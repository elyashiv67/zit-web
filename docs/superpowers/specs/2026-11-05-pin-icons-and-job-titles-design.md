# Pin icons and job titles — design

Date: 2026-11-05. Approved by the owner in conversation (preview: https://claude.ai/artifact/QESKu6DzQ55rNAWqaYqcMv).

## 1. Pin icons

### Intent
Units want to tell pins apart on the map at a glance. Each unit decides for itself what an icon or a color means,
so the app only offers the choice: no legend, no fixed meanings.

### Goals
- Every pin can have a marker: one of 8 icons on a colored circle (one of 8 colors), the pin name under it.
- The marker is chosen in the new-pin and edit-pin forms, with a live preview.

### Non-goals
- No legend or per-unit color meanings. No custom colors (color wheel) or uploaded icon images.
- No marker in the pins list rows (they keep the photo / no-photo thumbnail).

### Anti-goals
- A color or icon that disappears on the map (pale colors on yellow roads / green parks).
- Changing how existing pins look without anyone editing them.

### Approaches considered
- **A. Fixed set of icons × colors** (picked): consistent, always visible, validated by the server.
- B. Fixed icons + any color from a color wheel: rejected, people pick pale / near-identical colors that defeat the point.
- Uploading own icon images: rejected, heavy for little gain.

### Decided
- Look (as in the preview): a 32px circle filled with the color, 2.5px light ring (`--paper`), soft shadow, the icon
  in white on top. Yellow uses a dark (`--ink`) icon. The name label stays under the marker, centered, as today.
- Icons (key: lucide icon, Hebrew label): `cctv` Cctv מצלמת אבטחה, `video` Video מצלמת וידאו, `webcam` Webcam מצלמת רשת,
  `camera` Camera מצלמה, `eye` Eye תצפית, `store` Store חנות, `building` Building2 מבנה, `pin` MapPin נקודה.
- Colors (key: hex, Hebrew): `red` #D54845 אדום, `orange` #E8710A כתום, `yellow` #F5C518 צהוב, `green` #1E8E3E ירוק,
  `blue` #1A73E8 כחול, `purple` #8E44AD סגול, `brown` #704A42 חום, `black` #050510 שחור.
- Stored on the pin as `marker: {icon, color}` (keys above). Optional; on PATCH it is replaced whole (both keys).
  The server rejects unknown keys (400).
- New pins start as `{icon: 'cctv', color: 'blue'}` (the form's default). Pins without a marker (all existing ones)
  keep today's plain red dot until edited.
- Picker in the pin form: a "סמל על המפה" section, 4-column icon grid and 4-column color grid (toggle buttons with
  `aria-pressed`), and a large live preview with the chosen icon + color named in words.

### Left to the builder
- Building the Leaflet `divIcon` HTML from the lucide icons (e.g. `renderToStaticMarkup`), caching per combination.
- Keeping the marker anchor exactly at the pin location so the name label stays centered under it (see the RTL
  tooltip fix in `PinMap.css`); the label offset changes with the bigger marker.

## 2. Job titles

### Intent
Users get a job title (e.g. ראש צוות) that is separate from their permission. Only admins know or choose who is an
admin; regular users never see "מנהל" / "משתמש" — their profile shows their job title instead.

### Goals
- A managed list of job titles: admins add, rename and delete them in a new "תפקידים" tab on the admin page.
- Every user must have a job title (required when creating a user; admins can change it).
- The admin form keeps the admin / user choice, relabeled "הרשאה" (the word "תפקיד" now means the job title).
- Profile shows "תפקיד: <job title>" instead of מנהל / משתמש. The admin user list shows the job title, plus the
  shield icon for admins.

### Non-goals
- Titles don't grant permissions. Titles are shared by all units (not per unit).
- Users can't change their own title.

### Approaches considered
- A. Free-text title with suggestions: rejected by the owner.
- **B. Managed list of titles** (picked): consistent spelling, renaming updates everyone.

### Decided
- New collection `JobTitle {name}`: unique, trimmed, 1–50 chars. Routes `/jobTitle`: GET list (login),
  POST / PATCH / DELETE (admin). Deleting a title still given to a user → 409 (same rule as roles and units).
- `User.job_title`: id of a JobTitle, required. Create (`/auth/register`) requires it; admins may change it
  (PATCH `/user/:id`); a regular user sending it is ignored, like role / unit today. Unknown id → 400 `field: job_title`.
- The session user (`/auth/me`, login) carries `job_title: {_id, name}`. `GET /user` keeps it as an id, like role.
- `is_admin` still comes from the role; the app still receives it (it decides which pages to show), it is just never
  shown to regular users.
- Existing users: a one-time script creates the title **חוקר זיט** and gives it to every user without a title
  (the owner approved changing the real DB for this). It is safe to run twice.

### Left to the builder
- The "תפקידים" tab layout (follow the units tab), Hebrew error messages for the new 409 / 400s.

## Testing
- Server end-to-end suite: marker validation (good / unknown icon / unknown color / partial / replace / remove),
  job titles CRUD, delete-in-use 409, required on create, admin-only change, unknown id 400, `/auth/me` shape.
- UI tests: picker (default, choose, preview, sent body, edit replaces), map markers (real Leaflet test: icon +
  color + label centered), admin titles tab, user form title + permission, profile shows the title not the permission.
- Contract tests against the real server; real-browser check of the markers and labels at phone size.
