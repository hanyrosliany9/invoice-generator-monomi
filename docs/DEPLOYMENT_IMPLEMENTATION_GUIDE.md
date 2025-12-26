# Hybrid Deployment Implementation Guide
## VPS Reverse Proxy + Home PC Application Server

**Document Version:** 3.0
**Last Updated:** October 17, 2025

This guide provides step-by-step implementation for deploying Monomi Finance using a hybrid architecture with BiznetGio VPS (reverse proxy) and home PC (application server).

## 📌 Hybrid Architecture Deployment

**Two-Component Setup:**
- 🌐 **BiznetGio VPS (Jakarta)** - Internet-facing reverse proxy with Nginx
- 🏠 **Home PC (Ubuntu)** - Main application server with Docker + database
- 🔐 **Secure Tunnel** - Tailscale or WireGuard encrypted connection

**Access Pattern:**
```
Internet → VPS Public IP → Encrypted Tunnel → Home PC → Application
```

---

## 📋 Quick Reference - Your Configuration

**Key IP Addresses:**
- 🌐 **VPS Public IP:** `103.150.226.171` (BiznetGio Jakarta)
- 🏠 **Home PC Local IP:** `192.168.88.254` (static)
- 🔐 **Home PC Tailscale IP:** `100.114.215.21` (already installed)

**Access URLs:**
- **External (from anywhere):** `http://103.150.226.171`
- **Local (home network):** `http://192.168.88.254:5000`
- **Monitoring (Tailscale):** `http://100.114.215.21:3001`

**SSH to VPS:**
```bash
ssh root@103.150.226.171
```

**Default Admin Credentials (⚠️ CHANGE IMMEDIATELY!):**
- Email: `admin@monomi.id`
- Password: `password123`

---

## 🚀 Quick Overview

### Prerequisites
**Home PC:**
- Ubuntu (already installed)
- 6 cores CPU, 16GB RAM (✅ you have this)
- Local IP: 192.168.88.254
- Docker (already installed - I see multiple Docker networks)
- Tailscale (already installed - 100.114.215.21)
- External HDD for backups

**BiznetGio VPS:**
- Ubuntu 24.04 LTS (already installed)
- 1 vCPU, 2GB RAM, 50GB disk
- Public IP: **103.150.226.171**
- Root/sudo access

**Total Deployment Time:** 3-3.5 hours

---

## 🗺️ Deployment Roadmap

```
Phase 1: Home PC Setup (45 min)
   └─> Install Docker, configure static IP, test locally

Phase 2: Tunnel Configuration (30 min)
   └─> Setup Tailscale (recommended) or WireGuard

Phase 3: VPS Setup (30 min)
   └─> Install Nginx, configure firewall

Phase 4: Application Deployment (30 min)
   └─> Deploy Docker stack on home PC

Phase 5: Reverse Proxy Config (20 min)
   └─> Configure Nginx on VPS to proxy to home PC

Phase 6: Testing & Verification (30 min)
   └─> Test local access, tunnel, and external access

Phase 7: Monitoring Setup (20 min)
   └─> Setup Prometheus/Grafana on home PC

Phase 8: Backup Configuration (15 min)
   └─> Configure backups to external HDD
```

---

## PART A: HOME PC SETUP

## Phase 1: Home PC Initial Setup (45 minutes)

### Step 1.1: Update System

```bash
# On your home PC
# Update system packages
sudo apt update && sudo apt upgrade -y

# Set timezone to Indonesia (WIB)
sudo timedatectl set-timezone Asia/Jakarta

# Install essential packages
sudo apt install -y \
  curl \
  git \
  htop \
  ncdu \
  net-tools \
  speedtest-cli
```

### Step 1.2: Verify Docker Installation

```bash
# Check Docker (you already have it installed)
docker --version
docker-compose --version

# If not installed, run:
# curl -fsSL https://get.docker.com -o get-docker.sh
# sudo sh get-docker.sh

# Add your user to docker group (if not already)
sudo usermod -aG docker $USER

# Logout and login again for group changes to take effect
```

### Step 1.3: Configure Static Local IP (Recommended)

```bash
# Your current IP: 192.168.88.254
# Let's make it static so it doesn't change

# Check your network interface name
ip addr show

# Should see 'enp2s0' with 192.168.88.254

# Edit netplan configuration
sudo nano /etc/netplan/01-netcfg.yaml
```

