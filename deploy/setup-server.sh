#!/bin/bash
# ============================================================
#  AWS EC2 Server Setup Script
# ============================================================
#  Run this on a FRESH Ubuntu 22.04/24.04 EC2 instance
#  Usage: chmod +x setup-server.sh && sudo ./setup-server.sh
# ============================================================

set -euo pipefail

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Bitflow Medical LMS — AWS Server Setup                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ─── 1. System Updates ───
echo "📦 [1/7] Updating system packages..."
apt-get update -y
apt-get upgrade -y

# ─── 2. Install Docker ───
echo "🐳 [2/7] Installing Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release

# Docker official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Docker repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to run docker without sudo
usermod -aG docker ubuntu

echo "  ✅ Docker $(docker --version | cut -d' ' -f3) installed"

# ─── 3. Install useful tools ───
echo "🔧 [3/7] Installing utilities..."
apt-get install -y \
    htop \
    tree \
    unzip \
    fail2ban \
    ufw \
    certbot \
    python3-certbot-nginx \
    git

# ─── 4. Configure Firewall ───
echo "🛡️ [4/7] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo "  ✅ UFW firewall active (SSH, HTTP, HTTPS)"

# ─── 5. Configure Fail2Ban ───
echo "🔒 [5/7] Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF
systemctl enable fail2ban
systemctl restart fail2ban
echo "  ✅ Fail2Ban active (5 retries → 1hr ban)"

# ─── 6. Configure swap (for t2/t3.small instances) ───
echo "💾 [6/7] Setting up swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  ✅ 2GB swap created"
else
    echo "  ⏭️  Swap already exists"
fi

# ─── 7. Create app directory ───
echo "📁 [7/7] Creating app directory..."
mkdir -p /opt/bitflow-lms
chown ubuntu:ubuntu /opt/bitflow-lms

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Server setup complete!                               ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║   Next steps:                                             ║"
echo "║   1. Log out and back in (for docker group)               ║"
echo "║   2. Copy your project to /opt/bitflow-lms                ║"
echo "║   3. Run: cd /opt/bitflow-lms && ./deploy.sh              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
