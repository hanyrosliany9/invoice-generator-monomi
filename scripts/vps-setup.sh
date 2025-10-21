#!/bin/bash

# VPS Setup Script for Biznet Gio
# Indonesian Business Management System
# This script prepares a fresh Ubuntu/Debian VPS for deployment

set -e

echo "======================================"
echo "🚀 Biznet Gio VPS Setup Script"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script should be run as root or with sudo"
    echo "Usage: sudo bash vps-setup.sh"
    exit 1
fi

# Get VPS IP address
VPS_IP=$(hostname -I | awk '{print $1}')
echo "📍 Detected VPS IP: $VPS_IP"
echo ""

# Step 1: Update system
echo "1️⃣  Updating system packages..."
apt update
apt upgrade -y
echo "✅ System updated"
echo ""

# Step 2: Install essential tools
echo "2️⃣  Installing essential tools..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    net-tools \
    ufw \
    fail2ban \
    unattended-upgrades \
    ca-certificates \
    gnupg \
    lsb-release
echo "✅ Essential tools installed"
echo ""

# Step 3: Install Docker
echo "3️⃣  Installing Docker..."

# Remove old Docker installations
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Test Docker
if docker run hello-world &>/dev/null; then
    echo "✅ Docker installed successfully"
else
    echo "❌ Docker installation failed"
    exit 1
fi
echo ""

# Step 4: Configure firewall
echo "4️⃣  Configuring firewall..."

# Enable UFW
ufw --force enable

# Allow SSH (CRITICAL!)
ufw allow 22/tcp
echo "✅ SSH port 22 allowed"

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
echo "✅ HTTP/HTTPS ports allowed"

# Deny all other incoming by default
ufw default deny incoming
ufw default allow outgoing

# Show firewall status
ufw status verbose
echo "✅ Firewall configured"
echo ""

# Step 5: Configure Fail2Ban
echo "5️⃣  Configuring Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban
echo "✅ Fail2Ban configured"
echo ""

# Step 6: Enable automatic security updates
echo "6️⃣  Enabling automatic security updates..."
dpkg-reconfigure -plow unattended-upgrades
echo "✅ Automatic updates enabled"
echo ""

# Step 7: Create application directory
echo "7️⃣  Creating application directory..."
mkdir -p /opt/invoice-generator
chmod 755 /opt/invoice-generator
echo "✅ Application directory created: /opt/invoice-generator"
echo ""

# Step 8: System information
echo "======================================"
echo "📊 System Information"
echo "======================================"
echo "VPS IP Address: $VPS_IP"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker compose version)"
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk Space: $(df -h / | awk 'NR==2 {print $4}') available"
echo ""

# Step 9: Show next steps
echo "======================================"
echo "✅ VPS Setup Complete!"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Transfer your application files:"
echo "   On your local machine, run:"
echo "   rsync -avz --progress \\"
echo "     --exclude='node_modules' --exclude='.git' \\"
echo "     /path/to/invoice-generator/ \\"
echo "     root@$VPS_IP:/opt/invoice-generator/"
echo ""
echo "2. SSH into your VPS:"
echo "   ssh root@$VPS_IP"
echo ""
echo "3. Configure environment variables:"
echo "   cd /opt/invoice-generator"
echo "   nano .env.production"
echo ""
echo "4. Run deployment:"
echo "   ./scripts/deploy.sh"
echo ""
echo "5. Access your application:"
echo "   http://$VPS_IP"
echo ""
echo "======================================"
echo "📖 Full deployment guide:"
echo "   See BIZNET_GIO_DEPLOYMENT_GUIDE.md"
echo "======================================"
