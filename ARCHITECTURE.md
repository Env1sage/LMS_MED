# Bitflow Medical LMS - Phase 0 Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 0 - FOUNDATION                        │
│                    (Backend-Only Implementation)                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (NestJS)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              AUTHENTICATION MODULE                          │   │
│  │  • POST /auth/login        • POST /auth/refresh            │   │
│  │  • POST /auth/register     • POST /auth/logout             │   │
│  │  • POST /auth/change-password • GET /auth/me               │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYER (Middleware)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────┐  ┌──────────────────────────────────┐  │
│  │  JWT Auth Guard       │  │  Security Validation Middleware  │  │
│  │  • Validate JWT token │  │  • Validate userId & role        │  │
│  │  • Check expiry       │  │  • Attach security context       │  │
│  │  • Extract user       │  │  • Block invalid requests        │  │
│  └───────────────────────┘  └──────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────┐  ┌──────────────────────────────────┐  │
│  │  Roles Guard          │  │  Tenant Isolation Middleware     │  │
│  │  • Check @Roles       │  │  • Enforce collegeId boundary   │  │
│  │  • Validate access    │  │  • Enforce publisherId boundary │  │
│  │  • Deny unauthorized  │  │  • Block cross-tenant access    │  │
│  └───────────────────────┘  └──────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │   Auth Service      │  │     Audit Service                   │ │
│  │   • Login           │  │     • log() - Record events         │ │
│  │   • Register        │  │     • queryLogs() - Read logs       │ │
│  │   • Refresh token   │  │     • Immutable append-only         │ │
│  │   • Change password │  │     • All actions tracked           │ │
│  └─────────────────────┘  └─────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER (Prisma)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Prisma Service                             │ │
│  │  • Database connection pool                                   │ │
│  │  • Type-safe queries                                          │ │
│  │  • Automatic tenant filtering                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐ │
│  │     Users      │  │    Colleges    │  │    Publishers       │ │
│  │  • id          │  │  • id          │  │  • id               │ │
│  │  • email       │  │  • name        │  │  • name             │ │
│  │  • passwordHash│  │  • code        │  │  • code             │ │
│  │  • role        │  │  • status      │  │  • status           │ │
│  │  • collegeId   │  └────────────────┘  └─────────────────────┘ │
│  │  • publisherId │                                                │ │
│  │  • status      │                                                │ │
│  └────────────────┘                                                │ │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐ │
│  │ RefreshTokens  │  │ UserSessions   │  │   AuditLogs         │ │
│  │  • id          │  │  • id          │  │  • id               │ │
│  │  • userId      │  │  • userId      │  │  • userId           │ │
│  │  • token       │  │  • isActive    │  │  • action           │ │
│  │  • expiresAt   │  │  • platform    │  │  • timestamp        │ │
│  │  • isRevoked   │  │  • expiresAt   │  │  • collegeId        │ │
│  └────────────────┘  └────────────────┘  │  • publisherId      │ │
│                                            │  • metadata         │ │
│  ┌────────────────┐                       └─────────────────────┘ │
│  │SecurityPolicy  │                                                │ │
│  │  • sessionTimeout│                                              │ │
│  │  • tokenExpiry │                                                │ │
│  │  • maxSessions │                                                │ │
│  │  • featureFlags│                                                │ │
│  └────────────────┘                                                │ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│ Client  │                 │  Backend │                │ Database │
└────┬────┘                 └─────┬────┘                └─────┬────┘
     │                            │                           │
     │  POST /auth/login          │                           │
     │  {email, password}         │                           │
     ├───────────────────────────>│                           │
     │                            │                           │
     │                            │  Query user by email      │
     │                            ├──────────────────────────>│
     │                            │                           │
     │                            │<──────────────────────────┤
     │                            │  User record              │
     │                            │                           │
     │                            │  Verify password (bcrypt) │
     │                            │  Check user status        │
     │                            │  Check tenant status      │
     │                            │                           │
     │                            │  Create audit log         │
     │                            ├──────────────────────────>│
     │                            │                           │
     │                            │  Generate JWT (15min)     │
     │                            │  Generate refresh token   │
     │                            │                           │
     │                            │  Store refresh token      │
     │                            ├──────────────────────────>│
     │                            │                           │
     │<───────────────────────────┤                           │
     │  {accessToken,             │                           │
     │   refreshToken,            │                           │
     │   user: {...}}             │                           │
     │                            │                           │