Add this configuration (adjust to your network):
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp2s0:
      dhcp4: no
      addresses:
        - 192.168.88.254/24
      gateway4: 192.168.88.1  # Your router IP
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
# Apply configuration
sudo netplan apply

# Verify IP is still 192.168.88.254
ip addr show enp2s0
```

### Step 1.4: Prepare External HDD for Backups

```bash
# List all disks
lsblk

# Identify your external HDD (e.g., /dev/sdb1)
# Format it if needed (⚠️ THIS WILL ERASE ALL DATA!)
# sudo mkfs.ext4 /dev/sdb1

# Create mount point
sudo mkdir -p /mnt/backup-hdd

# Get UUID of your external HDD
sudo blkid /dev/sdb1

# Add to /etc/fstab for auto-mount (replace UUID)
echo "UUID=your-uuid-here /mnt/backup-hdd ext4 defaults 0 2" | sudo tee -a /etc/fstab

# Mount it
sudo mount -a

# Verify
df -h | grep backup-hdd

# Create backup directory
sudo mkdir -p /mnt/backup-hdd/monomi-finance-backups
sudo chown $USER:$USER /mnt/backup-hdd/monomi-finance-backups
```

### Step 1.5: Clone Application Repository

```bash
# Create application directory
mkdir -p ~/monomi-finance
cd ~/monomi-finance

# Clone your repository
# Replace with your actual repo URL
git clone <your-repo-url> .

# Or copy from your development machine
# rsync -avz --exclude 'node_modules' --exclude '.git' \
#   /path/to/local/project/ ~/monomi-finance/
```

---

## Phase 2: Tunnel Configuration (30 minutes)

### **OPTION A: Tailscale Setup** ⭐ **RECOMMENDED** (You already have it!)

#### Step 2A.1: Verify Tailscale on Home PC

```bash
# Check Tailscale status (you already have it installed!)
sudo tailscale status

# Should show your Tailscale IP: 100.114.215.21

# If not running, start it
sudo tailscale up

# Verify your Tailscale IP
tailscale ip -4
# Should output: 100.114.215.21

# Enable Tailscale to start on boot
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

#### Step 2A.2: Install Tailscale on BiznetGio VPS

**SSH to your VPS first:**
```bash
# From your home PC, SSH to VPS
ssh root@103.150.226.171
```

**On VPS:**
```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale and login
sudo tailscale up

# This will give you a URL like:
# https://login.tailscale.com/a/xxxxx
# Open it in browser and login with THE SAME ACCOUNT as your home PC

# After login, check status
sudo tailscale status

# Should show your VPS in the Tailscale network
# Note the VPS Tailscale IP (e.g., 100.x.x.x)

# Enable on boot
sudo systemctl enable tailscaled
```

#### Step 2A.3: Test Connectivity

**On VPS, test connection to home PC:**
```bash
# Ping your home PC via Tailscale
ping 100.114.215.21

# Should get response with 5-15ms latency

# Try to reach a port (we'll open port 5000 for the app later)
# This will fail now, but that's OK - we're just testing tunnel
telnet 100.114.215.21 22
```

✅ **Tailscale setup complete!** Skip to Phase 3.

---

### **OPTION B: WireGuard Setup** (Skip if using Tailscale)

#### Step 2B.1: Install WireGuard on Home PC

```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys for home PC
cd /etc/wireguard
sudo wg genkey | sudo tee privatekey | sudo wg pubkey | sudo tee publickey

# Save these keys - you'll need them
HOME_PRIVATE_KEY=$(sudo cat privatekey)
HOME_PUBLIC_KEY=$(sudo cat publickey)
echo "Home PC Public Key: $HOME_PUBLIC_KEY"
```

#### Step 2B.2: Install WireGuard on VPS

**SSH to VPS:**
```bash
ssh root@103.150.226.171
```

**On VPS:**
```bash
# Install WireGuard
apt install wireguard

# Generate keys for VPS
cd /etc/wireguard
wg genkey | tee privatekey | wg pubkey | tee publickey

# Save these keys
VPS_PRIVATE_KEY=$(cat privatekey)
VPS_PUBLIC_KEY=$(cat publickey)
echo "VPS Public Key: $VPS_PUBLIC_KEY"
```

#### Step 2B.3: Configure WireGuard on Home PC

