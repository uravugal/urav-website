# URAV — change summary

Everything below is implemented, typechecks clean (`npx tsc --noEmit`) and
builds (`next build`).

---

## 1 & 2 · Superadmin role, and superadmin-only admin creation

**Roles are now:** `student | recruiter | admin | superadmin`

- `models/User.ts` — enum extended; added compound indexes
  (`role + createdAt`, `role + approvalStatus + createdAt`) so the paginated
  admin lists stay fast.
- `lib/api.ts` — two guards:

  - `requireAdmin()` → admin **or** superadmin
  - `requireSuperAdmin()` → superadmin only

  Both re-read the role **from MongoDB**, not from the JWT. The role you
  already changed in the database therefore takes effect immediately — no
  logout/login needed. `/api/auth/me` does the same top-up.

- `isAdminRole()` replaces every `role === "admin"` comparison across the
  API and the layouts, so superadmins aren't locked out of normal admin work.

**New endpoints (superadmin only):**

| Method | Route                    | Purpose                                           |
| ------ | ------------------------ | ------------------------------------------------- |
| GET    | `/api/admin/admins`      | List admins + superadmins (paginated, searchable) |
| POST   | `/api/admin/admins`      | Create an admin                                   |
| PUT    | `/api/admin/admins/[id]` | Edit name/phone, or reset password                |
| DELETE | `/api/admin/admins/[id]` | Remove an admin                                   |

**New screen:** `/admin/admins` — create modal, password reset, remove.
The sidebar link is hidden for ordinary admins (`superOnly` flag in
`app/admin/layout.tsx`), and a "Superadmin" badge shows under the logo.

> New accounts are **hardcoded to the `admin` tier**. The superadmin tier is
> only settable directly in the database, so a second superadmin can never be
> minted through the UI. `DELETE` also refuses to touch a superadmin row or
> your own account.

---

## 3 · Student details editable in the admin dashboard

- `GET /api/admin/students/[id]` — any admin
- `PUT /api/admin/students/[id]` — **superadmin only**
- `DELETE /api/admin/students/[id]` — **superadmin only**; also removes their
  applications and deletes their CV from S3

Email _is_ editable here (unlike the student's own `/api/profile`, where it's
locked) so you can fix a mistyped login — with a validity + uniqueness check.
Password and role stay non-editable.

**UI:** `components/StudentEditModal.tsx`, wired to Edit / Delete buttons on
`/admin/students` that only render for superadmins.

---

## 4 & 5 · CV update — student side and admin side — with old-file cleanup

- `lib/s3.ts` — added `deleteFromS3()`, `deleteResume()` and `keyFromUrl()`.
  That last one recovers an object key by parsing the stored URL, so records
  created before `resumeKey` existed can still be cleaned up.
- `lib/resume.ts` — shared replace logic used by both endpoints.

**Ordering is deliberate:** upload the new file → save the new pointer →
_then_ delete the old object. If the upload or the DB write fails, the student
still has their existing CV. Worst case is one orphaned file; never a student
left with no resume. Cleanup failures are logged, not thrown — a dead S3
delete must not fail the user's upload.

| Method        | Route                             | Who                              |
| ------------- | --------------------------------- | -------------------------------- |
| POST / DELETE | `/api/profile/resume`             | The signed-in user, their own CV |
| POST / DELETE | `/api/admin/students/[id]/resume` | Any admin, on a student's behalf |

**UI:** `components/ResumeUpload.tsx` — full layout in the student profile
card, compact inline version in each admin student row. PDF only, 5MB cap,
validated client- and server-side.

---

## 6 · Recruiters edit their own profile

- `/api/profile` PUT now picks its whitelist by role:

  - **student** → the existing education fields
  - **recruiter** → name, phone, designation, company name / website /
    location / industry / size / about, LinkedIn
  - **admin** → name, phone

  `approvalStatus` is deliberately absent from the recruiter list — a
  recruiter can never approve themselves; only an admin can flip it.

