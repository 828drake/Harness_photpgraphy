# Harness Photography

A complete four-page, responsive photography website. Built with **HTML, CSS and vanilla JavaScript**, plus a lightweight **Node.js server** for actual bookings, admin-managed gallery uploads, contact messages, and email notifications. No npm dependencies or database installation required.

## What's included

- **Home:** cinematic auto-rotating photography hero, clear calls to action, featured photos, and service introduction. Images the admin marks **Featured** automatically become the home slideshow.
- **Book a Session:** integrated date calendar, four session categories, live available time slots, 2–120-day booking window, validation, conflict prevention, confirmation number, and saved appointments.
- **Gallery:** responsive portfolio, category filters, and full-screen lightbox. The admin can add or remove photos without editing code.
- **Contact:** owner email/phone/location/Instagram from your settings, working inquiry form, saved messages, and email notifications.
- **Admin:** password-protected `/admin.html` to upload photographs, view and cancel bookings, read messages, and retry email notifications.

The starter gallery now uses **real, publicly licensed sample photographs from Unsplash** (including landscape images). They load online from `images.unsplash.com`. These are **not photographs taken by Harness Photography** and should be replaced with your own portfolio work before representing the gallery as your work. See `PHOTO_CREDITS.md` for source information.

## Run directly from Microsoft Visual Studio

**Visual Studio 2022 or 2026 (the full IDE, not VS Code)** can run this repository from the green **Start / F5** button.

1. Install the **Node.js development** workload using **Visual Studio Installer**.
2. Clone (or open) this GitHub repository in Visual Studio and select **Git > Pull**.
3. Open **`HarnessPhotography.sln`** from **File > Open > Project/Solution**.
4. Set the **Harness Photography** project as the startup project if needed.
5. Copy `.env.example` to a private local `.env`, and set `ADMIN_PASSWORD` and `SESSION_SECRET`.
6. Choose **Harness Photography — Start website and browser** in the debug dropdown and click the green **Start** arrow (F5). The site opens at **http://localhost:3000**.

The project starts **`node server.mjs`** directly (no PowerShell `npm.ps1` issue). See **[VISUAL_STUDIO.md](VISUAL_STUDIO.md)** for troubleshooting and alternative configurations.

## Quick start (Windows)

1. Install Node.js **20 or newer** from https://nodejs.org/ (if not already installed).
2. Extract the zip and open the **Harness-Photography** folder in Visual Studio Code, File Explorer, or a terminal.
3. Make a copy of `.env.example` in the same folder and name it **`.env`**. (On Windows, use `copy .env.example .env` in Command Prompt.)
4. Edit `.env` to set `ADMIN_PASSWORD`, `SESSION_SECRET`, and your email/contact information. A strong secret can be generated with:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Open a terminal in the extracted website folder and run:

   ```powershell
   npm start
   ```

6. Open **http://localhost:3000** in your browser.

   - Home: http://localhost:3000/
   - Scheduling: http://localhost:3000/booking.html
   - Gallery: http://localhost:3000/gallery.html
   - Contact: http://localhost:3000/contact.html
   - Admin: http://localhost:3000/admin.html

**No `npm install` is necessary.** The server runs entirely on built-in Node.js modules.

### Configure notification emails

To email the administrator whenever someone books a session or uses the contact form, fill in these values in `.env`:

```ini
ADMIN_EMAIL=your-admin-address@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-google-app-password
MAIL_FROM=Harness Photography <your-gmail-address@gmail.com>
```

**With Gmail:** Enable 2-Step Verification on the Gmail account, then create an **App Password** in your Google Account settings if your account supports it. Use that app password in `SMTP_PASS`, **not your regular Google password**. Keep the `.env` file private and never publish it or commit it to Git.

Other email providers work if they support SMTP with **SSL port 465** or **STARTTLS port 587**. Change the SMTP variables accordingly. Use the email address/domain approved by your provider for `MAIL_FROM`. When SMTP is configured successfully, bookings trigger emails addressed to `ADMIN_EMAIL`.

If email settings are missing or email delivery fails, **bookings and messages are still saved**, and the admin dashboard displays their unsent status and offers a **Retry Email** button. Without valid email settings, the site cannot actually send email. An internet connection and an outgoing-SMTP-enabled host are necessary.

