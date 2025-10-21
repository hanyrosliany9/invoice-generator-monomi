# Deploy to Biznet Gio VPS
## IP: 103.150.226.171

**Your VPS Details**:
- Public IP: `103.150.226.171`
- Provider: Biznet Gio
- Target Directory: `/opt/invoice-generator`

---

## 🚀 Quick Deployment Steps

### Step 1: Test SSH Connection

First, verify you can connect to your VPS:

```bash
# Test connection
ssh root@103.150.226.171

# If this works, you'll be prompted for password
# Enter your Biznet Gio VPS password
```

**First-time connection**:
- You'll see: "The authenticity of host... can't be established"
- Type: `yes` and press Enter
- Enter your password

---

### Step 2: Prepare VPS (One-Time Setup)

Once connected to your VPS, run this setup script:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# Create application directory
sudo mkdir -p /opt/invoice-generator
sudo chmod 755 /opt/invoice-generator

# Test Docker
docker run hello-world
```

**Disconnect from VPS** (type `exit` or Ctrl+D)

---

### Step 3: Deploy from Local Machine

**On your LOCAL machine** (not VPS), run:

```bash
# Navigate to project directory
cd /home/jeff/projects/monomi/internal/invoice-generator

# Use quick deploy script
./scripts/quick-deploy-vps.sh 103.150.226.171 root
```

This will:
- ✅ Create deployment package
- ✅ Transfer files to VPS
- ✅ Extract in `/opt/invoice-generator`

---

### Step 4: Configure Environment

**SSH back into VPS**:

```bash
ssh root@103.150.226.171
cd /opt/invoice-generator
```

**Generate secure passwords**:

```bash
# Generate DB password
echo "DB_PASSWORD=$(openssl rand -base64 32)"

# Generate Redis password
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"

# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

**Copy the output** and save it temporarily.

**Create environment file**:

```bash
# Copy template
cp .env.production.template .env.production

# Edit with nano
nano .env.production
```

**Update these critical values**:

