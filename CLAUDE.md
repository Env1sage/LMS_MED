# Bitflow Medical LMS — Claude Operational Guide

> **This file is the single source of truth for a new Claude instance.**
> Read it completely before touching any code. Several non-obvious constraints will cause irreversible damage if ignored.

---

## 1. Project Overview

**Bitflow Medical LMS** is a full-stack Learning Management System for medical colleges in India.

- Publisher (Bitflow Owner) uploads books, videos, EPUB content
- Colleges subscribe and assign content to students via courses
- Students read books/EPUBs, take MCQ tests, attend live lectures
- Faculty create assignments, tests, notifications → HOD approves (maker-checker)
- MCI (Medical Council of India) competency codes are mapped to book page ranges

**Git repo:** `Env1sage/LMS_MED` on GitHub  
**Working directory on this machine:** `MEDICAL_LMS/` (wherever you extracted the zip)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, Prisma 7, PostgreSQL 16, Node.js, JWT Auth |
| Frontend | React 19, TypeScript, MUI 7, react-router-dom 7, pdfjs-dist 3.11 |
| Infrastructure | AWS EC2 (Mumbai), Docker Compose, Nginx reverse proxy |
| Deploy | Manual hot-inject scripts (see Section 7) |

---

## 3. Architecture

```
Your Laptop (Windows + WSL2)          EC2 Server: 13.234.225.94
────────────────────────────          ──────────────────────────────────
frontend/src/   ──build──▶            bitflow-frontend  (nginx, port 80)
                                              │
                  SSH/API calls              nginx reverse proxy (port 80/443)
                                              │
backend/src/ (PARTIAL — see §5)      bitflow-backend   (NestJS, port 3001)
                                              │
                                      bitflow-postgres  (PostgreSQL, port 5432)
```

**The backend runs exclusively on EC2.** You never run the backend locally. All backend changes are made by patching compiled JS files directly inside the Docker container via `docker exec`.

---

## 4. Production Server

```
IP:       13.234.225.94  (AWS Mumbai)
SSH user: ubuntu
PEM key:  LMS_mumbai.pem  (in project root — keep this secret)

SSH command:
  ssh -o StrictHostKeyChecking=no -i LMS_mumbai.pem ubuntu@13.234.225.94

Project root on EC2:  /opt/bitflow-lms/
```

Running containers on EC2:
| Container | Purpose | Internal Port |
|-----------|---------|---------------|
| `bitflow-postgres` | PostgreSQL database (data persists in Docker volume) | 5432 |
| `bitflow-backend` | NestJS API, compiled JS at `/app/dist/src/` | 3001 |
| `bitflow-frontend` | nginx serving React build at `/usr/share/nginx/html/` | 80 |
| `bitflow-nginx` | Reverse proxy (routes `/api` → backend, `/` → frontend) | 80/443 |

**Database URL (inside containers):**
```
postgresql://bitflow_user:Bitfl0wSecure2026@postgres:5432/bitflow_lms?schema=public
```

---

## 5. CRITICAL — Backend Source Drift (READ THIS FIRST)

**The local `backend/src/` folder is INCOMPLETE.** Several key modules were lost and exist ONLY as compiled JavaScript inside the running EC2 container:

Missing from local source:
- `competency/` (controller, service, module, DTOs)
- `learning-unit/` (controller, service, module)
- `audit/` (AuditService)
- `progress/`
- `main.ts`, `app.module.ts`, `app.controller.ts`, `app.service.ts`

**Consequences:**
- **NEVER run `docker compose build` for the backend** — it will compile from the incomplete local source and destroy the running production backend
- **NEVER run `npm run build` in `backend/`** for deployment purposes
- The backend is a **frozen artifact** — its compiled JS on EC2 is the only complete version

**How to make backend changes:**
1. SSH into EC2
2. Edit or patch the compiled JS at `/app/dist/src/<module>/<file>.controller.js` or `.service.js`
3. Restart the container: `docker restart bitflow-backend`