```

## Authorization Flow (Protected Endpoint)

```
┌─────────┐                 ┌──────────┐                ┌──────────┐
│ Client  │                 │ Backend  │                │ Database │
└────┬────┘                 └─────┬────┘                └─────┬────┘
     │                            │                           │
     │  GET /api/auth/me          │                           │
     │  Authorization: Bearer JWT │                           │
     ├───────────────────────────>│                           │
     │                            │                           │
     │                      [JWT Auth Guard]                  │
     │                            │                           │
     │                            │  Verify JWT signature     │
     │                            │  Check expiry             │
     │                            │  Extract payload          │
     │                            │                           │
     │                            │  Query user by id         │
     │                            ├──────────────────────────>│
     │                            │                           │
     │                            │<──────────────────────────┤
     │                            │  User record              │
     │                            │                           │
     │                      [Security Validation]             │
     │                            │                           │
     │                            │  Validate userId          │
     │                            │  Validate role            │
     │                            │  Attach securityContext   │
     │                            │                           │
     │                      [Tenant Isolation]                │
     │                            │                           │
     │                            │  Check collegeId match    │
     │                            │  OR publisherId match     │
     │                            │  (Bitflow Owner exempt)   │
     │                            │                           │
     │                      [Roles Guard]                     │
     │                            │                           │
     │                            │  Check @Roles decorator   │
     │                            │  Validate user role       │
     │                            │                           │
     │                      [Controller Handler]              │
     │                            │                           │
     │<───────────────────────────┤                           │
     │  {userId, email, role,     │                           │
     │   collegeId, publisherId}  │                           │
     │                            │                           │
```

## Multi-Tenant Isolation Model

```
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │              COLLEGE A (Tenant 1)              │        │
│  │  Users: {collegeId: "college-a-uuid"}         │        │
│  │  ├─ admin@collegeA.edu (COLLEGE_ADMIN)        │        │
│  │  ├─ dean@collegeA.edu (COLLEGE_DEAN)          │        │
│  │  ├─ faculty@collegeA.edu (FACULTY)            │        │
│  │  └─ student@collegeA.edu (STUDENT)            │        │
│  │                                                 │        │
│  │  ❌ Cannot see College B data                  │        │
│  │  ❌ Cannot query College B users               │        │
│  │  ❌ API blocks cross-tenant requests           │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │              COLLEGE B (Tenant 2)              │        │
│  │  Users: {collegeId: "college-b-uuid"}         │        │
│  │  ├─ admin@collegeB.edu (COLLEGE_ADMIN)        │        │
│  │  ├─ dean@collegeB.edu (COLLEGE_DEAN)          │        │
│  │  ├─ faculty@collegeB.edu (FACULTY)            │        │
│  │  └─ student@collegeB.edu (STUDENT)            │        │
│  │                                                 │        │
│  │  ❌ Cannot see College A data                  │        │
│  │  ❌ Cannot query College A users               │        │
│  │  ❌ API blocks cross-tenant requests           │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │            PUBLISHER (Separate Tenant)         │        │
│  │  Users: {publisherId: "publisher-uuid"}       │        │
│  │  └─ admin@publisher.com (PUBLISHER_ADMIN)     │        │
│  │                                                 │        │
│  │  ❌ Cannot see College data                    │        │
│  │  ❌ Cannot query College users                 │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │         BITFLOW OWNER (Global Access)          │        │
│  │  Users: {collegeId: null, publisherId: null}  │        │
│  │  └─ owner@bitflow.com (BITFLOW_OWNER)         │        │
│  │                                                 │        │
│  │  ✅ Can access ALL tenants                     │        │
│  │  ✅ Platform-wide governance                   │        │
│  │  ✅ Exempt from tenant isolation               │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Role Hierarchy & Permissions

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BITFLOW_OWNER                                              │
│  ├─ Platform governance                                     │
│  ├─ Create/suspend colleges                                 │
│  ├─ Create/suspend publishers                               │
│  ├─ Global security policy                                  │
│  ├─ View all audit logs                                     │
│  └─ System-wide analytics                                   │
│                                                              │
│  PUBLISHER_ADMIN                                            │
│  ├─ Content metadata management (future)                    │
│  ├─ Learning unit exposure (future)                         │
│  ├─ Usage analytics (non-PII) (future)                      │
│  └─ ❌ Cannot access student identity                       │
│                                                              │
│  COLLEGE_ADMIN                                              │
│  ├─ Student identity management (future)                    │
│  ├─ Faculty assignment (future)                             │
│  ├─ Create users within college                             │
│  └─ ❌ Cannot access other colleges                         │
│                                                              │
│  COLLEGE_DEAN                                               │
│  ├─ Institution-level analytics (future)                    │
│  ├─ Aggregated reports only                                 │
│  └─ ❌ No operational controls                              │
│                                                              │
│  COLLEGE_HOD                                                │
│  ├─ Department-level analytics (future)                     │
│  ├─ Aggregated reports only                                 │
│  └─ ❌ No operational controls                              │
│                                                              │
│  FACULTY                                                    │
│  ├─ Course creation (future)                                │
│  ├─ Learning flow design (future)                           │
│  ├─ Student progress monitoring (future)                    │
│  └─ ❌ Cannot access other faculty courses                  │
│                                                              │
│  STUDENT                                                    │
│  ├─ Content consumption (future)                            │
│  ├─ Course enrollment (future)                              │
│  ├─ Progress tracking (future)                              │
│  └─ ❌ No administrative access                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Enforcement Layers

