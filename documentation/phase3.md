
📘 Bitflow Medical LMS
PHASE 3 — PUBLISHER PORTAL & LEARNING UNIT EXPOSURE
(Ultra-Detailed | Functional + Technical + Security)

1️⃣ Phase Objective & Strategic Role
The objective of Phase 3 is to enable publishers to expose learning content securely on the platform without transferring ownership or raw files.
This phase establishes:
Publisher as content metadata authority
Bitflow as secure access orchestrator
Zero content storage liability for Bitflow
This phase is critical because all academic consumption depends on it, yet Bitflow never hosts or owns content.

2️⃣ Publisher Portal — High-Level Architecture
2.1 Responsibility Boundary
Publisher Portal is responsible for:
Defining what content exists
Defining how it can be accessed
Defining under what conditions it can be consumed
Publisher Portal is NOT responsible for:
File hosting
File storage
DRM enforcement at file level
User identity management

3️⃣ Learning Unit Concept (Core Abstraction)
3.1 What is a Learning Unit?
A Learning Unit is a logical reference to externally hosted content, wrapped with:
Metadata
Security rules
Access conditions
Analytics hooks
Bitflow stores only metadata + access rules, never raw files.

4️⃣ Supported Learning Unit Types (Final)
4.1 Book Chapter
Chapter-level access only
No full-book exposure
Delivered via:
Secure embedded reader OR
Time-bound redirect URL
No print
No download
No copy-paste
4.2 Video
Streaming only (HLS / DASH preferred)
No static video URLs exposed
Token-based stream authorization
Adaptive bitrate supported if publisher provides it
4.3 MCQ Set
Can be:
Publisher-hosted
API-rendered inside Bitflow
Supports:
Time limits
Attempt limits
Auto-evaluation
MCQ answers never exposed to client
4.4 Notes
HTML-based secure viewer
No raw PDF access
No offline caching
Read-only mode

5️⃣ Learning Unit Metadata Model (Technical)
5.1 Mandatory Fields (Database-Level)
Each Learning Unit record includes:
learningUnitId (UUID)
publisherId
type (BOOK | VIDEO | MCQ | NOTES)
subject
topic
subTopic
competencyIds[] (Bitflow-defined)
difficultyLevel
estimatedDuration
secureAccessUrl
deliveryType (REDIRECT | EMBED | STREAM)
watermarkEnabled (boolean)
sessionExpiryMinutes
status (ACTIVE | INACTIVE)
createdAt, updatedAt
❗ Validation is enforced at backend only.

6️⃣ Secure Access Flow (Critical Technical Detail)
6.1 Tokenized Access (Every Request)
When a student or faculty requests content:
Client → Bitflow API
Backend validates:
userId
role
collegeId
entitlement
Backend generates:
Short-lived access token
Session-bound watermark payload
Redirect / embed is issued
6.2 Token Characteristics
Time-bound (minutes, not hours)
Single-session scoped
Bound to:
userId
learningUnitId
device type
Cannot be reused

7️⃣ Watermarking (Dynamic & Session-Based)
7.1 Watermark Payload
Dynamic watermark includes:
Student name / ID
College name
Timestamp
Session ID
7.2 Rendering Rules
Applied at viewer level
Rotating / semi-transparent
Changes per session
⚠️ Watermark logic enforced server-side.

8️⃣ Publisher Analytics (Privacy-Safe)
8.1 What Publishers Can See
Total views per learning unit
Time spent (aggregated)
College-wise usage counts
Daily / monthly trends
8.2 What Publishers CANNOT See
Student names
Student IDs
Individual session logs
Faculty assignments

9️⃣ Security Enforcement Rules (Non-Negotiable)
9.1 Hard Restrictions
❌ No PDF uploads
❌ No video uploads
❌ No direct file URLs
❌ No downloadable assets
9.2 API Protections
Every access logged
Rate-limited token generation
Replay attack prevention
Device fingerprint validation (optional)

🔐 10️⃣ Web vs Mobile Handling (Publisher Side)
Web
Disable right-click
Disable text selection
Disable print
Session expiry enforced
Watermark mandatory
Mobile
Secure WebView only
Screenshot detection enabled
Screen recording blocked
Auto logout on violation
Token invalidation on app backgrounding

11️⃣ Failure & Edge Case Handling
11.1 Publisher Server Down
Graceful error shown to user
Session invalidated
Incident logged
11.2 Token Expiry Mid-Session
Immediate content block
Re-authentication required
11.3 Publisher Suspended
All learning units auto-disabled
Tokens invalidated instantly

12️⃣ Audit Logging (Compliance)
Logged events:
Learning unit creation
Metadata edits
Content access attempts
Token generation
Failed authorization attempts
Logs are:
Append-only
Immutable
Tenant-aware

13️⃣ Explicit Phase 3 Exclusions
Phase 3 does NOT include:
Faculty course creation
Learning flow logic
Student dashboards
Offline access
AI recommendations
Marketplace features

✅ Phase 3 Completion & Approval Criteria
Phase 3 is approved only when:
Publishers can define all learning unit types
Secure token-based access works end-to-end
No content is stored on Bitflow servers
Watermarking is enforced
Analytics are visible without PII
Audit logs capture all access
Security violations auto-block access


