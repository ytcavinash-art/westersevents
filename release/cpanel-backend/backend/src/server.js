import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { completeVerification, processDeliveries } from "./workflow.js";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";
import { sendOtp, checkOtp, sendBrochureEmail, sendWhatsAppFollowup } from "./services.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_EMAIL) throw new Error("Configure JWT_SECRET (32+ characters), ADMIN_EMAIL and ADMIN_PASSWORD.");
app.disable("x-powered-by");
if (process.env.TRUST_PROXY_HOPS) app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
app.use(cors({ origin: origins }));
app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); res.set("X-Content-Type-Options", "nosniff"); next(); });
function limit(scope, max, windowMs) {
  return (req, res, next) => {
    const time = Date.now();
    db.prepare("DELETE FROM request_limits WHERE expires_at<=?").run(time);
    const key = createHash("sha256").update(scope + ":" + req.ip).digest("hex");
    const row = db.prepare("INSERT INTO request_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count,expires_at").get(key, time+windowMs);
    if (row.count > max) { res.set("Retry-After", String(Math.ceil((row.expires_at-time)/1000))); return res.status(429).json({message:"Too many attempts. Please try again later."}); }
    next();
  };
}
function requireSession(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "") || req.body?.resendToken;
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (claims.purpose !== "otp-resend" || claims.requestId !== (req.body?.requestId || req.params.requestId)) throw Error();
    next();
  } catch { res.status(401).json({message:"Verification session expired. Please start again."}); }
}
app.use(express.json({ limit: "1mb" }));
const websiteRoot = path.resolve(process.env.WEBSITE_ROOT || path.resolve(__dirname, "../.."));
if (process.env.BACKEND_ONLY !== "true") {
app.use("/assets", express.static(path.join(websiteRoot, "assets")));
app.get(["/", "/index.html", "/book-event"], (_, res) => res.sendFile(path.join(websiteRoot, "index.html")));
app.get(/^\/([a-z0-9-]+)\.(css|js|mjs)$/, (req, res, next) => {
  res.sendFile(path.join(websiteRoot, req.params[0] + "." + req.params[1]), err => { if (err) next(); });
});
app.get(/^\/(about|clients|gallery|services|videos|work|service-[a-z-]+)(?:\.html)?$/, (req, res, next) => {
  res.sendFile(path.join(websiteRoot, req.params[0] + ".html"), err => { if (err) next(); });
});
}
app.use(express.static(path.resolve(__dirname, "../public"), { index: false }));

const allowedStatuses = [
  "NEW",
  "VERIFIED",
  "CONTACTED",
  "MEETING",
  "QUOTATION",
  "NEGOTIATION",
  "APPROVED",
  "ADVANCE_PAID",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED"
];

function now() {
  return new Date().toISOString();
}

function createRequestId() {
  const year = new Date().getFullYear();
  const suffix = randomUUID().replaceAll("-", "").toUpperCase();
  return `WE-${year}-${suffix}`;
}

function normalizePhone(phone) {
  let p = String(phone || "").trim().replace(/[^\d+]/g, "");
  if (p.startsWith("0")) p = "+91" + p.slice(1);
  if (!p.startsWith("+") && p.length === 10) p = "+91" + p;
  return p;
}

function validateLead(body = {}) {
  const errors = [];
  for (const key of ['name','email','phone','eventType']) if (typeof body[key] !== 'string' || !body[key].trim()) errors.push(key + ' is required.');
  for (const [key, value] of Object.entries(body)) if (typeof value !== 'string' || value.length > (key === 'details' ? 5000 : 250)) errors.push('Invalid ' + key + '.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '')) errors.push('Valid email is required.');
  if (!/^\+[1-9]\d{7,14}$/.test(normalizePhone(body.phone))) errors.push('Use a valid phone number with country code.');
  if (!['sms','email'].includes(body.verifyChannel)) errors.push('Choose SMS or email verification.');
  if (body.consent !== 'yes') errors.push('Please agree to event-related communication.');
  if (body.guests && (!Number.isInteger(Number(body.guests)) || Number(body.guests) < 1 || Number(body.guests) > 1000000)) errors.push('Invalid guest count.');
  return errors;
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "westers-event-booking" });
});

