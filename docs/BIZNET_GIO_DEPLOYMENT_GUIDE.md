# Biznet Gio VPS Deployment Guide
# Indonesian Business Management System

## 🎯 Overview

This guide will help you deploy your Invoice Generator application to your new Biznet Gio VPS with a public IP address.

**Deployment Type**: Production-ready with Docker, PostgreSQL, Redis, and Nginx
**Target Server**: Biznet Gio VPS (Ubuntu/Debian recommended)
**Access Method**: Public IP address

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- ✅ Biznet Gio VPS access credentials (IP, username, password)
- ✅ Root or sudo access to the server
- ✅ Your VPS public IP address (e.g., 103.xxx.xxx.xxx)
- ✅ SSH client installed on your local machine
- ✅ (Optional) Domain name pointed to your VPS IP

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your VPS

From your local machine, SSH into your Biznet Gio VPS:

```bash
# Replace with your actual IP and username
ssh root@YOUR_VPS_IP

# Or if using non-root user:
ssh username@YOUR_VPS_IP
```

**First-time login tips**:
- Accept the SSH fingerprint when prompted
- You may be asked to change your password on first login
- Note: Connection may take 10-30 seconds

---

### Step 2: Initial Server Setup

Once logged into your VPS, update the system:

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop ufw
```

---

### Step 3: Install Docker and Docker Compose

Install Docker Engine:

```bash
# Remove old Docker installations
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install Docker dependencies
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify Docker installation
sudo docker --version
sudo docker compose version

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

**Verification**:
```bash
# Test Docker
docker run hello-world

# Should output "Hello from Docker!"
```

---

### Step 4: Configure Firewall

Set up UFW (Uncomplicated Firewall):

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status verbose
```

**Expected output**:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                     ALLOW       Anywhere
```

---

### Step 5: Transfer Application Files to VPS

**Option A: Using Git (Recommended if you have a repository)**

```bash
# On VPS
cd /opt
sudo mkdir invoice-generator
sudo chown $USER:$USER invoice-generator
cd invoice-generator

# Clone your repository
git clone https://github.com/YOUR_USERNAME/invoice-generator.git .

# Or if private repo:
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/invoice-generator.git .
```

**Option B: Using SCP (Copy from your local machine)**

```bash
# On your LOCAL machine (not VPS)
cd /home/jeff/projects/monomi/internal/invoice-generator

# Create a tarball (excludes node_modules, .git, etc.)
tar -czf invoice-generator.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='*.log' \
  .

# Copy to VPS
scp invoice-generator.tar.gz root@YOUR_VPS_IP:/opt/

# Then on VPS:
ssh root@YOUR_VPS_IP
cd /opt
mkdir invoice-generator
cd invoice-generator
tar -xzf ../invoice-generator.tar.gz
rm ../invoice-generator.tar.gz
```

**Option C: Using rsync (Faster for updates)**

```bash
# On your LOCAL machine
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='build' \
  /home/jeff/projects/monomi/internal/invoice-generator/ \
  root@YOUR_VPS_IP:/opt/invoice-generator/
```

---

### Step 6: Configure Environment Variables

On your VPS, create production environment file:

```bash
cd /opt/invoice-generator

# Create production environment file
nano .env.production
```

**Copy and customize this configuration**:

```bash
# Production Environment Variables

# Database Credentials
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD_HERE

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
FROM_EMAIL=noreply@your-domain.com
FROM_NAME="Monomi Business System"

# Application URLs
FRONTEND_URL=http://YOUR_VPS_IP
CORS_ORIGIN=http://YOUR_VPS_IP

# Application Settings
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
```

**Generate secure secrets**:

