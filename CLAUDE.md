# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Full-stack announcement portal for Ghanshyamdas Saraf College. A **public student feed** (`/`) lets anyone browse/filter/search announcements by course, year, type, and date with no auth. **HODs** sign in via Clerk to publish/manage announcements for their departments. A **super-admin** dashboard (gated by a shared secret, not Clerk) approves HODs and assigns which courses each HOD may post to.

Monorepo with two independent node packages: `backend/` (Express + Mongoose REST API) and `frontend/` (React + Vite).

## Commands

Backend (`cd backend`) — CommonJS, exports `app` from `server.js`:
- `npm run dev` — start server on `:5000` with `node --watch` (auto-restart).
- `npm start` — start for production.
- `npm test` — run Vitest + Supertest suite (requires a MongoDB instance; uses `TEST_MONGODB_URI` or falls back to `MONGODB_URI` / `localhost:27017/gsc_announcements_test`). The suite hits the real DB, not mocks.
- `npm run seed` — populate the 9 standard course tags. Note: courses also auto-seed on DB connect via `utils/ensureCourses.js`, so manual seeding is usually unnecessary.
- `npm run approve-hod <clerk_user_id>` / `approve-hod all` — toggle `publicMetadata.isApproved` via Clerk API.
- `npm run delete-hod <clerk_user_id>` — remove an HOD account.
- VAPID keys for push: generate once with `npx web-push generate-vapid-keys`.

Frontend (`cd frontend`) — ESM, Vite:
- `npm run dev` — serves on `:3000`, proxies `/api` to `localhost:5000`.
- `npm run build` / `npm run preview`.

## Architecture

### Backend (`backend/`)

All routes are mounted under `/api` in `server.js`:
- `routes/courseRoutes.js` → `GET /api/courses`
- `routes/announcementRoutes.js` → public + protected CRUD at `/api/announcements`
- `routes/adminRoutes.js` → `/api/admin/...` (super-admin, secret-gated)
- `routes/uploadRoutes.js` → `POST /api/upload` (multi-step: multer memory storage → UploadThing)
- `routes/notificationRoutes.js` → `/api/notifications/{vapid-public-key,subscribe,unsubscribe}`

**Auth model — three distinct tiers, enforced server-side:**
- **Public** feed routes: no auth; filter by `status: 'PUBLISHED'` and non-expired only.
- **HOD**: `middleware/auth.js` `requireApprovedHod` requires a valid Clerk session AND `publicMetadata.isApproved === true`. A not-yet-approved account gets `403`. Write routes additionally enforce **ownership** (`postedBy === req.auth.userId` → else `403`) and, via `validateHodCoursePermissions`, restrict which `courseCodes` the HOD may post to (from Clerk `publicMetadata.allowedCourses`, `['*']` = unrestricted). These checks are re-run on every create/update, not just in the UI.
- **Super-admin**: `adminRoutes.js` verifies the `x-admin-secret` header against `ADMIN_SECRET` env with `crypto.timingSafeEqual`. It manages Clerk users via `clerkClient` (approve, assign courses) and reads an audit list of all announcements. Rate-limiter bypasses super-admin when the secret is valid.

**Data model** (`models/`): `Announcement`, `Course`, `Subscription`. Key `Announcement` fields: `status` (`DRAFT`/`PUBLISHED`), `type` (`NOTICE`/`EVENT`/`TIMETABLE`), `targetYears` (`FY`/`SY`/`TY`), `courseCodes` (validated against the `Course` collection both in the route and via a Mongoose validator), `isPinned`, `expiresAt`, and `timetableEntries` (subject/date/time/room, required non-empty when `type === 'TIMETABLE'`, disallowed otherwise). All announcement content is sanitized with `sanitize-html` (restricted tags + allowlisted CSS) before save.

**Push notifications:** VAPID keys auto-load from `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` env, else from `vapid-keys.json`, else generate and persist (see Gotchas — this is why prod must set them explicitly). On a `PUBLISHED` create/update, `utils/notificationDispatcher.js` `triggerPushNotifications()` streams matching `Subscription`s (by course/year) with a Mongoose cursor (batch 200, concurrency 50), sends via `web-push`, and deletes subscriptions that return `410`/`404` (expired).

**Middleware/plumbing:** `middleware/rateLimiter.js` (global `apiRateLimiter`, tighter `authRateLimiter`); `config/db.js` forcibly sets Google DNS resolvers for Atlas SRV lookup on Windows and auto-seeds courses on connect; `server.js` applies Helmet (CSP disabled), CORS from `ALLOWED_ORIGINS`, 5mb JSON body limit, `clerkMiddleware()`, and a global Express error handler.

### Frontend (`frontend/src/`)

App shell in `App.jsx` renders `Navbar`/`Footer` + routes. Navigation/routes:
- `/` → `PublicFeed` (course/year/type/date filters, bookmarks in localStorage, ReactBits decorative components, and an inline Web Push subscription widget).
- `/admin/login` & `/admin/sign-up` → Clerk-hosted routes (`AdminLogin`/`AdminSignUp`).
- `/admin` → `ProtectedRoute` → `AdminDashboard`. `ProtectedRoute` reads `user.publicMetadata.isApproved`; if false it shows the "pending approval" screen with a copyable user ID and a status re-check button.
- `/superadmin`, `/super`, `/admin/super`, `/admin/superadmin` all → `SuperAdminDashboard` — a self-contained secret-gated admin UI (separate from Clerk) for approving HODs, assigning courses, and auditing announcements.

`services/api.js` is the single REST client (axios). Auth calls pass a Clerk session token explicitly via `getToken` from `useAuth()`; super-admin calls pass `x-admin-secret`. `services/upload.js` posts `multipart/form-data` to `/api/upload`. `services/cloudinary.js` is a **legacy shim** — it merely re-exports from `upload.js`; file uploads go to UploadThing, not Cloudinary. `public/sw.js` is the push service worker; `index.css`/`tailwind.config.js` define the custom `college-*` palette and dark mode.

## Gotchas / non-obvious behavior

- **VAPID keys regenerate silently.** If neither `.env` nor `vapid-keys.json` has keys, `server.js` generates a fresh pair on boot and writes it to `vapid-keys.json`. In production set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, or existing push subscriptions break on every redeploy. Do not commit `vapid-keys.json` if it contains generated private keys.
- **DEPLOYMENT.md is stale about uploads** (it references Cloudinary). The actual pipeline is backend `multer` → `UploadThing` (`UPLOADTHING_TOKEN`). Without the token the upload route returns a fake `mock_...` URL rather than failing.
- **`ADMIN_SECRET` default.** In non-production, an unset `ADMIN_SECRET` falls back to `super_secret_admin_approval_key_123` in both the admin route and rate-limiter — safe locally, but must be a strong value in prod.
- **Tests bypass real Clerk.** When `NODE_ENV=test`, `requireApprovedHod` reads `x-test-user-id` and `x-test-is-approved` headers instead of the Clerk session, and permission checks short-circuit. Tests still need a reachable MongoDB and wipe/seed `Course`/`Announcement` collections.
- **`validated courseCodes on write is duplicated** in routes and in the `Announcement` schema validator (`mongoose.model('Course')` lookup) — keep both consistent.

## Repository rules (from `AGENTS.md`)

- Never commit `.env` or expose Clerk/UploadThing secrets to the client.
- Validate all Express route input before touching the database.
- `courseCodes` on an `Announcement` must always be validated against the `Course` collection.
- Ownership checks (`postedBy === current user`) happen server-side on every write, not just in the UI.
- Use Tailwind for all styling; no inline `style` objects in React components.