# ZitWeb — project notes for Claude

Claude Code loads this file automatically in this repo. It is the hand-off between machines:
read it before working, and update the "Status" and "Next" sections when something changes.

## Working rules (from the owner)

- **Never commit or push.** Finish the change, run the tests, then give the owner a commit message; they commit themselves.
- **Never touch real data** in the Atlas `Zit` database (roles, units, users) unless explicitly asked.
  Tests run on the separate `zit_test` database, which the test runner creates and drops.
- Never print values from `server/.env` (secrets).
- The owner handles `/auth/reg` and the gitignored `server/environment/` folder.
- Windows is case-insensitive: `src/Pages` and `src/pages` are the same folder. Never delete a folder whose name differs from a new one only in case.
- UI text is Hebrew, RTL. Talk to the owner in English.

## Layout

- `server/` — Express 5 + Mongoose 9 + Zod 4 API. Docs: `server/API.md`. Env: `server/.env.example`.
- `react/` — React 19 + Vite 7 app, deployed to GitHub Pages under `/zit-web/` (until the Docker server replaces it).
- Docker deploy (2026-11-09): `docker-compose.yml` (project `zit`: web / api / mongo), `server/Dockerfile`,
  `react/Dockerfile` (build, then nginx 1.28), both `.dockerignore`s, `deploy/` (nginx template, mongo-init,
  backup.sh, `*.env.example`), `.gitattributes` (LF for server files).
  Real secrets (`deploy/*.env`) are gitignored and live on the server only. Keep the guide's appendix in sync:
  it is generated from these files.
- **Public access is Tailscale Funnel** (owner, 2026-11-09), not a domain + Let's Encrypt: Funnel (HTTPS, port 443 of
  `<machine>.<tailnet>.ts.net`) → nginx on `127.0.0.1:8080` (plain http, `absolute_redirect off`, realip from
  X-Forwarded-For with the Docker gateway ranges trusted, `X-Forwarded-Proto https` to the API). No open web ports.
  The owner's personal projects share the server: tailnet-only via `tailscale serve` on other ports, published on
  127.0.0.1. Not yet confirmed: that Funnel passes the real client IP (guide step 10 checks it; if not, the login
  rate limit sees every user as one).

## Server (done, ready for the frontend)

- Sessions are stored in MongoDB (connect-mongo), cookie `zit.sid` (HttpOnly, SameSite=Lax, Secure in prod), 30 days rolling.
  `CheckLogin` reloads the user on every request; the session id rotates on login and on password change.
- A DB outage returns 503 (frontend: "try again", never a logout). 401 always means "log in".
- Pins belong to a unit, not a user (`creator` + `creator_name` kept). Images are compressed to 5MB or less,
  stored in `uploads/pins/<pin _id>/`, max 10 per pin (enforced atomically). DVR passwords are AES-256-GCM encrypted (`DVR_SECRET`).
- Paged lists: `GET /user`, `/timeDiff`, `/timeDiff/my`, `/timeDiff/allUnit` take `?page=&limit=` (default 20, max 100)
  and return `{items, page, limit, total, pages}`. Units, roles and pins are plain arrays.
- Last-admin protection: re-checked after the change, and undone if no admin is left.
- Time diffs have a required `name` on save (the history title); older records have none ("ללא שם" in the UI).
- Time diffs have an optional `location` `{lat, lng}` (same rule as a pin location, shared `location` in `schemas/common_S.js`).
  The calculator (logged in only) sets it with "המיקום שלי" or a map tap; a history row with one opens to a map and
  "שמירה כנקודה" → `/pins/new?lat=&lng=&name=` (the pin form reads these; an invalid place is ignored).
- Pins have an optional `dvr_owner` `{name, id_number?, phone?, notes?}`: name required when set; on PATCH it is
  replaced as a whole and `null` removes it. It is in the lists too (only the DVR password is hidden there).
- Pins have an optional `marker` `{icon, color}` from fixed lists (`MARKER_ICONS` / `MARKER_COLORS` in `schemas/Pins_S.js`);
  replaced whole on PATCH, `null` removes it. No marker = the plain red dot.
- Job titles (`/jobTitle`, admin-managed list, Hebrew sort) are separate from the role. Every user has a required
  `job_title`; `/auth/me` returns `job_title: {_id, name}`. Regular users see their title, never admin/user.
  `scripts/add-job-titles.mjs` (local only, gitignored) gave the 3 real users "חוקר זיט" on 2026-11-05 (safe to rerun).
- Security rules (2026-11-08, from `docs/security-report.html`):
  - ids are exactly 24 hex and lowercased in `schemas/common_S.js`, so `===` against `req.user.id` is safe;
  - passwords are 8+ characters and at most 72 bytes; bcrypt cost 12 (`config/passwords.js`), with older hashes
    upgraded at login without touching `pass_changed_at`;
  - a session without `login_at` is rejected;
  - roles are read-only (GET only);
  - API responses are `private, no-store`, and images are `private, max-age=86400`;
  - uploads accept files only, and the signature (magic bytes) is checked before sharp;
  - `express.json({inflate: false})`, so a gzip body gets 415;
  - the session store uses `mongoose.connection.name`. Before this fix, test runs wrote their sessions to the real DB.
