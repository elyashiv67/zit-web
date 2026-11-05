# Pin Icons and Job Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pins get a chosen marker (icon on a colored circle); users get a required job title from an admin-managed list, separate from their admin / user permission.

**Architecture:** Server first (Mongoose model + Zod schema + controller + end-to-end checks in `server/tests/routes.test.mjs`), then the React app (shared marker table in `src/lib/markers.js`, picker in the pin form, Leaflet `divIcon`s built from lucide icons, a new admin tab). Every task ends green on its own suite.

**Tech Stack:** Express 5, Mongoose 9, Zod 4; React 19, react-leaflet 5, lucide-react, Vitest + Testing Library; Playwright (scratchpad only) for the real-browser check.

**Spec:** `docs/superpowers/specs/2026-11-05-pin-icons-and-job-titles-design.md`

## Global Constraints

- **Never commit.** Where a task says "Commit", stop and leave the files uncommitted; the owner commits. Give a commit message at the end.
- Never print `server/.env` values. Real Atlas DB: the only allowed change is Task 4 (owner-approved).
- Windows: never `rm` a folder whose name differs from another only in case.
- UI text Hebrew, RTL; app palette tokens in `react/src/index.css`; icons from `lucide-react`.
- Marker icon keys exactly: `cctv video webcam camera eye store building pin`; color keys exactly: `red orange yellow green blue purple brown black` with hex `#D54845 #E8710A #F5C518 #1E8E3E #1A73E8 #8E44AD #704A42 #050510`.
- New-pin default marker `{icon: 'cctv', color: 'blue'}`. Pins without `marker` render as today's plain red dot.
- Job title name: trimmed, 1–50 chars, unique. Migration title: `חוקר זיט`.
- Server suite: `cd server && npm test`. Known flake: 1–4 `/health` 503 checks after request bursts (Atlas); anything else failing is real.
- React: `cd react && npm test`, `npx eslint .`, `npm run build`, `npm run test:contract`.

## Review Focus

1. A pin whose `marker` has a key the app doesn't know (data edited by hand, older/newer server) → shown as the plain red dot, no crash. Test in Task 6.
2. Editing a pin that has no marker and changing only its name → the pin keeps the plain red dot (no marker sent). Test in Task 5.
3. Deleting a job title still given to someone → Hebrew message "אי אפשר למחוק תפקיד שמשויך למשתמשים", the title stays in the list. Test in Task 7.
4. A logged-in user whose `job_title` is missing/null (session from before the migration) → profile simply hides the row; admin list shows the chip "חסר תפקיד". Test in Task 7.
5. Renaming a job title → the admin user list shows the new name without a reload. Test in Task 7.

---

### Task 1: Server — pin marker

**Files:**
- Modify: `server/schemas/Pins_S.js`, `server/modules/pins.js`, `server/controllers/Pins_C.js` (`updatePin`), `server/API.md` (pins section)
- Test: `server/tests/routes.test.mjs` (pins block, after the dvr_owner checks)

**Interfaces:**
- Produces: pin JSON may include `marker: {icon, color}`; `POST /pin` and `PATCH /pin/:id` accept `marker` (`PATCH` also `null` to remove). Exported constants `MARKER_ICONS`, `MARKER_COLORS` (arrays of keys) from `server/schemas/Pins_S.js`.

- [ ] **Step 1: Write the failing checks** (style of the existing `t(...)` calls)
  - `set marker` PATCH `{marker: {icon: 'cctv', color: 'blue'}}` → 200, `pin.marker` deep-equals it.
  - `marker shows in the unit list` GET `/pin/allUnit` → the pin's `marker.color === 'blue'`.
  - 400 for each: `{icon: 'tank', color: 'blue'}`, `{icon: 'cctv', color: 'pink'}`, `{icon: 'cctv'}`, `{color: 'red'}`, `'cctv'`.
  - `marker replaced whole` PATCH `{marker: {icon: 'store', color: 'yellow'}}` → `pin.marker` deep-equals `{icon:'store', color:'yellow'}`.
  - `marker removed with null` → 200, `!('marker' in pin)`.
  - `add pin with marker` POST → 201 with the marker; `add pin without marker` → 201, no `marker` key. Delete both test pins.