- **New:** `components/RecruiterProfileCard.tsx` and `/recruiter/profile`,
  plus the "My Profile" sidebar entry. Their approval state is displayed as a
  read-only badge.

---

## 7 · Pagination (server-side)

`lib/api.ts` gained `pageParams()`, `paginated()` and `searchFilter()`.

**Backwards compatible by design:** a route returns the envelope
`{ items, total, page, limit, pages }` **only when `?page=` is present**.
Without it the response shape is unchanged — so every public-website
component keeps working untouched.

Paginated + server-side searched: **students, recruiters, applications, jobs,
admins.** Search and tab filtering moved out of the browser and into MongoDB,
so the dashboard downloads one page at a time instead of the whole table.

- `lib/usePaginatedList.ts` — debounced search (350ms), stale-response
  guarding (a slow earlier request can't overwrite a newer one), and an
  automatic reset to page 1 whenever a filter or the search term changes.
  Page changes dim the existing rows rather than re-flashing the skeleton.
- `components/ui/Pagination.tsx` — page numbers with ellipsis collapsing,
  a per-page selector (10/25/50/100), and a "Showing 1–10 of 84" line.
- Tab counts come back from the API alongside the page, so they stay accurate
  across pages rather than counting only what's loaded.
- Applications search spans applicant _and_ job/webinar — those live in other
  collections, so the route resolves matching ids first, then constrains the
  query (combined with `$and` so a recruiter's own-jobs scoping is preserved).

---

## 8 · Shimmer loading states

`components/ui/Skeleton.tsx` — a real gradient sweep (`animate-shimmer`,
keyframes in `tailwind.config.ts`), not `animate-pulse`, which reads as a
flashing box. Composed variants: `SkeletonStats`, `SkeletonRecordList`,
`SkeletonList`, `SkeletonTable`, `SkeletonProfile`, `SkeletonText`,
`SkeletonPage`. Shapes mirror the real content, so the layout doesn't jump
when data lands. `prefers-reduced-motion` degrades it to a static tint.

**Every `animate-pulse` in the codebase is gone.** Applied to: both dashboard
layouts, admin overview / students / recruiters / recruiter detail /
applications / jobs / webinars, student dashboard, recruiter overview / jobs /
applicants, public jobs list + detail, webinars, and the navbar.

---

## Before you deploy

1. **IAM:** the bucket policy needs `s3:DeleteObject` alongside `s3:PutObject`,
   or the CV cleanup will silently no-op (it logs and continues by design).
2. **Existing CVs** uploaded before this change have no `resumeKey`. They're
   handled by `keyFromUrl()`, which assumes the standard
   `https://<bucket>.s3.<region>.amazonaws.com/<key>` or path-style form. If
   you serve resumes through a CDN, set `URAV_AWS_S3_PUBLIC_BASE_URL` and confirm
   the parse works before relying on the cleanup.
3. **Your superadmin session:** since `/api/auth/me` now reads the role from
   the database, the Admins link should appear on your next page load without
   a re-login.

## Not done

Recruiter applicants and recruiter jobs are still filtered client-side —
per-recruiter datasets are small, and the API already supports `?page=` if you
want them switched over. Say the word.

---

## Student consultation form

A student (or a logged-out visitor) can send a consultation request from
`/consultation`; admins **and** superadmins read and reply to them at
`/admin/consultations`.

**New model:** `models/Consultation.ts`

| Field                                     | Notes                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `user`                                    | Set only when a signed-in **student** submits — this is what links a request to a student record and lets them see the reply |
| `name` / `email` / `phone`                | Stored on the document so a logged-out visitor is still contactable                                                          |
| `studentType`, `institution`              | School / College / Other + where they study                                                                                  |
| `topic`, `preferredMode`, `preferredTime` | Career Guidance, Course Selection, … / Email, Phone Call, Video Call / free text                                             |
| `message`                                 | Required, 10–4000 characters                                                                                                 |
| `status`                                  | `New → In Progress → Responded → Closed`                                                                                     |
| `response`                                | The team's reply — **visible to the student**                                                                                |
| `internalNote`                            | Admin-only, never returned by the student endpoint                                                                           |
| `handledBy`, `respondedAt`                | Who last touched it, and when a reply was written                                                                            |

Indexed on `status + createdAt` and `createdAt` so the admin list paginates
without a collection scan.

**New endpoints:**

| Method | Route                           | Access              | Purpose                                                     |
| ------ | ------------------------------- | ------------------- | ----------------------------------------------------------- |
| POST   | `/api/consultations`            | public              | Submit a request                                            |
| GET    | `/api/consultations`            | logged in           | The student's own requests (internal note stripped)         |
| GET    | `/api/admin/consultations`      | admin + superadmin  | Paginated, searchable, `?status=` filtered, with tab counts |
| GET    | `/api/admin/consultations/[id]` | admin + superadmin  | One request in full                                         |
| PATCH  | `/api/admin/consultations/[id]` | admin + superadmin  | Status, reply, internal note                                |
| DELETE | `/api/admin/consultations/[id]` | **superadmin only** | Remove a request                                            |

POST is deliberately open so someone can ask a question before registering.
It still validates name / email / message length, and refuses a second
request from the same address inside 60 seconds so a double-click doesn't
duplicate the row. An admin or recruiter submitting the form is **not**
linked via `user` — only students are.

**New screens:**

- `/consultation` — public page: the form (pre-filled from the profile when
  signed in) plus **My requests**, which shows each request's status and the
  team's reply. The requests block only renders for a signed-in student.
- `/admin/consultations` — tabs (All / New / In Progress / Responded /
  Closed) with live counts, debounced server-side search across name, email,
  phone, institution, message and topic, and the shared `Pagination` control.
  Each card has an inline status dropdown, a reply box, an internal note box,
  a `mailto:` shortcut and — for a registered sender — a link straight to
  their CV. Saving a non-empty reply flips the status to **Responded**
  automatically unless the request is already Closed. Delete shows only for
  a superadmin.

**Wiring:**

- `app/admin/layout.tsx` — "Consultations" sidebar entry (both admin tiers).
- `lib/data.ts` — "Consultation" added to the public navbar.
- `app/api/admin/stats/route.ts` — returns `consultations` and
  `newConsultations`.
- `app/admin/page.tsx` — a Consultations stat tile, a banner when unanswered
  requests are waiting, and a summary card.
- `app/dashboard/page.tsx` — a CTA pointing students at `/consultation`.
- `components/StatusBadge.tsx` — colours for the four consultation statuses.
- `lib/types.ts` — `ConsultationRecord`, `ConsultationStatus`.

---

## 8 · Homepage hero is now a managed slider

`components/Hero.tsx` was a single hardcoded panel. It is now a slider whose
slides live in MongoDB and whose images live in S3, managed from a
**superadmin-only** dashboard screen.

**Each slide holds:** a title (line breaks preserved), a description, up to
two buttons (label + link), a **website image**, a **mobile image**, a text
colour, a display position and a show/hide flag.

### New model — `models/HeroSlide.ts`

| Field                                    | Notes                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `title`                                  | Required. `\n` renders as a line break in the slider.                  |
| `description`                            | Optional paragraph under the title.                                    |
| `ctaLabel` / `ctaHref`                   | Filled navy button. Renders only when both are set.                    |
| `secondaryCtaLabel` / `secondaryCtaHref` | Outline button, same rule.                                             |
| `desktopImageUrl` / `desktopImageKey`    | Required. Used from `md` (768px) up.                                   |
| `mobileImageUrl` / `mobileImageKey`      | Optional. Used below 768px; falls back to the desktop image.           |
| `textTone`                               | `light` (white copy + dark scrim) or `dark` (navy copy + light scrim). |
| `order`                                  | Ascending display position; ties break on `createdAt`.                 |
| `active`                                 | Hidden slides stay in the dashboard but leave the site.                |

Indexed on `{ active, order, createdAt }` — the homepage query hits it directly.

The **key** is stored alongside every URL so replacing an image can delete the
old object from the bucket instead of leaking it.

### New endpoints

| Method | Route                      | Who                                                             |
| ------ | -------------------------- | --------------------------------------------------------------- |
| GET    | `/api/hero-slides`         | Public — active slides in order                                 |
| GET    | `/api/hero-slides?all=1`   | Public — includes hidden ones (dashboard)                       |
| POST   | `/api/hero-slides`         | **Superadmin** — multipart create                               |
| PUT    | `/api/hero-slides/[id]`    | **Superadmin** — multipart (image change) or JSON (fields only) |
| DELETE | `/api/hero-slides/[id]`    | **Superadmin** — also deletes both images from S3               |
| PUT    | `/api/hero-slides/reorder` | **Superadmin** — `{ ids: [...] }`, position becomes `order`     |
| POST   | `/api/hero-slides/seed`    | **Superadmin** — copies the built-in defaults into the DB       |

Ordering is sent as the whole list rather than as a two-row swap, so a
half-applied reorder can't leave two slides fighting over one position.

On an image replace the upload happens **first**, the new URL is saved, and
only then is the old object deleted — a failure mid-way leaves the slide with
its previous picture rather than none.

### S3 — `lib/s3.ts`, `lib/heroImages.ts`

- `uploadToS3` / `deleteFromS3` / `keyFromUrl` / `isS3Configured` now take an
  optional bucket, so hero images can go to their **own** bucket while resumes
  stay where they are. Existing callers are untouched.
- `URAV_AWS_S3_HERO_BUCKET` — optional. Falls back to `URAV_AWS_S3_BUCKET`; either way
  the images are keyed under the `hero/` prefix.
- `URAV_AWS_S3_HERO_PUBLIC_BASE_URL` — optional CloudFront/custom domain.
- `validateImage()` — JPG / PNG / WebP / AVIF / GIF, 8MB cap.
- Hero uploads get `Cache-Control: public, max-age=31536000, immutable`. Safe
  because every key carries a UUID, so a replacement is always a new URL.

The hero bucket must be **publicly readable** (marketing images are loaded by
every visitor's browser). Minimal policy for just the `hero/` prefix:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadHeroImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_HERO_BUCKET/hero/*"
    }
  ]
}
```

The IAM user needs `s3:PutObject` and `s3:DeleteObject` on the same prefix.

### Default slides

`lib/heroDefaults.ts` holds three slides that render when the collection is
empty, so the homepage is never blank on a fresh install:

1. **Empowering Careers. Building Futures.** — the existing
   `/hero-students.webp` photo and the original copy.
2. **Webinars** — `/public/hero/default-webinars-*.svg` (new, brand navy).
3. **Jobs** — `/public/hero/default-jobs-*.svg` (new, brand navy).

Each has a desktop and a mobile variant. They are plain files, not database
rows — the dashboard shows a **"Copy the built-in slides"** button that inserts
them as editable rows when you want to keep the layout but change the wording.

### The slider — `components/Hero.tsx`

- Full-bleed banner: `540px` on phones, `500px` on tablets, `580px` on large
  screens, with the copy over a gradient scrim.
- `<picture>` with a `(max-width: 767px)` source, so a phone downloads **only**
  the mobile image and a desktop **only** the wide one.
- Autoplays every 6s; pauses on hover, on focus within, and when the tab is in
  the background.
- Arrows (desktop), dots, left/right keys, and touch swipe.
- Honours `prefers-reduced-motion` — no autoplay, no slide transition.
- Only the first slide uses `<h1>`; the rest use `<h2>` styled the same, so the
  page keeps exactly one h1.
- Inactive slides are `aria-hidden`. A visually-hidden live region announces
  the current slide.
- Shimmer skeleton while the slides load, matching the rest of the site.
- The two headline numbers from the old hero (**120+ webinars**, **2.5K+
  placed**) are kept as a small card row tucked under the slider. They're still
  hardcoded — delete the `<Stat>` block in `Hero.tsx` if you don't want them.

### New screen — `/admin/hero` ("Home slider")

Superadmin-only, hidden from ordinary admins via the `superOnly` flag in
`app/admin/layout.tsx` (the API enforces the same rule server-side). Ordinary
admins who navigate to the URL directly get an access notice.

Each row shows a desktop and a mobile thumbnail side by side, the title,
description, position and text colour, with controls to move up/down,
hide/show, edit and delete. The add/edit modal has both image pickers with live
previews, a "Remove" action on the mobile image to fall back to the desktop
one, and size hints (≈1600×620 wide, ≈800×1000 tall).

---

## Hero slider — buttons removed

The call-to-action buttons are gone from the slider. A slide is now just an
image plus a title and description.

Removed everywhere:

- `components/Hero.tsx` — the button row under the copy, the `next/link`
  import, the shared `btnBase` class and the two button placeholders in the
  loading skeleton.
- `app/admin/hero/page.tsx` — the four "Button text / Button link / Second
  button text / Second button link" inputs in the add/edit modal, the matching
  form state and `FormData` fields, and the button summary line on each row of
  the slide list.
- `models/HeroSlide.ts`, `lib/types.ts` — the `ctaLabel`, `ctaHref`,
  `secondaryCtaLabel` and `secondaryCtaHref` fields.
- `lib/heroDefaults.ts`, `app/api/hero-slides/route.ts`,
  `app/api/hero-slides/[id]/route.ts`, `app/api/hero-slides/seed/route.ts` —
  the same fields in the built-in slides and in create/update/seed handling.

Slides already saved in MongoDB keep their old `ctaLabel`/`ctaHref` values as
leftover fields. Nothing reads them any more, so they're harmless; a one-off
`db.heroslides.updateMany({}, { $unset: { ctaLabel: "", ctaHref: "",
secondaryCtaLabel: "", secondaryCtaHref: "" } })` clears them if you want the
documents tidy.

---

## Webinar cover images, auth-page redirects and the favicon

### 1 · Cover image on a webinar (optional)

`models/Webinar.ts` gains `imageUrl` + `imageKey`, both defaulting to `""` —
the image is never required.

- `lib/webinarUploads.ts` (new, server-only) — uploads to the same public
  bucket as the hero slides (`URAV_AWS_S3_HERO_BUCKET`, falling back to
  `URAV_AWS_S3_BUCKET`) under a `webinars/` prefix, reusing `validateImage`
  (JPG/PNG/WebP/AVIF/GIF, 8 MB cap).
- `lib/webinarMedia.ts` (new, client-safe) — `WEBINAR_FALLBACK_IMAGE`,
  `webinarImage()` and `withWebinarImage()`.
- `lib/s3.ts` — the long CDN `CacheControl` now applies to every marketing
  folder, not just `hero/`. Resumes are still uncached.

`/admin/webinars` → **Add Webinar** now has a "Cover image (optional)" picker
with a live preview. When nothing is chosen the preview shows the placeholder
the public site will use, and the row in the list is tagged "Default image".
Editing keeps the current picture unless you press Replace or Remove; the old
S3 object is deleted only after the new URL is committed, and deleting a
webinar deletes its image too.

The admin form always posts `multipart/form-data`. `POST /api/webinars` still
accepts plain JSON as well, so any existing caller keeps working.

### 2 & 3 · Fallback image everywhere

`GET /api/webinars`, `GET /api/webinars/:id` and every write response now
include **`displayImageUrl`** — the uploaded image, or
`/placeholders/webinar.svg` when there isn't one. `imageUrl` is left exactly as
stored so the dashboard can still tell "no image uploaded" from "image
uploaded".

`components/WebinarThumb.tsx` (new) renders the card image and swaps in the
placeholder a second time on the client if the stored URL 404s (deleted from
the bucket, bad link), so a card is never an empty box. It's used by the
homepage strip, `/webinars` and — via `webinarImage()` — the admin list. The
built-in default webinars on the homepage (the ones shown before anything is
scheduled) now render the same placeholder instead of a bare gradient.

### 4 · /login and /register while already signed in

`middleware.ts` now also matches `/login`, `/register` and
`/register/recruiter`. A visitor with a valid session cookie is redirected to
their own landing page — `/admin` for admin and superadmin, `/recruiter` for
recruiters, `/dashboard` for students.

The middleware reads the role by base64-decoding the JWT payload _without_
verifying the signature — that can't be done on the Edge runtime and doesn't
need to be, since this only picks a redirect target and every protected page
and API route still verifies properly. An expired or malformed token is
treated as signed out, so a stale cookie can't lock anyone out of the login
page.

`components/RedirectIfAuthed.tsx` (new) is the client-side twin, used by all
three pages, and covers client-side navigation such as the back button after
logging in.

Also fixed while in there: logging in as a **superadmin** used to land on
`/dashboard` (which then bounced to `/admin`). Both admin tiers now go
straight to `/admin` — the login handler shares the same `landingFor()` helper.

### 5 · Favicon

`app/icon.png` (512×512), `app/apple-icon.png` (180×180, white plate since iOS
ignores transparency) and `app/favicon.ico` (16 → 256px) are generated from
`public/logo.png`. Next.js picks these up by file convention — no change to
`app/layout.tsx` needed — so the URAV mark shows in the browser tab, in
bookmarks and on an iOS home screen.

## Webinar images — real fallback photo + dedicated bucket (2026-08-10)

**1. Fallback is a real image, not an SVG.**
`public/placeholders/webinar.jpg` (1280×720, a flat illustration of a student
watching a live session in the brand navy) replaces the old
`webinar.svg`, and `WEBINAR_FALLBACK_IMAGE` in `lib/webinarMedia.ts` points
at it. `WebinarThumb` no longer draws the video-camera icon over the
fallback — that overlay only made sense on top of the flat SVG. The three
built-in homepage webinars in `lib/data.ts` use the same file. To change the
picture, drop a different 16:9 image in at that path; no code change needed.
The editable vector source sits next to it as `webinar.source.svg` — it is not
referenced by the app, so re-colour or re-export from it whenever you like.

**2. Webinar covers upload to their own bucket.**
`URAV_AWS_S3_HERO_BUCKET` is now used by the homepage hero slider _only_.
`lib/webinarUploads.ts` uploads, deletes and resolves keys against
`WEBINAR_BUCKET` (`URAV_AWS_S3_WEBINAR_BUCKET`, falling back to `URAV_AWS_S3_BUCKET`),
with an optional `URAV_AWS_S3_WEBINAR_PUBLIC_BASE_URL` for a CDN in front of it.
`publicBase()` in `lib/s3.ts` checks the webinar bucket before the hero one,
so an unset env var collapsing onto the main bucket can't pick the wrong CDN
base. Existing webinar images already in the hero bucket keep working —
their full URL is stored in Mongo — but new uploads land in the new bucket.

**3. The Add/Edit Webinar modal states the size.**
The cover-image field now reads "Recommended size 1280 × 720 px (16:9
landscape)" with "JPG, PNG or WebP · up to 8MB" underneath, so the admin
knows what to prepare before picking a file.

## Forgot password via email (nodemailer) (2026-08-11)

**1. Two new pages.** `/forgot-password` takes an email address and `/reset-password?token=…`
takes the new password. Both sit on the same white card as the login form and
both are in the middleware's `AUTH_PAGES` list, so someone already signed in is
bounced to their own dashboard instead.

**2. `lib/mail.ts` — the nodemailer transport.** One shared, lazily created
transporter reading `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS`
(port 465 uses implicit TLS, anything else STARTTLS), plus the branded HTML +
plain-text reset template in URAV navy. `isMailConfigured()` lets the API route
return a clear 503 when SMTP hasn't been filled in yet, rather than the request
hanging or failing obscurely.

**3. `models/PasswordResetToken.ts`.** A 32-byte random token goes out in the
email; only its SHA-256 hash is stored, so a database dump can't be used to
take over accounts. A TTL index on `expiresAt` has Mongo delete each row the
moment it expires — nothing to sweep. Links last 60 minutes, work once
(`usedAt`), and issuing a new one deletes every earlier link for that account.

**4. `POST /api/auth/forgot-password`.** Replies with the same message whether
or not the address is registered, so the endpoint can't be used to discover who
has an account. A 60-second cooldown per user stops repeated clicks from
flooding an inbox, and if the send throws, the token row is deleted again so no
live link is left behind for an email that never arrived.

**5. `/api/auth/reset-password`.** `GET ?token=` validates the link when the page
opens, so a dead link says so up front instead of after the password has been
typed twice. `POST { token, password }` enforces the same 8-character minimum as
registration, re-hashes with the existing `hashPassword`, marks the token spent,
clears the rest, and deletes the auth cookie so the next sign-in uses the new
password.

**6. Login page.** A "Forgot password?" link now sits on the right of the
Password label.

## Unused images removed + play badge back on webinar covers (2026-08-10)

**1. `public/` cleaned out.** Four files were no longer referenced anywhere in
the app and are deleted: `hero-students.jpg` (only the `.webp` is used, by
`app/about/page.tsx` and `lib/heroDefaults.ts`), `placeholders/webinar1.jpg`,
`placeholders/webinar.svg` and `placeholders/webinar.source.svg` (all
superseded by the photo now sitting at `placeholders/webinar.jpg`). Everything
still in `public/` is referenced: `hero-students.webp`, `logo.png`,
`logo-white.png`, the four `hero/default-*.svg` slides, `placeholders/portrait.svg`
and `placeholders/webinar.jpg`.

**2. `WebinarThumb` draws the video icon again.** A centred play badge —
`<Video className="h-10 w-10 text-white/80" />` inside a translucent circle —
sits over the cover on every webinar card, uploaded image or fallback alike.
The overlay is `pointer-events-none`, so clicks still reach the card link
underneath.

---

## Forgot password — email must exist in the users collection (2026-08-11)

Previously `/api/auth/forgot-password` replied with the same "if that email is
registered, a link is on its way" message for every address, so a typo looked
identical to a success. It now checks the users collection and says so when the
address isn't there.

**`lib/users.ts` (new) — one place for email lookups**

| Helper                        | Use                                                |
| ----------------------------- | -------------------------------------------------- |
| `normalizeEmail(v)`           | trim + lowercase, exactly how the schema stores it |
| `isValidEmail(v)`             | shared regex (was copy-pasted in four routes)      |
| `findByEmail(email, select?)` | returns the user document, or `null`               |
| `findIdByEmail(email)`        | `_id` only, `.lean()` — for clash checks           |
| `emailExists(email)`          | boolean wrapper                                    |

All of them call `connectDB()` themselves and normalise the address before
querying, so `"  Ravi@Gmail.com "` and `"ravi@gmail.com"` can no longer resolve
differently depending on which route you came in through.

**Now used by:** forgot-password, login, register, `POST /api/admin/admins`,
and the email-clash check in `PUT /api/admin/students/[id]` — every
hand-rolled `User.findOne({ email })` is gone.

**Index** — `models/User.ts`: the `email` path carries `unique: true` (which is
itself the unique index MongoDB uses) and now an explicit `index: true`
alongside it, so the intent is visible in the schema. Mongoose merges the two
into a single `{ email: 1 }` unique index — no duplicate-index warning. Every
`findByEmail()` is therefore an index seek, not a collection scan. Indexes are
built on connect (`autoIndex` is on), so nothing to run by hand.

**API responses**

| Case                        | Status | Body                                                |
| --------------------------- | ------ | --------------------------------------------------- |
| Address not in the DB       | `404`  | "No account is registered with that email address…" |
| Link already sent < 60s ago | `429`  | "A reset link was just sent to this address…"       |
| Sent                        | `200`  | "We've sent a password reset link to _address_…"    |

**UI** — `app/forgot-password/page.tsx` reads the `404` status off `ApiError`
and renders a dedicated **"Email not registered"** panel: the address that was
tried, a **Try another email** button, and a **Create an account** link to
`/register`. Other failures still show the inline red error line. The success
screen now names the address the mail went to.

**Login is deliberately unchanged** — it still returns the same
"Invalid email or password." for an unknown address as for a wrong password.

> Trade-off worth knowing: this endpoint now confirms whether an address has an
> account, so someone could script it to test a list of addresses. The 60-second
> per-account cooldown limits the noise; if that becomes a problem, add an
> IP-level rate limit in `middleware.ts` for this route.

---

## Serving uploads through CloudFront (`HERO_URL` / `WEBINAR_URL` / `RESUME_URL`)

**The problem with the URL in the database.** Every upload saves two things:
the S3 object **key** and the public **URL** it had at upload time. The key is
stable; the URL is not. Putting the buckets behind CloudFront changes the URL
for every row already written, so rewriting only the upload path would leave
every existing hero slide, webinar cover and CV still hitting S3 directly.

**So the URL is now derived, not trusted.** It is rebuilt as
`<CloudFront base>/<key>` on the way out of the API, and the stored URL is only
a fallback. Nothing has to be migrated in MongoDB.

**`lib/cdn.ts` (new)** — pure string helpers, no aws-sdk or mongoose:

| Export                            | Purpose                                                                                                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cdnBase(surface)`                | Normalised base for `"hero" \| "webinar" \| "resume"`. Accepts a bare domain (adds `https://`) and trims a trailing slash, so the value pasted from the AWS console works as-is. Returns `null` when unset. |
| `keyFromStoredUrl(url)`           | Recovers the key from a virtual-hosted S3 URL, a path-style one (`s3.<region>.amazonaws.com/<bucket>/<key>`) or an existing CloudFront URL. Returns `null` for `/public` paths.                             |
| `cdnUrl(surface, key, storedUrl)` | The URL to serve. Key wins → key parsed out of the stored URL → stored URL untouched.                                                                                                                       |