```bash
# Use the passwords you generated above
DB_PASSWORD=paste_generated_db_password_here
REDIS_PASSWORD=paste_generated_redis_password_here
JWT_SECRET=paste_generated_jwt_secret_here

# Set your VPS IP
FRONTEND_URL=http://103.150.226.171
CORS_ORIGIN=http://103.150.226.171

# Email configuration (optional for now, can configure later)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@monomi.id
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

**Set permissions**:

```bash
chmod 600 .env.production
chmod +x scripts/*.sh
```

---

### Step 5: Deploy Application

```bash
# Run deployment
./scripts/deploy.sh
```

**What this does**:
1. Validates environment variables
2. Pulls Docker images
3. Builds application containers
4. Starts all services (app, database, redis, nginx)
5. Runs database migrations
6. Offers to seed sample data (type `y` if you want test data)

**Expected output**:
```
🚀 Starting production deployment...
✅ Application is healthy
✅ Production deployment completed successfully!
```

---

### Step 6: Verify Deployment

**Check containers are running**:

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected output** (all should say "Up"):
```
NAME                    STATUS          PORTS
invoice-app-prod        Up 1 minute
invoice-db-prod         Up 1 minute
invoice-nginx-prod      Up 1 minute     0.0.0.0:80->80/tcp
invoice-redis-prod      Up 1 minute
```

**Test health endpoint**:

```bash
curl http://localhost/health
```

**Should return**:
```json
{"status":"ok","timestamp":"..."}
```

**Check logs**:

```bash
docker compose -f docker-compose.prod.yml logs --tail=50
```

Look for any errors (there shouldn't be any).

---

### Step 7: Access Your Application

**Open in your browser**:

```
http://103.150.226.171
```

**Default admin login** (if you seeded the database):
- Email: `admin@monomi.id`
- Password: `password123`

**⚠️ IMPORTANT**: Change this password immediately after first login!

---

## ✅ Post-Deployment Tasks

### 1. Change Admin Password

Log in to the application and change the admin password:
1. Go to Settings/Profile
2. Change password to something secure
3. Log out and log back in

### 2. Test Core Features

- [ ] Create a new client
- [ ] Create a new project
- [ ] Create a quotation
- [ ] Generate an invoice
- [ ] Add expenses to a project

### 3. Monitor Logs

```bash
# View application logs in real-time
docker compose -f docker-compose.prod.yml logs -f app

# Press Ctrl+C to exit
```

---

## 🔧 Troubleshooting

### Problem: Can't SSH to VPS

```bash
# Check if VPS is reachable
ping 103.150.226.171

# Check SSH is open
telnet 103.150.226.171 22
```

If these fail, check:
- VPS is powered on in Biznet Gio dashboard
- Your local internet connection
- Biznet Gio firewall settings

### Problem: Deployment script fails

Run deployment manually:

```bash
cd /opt/invoice-generator

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Wait 30 seconds
sleep 30

# Check status
docker compose -f docker-compose.prod.yml ps

# Run migrations
docker compose -f docker-compose.prod.yml exec app sh -c "cd backend && npx prisma db push"
```

### Problem: Can't access http://103.150.226.171

Check firewall on VPS:

```bash
# Check UFW status
sudo ufw status

# Port 80 should be ALLOW

# If not:
sudo ufw allow 80/tcp
sudo ufw reload
```

Check containers are running:

```bash
docker compose -f docker-compose.prod.yml ps
```

Check nginx logs:

```bash
docker compose -f docker-compose.prod.yml logs nginx
```

### Problem: 502 Bad Gateway

Application container might not be ready:

```bash
# Check app logs
docker compose -f docker-compose.prod.yml logs app

# Restart app
docker compose -f docker-compose.prod.yml restart app

# Wait 30 seconds and try again
```

---

## 🔒 Security Hardening (Important!)

### 1. Set Up SSH Key Authentication

**On your LOCAL machine**:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy to VPS
ssh-copy-id root@103.150.226.171
```

**On VPS**:

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config

# Change these lines:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin prohibit-password

# Save and restart SSH
sudo systemctl restart sshd
```

### 2. Install Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Enable Automatic Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 Useful Commands

```bash
# SSH to VPS
ssh root@103.150.226.171

# View all containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart application
docker compose -f docker-compose.prod.yml restart app

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Database backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U invoiceuser invoices > backup_$(date +%Y%m%d).sql

# Check disk space
df -h
docker system df

# Check memory usage
free -h
docker stats --no-stream

# Clean up Docker
docker system prune -a
```

---

## 🌐 Next Steps (Optional)

### Get a Domain Name

If you want to use a domain instead of IP:

1. **Buy a domain** (e.g., from Namecheap, GoDaddy)
2. **Point domain to VPS**:
   - Create A record: `@` → `103.150.226.171`
   - Create A record: `www` → `103.150.226.171`

3. **Install SSL certificate**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

4. **Update environment**:
   ```bash
   nano .env.production
   # Change FRONTEND_URL to https://yourdomain.com
   # Change CORS_ORIGIN to https://yourdomain.com
   ```

5. **Restart services**:
   ```bash
   docker compose -f docker-compose.prod.yml restart
   ```

---

## 🎯 Quick Checklist

- [ ] SSH connection tested
- [ ] Docker installed on VPS
- [ ] Firewall configured
- [ ] Files transferred to VPS
- [ ] Environment file configured
- [ ] Deployment script executed
- [ ] All containers running
- [ ] Application accessible at http://103.150.226.171
- [ ] Admin password changed
- [ ] SSH key authentication set up
- [ ] Fail2Ban installed

---

**Your Application URL**: http://103.150.226.171
**Admin Email**: admin@monomi.id
**Default Password**: password123 (CHANGE THIS!)

---

Good luck with your deployment! 🚀
