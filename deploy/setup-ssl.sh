#!/bin/bash
# ============================================================
#  SSL Setup with Let's Encrypt (Certbot)
# ============================================================
#  Run AFTER deploy.sh and after pointing your domain's DNS
#  to this server's IP address.
#
#  Usage: sudo ./deploy/setup-ssl.sh yourdomain.com
# ============================================================

set -euo pipefail

DOMAIN="${1:?Usage: ./deploy/setup-ssl.sh yourdomain.com}"

echo "🔐 Setting up SSL for: $DOMAIN"
echo ""

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true

# Get certificate
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN}" \
    -d "$DOMAIN" \
    -d "www.${DOMAIN}"

# Copy certs to deploy directory
mkdir -p deploy/nginx/ssl
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem deploy/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem deploy/nginx/ssl/privkey.pem

# Update nginx config to enable HTTPS
NGINX_CONF="deploy/nginx/nginx.conf"

# Enable the HTTPS block
sed -i 's/# server {/server {/g' "$NGINX_CONF"
sed -i 's/#     listen 443/    listen 443/g' "$NGINX_CONF"
sed -i 's/#     server_name/    server_name/g' "$NGINX_CONF"
sed -i 's/#     ssl_/    ssl_/g' "$NGINX_CONF"
sed -i 's/#     client_max_body_size/    client_max_body_size/g' "$NGINX_CONF"
sed -i 's/#     location/    location/g' "$NGINX_CONF"
sed -i 's/#         proxy_/        proxy_/g' "$NGINX_CONF"
sed -i 's/#     }/    }/g' "$NGINX_CONF"
sed -i 's/# }/}/g' "$NGINX_CONF"

# Enable HTTP → HTTPS redirect
sed -i 's/# return 301 https/return 301 https/g' "$NGINX_CONF"

# Replace domain placeholder
sed -i "s/yourdomain.com/${DOMAIN}/g" "$NGINX_CONF"

# Restart nginx
docker compose -f docker-compose.prod.yml up -d nginx

# Setup auto-renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem $(pwd)/deploy/nginx/ssl/ && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem $(pwd)/deploy/nginx/ssl/ && docker restart bitflow-nginx'") | sort -u | crontab -

echo ""
echo "✅ SSL configured for $DOMAIN"
echo "   Auto-renewal cron job added (runs daily at 3am)"
echo "   Your site is now accessible at: https://${DOMAIN}"
