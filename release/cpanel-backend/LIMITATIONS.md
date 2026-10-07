# Westers live deployment handoff

Status: local integration implemented; NOT deployed or tested against real providers.
Hosting confirmed by owner: cPanel has Setup Node.js App. Provider accounts are not configured yet.

## Hosting layout

Use one persistent Node 24+ process. SQLite is a local persistent database; this implementation is not designed for multiple Node workers or ephemeral hosting. Node version availability must be checked in cPanel before deployment. Startup file: app.cjs. The app root must be outside public_html. Set WEBSITE_ROOT to the absolute public_html directory and DATABASE_PATH to a private persistent directory outside it. Never upload .env, database files, node_modules, logs, or test fixtures into public_html.

Install dependencies with npm ci and run npm test from the private application directory. Configure a supported same-origin reverse proxy so https://westers.in/api/* reaches this app. Route /booking-admin and its /admin.js and /styles.css assets to this app as well, or serve those three public assets deliberately. Preserve the existing Supabase media admin at /admin/login and /admin/dashboard. The booking CRM is separate at /booking-admin; it does not use Supabase credentials.

The exact cPanel route/proxy configuration depends on the hosting provider and has not been applied. Do not assume that selecting an application URL mounts /api correctly. Confirm /api/health returns JSON through HTTPS and unknown /api routes return JSON 404, not the homepage. If Passenger mounts the application under a prefix, adapt routing with the host before launch. A backend subdomain requires a frontend API-base change; the current frontend uses same-origin /api.

Set NODE_ENV=production, HOST and PORT according to the host's Node application configuration. Set ALLOWED_ORIGINS=https://westers.in. Set TRUST_PROXY_HOPS only after the host confirms the actual proxy topology; otherwise client-IP rate limits may group all visitors together. Use a long unique JWT_SECRET, a strong ADMIN_PASSWORD and ADMIN_EMAIL in the cPanel environment. No secrets are included in this handoff.

## Provider setup

1. Twilio Verify: configure Account SID, Auth Token, Verify Service SID and four-digit codes (set the Twilio Verify service Code Length to 4 to match this frontend and API). SMS uses E.164 numbers. Email OTP additionally needs Twilio's SendGrid email integration; Resend is used for brochure emails, not email OTP. Official guide: https://www.twilio.com/docs/verify/email
2. Resend: configure RESEND_API_KEY, a verified sender domain and FROM_EMAIL. Set BROCHURE_URL to the real HTTPS PDF URL, or provide the PDF in the app's public/assets directory and configure BASE_URL. No brochure PDF has been supplied yet.
3. WhatsApp: configure the approved sender and approved Content Template SID in TWILIO_WHATSAPP_FROM and TWILIO_WHATSAPP_CONTENT_SID. The template uses client name, request ID and event type.
4. Configure provider spending limits and destination restrictions before exposing paid OTP sends to the public. Current server limits are persisted per IP; a CAPTCHA and per-destination limits are not implemented.

## Booking and delivery semantics

An unverified enquiry is stored before OTP delivery. It becomes a submitted, verified lead only after provider approval. Verification and the two delivery jobs commit atomically. Duplicate verification does not reset the booking or duplicate jobs. Admin authentication requires an admin-scoped token, not a client OTP token. Client status access requires the short-lived enquiry session token.

Jobs survive restart. Provider acceptance is recorded as accepted, NOT recipient delivery. Missing configuration is not_configured, errors are failed. Admin can retry failed/not_configured jobs. A process interruption during sending becomes uncertain and is not retried automatically because a message may already have been accepted. Check provider logs before manually resolving uncertain jobs. Provider callbacks, guaranteed exactly-once sending and delivery receipts are not implemented. A network timeout followed by a manual retry can duplicate a message.

Status progression: VERIFIED → CONTACTED → MEETING → QUOTATION → NEGOTIATION → APPROVED → ADVANCE_PAID → CONFIRMED → COMPLETED. Cancellation closes the request. Admin must verify commercial approval and receipt of funds before advancing; no payment gateway is connected. CONTACTED is the operational team-assignment milestone; named assignee management is not implemented.

The CRM lists new leads and delivery states on refresh. Push/browser/email admin notifications are not implemented. The client can refresh request status within its 15-minute session; durable cross-device tracking is not implemented.

## Before cutover

Test a real SMS and email OTP, invalid/expired code, resend, verified database record, real PDF email, WhatsApp template, admin login, stage progression and frontend status refresh. Confirm backups and restore using a consistent SQLite backup or a stopped process (include WAL files if copying a live database). Confirm HTTPS routing and that .env/database files cannot be downloaded. Run npm audit after installation and review production dependencies. Review pending enquiry retention, abuse controls and provider webhook requirements before public traffic.

Local validation: workflow transaction rollback, duplicate prevention, missing-configuration/error handling and provider acceptance tests pass. Syntax and local HTTP access tests pass. Live provider and cPanel tests remain pending.
