# Westers Event Booking System

A ready-to-customize starter for **westers.in**:

- Event enquiry form
- SMS or email OTP verification with Twilio Verify
- Unique Westers Request ID
- Automatic brochure email with Resend
- Automatic WhatsApp follow-up with Twilio WhatsApp Content Templates
- SQLite lead database
- Admin login and CRM status dashboard

## Important booking logic

OTP means the client's phone/email is verified. It does **not** mean the event is commercially confirmed.

Recommended lifecycle:

`NEW → VERIFIED → CONTACTED → MEETING → QUOTATION → NEGOTIATION → ADVANCE_PAID → CONFIRMED → COMPLETED`

## 1. Install

```bash
npm install
cp .env.example .env
```

Fill the `.env` variables.

## 2. Add your brochure

Put your real PDF at:

`public/assets/westers-brochure.pdf`

You can also set `BROCHURE_URL` in `.env`.

## 3. Twilio Verify

Create a Verify Service and place its SID in:

`TWILIO_VERIFY_SERVICE_SID`

For SMS, the client number should be in E.164 format, e.g. `+919876543210`.

For email OTP, Twilio Verify email requires its email-channel setup. If you only configure SMS initially, keep the website on Mobile SMS.

## 4. WhatsApp

For testing, use Twilio's WhatsApp Sandbox.

For production:
- Connect a WhatsApp Business sender.
- Create and get approval for a Content Template.
- Put the approved `HX...` SID in `TWILIO_WHATSAPP_CONTENT_SID`.

The included code sends variables:

1. Client name
2. Request ID
3. Event type

Example template body:

`Hello {{1}}, thank you for contacting WESTERS Events. We received your event request {{2}} for {{3}}. Please reply with your venue, guest count, budget and any special requirements. Our team will review the details and contact you shortly.`

## 5. Resend

Verify your sending domain with Resend and set:

`RESEND_API_KEY`
`FROM_EMAIL`

## 6. Run

```bash
npm run dev
```

Open:
- Booking: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin`

## 7. Integrating with westers.in

Best approach:
1. Keep the existing Westers homepage.
2. Change the `Plan Your Event` CTA to `/book-event` or host this booking frontend as a section/modal.
3. Host the Node API on a Node-compatible server.
4. Point frontend API calls to that backend URL if frontend/backend are on different domains.
5. Use HTTPS in production.
6. Put secrets only in server environment variables—never in frontend JavaScript.

## Before public launch

Add:
- Rate limiting for OTP and login
- CAPTCHA / Turnstile
- Strong admin password and rotated JWT secret
- Database backups
- Privacy policy + consent text
- Input validation with a schema library
- Central logging/error monitoring
- CSRF protection if you switch to cookie auth
- Production database (PostgreSQL/MySQL) if running serverless or multiple instances