app.post("/api/enquiries/start", limit("start", 5, 15*60*1000), async (req, res) => {
  try {
    const errors = validateLead(req.body);
    if (errors.length) return res.status(400).json({ ok: false, errors });

    const phone = normalizePhone(req.body.phone);
    const requestId = createRequestId();
    const verifyChannel = req.body.verifyChannel === "email" ? "email" : "sms";

    const stmt = db.prepare(`
      INSERT INTO enquiries
      (request_id,name,company,phone,email,event_type,event_date,guests,location,budget,details,verify_channel,verified,status,created_at,updated_at)
      VALUES (@request_id,@name,@company,@phone,@email,@event_type,@event_date,@guests,@location,@budget,@details,@verify_channel,0,'NEW',@created_at,@updated_at)
    `);

    stmt.run({
      request_id: requestId,
      name: req.body.name.trim(),
      company: req.body.company?.trim() || "",
      phone,
      email: req.body.email.trim().toLowerCase(),
      event_type: req.body.eventType.trim(),
      event_date: req.body.eventDate || "",
      guests: Number(req.body.guests || 0),
      location: req.body.location?.trim() || "",
      budget: req.body.budget?.trim() || "",
      details: req.body.details?.trim() || "",
      verify_channel: verifyChannel,
      created_at: now(),
      updated_at: now()
    });

    const destination = verifyChannel === "email"
      ? req.body.email.trim().toLowerCase()
      : phone;

    await sendOtp(destination, verifyChannel);

    res.json({
      ok: true,
      requestId,
      resendToken: jwt.sign({ purpose: "otp-resend", requestId }, process.env.JWT_SECRET, { expiresIn: "15m" }),
      message: `OTP sent via ${verifyChannel}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      message: err.message || "Unable to start verification."
    });
  }
});

app.post("/api/enquiries/resend", limit("resend", 5, 15*60*1000), async (req, res) => {
  let token;
  try { token = jwt.verify(req.body.resendToken, process.env.JWT_SECRET, { algorithms: ["HS256"] }); }
  catch { return res.status(401).json({ message: "Verification session expired. Please start again." }); }
  if (token.purpose !== "otp-resend" || token.requestId !== req.body.requestId) return res.status(401).json({ message: "Invalid verification session." });
  const enquiry = db.prepare("SELECT * FROM enquiries WHERE request_id=?").get(token.requestId);
  if (!enquiry || enquiry.verified) return res.status(409).json({ message: "This request cannot be resent." });
  const cutoff = new Date(Date.now() - 30000).toISOString();
  const changed = db.prepare("UPDATE enquiries SET updated_at=? WHERE request_id=? AND updated_at<=? AND verified=0").run(now(), token.requestId, cutoff);
  if (!changed.changes) return res.status(429).json({ message: "Please wait 30 seconds before resending." });
  try {
    await sendOtp(enquiry.verify_channel === "email" ? enquiry.email : enquiry.phone, enquiry.verify_channel);
    res.json({ ok: true });
  } catch { res.status(503).json({ message: "Unable to resend the code. Please wait 30 seconds and try again." }); }
});

app.post("/api/enquiries/verify", limit("verify", 15, 15*60*1000), requireSession, async (req, res) => {
  try {
    const { requestId, code } = req.body;
    const enquiry = db.prepare("SELECT * FROM enquiries WHERE request_id = ?").get(requestId);
    if (!enquiry) return res.status(404).json({ ok: false, message: "Request not found." });
    if (typeof code !== "string" || !/^[0-9]{4}$/.test(code)) return res.status(400).json({ ok: false, message: "Enter a four-digit OTP." });
    if (enquiry.verified) return res.json({ok:true, requestId, status:enquiry.status});

    const destination = enquiry.verify_channel === "email" ? enquiry.email : enquiry.phone;
    const check = await checkOtp(destination, String(code));

    if (check.status !== "approved") {
      return res.status(400).json({ ok: false, message: "Invalid or expired OTP." });
    }

    completeVerification(db, requestId);
    void processDeliveries(db, {email:sendBrochureEmail, whatsapp:sendWhatsAppFollowup});

    res.json({
      ok: true,
      requestId,
      status: "VERIFIED",
      message: "Contact verified. Your enquiry has been received.",
      automations: ["pending", "pending"]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: err.message || "Verification failed." });
  }
});

app.get("/api/enquiries/:requestId/status", requireSession, (req, res) => {
  const enquiry = db.prepare(`
    SELECT request_id,name,event_type,event_date,status,verified,created_at,updated_at
    FROM enquiries WHERE request_id=?
  `).get(req.params.requestId);

  if (!enquiry) return res.status(404).json({ ok: false, message: "Request not found." });
  res.json({ ok: true, enquiry, deliveries: db.prepare("SELECT channel,status FROM deliveries WHERE request_id=?").all(req.params.requestId) });
});

app.post("/api/admin/login", limit("admin-login", 5, 15*60*1000), (req, res) => {
  const { email, password } = req.body;
  if (
    email !== process.env.ADMIN_EMAIL ||
    typeof password !== "string" || !timingSafeEqual(createHash("sha256").update(password || "").digest(), createHash("sha256").update(process.env.ADMIN_PASSWORD).digest())
  ) {
    return res.status(401).json({ ok: false, message: "Invalid credentials." });
  }

  const token = jwt.sign(
    { role: "admin", email },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ ok: true, token });
});

function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Missing token");
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (req.user.role !== "admin") throw new Error("Invalid role");
    next();
  } catch {
    res.status(401).json({ ok: false, message: "Unauthorized." });
  }
}

app.get("/api/admin/enquiries", requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM enquiries ORDER BY datetime(created_at) DESC
  `).all();
  res.json({ ok: true, enquiries: rows.map(row => ({...row, deliveries: db.prepare("SELECT channel,status,attempts FROM deliveries WHERE request_id=?").all(row.request_id)})) });
});

app.patch("/api/admin/enquiries/:requestId/status", requireAdmin, (req, res) => {
  const status = String(req.body.status || "").toUpperCase();
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ ok: false, message: "Invalid status." });
  }

  if (status === "NEW") return res.status(409).json({message:"A verified booking cannot return to unverified."});
  const current = db.prepare("SELECT verified,status FROM enquiries WHERE request_id=?").get(req.params.requestId);
  if (!current) return res.status(404).json({message:"Request not found."});
  if (!current.verified) return res.status(409).json({message:"Contact must be verified before progressing a booking."});
  if (current.status === 'CANCELLED' || current.status === 'COMPLETED') return res.status(409).json({message:'This booking is closed.'});
  const order = ['VERIFIED','CONTACTED','MEETING','QUOTATION','NEGOTIATION','APPROVED','ADVANCE_PAID','CONFIRMED','COMPLETED'];
  if (status !== current.status && status !== 'CANCELLED' && order.indexOf(status) !== order.indexOf(current.status)+1) return res.status(409).json({message:"Complete the next booking stage first."});
  const info = db.prepare(`
    UPDATE enquiries SET status=?,updated_at=? WHERE request_id=?
  `).run(status, now(), req.params.requestId);

  if (!info.changes) return res.status(404).json({ ok: false, message: "Request not found." });
  res.json({ ok: true, status });
});

