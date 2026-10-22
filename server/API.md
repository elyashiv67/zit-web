# Zit Server API

Express 5 + MongoDB (Mongoose) + Zod. All bodies are JSON unless noted (image upload is `multipart/form-data`).

## Running

```bash
cd server
npm install
npm run dev          # nodemon, restarts on changes
npm start            # plain node (production)
npm test             # every route, end to end — on a separate test database
```

Copy `.env.example` to `.env`. Required: `PORT`, `DB`, `SESSION_SECRET`, `DVR_SECRET` (32+ random characters).
The server checks `.env` at startup and stops with a clear message if something is missing.

`npm test` starts its own server on port 4599 against the database `zit_test` (on the same MongoDB as `DB`),
seeds it, runs ~220 checks and drops it again. Real data is never touched.

**Behind nginx / Docker:** set `TRUST_PROXY=1` (real client IP for rate limits, and secure cookies over HTTPS).

### Calling it from the React app

In dev, Vite proxies `/api/*` to `http://localhost:4586` and strips the `/api` prefix, so call
`fetch('/api/pin/allUnit')` → server gets `GET /pin/allUnit`. Same origin, so cookies just work.
Always send `credentials: 'include'` if you ever call the server on a different origin.

---

## Conventions

### Auth
- Login sets one cookie, `zit.sid` (HttpOnly, SameSite=Lax, Secure in production). The session itself is stored in MongoDB.
- It lasts 30 days **since the last visit** — users who use the app stay logged in; survives server restarts.
- Logout deletes the session on the server, so even a copied cookie stops working. Other devices stay logged in.
- Visitors who aren't logged in get no cookie at all.
- Every protected route reloads the user from the DB, so:
  - a deleted user is locked out on the next request,
  - role / unit changes apply immediately (no re-login),
  - after a password change, every other device is signed out.

### Responses

| Kind | Shape |
|---|---|
| List | plain array `[ {...}, {...} ]` |
| Single item | plain object `{ _id, ... }` |
| Create / update | `{ message, <entity> }` — e.g. `{ message, pin }` |
| Delete | `{ message, id }` |
| Error | `{ message }` (+ `field` on duplicate / missing-reference errors) |
| Validation error | `{ message, errors: [ { path, message } ] }` |

Unknown body keys are silently stripped. Strings are trimmed, `email` is lowercased.

### Status codes

| Code | Meaning | Frontend should |
|---|---|---|
| 200 / 201 | OK / created | |
| 400 | bad input, invalid id, wrong `current_password` | show `message` / `errors` next to fields |
| 401 | not logged in (or session ended) | **redirect to the login page** |
| 403 | logged in but not allowed | show "not authorized" |
| 404 | not found (also unknown routes) | |
| 409 | conflict: duplicate value, or delete blocked (in use / last admin) | show `message` |
| 429 | too many failed attempts | show `message`, wait 15 min (`Retry-After` header) |
| 413 | request body too large | |
| 500 | server error (details only in the server log) | show a generic error |
| 503 | database unavailable | show "try again in a moment" — **not** a login redirect |

> 401 is only ever "you need to log in". A database outage is 503, never 401, so nobody is logged out by it. A wrong current password on password change is a **400**, so it never kicks the user out.

### Access levels used below
- **public** – no login
- **login** – any logged-in user
- **admin** – role `admin`
- **self/admin** – the user themselves, or an admin
- **unit/admin** – the item belongs to the user's unit, or the user is an admin

---

