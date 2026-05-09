#!/bin/bash
# ============================================================
#  Full AWS Deployment — One Command
# ============================================================
#  This script:
#    1. Creates EC2 (if not exists)
#    2. Sets up the server (Docker, firewall, etc.)
#    3. Copies your project to the server
#    4. Configures environment
#    5. Builds & starts all containers
#    6. Imports your local database
#    7. Copies your uploaded files
#
#  Usage: ./deploy/aws-deploy-full.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
step() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
success() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; exit 1; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   🚀 Bitflow Medical LMS — Full AWS Deployment               ║"
echo "║   Region: ap-southeast-2 (Sydney)                             ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')                                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"

# ── Load connection info if available ──
KEY_FILE=""
EC2_HOST=""
if [ -f deploy/aws-connection.env ]; then
    source deploy/aws-connection.env
    KEY_FILE="$EC2_KEY_FILE"
fi

# ── If no connection info, run setup first ──
if [ -z "$EC2_HOST" ] || [ -z "$KEY_FILE" ]; then
    step "Step 0: Creating AWS Infrastructure"
    bash deploy/aws-setup.sh
    source deploy/aws-connection.env
    KEY_FILE="$EC2_KEY_FILE"
fi

SSH_CMD="ssh -o StrictHostKeyChecking=no -i $KEY_FILE ubuntu@$EC2_HOST"
SCP_CMD="scp -o StrictHostKeyChecking=no -i $KEY_FILE"

echo ""
success "Target: ubuntu@$EC2_HOST"
echo ""

# ═══════════════════════════════════════════════════════════
step "Step 1: Setup Server (Docker, Firewall, Swap)"
# ═══════════════════════════════════════════════════════════
$SCP_CMD deploy/setup-server.sh ubuntu@$EC2_HOST:/tmp/setup-server.sh
$SSH_CMD "sudo bash /tmp/setup-server.sh" || warn "Setup may have already been done"
success "Server configured"

# ═══════════════════════════════════════════════════════════
step "Step 2: Copy Project Files to Server"
# ═══════════════════════════════════════════════════════════
log "Syncing project (excluding node_modules, uploads, .git)..."

# Create the tarball locally (much faster than rsync for first deploy)
tar czf /tmp/bitflow-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backend/uploads' \
    --exclude='backend/dist' \
    --exclude='frontend/build' \
    --exclude='frontend/node_modules' \
    --exclude='*.log' \
    --exclude='.env' \
    -C "$PROJECT_DIR" .

TARSIZE=$(du -h /tmp/bitflow-deploy.tar.gz | cut -f1)
log "Uploading project ($TARSIZE)..."
$SCP_CMD /tmp/bitflow-deploy.tar.gz ubuntu@$EC2_HOST:/tmp/bitflow-deploy.tar.gz

$SSH_CMD <<'REMOTE'
    mkdir -p /opt/bitflow-lms
    cd /opt/bitflow-lms
    tar xzf /tmp/bitflow-deploy.tar.gz
    rm /tmp/bitflow-deploy.tar.gz
    echo "Files extracted"
REMOTE
rm /tmp/bitflow-deploy.tar.gz
success "Project files uploaded"

# ═══════════════════════════════════════════════════════════
step "Step 3: Configure Production Environment"
# ═══════════════════════════════════════════════════════════
# Generate secrets
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
JWT_SEC=$(openssl rand -base64 48 | tr -d '/+=')

log "Generating production .env..."
$SSH_CMD "cat > /opt/bitflow-lms/.env" <<EOF
# ── Auto-generated $(date) ──
DB_USER=bitflow_user
DB_PASSWORD=$DB_PASS
DB_NAME=bitflow_lms

JWT_SECRET=$JWT_SEC
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d

SESSION_TIMEOUT_MINUTES=60
MAX_CONCURRENT_SESSIONS=3

# Using IP for now — change to domain later
ALLOWED_ORIGINS=http://$EC2_HOST,https://$EC2_HOST
REACT_APP_API_URL=http://$EC2_HOST/api

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ameyahivarkar@gmail.com
SMTP_PASS=lzxjwsqhgbmbjfkl
SMTP_FROM=Bitflow Medical LMS <ameyahivarkar@gmail.com>
EOF
success "Environment configured (secrets auto-generated)"

# ═══════════════════════════════════════════════════════════
step "Step 4: Build & Start Containers"
# ═══════════════════════════════════════════════════════════
$SSH_CMD <<'REMOTE'
    cd /opt/bitflow-lms
    
    # Ensure docker group is effective
    if ! docker info >/dev/null 2>&1; then
        echo "Docker needs sudo (first run). Using sudo."
        sudo docker compose -f docker-compose.prod.yml build
        sudo docker compose -f docker-compose.prod.yml up -d
    else
        docker compose -f docker-compose.prod.yml build
        docker compose -f docker-compose.prod.yml up -d
    fi
REMOTE
success "Containers built and started"

# ═══════════════════════════════════════════════════════════
step "Step 5: Wait for Services"
# ═══════════════════════════════════════════════════════════
log "Waiting for backend to start (may take 30-60s on first build)..."
for i in {1..40}; do
    HEALTH=$($SSH_CMD "curl -sf -o /dev/null -w '%{http_code}' http://localhost:3001/api 2>/dev/null" || echo "000")
    if [ "$HEALTH" = "200" ]; then
        success "Backend is healthy (HTTP 200)"
        break
    fi
    if [ $i -eq 40 ]; then
        warn "Backend not responding yet. Check: ssh ... 'docker logs bitflow-backend'"
    fi
    echo -n "."
    sleep 5
