#!/bin/bash
# ============================================================
#  Health Check & Monitoring Script
# ============================================================
#  Run manually or via cron to check system health
#  Cron: */5 * * * * /opt/bitflow-lms/deploy/health-check.sh
# ============================================================

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

check() {
    local name="$1"
    local result="$2"
    if [ "$result" = "OK" ]; then
        echo -e "  ${GREEN}✅${NC} $name"
    else
        echo -e "  ${RED}❌${NC} $name — $result"
        ERRORS=$((ERRORS + 1))
    fi
}

echo ""
echo "═══ Bitflow LMS Health Check — $(date '+%Y-%m-%d %H:%M:%S') ═══"
echo ""

# ─── Docker containers ───
echo "🐳 Containers:"
for container in bitflow-backend bitflow-frontend bitflow-postgres bitflow-nginx; do
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
    if [ "$status" = "running" ]; then
        check "$container" "OK"
    else
        check "$container" "$status"
    fi
done

# ─── API Health ───
echo ""
echo "🌐 Endpoints:"
API_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/api 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    check "Backend API (/api)" "OK"
else
    check "Backend API (/api)" "HTTP $API_STATUS"
fi

FE_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:80/ 2>/dev/null || echo "000")
if [ "$FE_STATUS" = "200" ]; then
    check "Frontend (port 80)" "OK"
else
    check "Frontend (port 80)" "HTTP $FE_STATUS"
fi

# ─── Database ───
echo ""
echo "🗄️ Database:"
DB_STATUS=$(docker exec bitflow-postgres pg_isready -U bitflow_user 2>/dev/null && echo "OK" || echo "FAIL")
check "PostgreSQL" "$DB_STATUS"

DB_CONN=$(docker exec bitflow-postgres psql -U bitflow_user -d bitflow_lms -t -c "SELECT 1" 2>/dev/null | tr -d ' ')
if [ "$DB_CONN" = "1" ]; then
    check "DB connection" "OK"
else
    check "DB connection" "FAIL"
fi

# ─── Disk usage ───
echo ""
echo "💾 Resources:"
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_PCT" -lt 85 ]; then
    check "Disk usage" "OK"
else
    check "Disk usage" "${DISK_PCT}% (WARNING: above 85%)"
fi

MEM_PCT=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
if [ "$MEM_PCT" -lt 90 ]; then
    check "Memory usage" "OK"
else
    check "Memory usage" "${MEM_PCT}% (WARNING: above 90%)"
fi

# Docker disk
DOCKER_SIZE=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1)
echo -e "  📊 Docker disk: ${DOCKER_SIZE:-unknown}"

# ─── Summary ───
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}═══ All checks passed ✅ ═══${NC}"
else
    echo -e "${RED}═══ $ERRORS check(s) failed ❌ ═══${NC}"
    # Optional: send alert (uncomment and configure)
    # curl -X POST -H 'Content-Type: application/json' \
    #   -d "{\"text\": \"🚨 Bitflow LMS: $ERRORS health check(s) failed on $(hostname)\"}" \
    #   "$SLACK_WEBHOOK_URL"
fi
echo ""

exit $ERRORS
