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

function requireTwilio() {
  if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Twilio Verify is not configured.");
  }
}

export async function sendOtp(to, channel = "sms") {
  requireTwilio();
  return twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel });
}

export async function checkOtp(to, code) {
  requireTwilio();
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
    subject: `Westers Events — We received ${enquiry.request_id}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;line-height:1.6">
        <h2 style="color:#352D5C">WESTERS EVENTS</h2>
        <p>Hello ${escapeHtml(enquiry.name)},</p>
        <p>Your contact has been verified and your event enquiry has been received.</p>
        <p><strong>Request ID:</strong> ${enquiry.request_id}</p>
        <p><strong>Event:</strong> ${escapeHtml(enquiry.event_type)}</p>
        <p>Our team will review your requirement and contact you. Your event is confirmed only after proposal/availability approval and the agreed booking step.</p>
        <p><a href="${escapeHtml(brochureUrl)}" style="display:inline-block;padding:12px 18px;background:#352D5C;color:white;text-decoration:none;border-radius:8px">View Westers Brochure</a></p>
        <p>Regards,<br><strong>Westers Events</strong><br>Media | Advertising | Events</p>
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
      "3": enquiry.event_type
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