## Auth — `/auth`

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | public | `{ username, password }` | `{ message, user }` |
| POST | `/auth/logout` | public | – | `{ message }` |
| GET | `/auth/me` | login | – | `{ user }` |
| POST | `/auth/register` | admin | see [register body](#register-body) | 201 `{ message, user }` |
| POST | `/auth/reg` | admin | same as `/auth/register` | same |

- **Usernames are case-insensitive** (`Admin` = `admin`; stored lowercase).
- **Login errors:** 401 `invalid username or password` — same message *and* same response time whether the user exists or not.
  403 if the account has no role / unit.
- **Login rate limit:** 5 failed attempts per username+IP, and 30 failed attempts per IP, per 15 min → 429. Successful logins don't count.
- **`/auth/me`** — call on app load to restore the logged-in user. 401 → show login.

The `user` object from login / `me`:

```json
{
  "id": "…", "name": "…", "user_name": "…", "TZ": "…", "police_id": "…",
  "phone": "…", "email": "…",
  "role": { "_id": "…", "name": "admin", "level": 1 },
  "unit": { "_id": "…", "district": "…", "merhav": "…", "station": "…" },
  "is_admin": true
}
```

### Register body

| Field | Rules |
|---|---|
| `name` | string, 1–100 |
| `user_name` | string, 1–100, unique, case-insensitive (stored lowercase) |
| `pass` | string, 6–100 |
| `TZ` | string, unique |
| `police_id` | string, unique |
| `phone` | 1–10 digits, unique |
| `email` | valid email, unique |
| `role` | role `_id` (must exist) |
| `unit` | unit `_id` (must exist) |

Errors: 409 `{ message: "<field> already exists", field, fields }`, 400 `{ message: "role not found", field: "role" }`.

---

## Users — `/user`

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| GET | `/user` | admin | – | array of users (`role` / `unit` as ids) |
| GET | `/user/:id` | self/admin | – | user (with `role` / `unit` populated) |
| PATCH | `/user/:id` | self/admin | see below | `{ message, user }` |
| PATCH | `/user/:id/password` | self/admin | `{ current_password?, new_password }` | `{ message, id }` |
| DELETE | `/user/:id` | self/admin | – | `{ message, id }` |

The password hash is never returned.

**PATCH `/user/:id`** — at least one field:
- regular user (on themselves): `name`, `phone`, `email`. Anything else is ignored.
- admin: also `user_name`, `TZ`, `police_id`, `role`, `unit`. (Not `pass` — use the password route.)
- errors: 409 duplicate value, 400 role/unit not found, 409 `Cannot change the role of the last admin`
  (safe even if two admins demote each other at the same moment — one always stays admin).

**PATCH `/user/:id/password`**
- changing your own: `current_password` is required. This device stays logged in; all other devices are logged out.
- admin resetting someone else's: only `new_password`. That user is logged out everywhere.
- `new_password`: 6–100 chars, must differ from the current one.
- errors: 400 missing / wrong `current_password` (`field: "current_password"`), 400 same password (`field: "new_password"`),
  429 after 5 wrong `current_password` attempts in 15 min.

**DELETE `/user/:id`** — 409 `Cannot delete the last admin`. A deleted user's pins stay with the unit.
If users delete themselves, their session ends in the same response (cookie cleared) — redirect to login.

---

## Roles — `/role`

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| GET | `/role` | login | – | array |
| GET | `/role/:id` | login | – | role |
| POST | `/role` | admin | `{ level: positive integer, name: "admin" \| "user" }` | 201 `{ message, role }` |
| PATCH | `/role/:id` | admin | any of `level`, `name` | `{ message, role }` |
| DELETE | `/role/:id` | admin | – | `{ message, id }` |

`level` and `name` are unique (409). Delete → 409 if any user has the role.

---

## Units — `/unit`

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| GET | `/unit` | login | – | array |
| GET | `/unit/:id` | login | – | unit |
| POST | `/unit` | admin | `{ district, merhav, station }` | 201 `{ message, unit }` |
| PATCH | `/unit/:id` | admin | any of `district`, `merhav`, `station` | `{ message, unit }` |
| DELETE | `/unit/:id` | admin | – | `{ message, id }` |

A district / merhav can have many stations; only the full `district + merhav + station` combination is unique (409).
Delete → 409 if the unit still has users or pins.

---

## Pins — `/pin`

Pins belong to a **unit**, not a user. Everyone in the unit can see and edit them; deleting the user who made a pin doesn't affect it.

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| GET | `/pin` | admin | – | array of all pins |
| GET | `/pin/allUnit` | login | – | array of my unit's pins |
| GET | `/pin/:id` | unit/admin | – | pin (includes `dvr.password`) |
| POST | `/pin` | login | see below | 201 `{ message, pin }` |
| PATCH | `/pin/:id` | unit/admin | any of the fields below | `{ message, pin }` |
| DELETE | `/pin/:id` | unit/admin | – | `{ message, id }` (also deletes its images) |

Body:

```json
{
  "name": "string 1-100",
  "location": { "lat": -90..90, "lng": -180..180 },
  "dvr": { "user_name": "optional", "password": "optional" }
}
```

- `dvr` is optional. On PATCH, a dvr key that isn't sent is kept, and `null` removes it:
  `dvr: { password: "new" }` changes only the password, `dvr: { password: null }` removes it.
- `dvr.password` is stored **encrypted** (AES-256-GCM, key `DVR_SECRET`) and decrypted only in `GET /pin/:id`.
- Set by the server, never from the body: `creator` (user id), `creator_name` (kept even if the user is deleted), `assigned_unit`, `image`.
- `dvr.password` is only returned by `GET /pin/:id`, not in the lists.

Pin object:

```json
{
  "_id": "…", "name": "…",
  "location": { "lat": 32.6, "lng": 35.3 },
  "dvr": { "user_name": "…" },
  "image": ["<uuid>.jpg"],
  "creator": "<user id>", "creator_name": "…",
  "assigned_unit": "<unit id>",
  "createdAt": "…", "updatedAt": "…"
}
```

### Pin images

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| POST | `/pin/:id/images` | unit/admin | `multipart/form-data`, files in field `images` | 201 `{ message, pin }` |
| GET | `/pin/:id/images/:filename` | unit/admin | – | the image file |
| DELETE | `/pin/:id/images/:filename` | unit/admin | – | `{ message, pin }` |

- Up to 10 images per upload and 10 per pin (also enforced when two uploads happen at the same time). Each file up to 25MB, up to 100 megapixels.
- Formats in: jpeg, png, webp (HEIC only if the server can decode it — otherwise 400 asking for "Most Compatible").
- Every image is rotated by EXIF, shrunk to max 2560px, converted to jpg and compressed to **≤ 5MB**. EXIF (GPS, device) is removed.
- If any file in the upload is bad, nothing is saved (400).
- Uploads stream to a temp folder (not RAM) and at most 2 images are compressed at once, so many / slow phone uploads can't run the server out of memory.
- Files are stored at `<UPLOADS_DIR>/pins/<pin _id>/<uuid>.jpg` (default `server/uploads`); `pin.image` holds the file names.

Uploading from React:

```js
const form = new FormData();
for (const file of input.files) form.append('images', file);
await fetch(`/api/pin/${pinId}/images`, { method: 'POST', body: form }); // don't set Content-Type
```

Showing an image (cookies are sent automatically on same origin):

```jsx
<img src={`/api/pin/${pin._id}/images/${name}`} />
```

---

## Time diff — `/timeDiff`

The calculator page is public and runs in the browser. These routes only save and read history, so they need login.
Not related to pins.

| Method | Path | Access | Body | Response |
|---|---|---|---|---|
| GET | `/timeDiff` | admin | – | array, newest first |
| GET | `/timeDiff/my` | login | – | my history, newest first |
| GET | `/timeDiff/allUnit` | login | – | my unit's history, newest first |
| GET | `/timeDiff/:id` | owner/unit/admin | – | time diff |
| POST | `/timeDiff` | login | `{ real_time, dvr_time, dvr_lastSave? }` | 201 `{ message, timeDiff }` |
| DELETE | `/timeDiff/:id` | owner/admin | – | `{ message, id }` |

- Times must be ISO 8601 with `Z` or an offset — just send `date.toISOString()`. A plain date (`2026-10-21`) is also fine.
  `null`, numbers, `true`, and times without a timezone (`2026-10-21T10:00:00`) are rejected with 400.
- The owner can always read their own records, even after moving to another unit.
- The server computes `offset_ms = dvr_time - real_time` (negative = DVR is behind).
- `owner` and `assigned_unit` come from the logged-in user.

Time diff object:

```json
{
  "_id": "…", "owner": "<user id>", "assigned_unit": "<unit id>",
  "real_time": "2026-10-22T10:00:00.000Z", "dvr_time": "2026-10-22T09:58:30.000Z",
  "offset_ms": -90000, "dvr_lastSave": "…",
  "createdAt": "…", "updatedAt": "…"
}
```

---

## Other

- Unknown route → 404 `{ message: "route not found: GET /…" }`.
- Malformed JSON body → 400 `{ message: "invalid JSON body" }`.
- Invalid `:id` → 400 `{ message: "id is not valid" }`.
- `GET /health` (public) → 200 `{ status: "ok" }`, or 503 when the database is down. For Docker / uptime checks.
- Security headers are set with helmet.
- Behind nginx / a Docker proxy, set `TRUST_PROXY=1` in `.env`, otherwise the rate limit treats every user as the same IP.