app.post("/api/admin/enquiries/:requestId/retry", requireAdmin, (req, res) => {
  const result = db.prepare("UPDATE deliveries SET status='pending',updated_at=? WHERE request_id=? AND status IN ('failed','not_configured')").run(now(), req.params.requestId);
  void processDeliveries(db, {email:sendBrochureEmail, whatsapp:sendWhatsAppFollowup});
  res.json({ok:true, queued:result.changes});
});
app.use("/api", (_,res) => res.status(404).json({message:"API route not found."}));
app.use((err,req,res,next) => { if (res.headersSent) return next(err); res.status(err.status || 500).json({message:"Unable to process request."}); });
app.get(["/admin", "/booking-admin"], (_, res) => {
  res.sendFile(path.resolve(__dirname, "../public/admin.html"));
});

app.get("*", (req, res) => {
  if (process.env.BACKEND_ONLY === "true") {
    if (req.path === "/") return res.redirect("/booking-admin");
    return res.status(404).send("Not found");
  }
  res.sendFile(path.resolve(__dirname, "../public/index.html"));
});

db.prepare("UPDATE deliveries SET status='uncertain' WHERE status='sending'").run();
setInterval(() => { void processDeliveries(db, {email:sendBrochureEmail, whatsapp:sendWhatsAppFollowup}); }, 30000).unref();
app.listen(PORT, process.env.HOST || "127.0.0.1", () => {
  console.log(`Westers booking system running on http://localhost:${PORT}`);
});
