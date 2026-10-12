# AngeliteCare

**A Full-Stack Digitalization and Inventory Management System for the Holy Angel University Clinic**
WCSERVER (Web Server and Client Services) project, School of Computing, Holy Angel University

AngeliteCare replaces the clinic's paper consultation forms, filing-cabinet records and manual inventory ledgers with a secure web app:

- **Students** request a clinic service with just their **student number** (check-up, medicine, medical supply, clearance) and get a **live queue number**. No account or booking needed.
- **Clinic staff** work the **queue**, record **vitals, assessment and treatment**, **dispense medicine** (stock is deducted automatically, earliest expiry first), and every visit is saved to the student's **patient history**.
- **Inventory** is tracked per batch with **low-stock and expiration alerts** and a full stock ledger.
- **Role-based access** and an **audit log** support RA 10173 (Data Privacy Act of 2012).

## Tech stack (MEVN)

| Layer | Technology | Folder |
|---|---|---|
| **M**ongoDB | Database, accessed with Mongoose | local or MongoDB Atlas |
| **E**xpress | REST API, JWT auth, validation | `backend/` |
| **V**ue 3 | Vue Router, Composition API (`<script setup>`), TypeScript, Vite, Tailwind CSS v4 | `frontend/` |
| **N**ode.js | Runtime for the API and tooling | |

## Running it locally

You need **Node.js 18+** and **MongoDB** (local install, or a free MongoDB Atlas cluster).

```bash
# 1. Backend API  →  http://localhost:5000
cd backend
npm install
cp .env.example .env        # set MONGODB_URI and JWT_SECRET
npm run seed                # sample staff, patients, inventory, past visits
npm run dev

# 2. Frontend  →  http://localhost:5173   (new terminal)
cd frontend
npm install
npm run dev
```

Shortcut from the project root: `npm run dev:backend` and `npm run dev:frontend` (in two terminals).

**Sample logins** (after `npm run seed`): `admin` / `Admin@12345`, `nurse` / `Nurse@12345`
**Sample student numbers:** `20230001` (has allergies and history), `20230002`, `20220145`

## Putting it online (Render + MongoDB Atlas)

In production, the Express server also serves the built Vue site, so the whole app runs at **one URL**.

**1. MongoDB Atlas (database)**
1. In Atlas, open **Database Access** and create a database user with a password.
2. In **Network Access**, add the IP address `0.0.0.0/0` (allow access from anywhere). Render's IP addresses change, so this is needed.
3. Go to **Database → Connect → Drivers** and copy the connection string. Replace `<db_password>` with the user's password and add the database name `angelitecare` right after `.mongodb.net/`, like this:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/angelitecare?retryWrites=true&w=majority&appName=Cluster0`
   If the password has special characters (`@ : / ? # %`), URL-encode them (e.g. `@` becomes `%40`).

**2. Render (web hosting)**
1. Sign in to <https://render.com> with GitHub.
2. Click **New → Blueprint** and select this repository. Render reads `render.yaml`.
3. When it asks for `MONGODB_URI`, paste the Atlas connection string from step 1, then click **Apply**.
4. Wait for the build to finish (about 3–5 minutes) and open the `https://angelitecare-xxxx.onrender.com` link.

On the first start, the empty database is filled with demo data (`SEED_DEMO_DATA=true`): log in with `admin` / `Admin@12345` and **change the password** under Profile & Account. Every push to the main branch redeploys automatically.

> The free Render plan sleeps after ~15 minutes without visitors. The first visit after that takes 30–60 seconds, so open the site a minute before a demo.

## How it works

```
Student (public site)                 Clinic staff (/staff, login required)
──────────────────────────            ─────────────────────────────────────────
enter student number   ──▶  queue ──▶ Call next ──▶ record vitals & notes
pick a request                         │             dispense medicine (stock −)
get queue number  ◀── live position ───┘             Complete visit
                                                       │
                                                       ▼
                                         Patient history · reports · audit log
```

- Queue order: urgent first, then first come, first served. Queue numbers reset daily (`C-001` check-up, `M-` medicine, `S-` supply, `R-` certificate).
- Pages (Vue Router): `/` public site and student requests · `/staff/dashboard`, `/staff/queue`, `/staff/health-metrics`, `/staff/patients`, `/staff/inventory`, `/staff/expiration`, `/staff/reports`, `/staff/access`, `/staff/profile` · `/developer` (admin only). Staff routes are protected by a router guard plus server-side JWT checks.

## Frontend structure

```
frontend/src/
  main.ts, App.vue, router.ts     app entry, layout shell, routes + auth guard
  api.ts                          typed client for every backend endpoint
  stores/                         auth session, staff dialogs, public dialogs
  composables/                    useApi (load/poll data), toast, form helpers
  components/ui/                  BaseButton, BaseModal, AppIcon, StatusChip, …
  components/layout/              header, footer, login / access / hours dialogs
  components/student/             RequestModal, TicketModal (queue ticket)
  components/staff/               consultation, patient, inventory, account dialogs
  views/HomeView.vue              public website
  views/staff/*.vue               staff portal modules
  assets/index.css                design tokens and styles
```

## API & testing

The full endpoint list, data model, security notes and deployment steps (Render + MongoDB Atlas) are in **[`backend/README.md`](backend/README.md)**.
A Postman collection with tests is in `backend/postman/`. Import it, run **Auth → Login** first, then run the folders in order.

## Team

| Member | Role |
|---|---|
| Prince S. Laxamana | Database, backend, repository |
| Dannah Mikayla M. Sanchez | Frontend, UI/UX |
| Kitt Angelu P. Dumas | Frontend, UI/UX |
| Justine Lee N. Larioza | API testing, integration, QA |