- [ ] **Step 2: Run** `cd server && npm test` → the new checks FAIL (400s pass trivially only if unknown keys are stripped — the "set marker" check must fail).
- [ ] **Step 3: Implement**: `pinKeys.marker = z.object({icon: z.enum(MARKER_ICONS), color: z.enum(MARKER_COLORS)})`; `marker` optional in `addPinSchema`, `.nullable()` in `updatePinSchema`. Model: nested `marker: {icon: String, color: String}`. Controller: like `dvr_owner`, set both `marker.icon` / `marker.color` (undefined when null).
- [ ] **Step 4: Run** `npm test` → all marker checks PASS (only the known `/health` flake may fail).
- [ ] **Step 5: API.md**: body line `"marker": { "icon": one of …, "color": one of … }`, rules (optional, replaced whole, null removes), pin object example.
- [ ] **Step 6: Commit** — skip (owner commits).

### Task 2: Server — job titles collection

**Files:**
- Create: `server/modules/job_titles.js`, `server/schemas/JobTitles_S.js`, `server/controllers/JobTitles_C.js`, `server/routes/JobTitles_R.js`
- Modify: `server/routes/Main_R.js` (mount `/jobTitle`), `server/API.md` (new section after Roles)
- Test: `server/tests/routes.test.mjs` (new `== job titles` block after roles)

**Interfaces:**
- Produces: model `JobTitle` (`{name}` unique, timestamps); routes `GET /jobTitle` (login) → array sorted by name; `POST /jobTitle {name}` (admin) → 201 `{message, jobTitle}`; `PATCH /jobTitle/:id {name}` (admin) → `{message, jobTitle}`; `DELETE /jobTitle/:id` (admin) → `{message, id}`, 409 `{message: 'Cannot delete job title: still assigned to one or more users'}` when a user has it (check added in Task 3 once users have the field — write the controller check now against `User.exists({job_title: id})`).

- [ ] **Step 1: Failing checks**: list w/o login 401; user creates → 403; admin creates `'  ראש צוות '` → 201 name `'ראש צוות'`; duplicate → 409; blank / 51 chars → 400; list (user) contains it, sorted; rename → 200; get-list shows new name; delete unknown id → 404; delete → 200.
- [ ] **Step 2: Run** → FAIL (404 route not found).
- [ ] **Step 3: Implement** copying the Roles pattern (`Roles_C.js`, `Roles_R.js`); schema `name: z.string().trim().min(1).max(50)`; `GET` sorts `{name: 1}`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: API.md** section "Job titles — `/jobTitle`".

### Task 3: Server — user job title + migration script

**Files:**
- Modify: `server/modules/users.js` (`job_title` ObjectId ref `JobTitle`, required), `server/schemas/Users_S.js` (`job_title: objectId` in `registerUserSchema`; admin update gets it via `.partial()`), `server/controllers/Users_C.js` (`findMissingRef` checks `job_title` → `'job_title'`), `server/controllers/Auth_C.js` (populate `job_title` in both loaders), `server/middleware/Auth_MID.js` (`buildReqUser` adds `job_title: user.job_title ? {_id, name} : null`), `server/controllers/Users_C.js` `getUserById` / `updateUser` populate `job_title`, `server/tests/run.mjs` (seed a `jobtitles` doc `{name: 'test title'}`, give it to `test_admin`, export `JOB_TITLE` id in `testEnv`), `server/API.md` (users section).
- Create: `server/scripts/add-job-titles.mjs`
- Test: `server/tests/routes.test.mjs` (every `/auth/register` body gets `job_title: process.env.JOB_TITLE`; new checks)