**On home PC:**
```bash
# Create WireGuard config
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = <HOME_PRIVATE_KEY>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <VPS_PUBLIC_KEY>
AllowedIPs = 10.0.0.2/32
PersistentKeepalive = 25
```

```bash
# Start WireGuard
sudo wg-quick up wg0

# Enable on boot
sudo systemctl enable wg-quick@wg0

# Check status
sudo wg show
```

#### Step 2B.4: Configure WireGuard on VPS

**On VPS:**
```bash
# Note: You need your home's PUBLIC IP for this
# Find it by: curl ifconfig.me (from home PC)

# Create WireGuard config
nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = <VPS_PRIVATE_KEY>
Address = 10.0.0.2/24

[Peer]
PublicKey = <HOME_PUBLIC_KEY>
Endpoint = <YOUR_HOME_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25
```

```bash
# Start WireGuard
wg-quick up wg0

# Enable on boot
systemctl enable wg-quick@wg0

# Test connectivity
ping 10.0.0.1
```

---

## PART B: VPS SETUP

## Phase 3: VPS Initial Setup (30 minutes)

### Step 3.1: Update VPS System

**SSH to VPS:**
```bash
ssh root@103.150.226.171
```

**On VPS:**
```bash
# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Jakarta

# Install required packages
apt install -y \
  nginx \
  ufw \
  fail2ban \
  curl \
  htop \
  certbot  # Optional - if you want SSL later
```

### Step 3.2: Configure VPS Firewall

```bash
# Allow SSH (default port 22, or change to custom)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (if you want SSL later)
ufw allow 443/tcp

# Allow Tailscale port (if using Tailscale)
ufw allow 41641/udp

# OR allow WireGuard port (if using WireGuard)
# ufw allow 51820/udp

# Enable firewall
ufw default deny incoming
ufw default allow outgoing
ufw --force enable

# Check status
ufw status verbose
```

### Step 3.3: Configure Fail2ban

```bash
# Create jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

# Start Fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Check status
fail2ban-client status
```

---

## PART C: APPLICATION DEPLOYMENT

## Phase 4: Deploy Application on Home PC (30 minutes)

### Step 4.1: Create Environment File

**On home PC:**
```bash
cd ~/monomi-finance

# Create .env.production
nano .env.production
```

Paste this (update with your values):
```bash
# Database Configuration
DB_PASSWORD=<generate with: openssl rand -base64 32>

# JWT Secret
JWT_SECRET=<generate with: openssl rand -base64 64>

# Redis Password
REDIS_PASSWORD=<generate with: openssl rand -base64 32>

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreply@yourcompany.com

# Application URLs
# Use VPS public IP for external access
CORS_ORIGIN=http://103.150.226.171
FRONTEND_URL=http://103.150.226.171

# Alternative: Use Tailscale IP (internal only):
# CORS_ORIGIN=http://100.114.215.21
# FRONTEND_URL=http://100.114.215.21

# Logging
LOG_LEVEL=info

# Grafana
GRAFANA_PASSWORD=<generate with: openssl rand -base64 32>
```

```bash
# Secure the file
chmod 600 .env.production

# Generate passwords
echo "DB Password:"
openssl rand -base64 32

echo "JWT Secret:"
openssl rand -base64 64

echo "Redis Password:"
openssl rand -base64 32

echo "Grafana Password:"
openssl rand -base64 32

# Copy these into .env.production
```

### Step 4.2: Deploy Docker Containers

```bash
cd ~/monomi-finance

# Load environment variables
export $(cat .env.production | xargs)

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
# (Press Ctrl+C to exit)

# Check container status (wait 2-3 minutes)
docker-compose -f docker-compose.prod.yml ps

# Should see all containers "Up" or "Up (healthy)"
```

### Step 4.3: Initialize Database

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"

# Seed database with initial data
docker-compose -f docker-compose.prod.yml exec app sh -c "cd backend && npm run db:seed"

# This creates default admin: admin@monomi.id / password123
```

### Step 4.4: Test Local Access

```bash
# Test health endpoint
curl http://192.168.88.254:5000/health
# Expected: {"status":"ok"}

# Test API
curl http://192.168.88.254:5000/api/v1/health