**The JS patching pattern** (used extensively in this project):
```javascript
// Script runs on EC2 with: docker exec -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/patch.js
// Pattern: assign prototype methods FIRST, then call __decorate, then leave existing exports line

// Step 1: Write patch script locally at /tmp/patch_xyz.js
// Step 2: scp /tmp/patch_xyz.js ubuntu@13.234.225.94:/tmp/
// Step 3: docker exec lms_backend node /tmp/patch_xyz.js

// appendBeforeExport() helper — inserts code before "exports.ClassName = __decorate([" line:
function appendBeforeExport(src, className, newCode) {
  const marker = `exports.${className} = __decorate([`;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`Marker not found for ${className}`);
  return src.slice(0, idx) + newCode + '\n' + src.slice(idx);
}
```

**NestJS decorator ordering rule** (critical for patching):
Prototype methods MUST be assigned BEFORE their `__decorate(...)` calls, or NestJS will throw `TypeError at Reflect.defineMetadata`. Always structure patches as:
```
ClassName.prototype.methodName = async function(...) { ... };
__decorate([Get('/path'), ...], ClassName.prototype, 'methodName', null);
```

**Running scripts inside the backend container:**
```bash
docker exec -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/your-script.js
```
The `pg` and other modules live at `/app/node_modules`, not `/tmp`.

---

## 6. Windows Setup (New Machine)

### Required installs:
1. **WSL2 + Ubuntu** — mandatory for running `.sh` scripts
   ```powershell
   # In PowerShell (Admin):
   wsl --install
   # Reboot, then set up Ubuntu username/password
   ```

2. **Node.js v20 LTS** — install inside WSL2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **SSH access** — the PEM key is in the project root. After extracting zip in WSL2:
   ```bash
   chmod 400 /path/to/MEDICAL_LMS/LMS_mumbai.pem
   ```

### Install frontend dependencies:
```bash
cd MEDICAL_LMS/frontend
npm install
```

### Start frontend dev server (connects to live EC2 API):
```bash
cd MEDICAL_LMS/frontend
REACT_APP_API_URL=http://13.234.225.94/api npm start
# Opens on http://localhost:3000
```

> **Note:** `npm start` in the frontend connects to the EC2 backend automatically. You do not need to run the backend locally.

---

## 7. Deployment — How to Deploy Frontend Changes

**Never use `docker compose build` or `deploy-to-aws.sh`.** The EC2 disk is ~6.8GB and nearly full — a Docker rebuild will fail with ENOSPC and potentially corrupt the running backend.

### Frontend hot-inject (the ONLY safe deploy method):

```bash
# From WSL2 terminal in project root:

# Step 1: Build
cd frontend
REACT_APP_API_URL=http://13.234.225.94/api npm run build

# Step 2: Package and upload
cd ..
tar czf /tmp/frontend-build.tar.gz -C frontend/build .
scp -o StrictHostKeyChecking=no -i LMS_mumbai.pem \
    /tmp/frontend-build.tar.gz ubuntu@13.234.225.94:/tmp/

# Step 3: Inject into nginx container
ssh -o StrictHostKeyChecking=no -i LMS_mumbai.pem ubuntu@13.234.225.94 \
    "cd /tmp && tar xzf frontend-build.tar.gz -C /tmp/fbuild && \
     docker cp /tmp/fbuild/. bitflow-frontend:/usr/share/nginx/html/ && \
     docker exec bitflow-frontend nginx -s reload && \
     rm -rf /tmp/fbuild /tmp/frontend-build.tar.gz"

# Result: live at http://13.234.225.94 within ~30 seconds
```

### Backend changes (patch compiled JS):

```bash
# Step 1: Write patch script locally as /tmp/patch_something.js
# (see Section 5 for the patching pattern)

# Step 2: Upload patch script
scp -i LMS_mumbai.pem /tmp/patch_something.js ubuntu@13.234.225.94:/tmp/

# Step 3: Copy into container and run
ssh -i LMS_mumbai.pem ubuntu@13.234.225.94 \
    "docker cp /tmp/patch_something.js bitflow-backend:/tmp/ && \
     docker exec -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/patch_something.js && \
     docker restart bitflow-backend"
```

### DB schema changes (new tables):

```bash
# Write a script like /tmp/patch_db.js that uses require('pg') and raw SQL
# Run with NODE_PATH pointing at container's node_modules:

scp -i LMS_mumbai.pem /tmp/patch_db.js ubuntu@13.234.225.94:/tmp/
ssh -i LMS_mumbai.pem ubuntu@13.234.225.94 \
    "docker cp /tmp/patch_db.js bitflow-backend:/tmp/ && \
     docker exec -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/patch_db.js"
```

---

## 8. Project Structure

```
MEDICAL_LMS/
├── frontend/
│   ├── src/
│   │   ├── pages/          — one file per page/role (publisher, college, hod, faculty, student)
│   │   ├── components/     — layouts (PublisherLayout, HodLayout, etc.) + shared
│   │   ├── services/       — API service files (one per domain)
│   │   ├── context/        — AuthContext (useAuth hook)
│   │   ├── utils/          — imageUrl, dateUtils, etc.
│   │   ├── config/         — api.ts (base URL, endpoint constants)
│   │   └── styles/         — bitflow-owner.css (shared CSS variables)
│   ├── public/
│   ├── build/              — generated, not in git
│   └── package.json
│
├── backend/
│   ├── src/                — INCOMPLETE (see Section 5)
│   ├── prisma/
│   │   └── schema.prisma   — source of truth for DB schema (but not all tables exist here yet)
│   ├── dist/               — NOT present locally; only exists on EC2 inside container
│   └── uploads/            — media files (books, images) — only on EC2
│
├── deploy/                 — setup scripts for a fresh EC2 server
├── docker-compose.yml      — local dev (not used in practice)
├── docker-compose.prod.yml — production compose (running on EC2)
├── LMS_mumbai.pem          — EC2 SSH key (KEEP SECRET)
└── DEPLOYMENT.md           — intended GitHub Actions CI/CD (not fully wired up)
```

---

## 9. User Roles & Login Credentials

| Role | Email | Password | Portal URL |
|------|-------|----------|-----------|
| Bitflow Owner | `owner@bitflow.com` | `Bitflow@2026` | `/owner` |
| Publisher Admin | `ameyahivarkar@gmail.com` | `Admin@2026` | `/publisher` |
| College Admin | `manthan.bitflownova@gmail.com` | `College@2026` | `/college` |
| College Dean | `manthanpawale0509@gmail.com` | `Dean@2026` | `/college` or `/hod` |
| HOD | `amit.sharma15@college.edu` | `Hod@2026` | `/hod` |
| Student | `rahul@college.edu` | `Student@2026` | `/student` |
| Student | `priya@college.edu` | `Student@2026` | `/student` |

> **If passwords stop working:** The "resend credentials" button generates a new random password. If SMTP ever breaks again, passwords get changed silently. Reset directly via DB script — see Section 16.

**Login API:**
```
POST http://13.234.225.94/api/auth/login
Body: { "email": "...", "password": "..." }
Response: { "accessToken": "...", "refreshToken": "...", "user": { "role": "...", ... } }
```

---

## 10. Key Services & API Patterns

All API calls go through `frontend/src/services/api.service.ts` which injects the JWT token automatically.

```typescript
import apiService from '../services/api.service';
// apiService.get('/path'), apiService.post('/path', body), etc.
```

Base URL is set at build time via `REACT_APP_API_URL`. In development it's `http://13.234.225.94/api`.

**Auth:** `useAuth()` from `frontend/src/context/AuthContext.tsx` — provides `user`, `logout`.

**Image URLs:** Authenticated images (book covers, logos) use `getAuthImageUrl(path)` from `frontend/src/utils/imageUrl.ts` — adds auth token to the URL.

**CSS variables:** All layouts use `var(--bo-bg)`, `var(--bo-border)`, `var(--bo-text-primary)` etc. defined in `frontend/src/styles/bitflow-owner.css`.

---

## 11. Maker-Checker (Approval Workflow)

Implemented for: **Courses, Tests, Notifications, Online Lectures**

Flow: Faculty creates → submits for review → HOD approves or rejects → becomes active or returns to draft.

Status values: `DRAFT` → `PENDING_REVIEW` → `ACTIVE` (or back to `DRAFT`)

HOD approval UI is at `/hod/pending-approvals` → `frontend/src/pages/hod/HodPendingApprovals.tsx`

Backend endpoints (patched into compiled JS):
```
GET  /faculty-assignments/tests/pending-review
POST /faculty-assignments/tests/:id/hod-approve
POST /faculty-assignments/tests/:id/hod-reject

GET  /faculty-notifications/pending-review
POST /faculty-notifications/:id/hod-approve
POST /faculty-notifications/:id/hod-reject

GET  /guest-lectures/pending-review
POST /guest-lectures/:id/hod-approve
POST /guest-lectures/:id/hod-reject
```

All actions are logged in `maker_checker_logs` table.

---

## 12. Completed Features

### Page-wise Competency Mapping ✅ DONE

Maps MCI syllabus competency codes to page ranges in book PDFs. Students see competencies in a sidebar while reading.

**All completed:**
- DB table `learning_unit_page_competencies` created on EC2
- Backend endpoints patched: `GET /learning-units/:id/page-competencies` and `POST /learning-units/:id/page-competencies`
- `frontend/src/utils/competencyPdfParser.ts` — parses MCI syllabus PDF client-side
- `frontend/src/services/learning-unit.service.ts` — has `getPageCompetencies` and `bulkUpsertPageCompetencies`
- `frontend/src/pages/ContentListPage.tsx` — "Map Competencies" button + upload modal per book
- `frontend/src/components/student/EpubReaderAnnotated.tsx` — competency sidebar with "This Page" and "All" tabs

---

## 13. Useful EC2 Commands

```bash
# SSH shortcut (run from project root in WSL2):
ssh -i LMS_mumbai.pem ubuntu@13.234.225.94

# Once on EC2:
sudo docker ps                                          # list containers
sudo docker logs bitflow-backend --tail 50 -f          # backend logs
sudo docker logs bitflow-frontend --tail 20            # frontend logs
sudo docker restart bitflow-backend                    # restart backend
sudo docker exec -it bitflow-backend sh                # shell into backend

# Check disk space (stays near 90% — monitor):
df -h /

# Clear Docker build cache if disk is full:
sudo docker builder prune -af   # frees ~500MB but use carefully

# Database (from inside backend container):
docker exec -it bitflow-postgres psql -U bitflow_user -d bitflow_lms
```

---

## 14. CI/CD Notes

GitHub Actions CI/CD is **fully active**. See `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.

- **CI** (`ci.yml`): runs on every push — builds frontend, runs tests
- **CD** (`deploy.yml`): runs on push to `main` — hot-injects frontend into EC2 nginx container

**Required GitHub Secrets** (already configured on `Env1sage/LMS_MED`):
```
EC2_HOST=13.234.225.94
EC2_USER=ubuntu
EC2_SSH_KEY=<contents of LMS_mumbai.pem>
```

**CD uses hot-inject only** — it never runs `docker compose build`. Backend is untouched by CD.

The `deploy-to-aws.sh` script in the repo:
- References the **wrong IP** (`52.66.165.194` — old server)
- Does a full Docker rebuild — **do not use** (disk constraint + source drift)

---

## 15. Common Gotchas

| Situation | What to do |
|-----------|-----------|
| Backend change needed | Edit compiled JS on EC2, never rebuild Docker image |
| Frontend not showing changes | Build locally → hot-inject (Section 7) |
| EC2 disk full (>95%) | `sudo docker builder prune -af` — saves ~500MB |
| SSH key permission error | `chmod 400 LMS_mumbai.pem` in WSL2 terminal |
| `.sh` script not running | Must run in WSL2 or Git Bash, not PowerShell/CMD |
| `Cannot find module 'pg'` in patch scripts | Run with `-e NODE_PATH=/app/node_modules` flag |
| NestJS `TypeError at Reflect.defineMetadata` | Prototype method assignments must come BEFORE `__decorate` calls |
| `REACT_APP_API_URL` not set | Build will point to wrong API — always set explicitly |
| `docker compose up --force-recreate backend` | **WIPES all in-container patches** — must re-run Section 16 scripts after |
| Prisma error `Value X not found in enum Y` | Prisma client enum drift — re-run the enum patch scripts from Section 16 |
| Login fails after "resend credentials" clicked | The resend flow resets the password — reset via DB script in Section 16 |

---

## 16. EC2 Patches Applied — Must Re-run After `--force-recreate`

> **WARNING:** Running `docker compose up --force-recreate backend` recreates the container from the image, wiping all runtime patches below. If you ever need to force-recreate the backend (e.g. to update env vars), you MUST re-run all patch scripts afterward.

### 16.1 SMTP Configuration
Already persisted in `/opt/bitflow-lms/.env` on EC2 — survives recreate automatically:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ameyahivarkar@gmail.com
SMTP_PASS=unikvcqeyhdqgkwh
SMTP_FROM=Bitflow Medical LMS <ameyahivarkar@gmail.com>
```

### 16.2 Prisma Client Enum Patch ⚠️ MUST RE-RUN after force-recreate

The Prisma client compiled into the image is missing `PENDING_REVIEW` (CourseStatus) and `YEAR_3_PART1/PART2` (AcademicYear). Without this patch, the Faculty Dashboard and Course pages throw "unexpected database error".

```javascript
// /tmp/patch_prisma_enums_full.js
const fs = require('fs');

// Patch index.js exports
const indexPath = '/app/node_modules/.prisma/client/index.js';
let src = fs.readFileSync(indexPath, 'utf8');

// Fix inlineSchema (used by WASM query engine)
src = src.replace(
  'enum CourseStatus {\\n  DRAFT\\n  PUBLISHED\\n  ARCHIVED\\n}',
  'enum CourseStatus {\\n  DRAFT\\n  PUBLISHED\\n  ARCHIVED\\n  PENDING_REVIEW\\n}'
);
src = src.replace(
  '  PART_1\\n  PART_2\\n}\\n\\nenum',
  '  PART_1\\n  PART_2\\n  YEAR_3_PART1\\n  YEAR_3_PART2\\n}\\n\\nenum'
);
fs.writeFileSync(indexPath, src);

// Patch schema.prisma
const schemaPath = '/app/node_modules/.prisma/client/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');
if (!schema.includes('PENDING_REVIEW')) {
  schema = schema.replace(
    'enum CourseStatus {\n  DRAFT\n  PUBLISHED\n  ARCHIVED\n}',
    'enum CourseStatus {\n  DRAFT\n  PUBLISHED\n  ARCHIVED\n  PENDING_REVIEW\n}'
  );
}
if (!schema.includes('YEAR_3_PART1')) {
  schema = schema.replace('  PART_1\n  PART_2\n}', '  PART_1\n  PART_2\n  YEAR_3_PART1\n  YEAR_3_PART2\n}');
}
fs.writeFileSync(schemaPath, schema);
console.log('Prisma enum patch done');
```

Run with:
```bash
scp -i LMS_mumbai.pem /tmp/patch_prisma_enums_full.js ubuntu@13.234.225.94:/tmp/
ssh -i LMS_mumbai.pem ubuntu@13.234.225.94 \
  "docker cp /tmp/patch_prisma_enums_full.js bitflow-backend:/tmp/ && \
   docker exec -u root -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/patch_prisma_enums_full.js && \
   docker restart bitflow-backend"
```

### 16.3 Resend Credentials Fix ⚠️ MUST RE-RUN after force-recreate

The original code resets the password BEFORE sending email. If email fails, user is locked out. Patched to send email first, only reset password on success.

File patched: `/app/dist/src/bitflow-owner/bitflow-owner.service.js`
Functions: `resendPublisherCredentials` and `resendCollegeCredentials`

The patch scripts are at `/tmp/patch_resend_creds.js` locally. Re-apply the same way as other patches.

### 16.4 Reset Admin Passwords

If passwords get scrambled, reset them directly:

```javascript
// /tmp/reset_all_passwords.js
const bcrypt = require('bcrypt');
const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://bitflow_user:Bitfl0wSecure2026@postgres:5432/bitflow_lms' });
  await client.connect();
  const accounts = [
    { email: 'owner@bitflow.com',            password: 'Bitflow@2026' },
    { email: 'ameyahivarkar@gmail.com',       password: 'Admin@2026'  },
    { email: 'manthan.bitflownova@gmail.com', password: 'College@2026'},
    { email: 'manthanpawale0509@gmail.com',   password: 'Dean@2026'   },
    { email: 'amit.sharma15@college.edu',     password: 'Hod@2026'    },
    { email: 'rahul@college.edu',             password: 'Student@2026'},
    { email: 'priya@college.edu',             password: 'Student@2026'},
  ];
  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 12);
    await client.query(
      `UPDATE users SET "passwordHash"=$1, "failedLoginAttempts"=0, "lockedUntil"=NULL WHERE email=$2`,
      [hash, acc.email]
    );
    console.log('Reset:', acc.email, '->', acc.password);
  }
  await client.end();
}
main().catch(console.error);
```

Run with:
```bash
scp -i LMS_mumbai.pem /tmp/reset_all_passwords.js ubuntu@13.234.225.94:/tmp/
ssh -i LMS_mumbai.pem ubuntu@13.234.225.94 \
  "docker cp /tmp/reset_all_passwords.js bitflow-backend:/tmp/ && \
   docker exec -e NODE_PATH=/app/node_modules bitflow-backend node /tmp/reset_all_passwords.js"
```