```
Request Flow with Security Checks:

HTTP Request
    │
    ▼
┌───────────────────────────────────┐
│  1. CORS Validation               │
│     • Check origin                │
│     • Validate headers            │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  2. JWT Authentication            │
│     • Extract Bearer token        │
│     • Verify signature            │
│     • Check expiry                │
│     • Extract user payload        │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  3. Security Validation           │
│     • Validate userId             │
│     • Validate role               │
│     • Attach security context     │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  4. Tenant Isolation              │
│     • Check collegeId match       │
│     • Check publisherId match     │
│     • Block cross-tenant access   │
│     • Log violations              │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  5. Role Authorization            │
│     • Check @Roles decorator      │
│     • Validate user role          │
│     • Deny if unauthorized        │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  6. Input Validation              │
│     • Validate DTO schema         │
│     • Sanitize inputs             │
│     • Type transformation         │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│  7. Business Logic                │
│     • Execute service methods     │
│     • Database operations         │
│     • Audit logging               │
└───────────────┬───────────────────┘
                │
                ▼
          HTTP Response
```

## Audit Trail Example

```
┌─────────────────────────────────────────────────────────────┐
│                   AUDIT LOGS TABLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  id: uuid-1                                                 │
│  userId: "bitflow-owner-uuid"                               │
│  collegeId: null                                            │
│  publisherId: null                                          │
│  action: "LOGIN_SUCCESS"                                    │
│  description: "User logged in successfully"                 │
│  timestamp: "2026-01-09T10:15:30Z"                         │
│  ipAddress: "192.168.1.100"                                 │
│  userAgent: "Mozilla/5.0..."                                │
│  ────────────────────────────────────────────────────────  │
│  id: uuid-2                                                 │
│  userId: "college-admin-uuid"                               │
│  collegeId: "gmc-mumbai-uuid"                              │
│  publisherId: null                                          │
│  action: "USER_CREATED"                                     │
│  entityType: "User"                                         │
│  entityId: "new-user-uuid"                                  │
│  description: "Faculty user created"                        │
│  timestamp: "2026-01-09T10:20:45Z"                         │
│  ipAddress: "192.168.1.101"                                 │
│  ────────────────────────────────────────────────────────  │
│  id: uuid-3                                                 │
│  userId: "college-admin-uuid"                               │
│  collegeId: "gmc-mumbai-uuid"                              │
│  publisherId: null                                          │
│  action: "UNAUTHORIZED_ACCESS"                              │
│  description: "Attempted cross-tenant access"               │
│  metadata: {                                                │
│    "userCollegeId": "gmc-mumbai-uuid",                     │
│    "requestedCollegeId": "different-college-uuid",         │
│    "path": "/api/users",                                    │
│    "method": "GET"                                          │
│  }                                                          │
│  timestamp: "2026-01-09T10:25:00Z"                         │
│  ipAddress: "192.168.1.101"                                 │
│  ────────────────────────────────────────────────────────  │
│                                                              │
│  ✅ Immutable - No updates/deletes allowed                 │
│  ✅ Complete audit trail for compliance                    │
│  ✅ Queryable only by Bitflow Owner                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Phase 0 Architecture**: Complete & Production-Ready  
**Date**: January 9, 2026  
**Status**: ✅ All security layers implemented and verified