- **30-day rolling login is on purpose** (owner, 2026-11-08). Don't shorten it.
- First admin (2026-11-09, `config/firstAdmin.js`, called in `index.js` after the DB connects): when
  `FIRST_ADMIN_PASSWORD` is set (8+ chars, same rules as all passwords) and the DB has **no users at all**, it creates
  the admin/user roles, a unit (צפון/עמקים/עפולה) and a job title (מנהל מערכת), or reuses existing ones, plus one admin
  `FIRST_ADMIN_USERNAME` (default `admin`). The owner's deploy starts fresh (no Atlas copy) and replaces this admin
  with their own. The real credentials go only in `deploy/api.env` on the server, never in the repo (it's public).
- `npm run dev` (port 4586), `npm test` (325 end-to-end checks on `zit_test`; reads the test DB directly for hashes and
  sessions, then `tests/firstAdmin.test.mjs`: 19 checks that restart the server on its own empty `zit_test_first_admin`).
  `node tests/run.mjs "<command>"` runs another suite against the seeded test server (it also seeds a job title, `JOB_TITLE`).
- **Run the server with `npm run dev`** (nodemon). `npm start` does not reload, so code changes don't apply until a restart.

## Frontend (built on design option A)

- `/` time diff calculator: **public**. `/login` is public. `/pins`, `/pins/new`, `/pins/:id`, `/pins/:id/edit`,
  `/history` and `/profile` need a login. `/admin` (users + job titles + units) needs an admin.
- Pin markers: `lib/markers.js` (icons, colors, `findMarker`), `components/MarkerPicker.jsx` in the pin form.
  `PinMap` renders the 8 icon SVGs once when it loads (react-dom/client, not react-dom/server, to keep the chunk small).
- Structure under `react/src/`:
  - `api/client.js` — fetch wrapper with the cookie, Hebrew error messages, and a 401 → `authEvents` 'expired'.
  - `auth/` — `AuthContext` (status: loading / in / out / unknown) and `RequireAuth`.
  - `hooks/` — `useAsync` + `useDelayedFlag` (skeletons appear only after 300ms), `usePagedList`, `useSessionDate`.
  - `lib/` — `timeMath.js` (wall-clock DVR drift, DST-safe), `validation.js` (mirrors the server's Zod rules), `pinImages.js`.
  - `components/` — Skeleton, EmptyState and ErrorState (icons, not text), Toast, ConfirmDialog, Sheet, Field,
    PinMap (Leaflet + OSM, lazy-loaded), PinThumb.
  - `layout/AppLayout.jsx` — header, plus a bottom tab bar on phones (moves into the header at 900px or wider).
  - `pages/` — one file per page. `router.jsx` holds the routes.
- Design: only the existing palette (red #D54845, brown #704A42, grey #A6A9B1, slate #3E4D53, paper #F5F6F6, ink #050510),
  as CSS variables in `src/index.css`. Font: Heebo (bundled via @fontsource), with tabular numbers for times.
  The one loud element is the offset readout on the time diff page. Text on the grey background uses ink, for contrast.
  Icons come from lucide-react.
- Run: server `npm run dev`, then in `react/` run `npm run dev` → http://localhost:5173/zit-web/ (Vite proxies `/api` to 4586).
  Phone on the same Wi-Fi: `npm run dev -- --host`.
- Tests in `react/`: `npm test` (182 tests, fake server in `src/test/utils.jsx`, PinMap mocked in `src/test/setup.jsx`
  except `PinMap.test.jsx`, which renders real Leaflet) and `npm run test:contract` (12 tests against a real server on
  `zit_test`). Lint: `npx eslint .`. `API_PROXY_TARGET=<url> npx vite` points the dev proxy at another API server.
- Real-browser checks: Playwright with the installed Chrome, run through `server/tests/run.mjs` against `zit_test`
  (a second Vite on port 5174). Layout bugs (like the RTL label shift) only show up there, not in jsdom.
  After a check, make sure nothing still listens on 5174. A leftover Vite from an older run keeps serving stale
  dependencies ("Outdated Optimize Dep" 504, then the map's lazy import fails), and a new `--strictPort` Vite can't start.
  A check Vite (`API_PROXY_TARGET` set) uses its own cache, `node_modules/.vite-check` (`vite.config.js`). When it
  shared `node_modules/.vite`, it rewrote the chunks under the owner's running `--host` dev server, and the pin page's
  lazy map import loaded a second React ("Cannot read properties of null (reading 'useState')" on the phone).
  After a package update, restart the dev server (`npm run dev -- --host --force`).

## Status (last updated 2026-11-05)

- Server: merged to main (PR #13, paging). Branch `start-front` holds the frontend work. **Commit it before switching machines.**
- Frontend: all pages built. 149/149 UI tests, 12/12 contract tests, lint clean, build OK.
- 2026-11-05: pin markers (8 icons × 8 colors, picker in the pin form) and job titles (admin "תפקידים" tab, required
  per user, shown in the profile instead of the permission). Checked in a real browser at phone size.
- Local only (gitignored, not on GitHub): `docs/` (design + plan files), `server/postman/`, `server/scripts/`.
- 2026-11-05 (owner's phone review): name on time diffs (required to save, history title), bigger offset readout,
  DVR owner on pins (form, detail card with tap-to-call, search by owner), bigger map on the pins list; the list opens with a button; pin names show under the dots (hidden when zoomed far out).
  Unused MUI / emotion / react-router-dom packages were removed.
- Known flake: the server suite sometimes fails 1–4 `/health` checks right after request bursts. It is the Atlas connection
  dropping; the code is unchanged since 868d5cb, which passed 234/234. Confirm against local Docker Mongo.
- Real-browser checks exist now (see Frontend); the owner still reviews on a phone.
- 2026-11-08 (branch `final-tweaks`): back link on the pin page (history back when opened in-app, else `/pins`; also on
  not-found), mouse-wheel zoom on the pins list map only (`PinMap` `wheelZoom` prop, off elsewhere so page scroll isn't
  trapped). Logo source packs moved to `react/assets/` (not imported; the header uses `src/assets/logo-2`).
- 2026-11-08 security pass: fixed every code item in `docs/security-report.html` except session length (kept on purpose).
  Packages updated: server body-parser 2.4.0 and multer 2.5.0 (prod audit clean; 2 moderate left in dev-only nodemon);
  react-router 7.18.5 and vite 7.3.7 (0 advisories). Server 315/315, UI 149/149, contract 12/12, real-browser check OK.
- 2026-11-09 (branch `pre-deploy`, after PR #16 merged the security work): the deploy files from the guide were
  created and improved (see Layout). Tested without Docker: both build contexts filtered by `.dockerignore`, prod-only
  install, React build, the API copy in production mode behind proxy headers (Secure cookie, no warnings), compose
  parsed, nginx template syntax-checked by script. Downloading nginx to run `nginx -t` locally was blocked, so step 9
  of the guide runs it on the server. Also: a check Vite uses `node_modules/.vite-check` (fixed "useState is null" on the
  phone).
- 2026-11-09 home-screen icon: index.html icon links are absolute (`/shortcutIcon/...`, Vite adds the base) so they
  work from deep pages; iPhone gets `apple-touch-icon.png` (180×180, not the .ico); the manifest has `start_url`/`scope`
  `../` (= `/zit-web/`) and separate padded `maskable-*.png` icons. Guarded by `src/test/homeScreenIcon.test.js`;
  real Chrome says installable from `/zit-web/pins/123`.
- 2026-11-10 (branch `first-patch`, after the deploy went live): the password field takes its direction from the text
  (`lib/textDirection.js`: Hebrew → eye on the left, English / digits → eye on the right; it used to be forced LTR
  while the eye stayed on the RTL side, so it covered English text). Time diff location + "save as pin" from the history
  (see Server). GPS code shared in `hooks/useMyLocation.js`. Server 325/325, first admin 19/19, UI 182/182,
  contract 12/12, real-Chrome check at phone size 18/18.
- The real DB has test accounts made on request. Their names are kept out of this file, which is public on GitHub.
  Delete them before launch (owner's call).

Reports: `.claude/reports/frontend-report.html` is the full frontend build report (pages, tests, what the tests caught,
open items). The security report is `docs/security-report.html`, local only because the repo is public.
`.claude/reports/deployment-guide.html` is the step-by-step Docker deployment guide (13 steps, all config files in the
appendix, generated from the repo files). It is tracked and public, so it must never get real secrets, names or domains.
Docker hasn't run the files yet (no Docker on the dev PC). Open the reports in a browser.

## Next

1. Owner reviews the UI on a phone; fix whatever looks off.
2. **Deploy to a private server with Docker.** The files are ready; the owner commits them, tags `v1.0.0`, and follows
   `.claude/reports/deployment-guide.html` from step 1 on the server. It covers the must-do list (M1–M9) in `docs/security-report.html`:
   - nginx serves the app and proxies `/api` on one origin, so the Lax cookie keeps working;
   - HTTPS (Tailscale Funnel);
   - `NODE_ENV=production`, a new 48+ character `SESSION_SECRET`, `TRUST_PROXY=1`;
   - MongoDB locked down;
   - a non-root container;
   - backups (DB, uploads, `DVR_SECRET`);
   - firewall.
   Open decisions: Atlas or a Mongo container; a private repo; whether users may delete their own account.
3. Optional: remove the duplicate `/auth/reg` route, the unused `server/environment/Auth_ENV.js` and `JWT_SECRET`
   (owner handles these), and the test accounts in the real DB.