**Interfaces:**
- Consumes: `JobTitle` (Task 2).
- Produces: `req.user.job_title` / login + `/auth/me` `user.job_title = {_id, name} | null`; `GET /user` items have `job_title` as id string; `PATCH /user/:id {job_title}` (admin only).
- Script: `node scripts/add-job-titles.mjs` — connects with `.env` `DB`, upserts title `חוקר זיט`, `updateMany({job_title: {$exists: false}}, {job_title: id})`, prints `title <id>, updated <n> users`. Idempotent.

- [ ] **Step 1: Failing checks**: register without `job_title` → 400; with unknown id → 400 `field === 'job_title'`; register ok → 201 with `job_title`; `/auth/me` of that user → `user.job_title.name === <title name>`; user PATCHing own `job_title` → 200 but unchanged; admin PATCH `job_title` → changed; delete the title in use → 409; `/auth/me` has no `is_admin` change (still present).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** as listed in Files.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Write the script** (do not run it here).

### Task 4: Migrate the real DB (owner-approved)

- [ ] **Step 1:** Read-only count first: users without `job_title` in the real DB (expect 3).
- [ ] **Step 2:** `cd server && node scripts/add-job-titles.mjs` → `updated 3 users`.
- [ ] **Step 3:** Run it again → `updated 0 users` (idempotent).
- [ ] **Step 4:** Remind the owner to restart the API server (`npm run dev`).

### Task 5: React — marker table + picker in the pin form

**Files:**
- Create: `react/src/lib/markers.js`, `react/src/components/MarkerPicker.jsx`, `react/src/components/MarkerPicker.css`
- Modify: `react/src/pages/PinFormPage.jsx`
- Test: `react/src/pages/pins.test.jsx` (pin form block)

**Interfaces:**
- Produces (`lib/markers.js`): `MARKER_ICONS: Array<{key, Icon, label}>` (spec order and Hebrew labels), `MARKER_COLORS: Array<{key, hex, label, darkIcon: boolean}>` (only yellow `darkIcon: true`), `DEFAULT_MARKER = {icon: 'cctv', color: 'blue'}`, `findMarker(marker) → {icon, color} | null` (null when missing or any key unknown).
- Produces: `<MarkerPicker value={{icon, color}} onChange={marker => …} />` — icon buttons `aria-label={label}` `aria-pressed`, color buttons same, preview text `"<icon label>, <color label>"`; `<MarkerBadge marker size />` (exported from `MarkerPicker.jsx`) renders the circle for the preview.
- Form rule: new pin → state starts `DEFAULT_MARKER`, always sent. Edit → state starts `findMarker(pin.marker) ?? DEFAULT_MARKER`; send `marker` only if it differs from the stored one **and** (the pin had a marker or the user touched the picker).

- [ ] **Step 1: Failing tests**: new pin sends `marker: {icon:'cctv', color:'blue'}` by default; choosing "חנות" + "צהוב" sends `{icon:'store', color:'yellow'}` and the preview reads "חנות, צהוב" with both buttons `aria-pressed=true`; edit of a pin with a marker preselects it and sends the changed marker; edit of a pin without a marker changing only the name sends no `marker` (Review Focus 2); update the existing exact-body assertions for new pins to include the default marker.
- [ ] **Step 2: Run** `npm test` → FAIL.
- [ ] **Step 3: Implement**; section title "סמל על המפה", placed after the name field.
- [ ] **Step 4: Run** `npm test`, `npx eslint .` → PASS.

### Task 6: React — markers on the map

**Files:**
- Modify: `react/src/components/PinMap.jsx`, `react/src/components/PinMap.css`
- Test: `react/src/components/PinMap.test.jsx`; real browser via the scratchpad scripts (`inspect.cjs`, `interact.cjs`)

