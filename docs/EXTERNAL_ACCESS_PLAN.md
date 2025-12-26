# External Access Deployment Plan
## Monomi Invoice Generator - Make Accessible from External

**Date**: October 21, 2025
**Current Status**: Development mode, local access only
**Server IPs**:
- Local Network: `192.168.88.248`
- Tailscale VPN: `100.120.172.66`
- Docker Bridge: `172.17.0.1`

---

## 📋 Table of Contents

1. [Current Setup Analysis](#current-setup-analysis)
2. [Deployment Scenarios](#deployment-scenarios)
3. [Quick Start Options](#quick-start-options)
4. [Detailed Implementation Plans](#detailed-implementation-plans)
5. [Security Checklist](#security-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🔍 Current Setup Analysis

### ✅ Already Configured
- ✅ Docker production compose file with nginx reverse proxy
- ✅ SSL/TLS configuration ready
- ✅ Security headers configured
- ✅ Rate limiting implemented
- ✅ Health checks configured
- ✅ Database backup system ready
- ✅ Tailscale VPN available (100.120.172.66)
- ✅ Port 3000 already bound to `0.0.0.0` (allows LAN access)

### ⚠️ Needs Configuration
- ⚠️ SSL certificates (self-signed or Let's Encrypt)
- ⚠️ Production environment variables
- ⚠️ Firewall rules
- ⚠️ Domain name (if public internet)
- ⚠️ DNS configuration (if public internet)

---

## 🎯 Deployment Scenarios

### Scenario 1: Local Network Access (Easiest)
**Use Case**: Access from devices on the same WiFi/LAN
**Time**: 5 minutes
**Cost**: Free
**Security**: Medium (firewall protected)

### Scenario 2: VPN Access (Recommended for Teams)
**Use Case**: Secure access from anywhere using Tailscale VPN
**Time**: 15 minutes
**Cost**: Free (Tailscale personal)
**Security**: High (encrypted tunnel)

### Scenario 3: Public Internet Access (Most Complex)
**Use Case**: Access from anywhere without VPN
**Time**: 1-2 hours
**Cost**: Domain ($10/year) + Optional VPS
**Security**: Requires careful configuration

---

## 🚀 Quick Start Options

### Option A: Local Network Access (5 Minutes)

**Status**: ✅ ALREADY WORKING! Port 3000 is bound to `0.0.0.0`

**Access URLs**:
- From any device on `192.168.88.x` network:
  - Frontend: `http://192.168.88.248:3000`
  - Backend API: `http://192.168.88.248:5000`

**Test from another device on your network**:
```bash
# From your phone/tablet/another computer on the same WiFi
curl http://192.168.88.248:5000/api/v1/health
```

**To allow access from other subnets** (if you have multiple networks):
```bash
# Edit firewall rules (Ubuntu/Debian)
sudo ufw allow from 192.168.0.0/16 to any port 3000 comment 'Invoice App Frontend'
sudo ufw allow from 192.168.0.0/16 to any port 5000 comment 'Invoice App Backend'
sudo ufw reload
```

---

### Option B: Tailscale VPN Access (15 Minutes)

**Status**: ✅ Tailscale is installed (IP: 100.120.172.66)

**Step 1**: Verify Tailscale is running
```bash
tailscale status
```

**Step 2**: Allow teammates to access
```bash
# Go to https://login.tailscale.com/admin/machines
# Share machine with team members
# OR invite them to your Tailnet
```

**Step 3**: Access from anywhere
```bash
# From any device with Tailscale installed:
curl http://100.120.172.66:5000/api/v1/health

# Access in browser:
http://100.120.172.66:3000  # Frontend
http://100.120.172.66:5000  # Backend API
```

**Step 4** (Optional): Add Tailscale MagicDNS
```bash
# Enable MagicDNS in Tailscale admin panel
# Access via friendly name instead of IP:
http://invoice-server.tail-xxxxx.ts.net:3000
```

**Firewall Rules** (allow Tailscale traffic):
```bash
sudo ufw allow in on tailscale0
sudo ufw reload
```

---

### Option C: Public Internet with Cloudflare Tunnel (30 Minutes, Free)

**No port forwarding required!** Cloudflare Tunnel creates a secure connection.

**Step 1**: Install Cloudflare Tunnel (cloudflared)
```bash
# Download and install
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login
```

**Step 2**: Create tunnel
```bash
# Create tunnel
cloudflared tunnel create invoice-app

# Note the Tunnel ID from output
# Example: Created tunnel invoice-app with id abc123-def456-ghi789
```

**Step 3**: Configure tunnel
```bash
# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: invoice-app
credentials-file: /home/jeff/.cloudflared/abc123-def456-ghi789.json

ingress:
  - hostname: invoice.yourdomain.com
    service: http://localhost:3000
  - hostname: api-invoice.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
EOF
```

**Step 4**: Route DNS
```bash
# Route your domain through Cloudflare
cloudflared tunnel route dns invoice-app invoice.yourdomain.com
cloudflared tunnel route dns invoice-app api-invoice.yourdomain.com
```

**Step 5**: Run tunnel
```bash
# Test run
cloudflared tunnel run invoice-app

# Install as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

**Access**: `https://invoice.yourdomain.com` (SSL automatic!)

---

## 📚 Detailed Implementation Plans

### Plan 1: Production Deployment with Docker Compose

#### Step 1: Prepare Environment Files

**Create `.env.production`**:
```bash
cat > .env.production << 'EOF'
# Database
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>
POSTGRES_PASSWORD=<SAME_AS_DB_PASSWORD>

# Security
JWT_SECRET=<GENERATE_RANDOM_64_CHAR_STRING>
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Email (Optional - configure your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<APP_PASSWORD>
FROM_EMAIL=noreply@monomi.finance

# Application
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
EOF
```

**Generate secure passwords**:
```bash
# Generate strong passwords
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 32  # REDIS_PASSWORD
```

#### Step 2: SSL Certificate Options

**Option A: Self-Signed SSL (for testing/internal)**
```bash
cd /home/jeff/projects/monomi/internal/invoice-generator/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Monomi/CN=invoice.local"
```

**Option B: Let's Encrypt (for public domains)**
```bash
# Install certbot
sudo apt update
sudo apt install -y certbot

# Get certificate (requires domain pointing to your server)
sudo certbot certonly --standalone \
  -d invoice.yourdomain.com \
  -d api-invoice.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Copy certificates
sudo cp /etc/letsencrypt/live/invoice.yourdomain.com/fullchain.pem \
  /home/jeff/projects/monomi/internal/invoice-generator/ssl/
sudo cp /etc/letsencrypt/live/invoice.yourdomain.com/privkey.pem \
  /home/jeff/projects/monomi/internal/invoice-generator/ssl/
sudo chown jeff:jeff /home/jeff/projects/monomi/internal/invoice-generator/ssl/*.pem

# Setup auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /home/jeff/projects/monomi/internal/invoice-generator/docker-compose.prod.yml restart nginx"
```

**Option C: Cloudflare Tunnel (automatic SSL)**
No certificates needed! Cloudflare handles SSL automatically.

#### Step 3: Update nginx Configuration

**Create `nginx/conf.d/app.conf`** (optional, for custom routes):
```bash
mkdir -p nginx/conf.d
cat > nginx/conf.d/app.conf << 'EOF'
# Additional nginx configuration
# This file is included by main nginx.conf

# Websocket support (if needed)
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
EOF
```

#### Step 4: Start Production Environment

```bash
cd /home/jeff/projects/monomi/internal/invoice-generator

# Stop development environment
docker compose -f docker-compose.dev.yml down

# Start production environment
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

#### Step 5: Firewall Configuration

**Ubuntu/Debian (ufw)**:
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp comment 'SSH'

# For Cloudflare Tunnel (no ports needed)
# Skip port opening, tunnel handles everything

# For Direct Access (port forwarding)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# For Tailscale
sudo ufw allow in on tailscale0

# Reload firewall
sudo ufw reload
sudo ufw status numbered
```

**CentOS/RHEL (firewalld)**:
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Step 6: Domain Configuration

**If using a domain name**:

1. **Purchase domain** (Namecheap, Cloudflare, etc.)
2. **Configure DNS**:
   ```
   Type    Name       Value              TTL
   A       @          <YOUR_PUBLIC_IP>   Auto
   A       invoice    <YOUR_PUBLIC_IP>   Auto
   A       api        <YOUR_PUBLIC_IP>   Auto
   CNAME   www        invoice            Auto
   ```

3. **Update nginx.conf**:
   ```bash
   # Edit line 75 in nginx/nginx.conf
   server_name invoice.yourdomain.com;
   ```

4. **Update .env.production**:
   ```bash
   FRONTEND_URL=https://invoice.yourdomain.com
   CORS_ORIGIN=https://invoice.yourdomain.com
   ```

---

### Plan 2: Port Forwarding (Home Internet)

**If your server is behind a home router**:

#### Step 1: Find Your Public IP
```bash
curl ifconfig.me
# Example: 203.0.113.45
```

#### Step 2: Router Configuration

**Access your router** (usually `192.168.1.1` or `192.168.0.1`):

1. Login to router admin panel
2. Find "Port Forwarding" or "Virtual Server" section
3. Add rules:
   ```
   Service Name: Invoice-HTTP
   External Port: 80
   Internal IP: 192.168.88.248
   Internal Port: 80
   Protocol: TCP

   Service Name: Invoice-HTTPS
   External Port: 443
   Internal IP: 192.168.88.248
   Internal Port: 443
   Protocol: TCP
   ```

#### Step 3: Dynamic DNS (for home internet with changing IP)

**Install ddclient**:
```bash
sudo apt install -y ddclient

# Configure for your provider (Cloudflare example)
sudo nano /etc/ddclient.conf
```

```ini
# Cloudflare DDNS
protocol=cloudflare
use=web
web=ipinfo.io/ip
login=your-cloudflare-email@example.com
password=your-cloudflare-api-token
zone=yourdomain.com
invoice.yourdomain.com
```

```bash
# Start service
sudo systemctl enable ddclient
sudo systemctl start ddclient
```

---

### Plan 3: VPS Deployment (Cloud Server)

**Recommended Providers**:
- DigitalOcean: $6/month (1GB RAM)
- Vultr: $6/month (1GB RAM)
- Linode: $5/month (1GB RAM)
- AWS Lightsail: $5/month (1GB RAM)

#### Step 1: Create VPS
- Choose Ubuntu 22.04 LTS
- Select datacenter near Indonesia (Singapore recommended)
- Add SSH key for security

#### Step 2: Initial Server Setup
```bash
# Connect via SSH
ssh root@your-vps-ip

# Create user
adduser jeff
usermod -aG sudo jeff
usermod -aG docker jeff

# Setup SSH key
su - jeff
mkdir ~/.ssh
chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys

# Secure SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Step 3: Deploy Application
```bash
# Clone repository
git clone <your-repo-url> ~/invoice-generator
cd ~/invoice-generator

# Copy environment file
cp .env.production.example .env.production
nano .env.production  # Configure

# Start production
docker compose -f docker-compose.prod.yml up -d
```

#### Step 4: Point Domain to VPS
```bash
# Get VPS IP
curl ifconfig.me

# Update DNS records
A    invoice    <VPS_IP>
A    api        <VPS_IP>
```

---

## 🔒 Security Checklist

### Essential Security Measures

- [ ] **Change default passwords** in `.env.production`
- [ ] **Generate strong JWT secret** (64+ characters)
- [ ] **Enable SSL/TLS** (Let's Encrypt or Cloudflare)
- [ ] **Configure firewall** (ufw/firewalld)
- [ ] **Disable root SSH login**
- [ ] **Enable fail2ban** for brute force protection
  ```bash
  sudo apt install -y fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```
- [ ] **Update nginx security headers** (already configured in nginx.conf)
- [ ] **Rate limiting enabled** (already configured)
- [ ] **Database not exposed** externally (good - only internal Docker network)
- [ ] **Redis password protected** (configure in production)
- [ ] **Regular backups** (backup service in docker-compose.prod.yml)
- [ ] **Setup monitoring** (Uptime Kuma, Prometheus + Grafana)
- [ ] **Log rotation** configured
  ```bash
  # Create logrotate config
  sudo nano /etc/logrotate.d/invoice-app
  ```
  ```
  /home/jeff/projects/monomi/internal/invoice-generator/logs/*.log {
      daily
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 jeff jeff
      sharedscripts
      postrotate
          docker compose -f /home/jeff/projects/monomi/internal/invoice-generator/docker-compose.prod.yml restart nginx
      endscript
  }
  ```

### Indonesian Specific Security

- [ ] **Materai digital compliance** (for invoices > 5 million IDR)
- [ ] **Data residency** (consider Indonesia datacenter)
- [ ] **Privacy policy** (GDPR/Indonesia equivalent)
- [ ] **Backup encryption** (for financial data)

---

## 📊 Monitoring & Maintenance

### Setup Monitoring

**Option 1: Uptime Kuma (Recommended)**
```bash
# Run Uptime Kuma
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --restart=always \
  louislam/uptime-kuma:1

# Access: http://192.168.88.248:3001
# Add monitors for:
# - https://invoice.yourdomain.com (HTTP 200)
# - https://invoice.yourdomain.com/api/v1/health (JSON "ok")
```

**Option 2: Prometheus + Grafana**
```yaml
# Add to docker-compose.prod.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=<SECURE_PASSWORD>
```

### Backup Strategy

**Automated Backups** (already in docker-compose.prod.yml):
```bash
# Check backup service
docker compose -f docker-compose.prod.yml logs backup

# Manual backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U invoiceuser invoices > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20251021.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U invoiceuser invoices
```

**Off-site Backups** (recommended):
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure cloud storage (Google Drive, Dropbox, S3, etc.)
rclone config

# Automated backup script
cat > /home/jeff/backup-to-cloud.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/home/jeff/projects/monomi/internal/invoice-generator/backup
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker compose -f /home/jeff/projects/monomi/internal/invoice-generator/docker-compose.prod.yml exec -T db \
  pg_dump -U invoiceuser invoices > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Upload to cloud
rclone copy $BACKUP_DIR/backup_$DATE.sql.gz remote:invoice-backups/

# Keep only last 30 days locally
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x /home/jeff/backup-to-cloud.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/jeff/backup-to-cloud.sh >> /home/jeff/backup.log 2>&1
```

### Health Monitoring

**Check health endpoints**:
```bash
# Application health
curl http://localhost:5000/api/v1/health

# Database health
docker compose -f docker-compose.prod.yml exec db \
  pg_isready -U invoiceuser -d invoices

# Redis health
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Container health
docker compose -f docker-compose.prod.yml ps
```

### Log Monitoring

```bash
# Real-time logs
docker compose -f docker-compose.prod.yml logs -f

# Application logs
docker compose -f docker-compose.prod.yml logs app

# Nginx access logs
docker compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log

# Check for errors
docker compose -f docker-compose.prod.yml logs | grep -i error
```

---

## 🎯 Recommended Approach for Your Use Case

Based on your setup (Tailscale available, home network), I recommend:

### **Quick Win: Tailscale Access (TODAY)**
1. ✅ Already working on `100.120.172.66`
2. Share Tailscale machine with team
3. Access: `http://100.120.172.66:3000`
4. **Time**: 5 minutes
5. **Cost**: Free
6. **Security**: Excellent (encrypted VPN)

### **Medium Term: Cloudflare Tunnel (THIS WEEK)**
1. Setup Cloudflare Tunnel (30 min)
2. Get free SSL certificate
3. Access: `https://invoice.yourdomain.com`
4. **Time**: 30 minutes
5. **Cost**: Domain only ($10/year)
6. **Security**: Excellent (no exposed ports)

### **Long Term: VPS Deployment (NEXT MONTH)**
1. Move to VPS in Singapore datacenter
2. Better performance for Indonesian users
3. 99.9% uptime SLA
4. **Time**: 2 hours
5. **Cost**: $5-10/month
6. **Security**: Configurable

---

## 📞 Support & Resources

**Documentation**:
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- Let's Encrypt: https://letsencrypt.org/getting-started/
- Tailscale: https://tailscale.com/kb/

**Monitoring**:
- Uptime Kuma: https://github.com/louislam/uptime-kuma
- Grafana: https://grafana.com/docs/

**Security**:
- fail2ban: https://www.fail2ban.org/
- ufw guide: https://www.digitalocean.com/community/tutorials/ufw-essentials-common-firewall-rules-and-commands

---

## ✅ Next Steps

Choose your deployment path and follow the corresponding section above. Start with the quickest option (Tailscale) and progressively move to more permanent solutions as needed.

**Questions to decide**:
1. Who needs access? (Team only vs. Public)
2. Where are users located? (Local network, Indonesia, Global)
3. What's your budget? (Free, $10/month, $50/month)
4. What's your technical expertise? (Beginner, Intermediate, Advanced)
5. How critical is uptime? (Development, Production, Business-critical)

Based on answers, I can provide specific step-by-step instructions.