### Edit public contact information

In `.env`, adjust:

```ini
PUBLIC_EMAIL=hello@yourdomain.com
PUBLIC_PHONE=(555) 123-4567
PUBLIC_LOCATION=Your City, State
PUBLIC_INSTAGRAM=yourinstagramhandle
TIME_ZONE=America/New_York
```

Blank optional fields simply do not appear on the contact page. `TIME_ZONE` controls the scheduling calendar's business date and timezone label.

### Admin photo uploads

1. Visit `/admin.html` and sign in using `ADMIN_PASSWORD`.
2. Choose **Your Photos**.
3. Select a JPG, PNG, WebP or GIF under 8 MB, provide a title and category (including **Landscapes**), and click **Publish Photo**.
4. Check **Mark as a featured photograph** if you want it in the homepage slideshow.
5. The photo is immediately visible on the public gallery. You can remove the sample images using **Remove Photo**.

Images are stored in `public/uploads/`, and bookings/messages/gallery data are stored in `data/site.json`. **Back up both locations.** Keep them on persistent storage, especially when hosting in the cloud.

### Booking rules

- Available dates are 2 through 120 days in advance.
- Available appointment starts are every 30 minutes between 9 a.m. and 6 p.m. local business time; the session must end by 6 p.m.
- Session lengths: Portraits 60 min; Couples 90 min; Families 90 min; Celebrations 120 min.
- Confirmed sessions automatically block other appointments with overlapping time ranges.
- Admin cancellation frees the time slot, but **does not automatically email the customer**. Contact the client separately when canceling.
- To change the operating hours, advance-booking window, or session types, edit the documented constants/availability logic near the start of `server.mjs` and keep the matching choices in `public/booking.html` consistent.

### Publishing your website

This website needs a server host that runs Node.js and **preserves uploaded images and saved JSON files**. Options include a VPS or a Node-capable platform with a persistent disk. You cannot host the functioning booking/admin/email features on static-only GitHub Pages or by opening `index.html` directly.

For production:

1. Use a real HTTPS domain and set `NODE_ENV=production` in `.env`.
2. Use a long, unique `ADMIN_PASSWORD` and random `SESSION_SECRET`.
3. Configure SMTP, test an actual booking, and verify the message arrives at `ADMIN_EMAIL`.
4. Set up backups and a persistent disk for `data/site.json` and `public/uploads/`.
5. Configure a reverse proxy/hosting platform to forward requests to the chosen Node `PORT`.
6. Protect the `.env` file; it lives outside `public/` and is not served by this app.

This initial version uses a local JSON store suitable for small websites and single-process deployments. For larger-scale use or multiple server instances, switch the storage to a real database and cloud photo storage.

## Files

```text
Harness-Photography/
  .env.example
  package.json
  server.mjs                 Node server, bookings, uploads, SMTP
  public/
    index.html               Home + slideshow
    booking.html             Calendar and booking form
    gallery.html             Gallery + lightbox
    contact.html             Contact details + inquiry form
    admin.html               Private admin area
    styles.css               Responsive website styles
    js/                      Frontend JavaScript
    assets/                  Favicon (stock samples are served from Unsplash)
    uploads/                 Admin-uploaded photos (generated)
  data/                      Saved bookings, messages, gallery (generated)
```

## Quick smoke test

- Book a date, then book the exact same time again: the second booking must be rejected.
- Log in at `/admin.html` and confirm the booking appears.
- Upload a photo and verify it appears on `/gallery.html`; mark it featured to see it on the homepage.
- Send a contact message and verify it appears under **Inquiries**.
- Configure SMTP and check the email status in the admin dashboard, then run a real booking to verify delivery.

### Updating the sample photos

The default sample gallery is configured in `SEED_GALLERY` inside `server.mjs`, and the homepage's backup slideshow is configured in `public/index.html`. Stock images load from Unsplash's CDN and therefore require an internet connection. The gallery distinguishes starter examples from photos you upload yourself. To make your own photos appear in the slideshow, mark them **Featured** in the admin dashboard.
