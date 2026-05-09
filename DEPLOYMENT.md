# Bitflow LMS — Deployment Guide

## Architecture

```
GitHub (main branch)
    │
    ├── CI Pipeline (ci.yml)
    │     ├── Backend TypeScript check
    │     ├── Frontend build validation
    │     ├── Unit tests
    │     ├── Docker build test
    │     └── DB schema integrity
    │
    └── CD Pipeline (deploy.yml) — on push to main
          ├── SSH into EC2
          ├── Backup database
          ├── git pull latest code
          ├── docker compose build + up
          ├── Health check
          └── Auto-rollback on failure
```

## One-Time Setup

### 1. Add GitHub Actions Secrets

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Value | Where to get it |
|--------|-------|-----------------|
| `EC2_HOST` | Your EC2 public IP | AWS Console → EC2 → Instances |
| `EC2_USER` | `ubuntu` | Standard for Ubuntu AMIs |
| `EC2_SSH_KEY` | Contents of `LMS_mumbai.pem` | Run: `cat LMS_mumbai.pem` |

To get the PEM key content:
```bash
cat /path/to/LMS_mumbai.pem
```
Copy the entire output (including `-----BEGIN RSA PRIVATE KEY-----`) as the secret value.

### 2. Setup EC2 Server (first time only)

SSH into your EC2 instance:
```bash
ssh -i LMS_mumbai.pem ubuntu@YOUR_EC2_IP
```

Run the setup script:
```bash
# Install Docker, Docker Compose, Git
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu
newgrp docker

# Clone the repo
git clone git@github.com:Env1sage/LMS_MED.git /opt/bitflow-lms
cd /opt/bitflow-lms

# Configure production environment
cp .env.production .env
nano .env  # Fill in real values
```

**Required `.env` values on the server:**
```env
DB_USER=bitflow_user
DB_PASSWORD=<strong-random-password>
DB_NAME=bitflow_lms
JWT_SECRET=<generate: openssl rand -base64 64>
ALLOWED_ORIGINS=http://YOUR_EC2_IP
REACT_APP_API_URL=/api
SMTP_USER=ameyahivarkar@gmail.com
SMTP_PASS=<gmail-app-password>
```

### 3. Initial Deploy

From EC2:
```bash
cd /opt/bitflow-lms
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Import your local database
PGPASSWORD=postgres pg_dump -h localhost -U postgres bitflow_lms | \
  docker exec -i bitflow-postgres psql -U bitflow_user bitflow_lms
```

### 4. Setup GitHub Deploy Key (so EC2 can pull from GitHub)

On EC2:
```bash
ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

Add the public key to: **GitHub → Repo → Settings → Deploy keys** (read access only).

Configure SSH on EC2:
```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
  StrictHostKeyChecking no
EOF
```

## Daily Workflow (After Setup)

```
1. Make code changes locally
2. git commit && git push origin main
3. GitHub Actions runs CI (≈3-5 min)
4. If CI passes → auto-deploys to EC2 (≈5-8 min)
5. App updated at http://YOUR_EC2_IP
```

## Useful Commands on EC2

```bash
# View all container status
docker compose -f docker-compose.prod.yml ps

# View backend logs
docker logs bitflow-backend -f

# View nginx logs
docker logs bitflow-nginx -f

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Manual deploy (without CI)
cd /opt/bitflow-lms && git pull && \
  docker compose -f docker-compose.prod.yml build && \
  docker compose -f docker-compose.prod.yml up -d
```

## SSL Setup (when you have a domain)

```bash
# From EC2, after pointing DNS to your IP
bash deploy/setup-ssl.sh yourdomain.com
```