**Interfaces:**
- Consumes: `findMarker`, `MARKER_ICONS`, `MARKER_COLORS` (Task 5).
- Produces: `markerIcon(marker) → L.DivIcon` (cached by `icon-color`; `null`/unknown → today's `pinIcon`). Marker DOM: `<div class="map-marker" data-icon data-color style="--c:<hex>">` + svg; size 32, anchor `[16, 16]`; tooltip offset `[0, 16]`.

- [ ] **Step 1: Failing tests** (real Leaflet): a pin with `{icon:'cctv', color:'blue'}` renders `.map-marker[data-icon="cctv"][data-color="blue"]` containing an `svg.lucide-cctv`; a pin without a marker and one with `{icon:'tank', color:'blue'}` both render the plain `.map-pin` (Review Focus 1); labels still one per pin.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** (`renderToStaticMarkup` from `react-dom/server` for the svg). CSS mirrors the preview: ring `--paper` 2.5px, shadow, yellow icon `--ink`.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Real browser**: give one real pin a marker through the app's edit form (in the browser script), run `inspect.cjs` + `interact.cjs`: labels centered (|dx| ≤ 1, gap 0–3px) under both marker kinds, popup opens, far zoom hides names. Look at the screenshots. Restore that pin's marker afterwards only if the owner wants it removed (ask).

### Task 7: React — job titles in admin, user form and profile

**Files:**
- Modify: `react/src/pages/AdminPage.jsx` (new `TitlesTab`, `UserForm` gets "תפקיד" select of titles + "הרשאה" select of roles, list chip = title or "חסר תפקיד", shield icon stays for admins), `react/src/pages/ProfilePage.jsx` (row "תפקיד" = `user.job_title?.name`, hidden when missing), `react/src/lib/validation.js` (`validateUser` requires `job_title` when present in the form: "צריך לבחור תפקיד"; role message becomes "צריך לבחור הרשאה"), `react/src/api/client.js` (`FIELD_NAMES.job_title = 'התפקיד'`; `KNOWN` maps the 409 delete message to "אי אפשר למחוק תפקיד שמשויך למשתמשים" and the duplicate to "התפקיד כבר קיים")
- Test: `react/src/pages/account.test.jsx`, `react/src/test/utils.jsx` (`makeUser` gets `job_title: {_id: 'jt1', name: 'חוקר זיט'}`; `TITLES` fixture)

**Interfaces:**
- Consumes: `/jobTitle` routes (Task 2), `user.job_title` (Task 3).

- [ ] **Step 1: Failing tests**: profile shows "חוקר זיט" and no "מנהל"/"משתמש" text for a regular user and for an admin; profile with `job_title: null` hides the row (Review Focus 4); titles tab lists, adds (POST body `{name}`), renames (PATCH) and the users list shows the new name without reload (Review Focus 5); delete in use → the Hebrew 409 message and the row stays (Review Focus 3); create user requires a title and sends `job_title`; user form labels "תפקיד" and "הרשאה"; admin list shows "חסר תפקיד" for a user without one.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; titles tab copies the units tab structure (list, Sheet form, ConfirmDialog).
- [ ] **Step 4: Run** `npm test`, `npx eslint .` → PASS.

### Task 8: Contract, full verification, hand-off

**Files:**
- Modify: `react/src/test/contract.test.js` (register body gets `job_title: process.env.JOB_TITLE`; marker round trip on the contract pin; `/auth/me` has `job_title.name`), `.claude/CLAUDE.md` (status, counts, the two features)

- [ ] **Step 1:** `npm run test:contract` → 12+ PASS.
- [ ] **Step 2:** Full: server `npm test`, react `npm test`, `npx eslint .`, `npm run build` — all green (except the known flake).
- [ ] **Step 3:** Real-browser pass of admin titles tab + profile at phone size (screenshot, look).
- [ ] **Step 4:** Update `.claude/CLAUDE.md`; give the owner the commit message.
