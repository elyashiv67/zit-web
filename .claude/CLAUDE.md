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
- `react/` — React 19 + Vite 7 app, deployed to GitHub Pages under `/zit-web/`.

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
- Pins have an optional `dvr_owner` `{name, id_number?, phone?, notes?}`: name required when set; on PATCH it is
  replaced as a whole and `null` removes it. It is in the lists too (only the DVR password is hidden there).
- Pins have an optional `marker` `{icon, color}` from fixed lists (`MARKER_ICONS` / `MARKER_COLORS` in `schemas/Pins_S.js`);
  replaced whole on PATCH, `null` removes it. No marker = the plain red dot.
- Job titles (`/jobTitle`, admin-managed list, Hebrew sort) are separate from the role. Every user has a required
  `job_title`; `/auth/me` returns `job_title: {_id, name}`. Regular users see their title, never admin/user.
  `scripts/add-job-titles.mjs` gave the 3 real users "חוקר זיט" on 2026-11-05 (safe to rerun).
- `npm run dev` (port 4586), `npm test` (299 end-to-end checks on `zit_test`).
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
- Tests in `react/`: `npm test` (141 tests, fake server in `src/test/utils.jsx`, PinMap mocked in `src/test/setup.jsx`
  except `PinMap.test.jsx`, which renders real Leaflet) and `npm run test:contract` (12 tests against a real server on
  `zit_test`). Lint: `npx eslint .`. `API_PROXY_TARGET=<url> npx vite` points the dev proxy at another API server.
- Real-browser checks: Playwright with the installed Chrome, run through `server/tests/run.mjs` against `zit_test`
  (a second Vite on port 5174). Layout bugs (like the RTL label shift) only show up there, not in jsdom.

## Status (last updated 2026-11-05)

- Server: merged to main (PR #13, paging). Branch `start-front` holds the frontend work. **Commit it before switching machines.**
- Frontend: all pages built. 141/141 UI tests, 12/12 contract tests, lint clean, build OK.
- 2026-11-05: pin markers (8 icons × 8 colors, picker in the pin form) and job titles (admin "תפקידים" tab, required
  per user, shown in the profile instead of the permission). Design: `docs/superpowers/specs/2026-11-05-pin-icons-and-job-titles-design.md`,
  plan: `docs/superpowers/plans/2026-11-05-pin-icons-and-job-titles.md`. Checked in a real browser at phone size.
- 2026-11-05 (owner's phone review): name on time diffs (required to save, history title), bigger offset readout,
  DVR owner on pins (form, detail card with tap-to-call, search by owner), bigger map on the pins list; the list opens with a button; pin names show under the dots (hidden when zoomed far out).
  Unused MUI / emotion / react-router-dom packages were removed.
- Known flake: the server suite sometimes fails 1–4 `/health` checks right after request bursts. It is the Atlas connection
  dropping; the code is unchanged since 868d5cb, which passed 234/234. Confirm against local Docker Mongo.
- Real-browser checks exist now (see Frontend); the owner still reviews on a phone.
- Real DB test users (made on request): `elyashiv` (admin) and `testuser` (user) in unit Afula. The owner knows the passwords.

Reports: `.claude/reports/frontend-report.html` is the full frontend build report (pages, tests, what the tests caught,
open items). Open it in a browser.

## Next

1. Owner reviews the UI on a phone; fix whatever looks off.
2. **Before deploying, remind the owner:**
   - GitHub Pages is on a different site from the API, so the server needs CORS with credentials and the cookie must be
     `SameSite=None; Secure`. Today it is Lax, which breaks a cross-site login silently. Alternative: serve the built app from
     the same domain as the API (nginx/Docker), and then nothing changes.
   - Set `VITE_API_URL` for the build when the API is on another origin.
   - `SESSION_SECRET` is only 10 chars; it needs 32+ (production refuses to start otherwise).
   - Back up `DVR_SECRET` (losing it makes the stored DVR passwords unreadable).
   - Docker: `TRUST_PROXY=1`, `DB` pointing at the Mongo container, and mount `UPLOADS_DIR` as a volume.
3. Optional: remove the duplicate `/auth/reg` route, the unused `server/environment/Auth_ENV.js` and `JWT_SECRET`,
   rate limits kept in memory, and the test users in the real DB.
