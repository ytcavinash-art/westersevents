# WESTERS Admin Panel + Media Backend

A complete static admin panel powered by Supabase Auth, Database and Storage.

## What is included

- Admin email/password login
- Protected dashboard
- Create, edit, publish/unpublish and delete events/projects
- Multiple image + video uploads
- Cover image selection
- Individual media delete
- Public gallery page that automatically loads published projects
- Search/filter on admin dashboard
- Row Level Security (RLS)
- Responsive mobile/desktop UI
- Netlify-friendly static deployment

## 1. Create a Supabase project

Create a project in Supabase.

Then open **SQL Editor** and run:

`supabase/setup.sql`

This creates:
- `projects`
- `media`
- public storage bucket `westers-media`
- RLS policies

## 2. Create your admin user

In Supabase Dashboard:

**Authentication → Users → Add user**

Create your own admin email and password.

Important: This starter intentionally allows CRUD to authenticated users only.
Keep signup disabled unless you specifically need multiple admins.

## 3. Add Supabase credentials

Open:

`assets/js/config.js`

Replace:

```js
SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY"
```

Use only the public/anon (publishable) key. Never put your `service_role` key in browser code.

## 4. Run locally

Because ES modules are used, open through a local server instead of double-clicking HTML.

With VS Code Live Server:
- Right-click `index.html`
- Open with Live Server

Or:

```bash
npx serve .
```

Then visit:

- Public gallery: `/index.html`
- Admin login: `/admin/login.html`
- Admin dashboard: `/admin/dashboard.html`

## 5. Deploy to Netlify

Drag-and-drop the complete folder into Netlify, or connect it to GitHub.

No Node/Express server is required for this version. Supabase is the backend.

## Add this gallery to your existing WESTERS website

You can either:

1. Use this project's `index.html` as your gallery page, or
2. Copy the gallery container + `gallery.js` into your existing website.

The public gallery reads only projects where `published = true`.

## Video note

This uses Supabase's normal browser upload API. It works for images and videos within the file-size limit configured on the Storage bucket.

For very large event videos, use compressed web MP4 files or host the full showreel on YouTube/Vimeo and add a lightweight website preview. Supabase recommends resumable uploads for larger files because they are more reliable.

## Suggested image/video formats

- Images: JPG, PNG, WebP
- Videos: MP4, WebM, MOV
- Cover image: 1600×900 or similar
- Web gallery videos: keep compressed for faster loading

## Folder structure

```text
westers-admin-panel/
├── index.html
├── admin/
│   ├── login.html
│   └── dashboard.html
├── assets/
│   ├── css/
│   │   ├── site.css
│   │   └── admin.css
│   └── js/
│       ├── config.js
│       ├── supabase-client.js
│       ├── gallery.js
│       ├── login.js
│       └── dashboard.js
├── supabase/
│   └── setup.sql
├── _redirects
└── README.md
```

## Security

- RLS is enabled on database tables.
- Anonymous visitors can only read published project records and their media.
- Authenticated users can create/update/delete.
- Storage files are publicly viewable because they are used by the public website.
- Upload/update/delete on Storage is restricted to authenticated users.
- The Supabase `service_role` key is never required in this frontend.

## Troubleshooting

### "Invalid API key"
Check `assets/js/config.js`.

### Login works but upload is denied
Run the complete `supabase/setup.sql` file again and verify the bucket name is `westers-media`.

### Gallery is blank
Make sure:
- project is marked Published
- `config.js` contains correct credentials
- your site is served through HTTP/HTTPS, not `file://`

### Video upload fails
Check:
- Supabase bucket file-size limit
- your internet connection
- video MIME type
- whether the video is too large for reliable standard upload