done

FE_HEALTH=$($SSH_CMD "curl -sf -o /dev/null -w '%{http_code}' http://localhost:80/ 2>/dev/null" || echo "000")
if [ "$FE_HEALTH" = "200" ]; then
    success "Frontend is healthy (HTTP 200)"
else
    warn "Frontend returned HTTP $FE_HEALTH"
fi

# ═══════════════════════════════════════════════════════════
step "Step 6: Import Local Database"
# ═══════════════════════════════════════════════════════════
log "Dumping local database..."
PGPASSWORD=postgres pg_dump -h localhost -U postgres -d bitflow_lms --no-owner --no-privileges 2>/dev/null | gzip > /tmp/bitflow_local_dump.sql.gz
DUMPSIZE=$(du -h /tmp/bitflow_local_dump.sql.gz | cut -f1)
log "Database dump: $DUMPSIZE"

log "Uploading to server..."
$SCP_CMD /tmp/bitflow_local_dump.sql.gz ubuntu@$EC2_HOST:/tmp/bitflow_local_dump.sql.gz

log "Importing database on server..."
$SSH_CMD <<REMOTE
    cd /opt/bitflow-lms
    source .env
    
    # Wait for postgres to be ready
    for i in {1..20}; do
        if docker exec bitflow-postgres pg_isready -U \$DB_USER >/dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    
    # Import
    gunzip -c /tmp/bitflow_local_dump.sql.gz | docker exec -i bitflow-postgres psql -U \$DB_USER -d \$DB_NAME 2>&1 | tail -5
    rm /tmp/bitflow_local_dump.sql.gz
    echo "Database imported"
REMOTE
rm /tmp/bitflow_local_dump.sql.gz
success "Local database imported to production"

# ═══════════════════════════════════════════════════════════
step "Step 7: Upload Files (books, images, videos)"
# ═══════════════════════════════════════════════════════════
if [ -d "backend/uploads" ]; then
    UPLOAD_SIZE=$(du -sh backend/uploads/ | cut -f1)
    log "Uploading files ($UPLOAD_SIZE)..."
    tar czf /tmp/bitflow-uploads.tar.gz -C backend/uploads .
    $SCP_CMD /tmp/bitflow-uploads.tar.gz ubuntu@$EC2_HOST:/tmp/bitflow-uploads.tar.gz
    $SSH_CMD <<'REMOTE'
        docker exec bitflow-backend mkdir -p /app/uploads
        docker cp /tmp/bitflow-uploads.tar.gz bitflow-backend:/tmp/
        docker exec bitflow-backend sh -c "cd /app/uploads && tar xzf /tmp/bitflow-uploads.tar.gz && rm /tmp/bitflow-uploads.tar.gz"
        rm /tmp/bitflow-uploads.tar.gz
REMOTE
    rm /tmp/bitflow-uploads.tar.gz
    success "Upload files copied ($UPLOAD_SIZE)"
else
    warn "No uploads directory found. Skipping."
fi

# ═══════════════════════════════════════════════════════════
step "Step 8: Setup Backups & Monitoring"
# ═══════════════════════════════════════════════════════════
$SSH_CMD <<'REMOTE'
    cd /opt/bitflow-lms
    chmod +x deploy/*.sh
    
    # Daily backup at 2am
    (crontab -l 2>/dev/null | grep -v backup-db; echo "0 2 * * * cd /opt/bitflow-lms && source .env && bash deploy/backup-db.sh >> /var/log/bitflow-backup.log 2>&1") | crontab -
    
    # Health check every 5 minutes
    (crontab -l 2>/dev/null | grep -v health-check; echo "*/5 * * * * bash /opt/bitflow-lms/deploy/health-check.sh >> /var/log/bitflow-health.log 2>&1") | crontab -
    
    echo "Cron jobs set"
REMOTE
success "Backups (daily 2am) + health checks (every 5min) configured"

# ═══════════════════════════════════════════════════════════
# FINAL STATUS
# ═══════════════════════════════════════════════════════════
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   🎉 DEPLOYMENT COMPLETE!                                    ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║   🌐 Your app is live at:                                    ║"
echo "║      http://$EC2_HOST                                        "
echo "║                                                               ║"
echo "║   🔌 API endpoint:                                           ║"
echo "║      http://$EC2_HOST/api                                    "
echo "║                                                               ║"
echo "║   🔑 SSH access:                                             ║"
echo "║      ssh -i $KEY_FILE ubuntu@$EC2_HOST                      "
echo "║                                                               ║"
echo "║   📊 Login credentials (same as local):                      ║"
echo "║      Owner:    owner@bitflow.com / Password123!               ║"
echo "║      Student:  aiim001@aiims.edu / Password123!               ║"
echo "║                                                               ║"
echo "║   ⚠️  Next steps for production:                              ║"
echo "║      1. Point your domain DNS to: $EC2_HOST                  "
echo "║      2. Run SSL setup: ./deploy/setup-ssl.sh yourdomain.com   ║"
echo "║      3. Change default passwords in the app                   ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
