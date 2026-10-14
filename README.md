# Work Log Ticketing (US Travel)

A "glorified task list" for the US Travel back office. One list per ticketing staff member, where each reservation moves through three boxes: **Issued**, **Bayar AP**, **Invoice**. The same data is shown four ways:

| Role | What they see |
|---|---|
| Staf ticketing | Their own work log. Urgent on top, newest first. One "next step" button per row. Invoiced items move to Arsip. |
| SPV ticketing | Per-staff summary and a "Nyangkut" list of stuck items with a reason and a reminder button. |
| Acc. payable | Payment request queue, urgent first then nearest TTL. Mark paid with transfer proof, or send back with a note. |
| Finance | Issued but not yet invoiced, by aging bucket and per company, with CSV export. |

## Current status

| Part | Status |
|---|---|
| Frontend (all 4 roles, forms, autocomplete, uploads) | Done, runs on mock data in the browser |
| Database schema (Postgres + Drizzle) | Done, not wired to the UI yet |
| File storage (local disk, image compression) | Done, `/api/uploads` and `/api/files` |
| Login and roles | Not started. File APIs refuse all requests until it exists |
| Docker deployment for the internal server | Done |

Without `DATABASE_URL` the app runs in **mock mode**: fictional seed data in React state that resets on reload. This is what the Vercel demo uses.

## Tech stack

- **Next.js 15** (App Router, TypeScript) on **Node.js 20 or newer**
- **React 19**, **Tailwind CSS 4** (design tokens in `globals.css`)
- **PostgreSQL 17** with **Drizzle ORM**, `pg_trgm` for fuzzy autocomplete
- **sharp** to shrink screenshots to WebP on upload
- **Docker Compose** for the internal server, **Tailscale** for access from outside

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and switch roles in the top right.

Before your first commit, run `npm run typecheck` and `npm run build` once. The project was written without network access, so this is the first full compile.

## Put it on GitHub

```bash
git init
git add .
git commit -m "Work log ticketing: frontend mockup and backend scaffold"
git branch -M main
git remote add origin https://github.com/<your-account>/us-travel-worklog.git
git push -u origin main
```

Commit `package-lock.json` (created by `npm install`). The Docker build needs it. Keep the repo **private**, since it will hold client workflow details.

## Deploy the demo to Vercel

1. In Vercel, choose **Add New Project** and import the GitHub repo.
2. Keep the defaults (Framework: Next.js). Do **not** set `DATABASE_URL`.
3. Deploy. Every push to `main` redeploys automatically.

The demo has `noindex` set so search engines skip it. File uploads work in the browser only and are not saved on Vercel, which is intended: Vercel's disk is temporary, so real files belong on the internal server.

## Deploy for real on the internal server

On a Linux VM or mini PC inside the office network, with Docker and Tailscale installed:

```bash
git clone https://github.com/<your-account>/us-travel-worklog.git
cd us-travel-worklog
cp .env.example .env          # set a strong POSTGRES_PASSWORD
npm install && npm run db:generate   # once, on any machine, then commit the drizzle/ folder
docker compose up -d --build
docker compose run --rm migrate
tailscale serve --bg 3000     # HTTPS on the tailnet only
```

The app is bound to `127.0.0.1:3000`, so it is not reachable on the LAN or internet directly. Only Tailscale exposes it.

Check it is up: `curl http://127.0.0.1:3000/api/health`

### Backups

Run nightly with cron. Copy both to another machine or NAS:

```bash
docker compose exec -T db pg_dump -U worklog worklog | gzip > backup/worklog-$(date +%F).sql.gz
docker run --rm -v us-travel-worklog_uploads:/data -v "$PWD/backup":/out alpine \
  tar czf /out/uploads-$(date +%F).tgz -C /data .
```

## How data is stored

- **Records** live in Postgres (`src/server/db/schema.ts`): users, companies, passengers, vendors, reservations, payment_requests, attachments, activity_log.
- **Files** (vendor invoices, transfer proofs) are saved on disk under `UPLOAD_DIR/yyyy/mm/<uuid>.<ext>`. The database only keeps metadata: path, original name, type, size, SHA-256, who uploaded it.
- Images are resized to 1600px wide and converted to WebP, typically 2 to 4 MB down to about 200 KB. PDFs are stored as is. Max size is `MAX_UPLOAD_MB` (default 10).
- Files are served through `/api/files/...` behind a login check, never from `/public`.
- **Money** is stored as whole rupiah (`bigint`).

## Project layout

```
src/
  app/
    page.tsx, layout.tsx, globals.css
    api/health/      GET  status and mode
    api/uploads/     POST save a file (auth required)
    api/files/       GET  read a file (auth required)
  components/
    worklog-app.tsx  app shell, role switcher, drawer and modal hosts
    views/           staff, spv, ap, finance screens
    rows.tsx         list rows for each role
    detail-panel.tsx reservation detail drawer
    new-entry-form.tsx, autocomplete.tsx, modals.tsx, bits.tsx
  lib/
    types.ts         shared data types
    workflow.ts      stage rules, "nyangkut" rules, sort orders
    constants.ts     vendors, staff, products, thresholds
    store.tsx        mock data store (swap for API calls later)
    seed.ts          fictional demo data
  server/
    db/schema.ts     database tables
    db/index.ts      lazy Postgres connection
    storage.ts       save and read uploads
    auth.ts          placeholder, refuses everything until login exists
```

## Next steps

1. **Login and roles.** Add Auth.js or Better Auth with username and password, then implement `requireUser()` in `src/server/auth.ts`. Admin screen to add users and vendors.
2. **Wire the store to the API.** `src/lib/store.tsx` exposes `records` and `actions`. Replace each action with a server action or `fetch` call. The components do not need to change.
3. **Autocomplete from the database.** Query companies and passengers ordered by `last_used_at`, filtered with `pg_trgm` similarity.
4. **Activity log** written in the same transaction as each status change.
5. **Notifications** (optional): WhatsApp or browser notification when AP pays an urgent request.

## Questions to confirm with the client

- Who marks a reservation as invoiced: ticketing staff or finance?
- Record the selling price as well as the vendor cost?
- Are the "nyangkut" thresholds right? (`STUCK` in `src/lib/constants.ts`: 2 hours waiting for AP, 1 hour paid but not issued, TTL under 3 hours, 1 day issued without invoice)
- Should the server also host Fauzi's app, as mentioned in the chat?
