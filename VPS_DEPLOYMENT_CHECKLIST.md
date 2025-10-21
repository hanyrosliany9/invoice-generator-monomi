# Biznet Gio VPS Deployment Checklist

Quick reference checklist for deploying to your Biznet Gio VPS.

## ✅ Pre-Deployment (On Your Local Machine)

- [ ] **Get VPS credentials from Biznet Gio**
  - [ ] VPS IP address (e.g., 103.xxx.xxx.xxx)
  - [ ] SSH username (usually `root`)
  - [ ] SSH password

- [ ] **Test SSH connection**
  ```bash
  ssh root@YOUR_VPS_IP
  ```

## ✅ VPS Initial Setup (First Time Only)

Run this script on your VPS to install all prerequisites:

```bash
# On VPS, run:
curl -o vps-setup.sh https://raw.githubusercontent.com/YOUR_REPO/vps-setup.sh
sudo bash vps-setup.sh
```

Or manually follow these steps:

- [ ] **Update system**
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] **Install Docker**
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

- [ ] **Install Docker Compose**
  ```bash
  sudo apt install docker-compose-plugin
  ```

- [ ] **Configure firewall**
  ```bash
  sudo ufw allow 22/tcp  # SSH
  sudo ufw allow 80/tcp  # HTTP
  sudo ufw allow 443/tcp # HTTPS
  sudo ufw enable
  ```

- [ ] **Create app directory**
  ```bash
  sudo mkdir -p /opt/invoice-generator
  ```

## ✅ Application Deployment

### Option 1: Quick Deploy Script (Recommended)

On your **local machine**:

```bash
./scripts/quick-deploy-vps.sh YOUR_VPS_IP
```

### Option 2: Manual Deployment

- [ ] **Transfer files to VPS**
  ```bash
  # On local machine:
  rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    . root@YOUR_VPS_IP:/opt/invoice-generator/
  ```

- [ ] **SSH into VPS**
  ```bash
  ssh root@YOUR_VPS_IP
  cd /opt/invoice-generator
  ```

- [ ] **Create environment file**
  ```bash
  cp .env.production.template .env.production
  nano .env.production
  ```

- [ ] **Generate secrets**
  ```bash
  # DB Password
  openssl rand -base64 32

  # Redis Password
  openssl rand -base64 32

  # JWT Secret
  openssl rand -hex 32
  ```

- [ ] **Edit `.env.production`**
  - [ ] Set `DB_PASSWORD`
  - [ ] Set `REDIS_PASSWORD`
  - [ ] Set `JWT_SECRET`
  - [ ] Set `FRONTEND_URL` to your VPS IP
  - [ ] Set `CORS_ORIGIN` to your VPS IP
  - [ ] Configure SMTP settings (if using email)

- [ ] **Set permissions**
  ```bash
  chmod 600 .env.production
  chmod +x scripts/*.sh
  ```

- [ ] **Run deployment**
  ```bash
  ./scripts/deploy.sh
  ```

## ✅ Post-Deployment Verification

- [ ] **Check containers are running**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
  All should show "Up"

- [ ] **Test health endpoint**
  ```bash
  curl http://localhost/health
  ```
  Should return: `{"status":"ok",...}`

- [ ] **Check logs for errors**
  ```bash
  docker compose -f docker-compose.prod.yml logs --tail=50
  ```

- [ ] **Access application in browser**
  ```
  http://YOUR_VPS_IP
  ```

- [ ] **Test login**
  - Email: `admin@monomi.id`
  - Password: `password123`

## ✅ Security Hardening

- [ ] **Change default admin password**
  - Log in to the application
  - Go to Settings → Change Password

- [ ] **Set up SSH key authentication**
  ```bash
  # On local machine:
  ssh-copy-id root@YOUR_VPS_IP
  ```

- [ ] **Disable password authentication**
  ```bash
  # On VPS:
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  sudo systemctl restart sshd
  ```

- [ ] **Enable Fail2Ban**
  ```bash
  sudo apt install fail2ban
  sudo systemctl enable fail2ban
  ```

- [ ] **Set up automatic security updates**
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

## ✅ Optional: Domain and SSL Setup

- [ ] **Point domain to VPS IP**
  - Create A record: `@` → `YOUR_VPS_IP`
  - Create A record: `www` → `YOUR_VPS_IP`
  - Wait 5-15 minutes for DNS propagation

- [ ] **Update environment variables**
  ```bash
  nano .env.production
  # Change FRONTEND_URL to https://your-domain.com
  # Change CORS_ORIGIN to https://your-domain.com
  ```

- [ ] **Install SSL certificate**
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d your-domain.com -d www.your-domain.com
  ```

- [ ] **Restart services**
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```

- [ ] **Test HTTPS access**
  ```
  https://your-domain.com
  ```

## ✅ Monitoring and Maintenance

- [ ] **Set up monitoring**
  ```bash
  # View resource usage
  docker stats

  # View logs
  docker compose -f docker-compose.prod.yml logs -f
  ```

- [ ] **Schedule database backups**
  - Automatic backups run daily at midnight
  - Backups stored in `/opt/invoice-generator/backup/`

- [ ] **Test backup restoration**
  ```bash
  # Create manual backup
  docker compose -f docker-compose.prod.yml exec db \
    pg_dump -U invoiceuser invoices > test-backup.sql
  ```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect to application | Check firewall: `sudo ufw status` |
| 502 Bad Gateway | Check app logs: `docker compose -f docker-compose.prod.yml logs app` |
| Database connection failed | Check .env.production DB_PASSWORD matches |
| Out of disk space | Clean Docker: `docker system prune -a` |
| Container keeps restarting | Check logs: `docker compose -f docker-compose.prod.yml logs` |

## 📚 Quick Reference Commands

```bash
# View all containers
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Restart application
docker compose -f docker-compose.prod.yml restart app

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Database backup
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U invoiceuser invoices > backup_$(date +%Y%m%d).sql

# Clean up Docker
docker system prune -a

# Check disk space
df -h
docker system df

# Check memory usage
free -h
docker stats --no-stream
```

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ All containers show "Up" status
- ✅ Health endpoint returns `{"status":"ok"}`
- ✅ Application accessible at `http://YOUR_VPS_IP`
- ✅ Can log in with admin credentials
- ✅ No errors in application logs
- ✅ Database migrations completed
- ✅ Firewall properly configured
- ✅ SSL installed (if using domain)

## 📖 Additional Resources

- Full deployment guide: `BIZNET_GIO_DEPLOYMENT_GUIDE.md`
- Environment template: `.env.production.template`
- Docker configuration: `docker-compose.prod.yml`
- Deployment script: `scripts/deploy.sh`
- VPS setup script: `scripts/vps-setup.sh`

---

**Next Steps After Deployment**:
1. Change admin password immediately
2. Configure email settings for notifications
3. Set up regular backups
4. Monitor application logs
5. Consider setting up SSL if you have a domain
