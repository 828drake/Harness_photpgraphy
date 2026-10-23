# Where to edit Harness Photography (Microsoft Visual Studio)

Open **HarnessPhotography.sln** in Microsoft Visual Studio, and expand the **public** folder in Solution Explorer. Source files are grouped by their purpose, while the server stays at the project root.

## Project map

```text
HarnessPhotography.sln       Visual Studio solution: open this
HarnessPhotography.esproj    Visual Studio project and Start configuration
server.mjs                   Node.js server, API, bookings, SMTP, admin
package.json                 Node.js scripts and requirements
.env.example                 Template for local configuration
.env                         Your PRIVATE settings (not committed)
.editorconfig                Indentation and editor formatting standards
public/
  index.html                 Home page and featured photo slideshow
  booking.html               Booking calendar and customer form
  gallery.html               Photo gallery and category filters
  contact.html               Contact information and contact form
  admin.html                 Password-protected admin interface
  styles.css                 Shared styles, arranged by page and component
  js/
    common.js                Navigation and shared API functions
    home.js                  Slideshow controls and featured photos
    booking.js               Calendar and booking form logic
    gallery.js               Filters and image viewer
    contact.js               Contact information and message sending
    admin.js                 Admin photo uploads, login and bookings
  assets/                    Favicon and older bundled assets
  uploads/                   Photos you upload through the dashboard
data/site.json               Saved bookings and uploaded-photo records
PHOTO_CREDITS.md             Unsplash image information
VISUAL_STUDIO.md             Starting and debugging from Visual Studio
```

## Common changes

| You want to change | Open this file |
| --- | --- |
| Homepage heading, buttons or feature photos | `public/index.html` |
| Booking page's wording and fields | `public/booking.html` |
| Appointment durations and availability logic | `server.mjs` |
| Gallery categories and labels | `public/gallery.html`, `public/js/gallery.js`, `server.mjs` |
| Contact email shown publicly | `public/contact.html`, `public/js/contact.js` |
| Colors, fonts, spacing or responsive layout | `public/styles.css` |
| Booking/contact notification settings | Local `.env` |
| Header/navigation appearance | `public/styles.css`; markup is in the relevant HTML page |
| Upload your own photographs | Visit `http://localhost:3000/admin.html` |

### CSS organization

Open `public/styles.css`, press **Ctrl+F**, and search for these section comments:

- `/* Navigation */`
- `/* Home */`
- `/* Footer */`
- `/* Inner page headers */`
- `/* Booking */`
- `/* Gallery */`
- `/* Contact */`
- `/* Admin */`

Change the colors in the `:root` CSS variables at the top. Responsive rules are near the bottom.

### Working in Visual Studio

- **Ctrl+F**: Find in the current file.
- **Ctrl+Shift+F**: Search every file in your project.
- **Ctrl+K, Ctrl+D**: Format the current document (for supported file types).
- **Ctrl+S**: Save edits.
- **Git → Git Changes**: Commit and push edits.
- **Git → Pull**: Get changes made in GitHub.

Use the green **Start** button to run the app locally. See [VISUAL_STUDIO.md](VISUAL_STUDIO.md) for setup.

**Important:** Keep `.env`, passwords, email tokens, `data/site.json`, and private uploaded customer files out of Git. The existing `.gitignore` protects those paths. The website's source paths are intentionally unchanged, so links and startup settings continue working.