# Open in browser (from another device on same network)
# http://192.168.88.254:5000
```

✅ **Application is running locally!**

---

## Phase 5: Configure Nginx Reverse Proxy on VPS (20 minutes)

### Step 5.1: Create Nginx Configuration

**On VPS:**
```bash
# Remove default config
rm /etc/nginx/sites-enabled/default

# Create new config for Monomi Finance
nano /etc/nginx/sites-available/monomi-finance
```

**If using Tailscale (recommended):**
```nginx
upstream home_pc {
    server 100.114.215.21:5000;  # Your home PC Tailscale IP
    keepalive 32;
}

server {
    listen 80;
    server_name _;  # Accept any domain/IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/monomi-access.log;
    error_log /var/log/nginx/monomi-error.log;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    location / {
        proxy_pass http://home_pc;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # Keep-alive
        proxy_set_header Connection "";
    }

    # WebSocket support (if needed later)
    location /ws {
        proxy_pass http://home_pc;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**If using WireGuard:**
```nginx
# Replace 100.114.215.21 with 10.0.0.1 in the config above
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/monomi-finance /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Should see: syntax is ok, test is successful

# Restart Nginx
systemctl restart nginx

# Check status
systemctl status nginx
```

---

## Phase 6: Testing & Verification (30 minutes)

### Step 6.1: Test VPS → Home PC Connectivity

**On VPS:**
```bash
# Test if VPS can reach home PC via Tailscale
ping 100.114.215.21

# Test if app port is accessible
curl http://100.114.215.21:5000/health

# Should return: {"status":"ok"}
```

### Step 6.2: Test External Access

**From your phone/laptop (NOT on home network):**
```bash
# Your VPS public IP is: 103.150.226.171

# From external device, access:
http://103.150.226.171

# Should load the Monomi Finance login page!
```

### Step 6.3: Test Login

```
1. Open browser: http://103.150.226.171
2. Login with:
   Email: admin@monomi.id
   Password: password123
3. ⚠️ CHANGE PASSWORD IMMEDIATELY after first login!
```

### Step 6.4: Test From Cafe/Mobile

**From cafe WiFi or mobile data:**
```
1. Open: http://103.150.226.171
2. Should work from anywhere in the world!
3. Login and test creating a client/project
```

---

## Phase 7: Monitoring Setup (20 minutes)

### Step 7.1: Access Grafana (on Home PC)

**From any device on Tailscale network:**
```
1. Open: http://100.114.215.21:3001
2. Login: admin / <your-grafana-password>
3. Add dashboards for monitoring
```

**Or access via VPS (add to nginx config):**
```nginx
# On VPS, add to nginx config:
location /grafana/ {
    proxy_pass http://100.114.215.21:3001/;
    # ... same proxy settings
}
```

Then access via: `http://103.150.226.171/grafana`

### Step 7.2: Monitor Tunnel Health

**Create simple monitoring script on VPS:**
```bash
# On VPS
cat > /usr/local/bin/check-tunnel.sh << 'EOF'
#!/bin/bash
# Check if home PC is reachable

if ! ping -c 1 100.114.215.21 > /dev/null 2>&1; then
    echo "$(date): Home PC unreachable via Tailscale!" | tee -a /var/log/tunnel-check.log
    systemctl restart tailscaled
else
    echo "$(date): Tunnel OK" >> /var/log/tunnel-check.log
fi
EOF

chmod +x /usr/local/bin/check-tunnel.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-tunnel.sh") | crontab -
```

---

## Phase 8: Backup Configuration (15 minutes)

### Step 8.1: Configure Backups to External HDD

**On home PC:**
```bash
# Create backup script
cat > ~/monomi-finance/scripts/backup-to-external.sh << 'EOF'
#!/bin/bash
# Backup Monomi Finance to External HDD

BACKUP_DIR="/mnt/backup-hdd/monomi-finance-backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="$HOME/monomi-finance"

echo "Starting backup at $(date)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
docker-compose -f "$APP_DIR/docker-compose.prod.yml" exec -T db \
  pg_dump -U invoiceuser invoices > "$BACKUP_DIR/db_$DATE.sql"

# Backup Docker volumes
echo "Backing up Docker volumes..."
tar -czf "$BACKUP_DIR/volumes_$DATE.tar.gz" \
  -C "$APP_DIR" \
  uploads storage logs .env.production

# Cleanup old backups (keep last 30 days)
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "db_*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "volumes_*.tar.gz" -mtime +30 -delete

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -5
EOF

chmod +x ~/monomi-finance/scripts/backup-to-external.sh

# Test backup
~/monomi-finance/scripts/backup-to-external.sh

# Check if backup was created
ls -lh /mnt/backup-hdd/monomi-finance-backups/
```

### Step 8.2: Schedule Automatic Backups

```bash
# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "# Daily backup to external HDD") | crontab -
(crontab -l; echo "0 2 * * * $HOME/monomi-finance/scripts/backup-to-external.sh >> $HOME/monomi-finance/logs/backup.log 2>&1") | crontab -

# Verify crontab
crontab -l
```

---

## 🎉 Deployment Complete!

### ✅ What You Have Now

**Home PC:**
- ✅ Application running in Docker
- ✅ PostgreSQL database with all business data
- ✅ Tailscale VPN connected
- ✅ Monitoring (Grafana/Prometheus/Loki)
- ✅ Automated backups to external HDD
- ✅ Local IP: 192.168.88.254
- ✅ Tailscale IP: 100.114.215.21

**BiznetGio VPS:**
- ✅ Nginx reverse proxy running
- ✅ Tailscale VPN connected
- ✅ Firewall (UFW) configured
- ✅ Fail2ban protection active
- ✅ Public IP accessible from internet

**Access Methods:**
1. **From Home Network:** `http://192.168.88.254:5000`
2. **From Anywhere (Internet):** `http://103.150.226.171`
3. **From Cafe/Mobile:** `http://103.150.226.171`
4. **Monitoring:** `http://100.114.215.21:3001` (Tailscale only)

---

## 📊 Next Steps

### 1. Change Default Passwords
```
Login: http://103.150.226.171
Email: admin@monomi.id
Password: password123

⚠️ CHANGE THIS IMMEDIATELY!
```

### 2. Optional: Add Domain Name + SSL

If you want `https://finance.yourdomain.com` instead of IP:

**On VPS:**
```bash
# Install certbot (already installed in Phase 3)

# Get SSL certificate
certbot --nginx -d yourdomain.com

# Certbot will auto-configure Nginx for HTTPS
# Auto-renewal is set up automatically
```

### 3. Test UPS (When You Get It)

```bash
# On home PC, simulate power outage
# Verify:
# 1. PC stays on with UPS
# 2. Tailscale auto-reconnects when internet returns
# 3. Application resumes serving
```

---

## 🆘 Troubleshooting

### Issue: Can't Access from Internet

**Check VPS:**
```bash
# SSH to VPS
ssh root@103.150.226.171

# Check Nginx
systemctl status nginx
curl http://localhost

# Check if VPS can reach home PC
ping 100.114.215.21
curl http://100.114.215.21:5000/health

# Check Nginx logs
tail -f /var/log/nginx/monomi-error.log
```

**Check Home PC:**
```bash
# Check Docker containers
docker-compose -f ~/monomi-finance/docker-compose.prod.yml ps

# Check Tailscale
sudo tailscale status

# Check if app is responding
curl http://localhost:5000/health
```

### Issue: Slow Performance

```bash
# On VPS, check latency to home PC
ping 100.114.215.21
# Should be < 20ms

# On home PC, check resources
docker stats

# Check database performance
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs db | tail -50
```

### Issue: Tunnel Disconnected

**Tailscale:**
```bash
# On both VPS and home PC
sudo systemctl restart tailscaled
sudo tailscale status

# Check logs
sudo journalctl -u tailscaled -f
```

---

## 📝 Useful Commands

### Home PC Commands
```bash
# View all containers
docker-compose -f ~/monomi-finance/docker-compose.prod.yml ps

# View logs
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs -f

# Restart app
docker-compose -f ~/monomi-finance/docker-compose.prod.yml restart

# Manual backup
~/monomi-finance/scripts/backup-to-external.sh

# Check disk space
df -h
```

### VPS Commands
```bash
# Restart Nginx
systemctl restart nginx

# Check Nginx status
systemctl status nginx

# View Nginx logs
tail -f /var/log/nginx/monomi-error.log

# Check tunnel connectivity
ping 100.114.215.21
```

---

**Deployment Status:** ✅ **COMPLETE**

**Access URL:** `http://103.150.226.171`

**Architecture:** Hybrid (VPS Reverse Proxy + Home PC Application Server)

**Total Cost:** $0/month (using existing resources)
