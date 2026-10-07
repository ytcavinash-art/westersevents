# Local Westers website with event booking

Run from this directory with Node 24 or later:

    npm start

Open http://localhost:3000/ and select Book Your Event. The existing Westers homepage contains the booking form; client details, event details and OTP are separate steps. The API and website share the same localhost origin. Booking leads remain available at /admin.

The server serves selected website pages/assets from the parent directory, not the entire project directory. It binds to loopback only. Existing production deployment files and cPanel archive have not been updated.

Set Twilio Verify, Resend and WhatsApp credentials in .env before testing real delivery. No fake OTP or success response is enabled. The initial tracker marks only contact verification and requirement submission complete; team assignment and commercial stages require actual follow-up. Live tracker refresh and integration with the existing Supabase admin are not implemented.

Validation: JavaScript syntax checks and HTTP checks for homepage, booking assets, existing website styles/scripts, About page, and API health passed. Interactive browser verification was unavailable in this session.
