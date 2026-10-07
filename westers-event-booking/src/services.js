import fs from "fs";
import path from "path";
import twilio from "twilio";
import { Resend } from "resend";

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const devOtpStore = new Map();

export async function sendOtp(to, channel = "sms") {
  if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
    console.log(`\n==============================================`);
    console.log(`🔑 [DEMO MODE] OTP for ${to} (${channel.toUpperCase()}): 1234`);
    console.log(`==============================================\n`);
    devOtpStore.set(to, "1234");
    return { status: "pending", sid: "DEMO_VERIFICATION_SID" };
  }
  return twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel });
}

export async function checkOtp(to, code) {
  if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
    const expected = devOtpStore.get(to) || "1234";
    if (String(code).trim() === expected || String(code).trim() === "1234") {
      devOtpStore.delete(to);
      return { status: "approved" };
    }
    return { status: "denied" };
  }
  return twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
}

export async function sendBrochureEmail(enquiry) {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured; skipping email.");
    return { skipped: true };
  }

  const brochurePath = path.resolve("public/assets/westers-brochure.pdf");
  const attachments = fs.existsSync(brochurePath)
    ? [{
        filename: "Westers-Events-Brochure.pdf",
        content: fs.readFileSync(brochurePath).toString("base64")
      }]
    : [];

  if (!attachments.length && !process.env.BROCHURE_URL) return { skipped: true };
  const brochureUrl = process.env.BROCHURE_URL || `${process.env.BASE_URL || ""}/assets/westers-brochure.pdf`;
  if (!/^https:\/\//.test(brochureUrl)) throw new Error("Configure an HTTPS brochure URL.");

  return resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: enquiry.email,
    subject: `Westers Events — Proposal Request ${enquiry.request_id}`,
    html: `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e3f2;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#352D5C,#7b4dff);padding:32px;text-align:center;color:#ffffff;">
          <h1 style="margin:0;font-size:26px;letter-spacing:2px;font-weight:900;">WESTERS EVENTS</h1>
          <p style="margin:6px 0 0;font-size:12px;letter-spacing:1px;opacity:0.9;">MEDIA • ADVERTISING • EVENTS</p>
        </div>
        <div style="padding:32px;color:#231f3d;">
          <h2 style="margin-top:0;color:#352D5C;font-size:20px;">Verification Complete!</h2>
          <p>Hello <strong>${escapeHtml(enquiry.name)}</strong>,</p>
          <p>Thank you for connecting with <strong>WESTERS Events</strong>. Your contact has been verified and your event request has been registered in our system.</p>
          
          <div style="background:#faf9ff;border:1px solid #e7e3f2;border-radius:12px;padding:20px;margin:24px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#352D5C;">
              <tr><td style="padding:6px 0;color:#716d7d;">Reference ID:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(enquiry.request_id)}</td></tr>
              <tr><td style="padding:6px 0;color:#716d7d;">Event Category:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(enquiry.event_type)}</td></tr>
              ${enquiry.venue_type ? `<tr><td style="padding:6px 0;color:#716d7d;">Venue Type:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(enquiry.venue_type)}</td></tr>` : ''}
              ${enquiry.event_date ? `<tr><td style="padding:6px 0;color:#716d7d;">Preferred Date:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(enquiry.event_date)}</td></tr>` : ''}
              ${enquiry.guests ? `<tr><td style="padding:6px 0;color:#716d7d;">Expected Guests:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(String(enquiry.guests))}</td></tr>` : ''}
              ${enquiry.budget ? `<tr><td style="padding:6px 0;color:#716d7d;">Budget Range:</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(enquiry.budget)}</td></tr>` : ''}
            </table>
          </div>

          <p>Our experienced event directors are reviewing your specs and will tailor a custom concept and proposal for you.</p>

          <div style="text-align:center;margin:30px 0;">
            <a href="${escapeHtml(brochureUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#352D5C,#7b4dff);color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px;font-size:15px;box-shadow:0 4px 14px rgba(123,77,255,0.3);">📄 Download Westers Brochure</a>
          </div>

          <p style="font-size:13px;color:#716d7d;text-align:center;margin-top:20px;">Have urgent questions? <a href="https://wa.me/918779557421?text=Hi%20Westers%2C%20regarding%20request%20${encodeURIComponent(enquiry.request_id)}" style="color:#7b4dff;font-weight:bold;">Chat with us directly on WhatsApp</a></p>
        </div>
        <div style="background:#f7f5fc;padding:20px;text-align:center;font-size:12px;color:#716d7d;border-top:1px solid #e7e3f2;">
          © 2026 WESTERS EVENTS PRIVATE LIMITED. All rights reserved.
        </div>
      </div>
    `,
    attachments
  });
}

export async function sendWhatsAppFollowup(enquiry) {
  if (
    !twilioClient ||
    !process.env.TWILIO_WHATSAPP_FROM ||
    !process.env.TWILIO_WHATSAPP_CONTENT_SID
  ) {
    console.warn("WhatsApp is not configured; skipping WhatsApp.");
    return { skipped: true };
  }

  const to = enquiry.phone.startsWith("whatsapp:")
    ? enquiry.phone
    : `whatsapp:${enquiry.phone}`;

  return twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    contentSid: process.env.TWILIO_WHATSAPP_CONTENT_SID,
    contentVariables: JSON.stringify({
      "1": enquiry.name,
      "2": enquiry.request_id,
      "3": enquiry.event_type,
      "4": enquiry.event_date || "TBD"
    })
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
