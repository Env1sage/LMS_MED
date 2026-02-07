# Bitflow Medical LMS - Phase 0

## Quick Start with Docker

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### 3. Test API
```bash
# Login as Bitflow Owner
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@bitflow.com","password":"BitflowAdmin@2026"}'
```

## Project Status

✅ **Phase 0 Complete** - Foundation & Governance Setup
- Multi-tenant architecture
- Custom SSO with JWT
- 7 role system
- Audit logging
- Security middleware

📋 **Next**: Phase 1 - Bitflow Owner Portal

## Documentation
- Backend: [backend/README.md](backend/README.md)
- Phase 0 Spec: [documentation/phase0.md](documentation/phase0.md)