```bash
# Generate DB password
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32

# Generate Redis password
openssl rand -base64 32
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

**Set proper permissions**:
```bash
chmod 600 .env.production
```

---

### Step 7: Create Nginx Configuration

Create nginx directory and configuration:

```bash
cd /opt/invoice-generator
mkdir -p nginx/conf.d
```

**Create nginx configuration file**:

```bash
nano nginx/conf.d/default.conf
```

**For IP-based access (no domain)**:

```nginx
# Backend API
upstream api {
    server app:5000;
}

server {
    listen 80;
    server_name YOUR_VPS_IP;

    client_max_body_size 10M;

    # API endpoints
    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend (served from app container)
    location / {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://api/health;
        access_log off;
    }
}
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

---

### Step 8: Deploy the Application

Run the deployment script:

```bash
cd /opt/invoice-generator

# Make deploy script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh
```

**What this does**:
1. ✅ Validates environment variables
2. ✅ Creates necessary directories
3. ✅ Pulls Docker images
4. ✅ Builds and starts all services
5. ✅ Runs database migrations
6. ✅ (Optional) Seeds sample data

**Expected output**:
```
🚀 Starting production deployment...
📁 Creating directories...
🐳 Checking Docker installation...
📦 Pulling Docker images...
🏗️ Building and starting production services...
⏳ Waiting for services to be ready...
✅ Application is healthy
🗄️ Running database migrations...
✅ Production deployment completed successfully!
```

**If the script fails**, deploy manually:

```bash
# Manual deployment
cd /opt/invoice-generator

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Wait 30 seconds
sleep 30

# Check container status
docker compose -f docker-compose.prod.yml ps

# Run migrations
docker compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"

# Seed database (optional)
docker compose -f docker-compose.prod.yml exec app sh -c "cd backend && npm run db:seed"
```

---

### Step 9: Verify Deployment

**Check running containers**:

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected output**:
```
NAME                    STATUS          PORTS
invoice-app-prod        Up 2 minutes
invoice-db-prod         Up 2 minutes
invoice-redis-prod      Up 2 minutes
invoice-nginx-prod      Up 2 minutes    0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

**Check application health**:

```bash
# From VPS
curl http://localhost/health

# From your local machine
curl http://YOUR_VPS_IP/health
```

**Expected response**:
```json
{"status":"ok","timestamp":"2025-10-21T..."}
```

**View application logs**:

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# App logs only
docker compose -f docker-compose.prod.yml logs -f app

# Last 50 lines
docker compose -f docker-compose.prod.yml logs --tail=50 app
```

---

### Step 10: Access Your Application

**Open in browser**:

```
http://YOUR_VPS_IP
```

**Default admin credentials** (if seeded):
- Email: `admin@monomi.id`
- Password: `password123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

---

## 🔒 Post-Deployment Security

### 1. Change Default Credentials

```bash
# Access the app and change admin password through UI
# Or via database:
docker compose -f docker-compose.prod.yml exec app sh -c "cd backend && npm run create-admin"
```

### 2. Set Up SSH Key Authentication

```bash
# On your LOCAL machine:
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy to VPS:
ssh-copy-id root@YOUR_VPS_IP

# On VPS, disable password authentication:
sudo nano /etc/ssh/sshd_config

# Set these values:
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH:
sudo systemctl restart sshd
```

### 3. Enable Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Set Up Fail2Ban (Prevent brute force)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 🌐 (Optional) Set Up Domain and SSL

### If you have a domain name:

**1. Point your domain to VPS IP**:

Go to your domain registrar (Namecheap, GoDaddy, etc.):
- Create an A record: `@` → `YOUR_VPS_IP`
- Create an A record: `www` → `YOUR_VPS_IP`

Wait 5-15 minutes for DNS propagation.

**2. Update environment variables**:

```bash
nano .env.production

# Change:
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

**3. Update nginx configuration**:

```bash
nano nginx/conf.d/default.conf

# Change:
server_name YOUR_VPS_IP;
# To:
server_name your-domain.com www.your-domain.com;
```

**4. Install SSL with Let's Encrypt**:

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts, enter email, agree to terms

