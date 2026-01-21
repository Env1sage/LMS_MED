# 🚀 Phase 0 Setup Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js v22.19.0 (installed)
- ✅ npm 10.9.3 (installed)
- ⚠️ PostgreSQL 14+ (needs to be installed or Docker running)

## Setup Steps

### Option 1: Using Docker (Recommended)

1. **Start Docker Desktop**
   ```bash
   # Make sure Docker is running, then:
   cd /home/envisage/Downloads/MEDICAL_LMS
   docker compose up -d
   ```

2. **Run migrations and seed**
   ```bash
   cd backend
   npm run prisma:migrate
   npm run prisma:seed
   ```

### Option 2: Manual PostgreSQL Installation

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Start PostgreSQL service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE bitflow_lms;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE bitflow_lms TO postgres;
   \q
   ```

3. **Update .env file**
   ```bash
   cd /home/envisage/Downloads/MEDICAL_LMS/backend
   # Ensure DATABASE_URL is correct in .env:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bitflow_lms?schema=public"
   ```

4. **Run migrations and seed**
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

### Option 3: Use Prisma's built-in PostgreSQL (Easiest)

```bash
cd /home/envisage/Downloads/MEDICAL_LMS/backend
npx prisma dev
```

This will start a local PostgreSQL instance managed by Prisma.

## Starting the Application

```bash
cd /home/envisage/Downloads/MEDICAL_LMS/backend
npm run start:dev
```

You should see:
```
================================================
🏥 Bitflow Medical LMS - Phase 0: Foundation
================================================
🚀 Server running on: http://localhost:3000/api
🔐 Authentication: Custom SSO with JWT
🗄️  Database: PostgreSQL with Prisma ORM
🛡️  Security: Multi-tenant isolation enforced
📝 Audit: Immutable logging active
================================================
```

## Testing the API

### 1. Login as Bitflow Owner
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@bitflow.com",
    "password": "BitflowAdmin@2026"
  }'
```

### 2. Use the access token
```bash
# Replace YOUR_TOKEN with the accessToken from login response
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d bitflow_lms

# Check if PostgreSQL is running
sudo systemctl status postgresql

# View logs
sudo journalctl -u postgresql -n 50
```

### Prisma Issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database in GUI
npx prisma studio
```

## What's Been Built

✅ **Core Foundation**
- Multi-tenant database schema
- User authentication with JWT
- 7 role system (Bitflow Owner, Publisher Admin, College Admin, Dean, HoD, Faculty, Student)
- Tenant isolation middleware
- Audit logging system

✅ **Security Features**
- Backend-only validation
- No frontend trust
- Session management
- Password hashing (bcrypt)
- Refresh token rotation

✅ **API Endpoints**
- POST `/api/auth/login` - User authentication
- POST `/api/auth/register` - Create users (restricted)
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - End session
- POST `/api/auth/change-password` - Update password
- GET `/api/auth/me` - Current user profile

## Next Steps

Once Phase 0 is running:
1. Test all authentication endpoints
2. Verify tenant isolation
3. Check audit logs in database
4. Begin Phase 1: Bitflow Owner Portal development

## Files Created

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Initial data
│   └── migrations/             # Database migrations
├── src/
│   ├── auth/                   # Authentication module
│   ├── audit/                  # Audit logging
│   ├── prisma/                 # Database service
│   ├── common/
│   │   ├── enums/              # Role & status enums
│   │   └── middleware/         # Security middleware
│   ├── app.module.ts
│   └── main.ts
├── .env                        # Environment config
└── README.md                   # Documentation
```

## Support

Need help? Check:
1. [Backend README](backend/README.md) - Detailed API documentation
2. [Phase 0 Spec](documentation/phase0.md) - Requirements
3. Prisma Studio: `npx prisma studio` - View database
