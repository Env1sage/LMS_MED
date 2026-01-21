# Bitflow Medical LMS - Backend

## Phase 0: Foundation & Governance Setup ✅

Enterprise-grade Learning Management System for medical education with:
- **Multi-tenant architecture** with strict tenant isolation
- **Custom SSO** with JWT authentication
- **Role-based access control** (7 roles)
- **Immutable audit logging**
- **Backend-only security enforcement**

---

## 🏗️ Architecture

### Tech Stack
- **Backend Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Custom SSO with JWT + Refresh Tokens
- **Validation**: class-validator + class-transformer

### Security Model
```
┌─────────────────────────────────────────────────┐
│         CLIENT (Untrusted)                      │
│  ❌ No security logic                           │
│  ❌ No role checks                              │
│  ❌ No tenant filtering                         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         BACKEND (Trusted Authority)             │
│  ✅ JWT validation                              │
│  ✅ Role enforcement                            │
│  ✅ Tenant isolation                            │
│  ✅ Audit logging                               │
└─────────────────────────────────────────────────┘
```

---

## 👥 User Roles (Frozen)

| Role | Authority | Tenant Context |
|------|-----------|----------------|
| `BITFLOW_OWNER` | Platform governance | Global |
| `PUBLISHER_ADMIN` | Content metadata | Publisher |
| `COLLEGE_ADMIN` | Student identity management | College |
| `COLLEGE_DEAN` | Analytics (read-only) | College |
| `COLLEGE_HOD` | Analytics (read-only) | College |
| `FACULTY` | Course orchestration | College |
| `STUDENT` | Content consumption | College |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000/api`

---

## 🗄️ Database Schema

### Core Entities
- **Users** - Authentication & identity
- **Colleges** - Tenant organizations (medical institutions)
- **Publishers** - Content providers
- **RefreshTokens** - Session management
- **UserSessions** - Concurrent session tracking
- **AuditLogs** - Immutable event log
- **SecurityPolicy** - Global security configuration

### Tenant Isolation
```sql
-- Every user belongs to either a college OR publisher
User {
  collegeId    String?    -- For college users
  publisherId  String?    -- For publisher users
}

-- All queries automatically filtered by tenant context
WHERE user.collegeId = :currentUserCollegeId
```

---

## 🔐 Authentication Flow

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "uuid-v4",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "COLLEGE_ADMIN",
    "collegeId": "uuid"
  }
}
```

### 2. Authenticated Requests
```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

### 3. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "uuid-v4"
}

Response:
{
  "accessToken": "eyJhbGc..."
}
```

### 4. Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "refreshToken": "uuid-v4"
}
```

---

## 📝 Test Credentials (After Seeding)

### Bitflow Owner
- **Email**: `owner@bitflow.com`
- **Password**: `BitflowAdmin@2026`
- **Access**: Platform-wide

### College Admin (GMC Mumbai)
- **Email**: `admin@gmc.edu`
- **Password**: `CollegeAdmin@2026`
- **Access**: GMC Mumbai tenant only

### Publisher Admin (Elsevier)
- **Email**: `admin@elsevier.com`
- **Password**: `Publisher@2026`
- **Access**: Elsevier publisher only

---

## 🔒 Security Features

### 1. Multi-Tenant Isolation
```typescript
// Middleware automatically enforces tenant boundaries
// College Admin cannot access other colleges
// Publisher Admin cannot access other publishers
// Bitflow Owner can access all tenants
```

### 2. Audit Logging
Every action is logged:
- Authentication events (login, logout, token refresh)
- User management (create, update, suspend)
- Security violations (unauthorized access, invalid tokens)
- Content access (future phases)

### 3. Session Management
- JWT access tokens (15 min expiry)
- Refresh tokens (30 day expiry)
- Maximum 3 concurrent sessions per user
- Automatic session cleanup on password change

### 4. Password Security
- bcrypt hashing (12 rounds)
- Minimum 8 characters
- Enforced via validation pipes

---

## 🧪 API Documentation

### Auth Endpoints

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| POST | `/auth/register` | Yes | `BITFLOW_OWNER`, `COLLEGE_ADMIN` | Create new user |
| POST | `/auth/login` | No | - | Authenticate user |
| POST | `/auth/refresh` | No | - | Refresh access token |
| POST | `/auth/logout` | Yes | All | Invalidate session |
| POST | `/auth/change-password` | Yes | All | Update password |
| GET | `/auth/me` | Yes | All | Get current user profile |

---

## 🛠️ Development

### Database Migrations
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Prisma Studio (Database GUI)
```bash
npx prisma studio
```

### Code Quality
```bash
# Linting
npm run lint

# Formatting
npm run format

# Testing
npm run test

# E2E tests
npm run test:e2e
```

---

## 📊 Monitoring

### Health Check
```http
GET /health
```

### Audit Log Query (Bitflow Owner only)
All security events are logged to the `audit_logs` table.
Query via Prisma Studio or direct SQL.

---

## 🐳 Docker Deployment (Optional)

```bash
# Start PostgreSQL in Docker
docker run --name bitflow-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=bitflow_lms \
  -p 5432:5432 \
  -d postgres:16

# Update .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bitflow_lms?schema=public"
```

---

## 🎯 Phase 0 Exit Criteria

- [x] Secure authentication is live
- [x] Tenant isolation is verified
- [x] Role enforcement is backend-controlled
- [x] Audit logs are active and immutable
- [x] No frontend-based security logic exists

**Status**: ✅ Phase 0 Complete - Ready for Phase 1

---

## 📞 Support

For issues or questions:
- Create an issue in the repository
- Contact: Bitflow Development Team

---

## 📄 License

Proprietary - Bitflow Medical LMS
© 2026 All Rights Reserved