Env, newest name first — `URAV_AWS_S3_PUBLIC_BASE_URL`,
`URAV_AWS_S3_HERO_PUBLIC_BASE_URL` and `URAV_AWS_S3_WEBINAR_PUBLIC_BASE_URL` still work
as fallbacks:

```
HERO_URL=https://d111111abcdef8.cloudfront.net
WEBINAR_URL=https://d222222abcdef8.cloudfront.net
RESUME_URL=https://d333333abcdef8.cloudfront.net
```

**`lib/api.ts` — one rewrite point.** `serialize()` already runs on every
document leaving every route, so the mapping lives there rather than in ~15
handlers:

| Field             | Key field         | Surface |
| ----------------- | ----------------- | ------- |
| `desktopImageUrl` | `desktopImageKey` | hero    |
| `mobileImageUrl`  | `mobileImageKey`  | hero    |
| `imageUrl`        | `imageKey`        | webinar |
| `resumeUrl`       | `resumeKey`       | resume  |

Because `serialize()` recurses, populated sub-documents are covered too — the
`user` on a consultation, the applicant on an application. `Application.resumeUrl`
is a snapshot with no key of its own, so it resolves through the URL parser.
`withWebinarImage()` runs _after_ `serialize()`, so `displayImageUrl` inherits
the rewritten value and the `/public` placeholder is still used when there is
no upload.

**`lib/s3.ts`** — `publicBase()` now reads the same bases, so newly written
rows also store the CloudFront URL; and `keyFromUrl()` (used to delete the
replaced file) delegates to `keyFromStoredUrl()`, so deletes work whether the
row was written before or after the switch.

**Unchanged by design:** the default hero slides and the webinar placeholder
live in `/public` and are never rewritten — a stored URL starting with `/` is
returned as-is.

> Two things to check on the AWS side: each distribution's origin must point at
> the **bucket root** (an origin path would be dropped, since the key is
> appended to the domain directly), and `RESUME_URL` fronts a bucket of private
> CVs — that distribution needs OAC plus a bucket policy allowing only it, or
> the PDFs are public to anyone with the link, exactly as they were on the raw
> S3 URL.
