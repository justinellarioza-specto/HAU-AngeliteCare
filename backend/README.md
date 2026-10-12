# AngeliteCare — Backend API

Node.js + Express + MongoDB (Mongoose) backend for **AngeliteCare**, the Holy Angel University Clinic patient record, consultation queue, and medicine inventory system.

This version has **no bookings**. Students don't need accounts:

1. A student enters their **student number** and selects a request (check-up, medicine, medical supply, clearance, other).
2. The request goes into today's **queue** and the student gets a **queue number** (e.g. `C-004`) they can track.
3. Clinic staff **call** the next student, record **vitals / assessment / treatment**, **dispense** medicine (stock is deducted automatically), and **complete** the visit.
4. Every completed visit becomes part of the student's **patient history**, replacing the paper forms.

---

## Quick start

Requirements: **Node.js 18+** and **MongoDB** (local install or a free MongoDB Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env      # then edit MONGODB_URI and JWT_SECRET
npm run seed              # sample staff, patients, inventory and past visits
npm run dev               # http://localhost:5000  (auto-restarts on save)
```

Check it works: open <http://localhost:5000/api/health>.

**Sample logins (from `npm run seed`):**

| Role  | Username | Password      |
|-------|----------|---------------|
| Admin | `admin`  | `Admin@12345` |
| Nurse | `nurse`  | `Nurse@12345` |

Sample student numbers: `20230001` (has allergies + history), `20230002`, `20220145`, `20240310`, `20210077`.

> `npm run seed` **wipes** the database first. For a real/production database, use
> `npm run create-admin -- --username headnurse --password "Strong-Pass-123" --name "Jane Doe, RN"` instead.

### Connecting the frontend

The Vue frontend (`../frontend`) reads the API URL from `VITE_API_URL` (defaults to `http://localhost:5000/api`).
The frontend's origin must be listed in the backend's `CORS_ORIGINS` (`.env`). The default allows the Vite dev server at `http://localhost:5173`.

---

## Environment variables (`.env`)

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `5000` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/angelitecare` | or your Atlas connection string |
| `JWT_SECRET` | long random string | **required** — never commit it |
| `JWT_EXPIRES_IN` | `8h` | staff session length |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated frontend URLs |
| `EXPIRY_WARNING_DAYS` | `30` | "expiring soon" window for inventory alerts |
| `CLINIC_TIMEZONE` | `Asia/Manila` | used for "today" (daily queue numbers, dashboard) |
| `SEED_DEMO_DATA` | `true` | load the sample data on start **only if the database is empty** (used for the online demo) |

---

## Project structure

```
src/
  server.js              starts the app after connecting to MongoDB
  app.js                 express app: security headers, CORS, JSON, routes, errors
  config/                env + database connection
  models/                Mongoose schemas
    User.js              clinic staff accounts (admin / nurse)
    Patient.js           student / employee health profile
    Visit.js             queue ticket + consultation record (the "history")
    InventoryItem.js     medicine/supply with batches (lot + expiry), FEFO logic
    StockMovement.js     inventory ledger (restock, dispense, adjust, dispose)
    AuditLog.js          who viewed/changed what (RA 10173)
    Counter.js           daily queue numbers
  controllers/           request handlers
  services/visitService  queue numbering, queue position, dispensing
  routes/                URL → controller mapping
  middleware/            auth (JWT + roles), validation, error handler
  validators/schemas.js  all request validation rules (zod)
  scripts/               seed + create-admin
postman/                 Postman collection for API testing
```

---

## Data model in one picture

```
Patient (studentNumber) 1 ──── * Visit ──── * dispensed items ──→ InventoryItem
                                  │                                   │ batches[] (lot, qty, expiry)
                         handledBy│                                   │
                                  ▼                                   ▼
                                 User                          StockMovement (ledger)
```

**Visit status lifecycle**

```
waiting ──call──▶ in_progress ──complete──▶ completed   (saved to history, stock deducted)
   │                  │  └──requeue──▶ waiting
   └──cancel / no-show┴──▶ cancelled / no_show
```

Queue order: **urgent first**, then first-come-first-served. Queue numbers reset daily and are prefixed by request type: `C` check-up, `M` medicine, `S` supply, `R` certificate, `O` other.

---

## API reference

Base URL: `http://localhost:5000/api`. All responses are JSON with `success: true|false`.
Errors look like `{ "success": false, "message": "...", "details": [...] }`.

**Auth:** staff routes need `Authorization: Bearer <token>` from `POST /auth/login`.
🔓 = public (student kiosk), 👩‍⚕️ = any staff, 🛡️ = admin only.

### Auth & staff accounts
| | Method | Path | Body / notes |
|---|---|---|---|
| 🔓 | POST | `/auth/login` | `{ username, password }` → `{ token, user }` (10 tries / 15 min) |
| 👩‍⚕️ | GET | `/auth/me` | current user |
| 👩‍⚕️ | PATCH | `/auth/me` | `{ fullName?, email?, position? }` |
| 👩‍⚕️ | PATCH | `/auth/me/password` | `{ currentPassword, newPassword }` → new token (old tokens stop working) |
| 🛡️ | GET | `/users` | list staff |
| 🛡️ | POST | `/users` | `{ fullName, username, password, role: "admin"\|"nurse", position? }` |
| 🛡️ | PATCH | `/users/:id` | `{ fullName?, role?, position?, isActive? }` (can't remove the last admin) |
| 🛡️ | PATCH | `/users/:id/reset-password` | `{ newPassword }` |

### Student kiosk (no login)
| | Method | Path | Body / notes |
|---|---|---|---|
| 🔓 | GET | `/kiosk/options` | request types + requestable items (with `inStock`) |
| 🔓 | POST | `/kiosk/lookup` | `{ studentNumber }` → `{ registered, displayName, activeRequest }` |
| 🔓 | POST | `/kiosk/requests` | `{ studentNumber, requestType, reason?, requestedItems?: [{ item, quantity }], patient?: { firstName, lastName, program?, section? } }` → ticket. `patient` is only needed on a student's **first** visit (otherwise 422 `NEEDS_REGISTRATION`). One active request per student per day (409). |
| 🔓 | GET | `/kiosk/requests/:id` | ticket status + `position` in line |
| 🔓 | POST | `/kiosk/requests/:id/cancel` | `{ studentNumber }` — only while waiting |
| 🔓 | GET | `/kiosk/queue-board` | now serving / waiting queue numbers for a TV display (no names) |

### Queue & consultations
| | Method | Path | Body / notes |
|---|---|---|---|
| 👩‍⚕️ | GET | `/queue` | today's `waiting` + `inProgress` lists and status counts |
| 👩‍⚕️ | POST | `/queue/next` | `{ requestType? }` — calls the next student (atomic; two nurses can't grab the same ticket) |
| 👩‍⚕️ | GET | `/visits` | filters: `status, requestType, studentNumber, search, from, to (YYYY-MM-DD), page, limit` |
| 👩‍⚕️ | POST | `/visits` | walk-in: `{ studentNumber, requestType, reason?, priority?: "urgent", addToQueue?: false }` |
| 👩‍⚕️ | GET | `/visits/:id` | full record |
| 👩‍⚕️ | PATCH | `/visits/:id` | save progress: `{ vitals?, assessment?, treatment?, referral?, remarks? }` |
| 👩‍⚕️ | POST | `/visits/:id/call` | waiting → in_progress |
| 👩‍⚕️ | POST | `/visits/:id/requeue` | in_progress → waiting |
| 👩‍⚕️ | POST | `/visits/:id/no-show` | |
| 👩‍⚕️ | POST | `/visits/:id/cancel` | `{ reason? }` |
| 👩‍⚕️ | POST | `/visits/:id/complete` | `{ vitals?, assessment?, treatment?, referral?, remarks?, dispensed: [{ item, quantity, instructions? }] }` — all stock is checked first; nothing is deducted if any item is short |

`vitals` = `{ bloodPressure: "120/80", temperature, pulseRate, respiratoryRate, oxygenSaturation, weight, height, painScale }`

### Patients & history
| | Method | Path | Body / notes |
|---|---|---|---|
| 👩‍⚕️ | GET | `/patients` | `search, incomplete=true, page, limit` |
| 👩‍⚕️ | POST | `/patients` | `{ studentNumber, firstName, lastName, ...profile }` |
| 👩‍⚕️ | GET | `/patients/:studentNumber` | profile + summary (visit counts, recent visits) |
| 👩‍⚕️ | PATCH | `/patients/:studentNumber` | profile fields (allergies, conditions, emergency contact, …) |
| 👩‍⚕️ | GET | `/patients/:studentNumber/visits` | **consultation history** (completed only; `all=true` for every status) |

### Inventory
| | Method | Path | Body / notes |
|---|---|---|---|
| 👩‍⚕️ | GET | `/inventory` | `category, search, stock=low\|out\|expiring\|expired, includeInactive` |
| 👩‍⚕️ | POST | `/inventory` | `{ name, category: "medicine"\|"supply"\|"equipment", unit, reorderLevel, initialStock?: { quantity, lotNumber, expirationDate } }` |
| 👩‍⚕️ | GET | `/inventory/alerts` | low stock, expiring soon, expired batches |
| 👩‍⚕️ | GET | `/inventory/movements` | full stock ledger |
| 👩‍⚕️ | GET / PATCH / DELETE | `/inventory/:id` | DELETE archives (soft delete) |
| 👩‍⚕️ | POST | `/inventory/:id/restock` | `{ quantity, lotNumber?, expirationDate?, supplier? }` |
| 👩‍⚕️ | POST | `/inventory/:id/adjust` | `{ batchId, newQuantity, reason }` after a physical count |
| 👩‍⚕️ | POST | `/inventory/:id/dispose-expired` | removes expired batches, logs it |
| 👩‍⚕️ | GET | `/inventory/:id/movements` | ledger for one item |

### Dashboard & reports
| | Method | Path | Notes |
|---|---|---|---|
| 👩‍⚕️ | GET | `/dashboard/summary` | today's counts, avg wait/consult time, inventory alert counts |
| 👩‍⚕️ | GET | `/dashboard/reports?from=&to=` | visits per day/type/status, top dispensed items (default: last 30 days) |
| 🛡️ | GET | `/dashboard/audit-logs` | `action, entity, entityId, user, page` |
| 🔓 | GET | `/meta` | enum values for dropdowns |
| 🔓 | GET | `/health` | server + DB status |

---

## Testing with Postman

Import `postman/AngeliteCare.postman_collection.json`. Run **Auth → Login (nurse)** first — the token is saved automatically into the collection variables, and later requests save `visitId`, `itemId`, etc. so you can run the folders top to bottom (or the whole collection with the Runner after `npm run seed`).

---

## Security & data privacy (RA 10173)

- Passwords hashed with bcrypt; JWT sessions expire (default 8h) and are invalidated after a password change.
- Role checks on the server (`admin` vs `nurse`); students only ever see their own ticket's queue number and position — no names or health data on public endpoints.
- Every view/change of a patient record or visit is written to the **audit log** (`/dashboard/audit-logs`).
- Helmet security headers, CORS allow-list, rate limiting on login and kiosk routes, request validation on every write.
- Inventory uses optimistic locking and visits use atomic status changes so two staff can't double-dispense or double-call.

## Deployment (Render + MongoDB Atlas)

The repo root has a `render.yaml` Blueprint. In production, `npm run build` (root) builds the Vue app into `frontend/dist`, and the Express server serves it, so the API and the site share one URL. Step-by-step instructions are in the [root README](../README.md#putting-it-online-render--mongodb-atlas).