# Certbot will automatically:
# - Obtain SSL certificate
# - Update nginx config
# - Set up auto-renewal
```

**5. Restart services**:

```bash
cd /opt/invoice-generator
docker compose -f docker-compose.prod.yml restart nginx
```

**6. Access via HTTPS**:

```
https://your-domain.com
```

---

## 📊 Monitoring and Maintenance

### View Container Stats

```bash
# Real-time resource usage
docker stats

# Disk usage
docker system df
```

### Database Backup

**Manual backup**:

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U invoiceuser invoices > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U invoiceuser invoices < backup_20251021_120000.sql
```

**Automatic daily backups** are configured via the backup container.

### Application Updates

```bash
# Pull latest code
cd /opt/invoice-generator
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations if needed
docker compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart app
```

### Clean Up Resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAREFUL - this deletes data!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to application"

**Check containers are running**:
```bash
docker compose -f docker-compose.prod.yml ps
```

**Check logs**:
```bash
docker compose -f docker-compose.prod.yml logs app
```

**Check firewall**:
```bash
sudo ufw status
curl http://localhost/health  # Should work on VPS
```

### Problem: "Database connection failed"

**Check database container**:
```bash
docker compose -f docker-compose.prod.yml logs db
```

**Check database credentials**:
```bash
cat .env.production | grep DB_PASSWORD
```

**Restart database**:
```bash
docker compose -f docker-compose.prod.yml restart db
```

### Problem: "Out of disk space"

**Check disk usage**:
```bash
df -h
docker system df
```

**Clean up**:
```bash
docker system prune -a
sudo apt autoremove -y
sudo apt clean
```

### Problem: "Nginx 502 Bad Gateway"

**Check app container**:
```bash
docker compose -f docker-compose.prod.yml logs app
```

**Check app health**:
```bash
docker compose -f docker-compose.prod.yml exec app curl http://localhost:5000/health
```

**Restart services**:
```bash
docker compose -f docker-compose.prod.yml restart app nginx
```

---

## 📋 Useful Commands Reference

```bash
# View all containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Execute command in container
docker compose -f docker-compose.prod.yml exec app sh

# Database backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U invoiceuser invoices > backup.sql

# View resource usage
docker stats

# Clean up
docker system prune -a
```

---

## 🎯 Quick Start Checklist

- [ ] SSH into Biznet Gio VPS
- [ ] Update system packages
- [ ] Install Docker and Docker Compose
- [ ] Configure firewall (ports 22, 80, 443)
- [ ] Transfer application files to VPS
- [ ] Create `.env.production` with secrets
- [ ] Create nginx configuration
- [ ] Run deployment script
- [ ] Verify containers are running
- [ ] Access application in browser
- [ ] Change default admin password
- [ ] Set up SSH key authentication
- [ ] (Optional) Configure domain and SSL

---

## 🆘 Support

### Common Issues:

1. **Port 80 already in use**: Check if Apache/Nginx already running
   ```bash
   sudo systemctl stop apache2
   sudo systemctl disable apache2
   ```

2. **Permission denied**: Ensure user is in docker group
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Out of memory**: Check VPS resources
   ```bash
   free -h
   htop
   ```

### Logs Location:

- Application: `/opt/invoice-generator/logs`
- Nginx: `/opt/invoice-generator/logs/nginx`
- Docker: `docker compose -f docker-compose.prod.yml logs`

---

## 🎉 Success!

Your Indonesian Business Management System is now running on Biznet Gio VPS!

**Access**: `http://YOUR_VPS_IP`
**Admin**: `admin@monomi.id` / `password123` (change immediately!)

**Next Steps**:
1. Change admin password
2. Configure email settings for notifications
3. Set up SSL if you have a domain
4. Create regular backups
5. Monitor application logs

---

**Deployment Date**: October 21, 2025
**Guide Version**: 1.0
**Application**: Indonesian Business Management System
**VPS Provider**: Biznet Gio
