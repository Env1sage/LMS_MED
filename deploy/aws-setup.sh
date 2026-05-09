#!/bin/bash
# ============================================================
#  AWS Infrastructure Setup via CLI
# ============================================================
#  Creates EC2 instance + Security Group + Key Pair
#  Region: ap-southeast-2 (Sydney) — matching your AWS account
#
#  Prerequisites:
#    1. Install AWS CLI: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install
#    2. Configure: aws configure  (use your Access Key ID + Secret)
#
#  Usage: chmod +x deploy/aws-setup.sh && ./deploy/aws-setup.sh
# ============================================================

set -euo pipefail

# ── Configuration ──
AWS_REGION="ap-southeast-2"
INSTANCE_TYPE="t3.small"        # 2 vCPU, 2GB RAM — cheapest that works ($0.026/hr ≈ $19/month)
AMI_ID="ami-0310483fb2b488153" # Ubuntu 24.04 LTS ap-southeast-2 (verify latest)
KEY_NAME="bitflow-lms-key"
SG_NAME="bitflow-lms-sg"
INSTANCE_NAME="bitflow-lms-prod"
VOLUME_SIZE=30                  # GB

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✅]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $1"; }
error() { echo -e "${RED}[❌]${NC} $1"; exit 1; }

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Bitflow Medical LMS — AWS Infrastructure Setup              ║"
echo "║   Region: ap-southeast-2 (Sydney)                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# ── Check AWS CLI ──
command -v aws >/dev/null 2>&1 || error "AWS CLI not installed. Install it first:\n  curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'\n  unzip awscliv2.zip && sudo ./aws/install"

aws sts get-caller-identity >/dev/null 2>&1 || error "AWS CLI not configured. Run: aws configure"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
success "AWS Account: $ACCOUNT_ID | Region: $AWS_REGION"

# ── Step 1: Get latest Ubuntu 24.04 AMI ──
log "Finding latest Ubuntu 24.04 AMI..."
AMI_ID=$(aws ec2 describe-images \
    --region "$AWS_REGION" \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
              "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text 2>/dev/null || echo "$AMI_ID")
success "AMI: $AMI_ID (Ubuntu 24.04 LTS)"

# ── Step 2: Create Key Pair ──
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    warn "Key pair '$KEY_NAME' already exists. Reusing."
else
    log "Creating SSH key pair..."
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --region "$AWS_REGION" \
        --query 'KeyMaterial' \
        --output text > "${KEY_NAME}.pem"
    chmod 400 "${KEY_NAME}.pem"
    success "Key pair created → ./${KEY_NAME}.pem"
    warn "⚠️  SAVE THIS FILE! You cannot download it again!"
fi

# ── Step 3: Create Security Group ──
VPC_ID=$(aws ec2 describe-vpcs --region "$AWS_REGION" --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 describe-security-groups \
    --region "$AWS_REGION" \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    log "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SG_NAME" \
        --description "Bitflow Medical LMS - HTTP/HTTPS/SSH" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text)

    # SSH (port 22)
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    # HTTP (port 80)
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    # HTTPS (port 443)
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    success "Security group created: $SG_ID (SSH + HTTP + HTTPS)"
else
    success "Security group exists: $SG_ID"
fi

# ── Step 4: Launch EC2 Instance ──
EXISTING=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters "Name=tag:Name,Values=$INSTANCE_NAME" "Name=instance-state-name,Values=running,stopped" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null || echo "None")

if [ "$EXISTING" != "None" ] && [ -n "$EXISTING" ]; then
    warn "Instance '$INSTANCE_NAME' already exists: $EXISTING"
    INSTANCE_ID="$EXISTING"
else
    log "Launching EC2 instance ($INSTANCE_TYPE)..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --region "$AWS_REGION" \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SG_ID" \
        --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":${VOLUME_SIZE},\"VolumeType\":\"gp3\"}}]" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    success "Instance launched: $INSTANCE_ID"
fi

# ── Step 5: Wait for instance ──
log "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

success "Instance running at: $PUBLIC_IP"

# ── Step 6: Wait for SSH ──
log "Waiting for SSH to be ready (30-60 seconds)..."
for i in {1..30}; do
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "${KEY_NAME}.pem" ubuntu@"$PUBLIC_IP" "echo ready" >/dev/null 2>&1; then
        success "SSH is ready"
        break
    fi
    [ $i -eq 30 ] && warn "SSH not ready yet. Try manually in a minute."
    sleep 5
done

# ── Save connection info ──
cat > deploy/aws-connection.env <<EOF
# AWS Connection Info — $(date)
EC2_HOST=$PUBLIC_IP
EC2_INSTANCE_ID=$INSTANCE_ID
EC2_KEY_FILE=$(pwd)/${KEY_NAME}.pem
EC2_REGION=$AWS_REGION
EC2_SG_ID=$SG_ID
SSH_COMMAND="ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   ✅ AWS Infrastructure Ready!                                ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
printf "║   Instance ID:  %-42s  ║\n" "$INSTANCE_ID"
printf "║   Public IP:    %-42s  ║\n" "$PUBLIC_IP"
printf "║   Region:       %-42s  ║\n" "$AWS_REGION"
printf "║   Key File:     %-42s  ║\n" "${KEY_NAME}.pem"
echo "║                                                               ║"
echo "║   Connect:                                                    ║"
echo "║     ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo "║                                                               ║"
echo "║   Next steps:                                                 ║"
echo "║     1. SSH into the server (command above)                    ║"
echo "║     2. Run: sudo bash /tmp/setup-server.sh                   ║"
echo "║     3. Deploy the app                                        ║"
echo "║                                                               ║"
echo "║   Or run the full deploy:                                     ║"
echo "║     ./deploy/aws-deploy-full.sh                               ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
