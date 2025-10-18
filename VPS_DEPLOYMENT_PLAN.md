# VPS Deployment Plan - Monomi Finance (Indonesian Business Management System)

**Document Version:** 2.0
**Last Updated:** October 17, 2025
**Author:** System Deployment Team

---

## 🎯 Deployment Overview

This plan provides a streamlined **HTTP-only IP-based deployment** for internal corporate applications.

**Deployment Method:**
- **Best for:** Corporate internal apps, private networks, internal tools
- **Requirements:** VPS with public IP address
- **Access:** `http://YOUR_VPS_IP`
- **Cost:** VPS hosting only (no domain needed)
- **Perfect for:** Company internal finance systems on trusted networks

---

## 📋 Table of Contents

1. [Current System Analysis](#1-current-system-analysis)
2. [VPS Requirements](#2-vps-requirements)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Deployment Strategy](#4-deployment-strategy)
5. [Security Implementation](#5-security-implementation)
6. [Monitoring & Logging](#6-monitoring--logging)
7. [Backup & Disaster Recovery](#7-backup--disaster-recovery)
8. [Performance Optimization](#8-performance-optimization)
9. [Deployment Steps](#9-deployment-steps)
10. [Post-Deployment](#10-post-deployment)
11. [Maintenance Procedures](#11-maintenance-procedures)
12. [Troubleshooting Guide](#12-troubleshooting-guide)

---

## 1. Current System Analysis

### 🎯 Application Overview

**Monomi Finance** is a comprehensive Indonesian Business Management System with the following features:

#### ✅ Core Features Implemented
- **Client Management** - Complete CRUD with relationships
- **Project Management** - Project tracking with financial data
- **Quotation System** - Quotation creation, approval/decline workflow
- **Invoice Management** - Invoice generation, payment tracking
- **Asset Management** - Digital asset tracking with QR codes ✨ **NEW**
- **Expense Management** - Expense tracking and categorization ✨ **NEW**
- **Accounting Module** - Full double-entry bookkeeping (PSAK compliant) ✨ **NEW**
  - Chart of Accounts
  - Journal Entries
  - Trial Balance
  - General Ledger
  - Income Statement
  - Balance Sheet
  - Cash Flow Statement
  - Accounts Receivable/Payable
  - AR/AP Aging Reports
  - Depreciation (PSAK 16)
  - ECL Provisions (PSAK 71)
- **Authentication & Authorization** - JWT-based auth with role management
- **Indonesian Compliance** - Materai support, IDR formatting
- **Modern UI** - Dark/Light theme with glassmorphism design
- **PDF Generation** - Puppeteer-based PDF export

#### 🏗️ Technology Stack

**Backend:**
- NestJS 11.1.3
- PostgreSQL 15
- Prisma ORM
- Redis (caching & sessions)
- Puppeteer (PDF generation)

**Frontend:**
- React 19
- Vite 6/7
- Ant Design 5.x
- TanStack Query
- Zustand (state management)
- Tailwind CSS 4.0

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- Multi-stage Dockerfile
- Health checks configured

### 📊 Current Docker Configuration Status

✅ **Production-Ready Components:**
- Multi-stage Dockerfile (development & production targets)
- Production docker-compose.yml with health checks
- Nginx configuration with SSL support
- Database backup service
- Resource limits configured
- Non-root user security

🟡 **Needs Configuration:**
- SSL certificates (Let's Encrypt - optional for domain-based) OR Self-signed certificates (for IP-only)
- Environment variables (.env.production)
- Domain configuration (optional - can use IP address for internal deployment)
- Monitoring tools integration

---

## 2. VPS Requirements

### 💻 Minimum Server Specifications

**For Small Business (1-20 users):**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 100 GB SSD
- **Bandwidth:** 1 TB/month
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS

**For Medium Business (20-100 users):**
- **CPU:** 8 vCPUs
- **RAM:** 16 GB
- **Storage:** 200 GB SSD
- **Bandwidth:** 3 TB/month
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS

### 📋 Required Software

- **Docker** - Latest stable (24.x)
- **Docker Compose** - v2.x
- **Git** - For deployment automation
- **UFW** - Firewall management
- **Fail2ban** - Brute force protection

---

## 3. Pre-Deployment Checklist

### 🌐 VPS Access Configuration

- [ ] Provision VPS server (Ubuntu 22.04/24.04 LTS)
- [ ] Note your VPS public IP address
- [ ] Ensure VPS has root or sudo access
- [ ] Access will be via `http://YOUR_VPS_IP`
- [ ] Ensure firewall allows HTTP access (port 80) from your internal network
- [ ] **No domain or SSL required** - HTTP-only for trusted internal network

### ✅ Environment Variables Preparation

Create `.env.production` file with the following variables:

```bash
# Database Configuration
DB_PASSWORD=<generate-strong-password>

# JWT Secret (generate with: openssl rand -base64 64)
JWT_SECRET=<generate-strong-secret>

# Redis Password
REDIS_PASSWORD=<generate-strong-password>

# SMTP Configuration (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-specific-password>
FROM_EMAIL=noreply@your-company.com

# Application URLs (replace YOUR_VPS_IP with actual IP)
CORS_ORIGIN=http://YOUR_VPS_IP
FRONTEND_URL=http://YOUR_VPS_IP

# Logging
LOG_LEVEL=info
```

### ✅ Backup Storage

- [ ] Set up external backup location (S3, Backblaze B2, etc.)
- [ ] Configure backup retention policy
- [ ] Test backup restoration procedure

---

## 4. Deployment Strategy

### 🚀 Deployment Approach: Blue-Green Deployment

We'll use a **single-server blue-green deployment** strategy:

1. **Initial Deployment** - Deploy to production (Blue)
2. **Updates** - Deploy new version alongside (Green)
3. **Switch** - Change nginx upstream to Green
4. **Rollback** - Switch back to Blue if issues occur

### 📦 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS (Ubuntu 22.04 LTS)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Nginx (Reverse Proxy + SSL)              │  │
│  │                    Port 80 → 443                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Docker Network: invoice-network              │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │   App       │  │  PostgreSQL  │  │   Redis    │  │  │
│  │  │  NestJS +   │  │   Database   │  │   Cache    │  │  │
│  │  │   React     │  │              │  │            │  │  │
│  │  │  Port 5000  │  │  Port 5432   │  │ Port 6379  │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐│  │
│  │  │         Backup Service (Daily Cron)             ││  │
│  │  └─────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Persistent Volumes                       │  │
│  │  • postgres_prod_data  • redis_prod_data             │  │
│  │  • uploads/  • storage/  • logs/  • backup/          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Security Implementation

### 🔒 Security Layers (4-Layer Implementation)

**Note:** This is an HTTP-only deployment for internal trusted networks. SSL/TLS (Layer 4) is intentionally omitted.

#### Layer 1: VPS Firewall (UFW)

```bash
# Allow SSH (change port from 22 to custom port)
ufw allow 2222/tcp comment 'SSH Custom Port'

# Allow HTTP only (no HTTPS)
ufw allow 80/tcp comment 'HTTP'

# Deny all other inbound
ufw default deny incoming
ufw default allow outgoing

# Enable firewall
ufw enable
```

#### Layer 2: Fail2ban (Brute Force Protection)

Install and configure Fail2ban to ban IPs with failed login attempts:

```bash
# Install
apt install fail2ban

# Configure jail for SSH
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
EOF

# Restart fail2ban
systemctl restart fail2ban
```

#### Layer 3: Docker Secrets Management

Use Docker secrets for sensitive data:

```bash
# Create secrets
echo "your-db-password" | docker secret create db_password -
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-redis-password" | docker secret create redis_password -
```

#### Layer 4: Application Security

**Database Security:**
- Use strong passwords (64+ characters)
- Enable SSL/TLS for database connections
- Restrict database access to app container only
- Regular security updates

**API Security:**
- Rate limiting (already configured in nginx)
- JWT token expiration (24 hours)
- CORS restrictions
- Input validation
- SQL injection prevention (Prisma ORM)

---

## 6. Monitoring & Logging

### 📊 Monitoring Stack

**Self-Hosted Monitoring (Prometheus + Grafana + Loki)**

```yaml
# Add to docker-compose.prod.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - invoice-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    networks:
      - invoice-network
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/loki-config.yml
      - loki_data:/loki
    command: -config.file=/etc/loki/loki-config.yml
    networks:
      - invoice-network
    restart: unless-stopped
```

### 📈 Key Metrics to Monitor

1. **Application Metrics:**
   - Request rate (requests/second)
   - Response time (p50, p95, p99)
   - Error rate (5xx errors)
   - Active users
   - Database query performance

2. **Infrastructure Metrics:**
   - CPU usage per container
   - Memory usage per container
   - Disk I/O
   - Network I/O
   - Disk space available

3. **Database Metrics:**
   - Query performance
   - Connection pool usage
   - Database size
   - Slow queries

4. **Business Metrics:**
   - Daily active users
   - Invoice generation rate
   - Quotation conversion rate
   - System uptime

### 📝 Logging Strategy

**Log Levels:**
- Production: `info`, `warn`, `error`
- Development: `debug`, `verbose`

**Log Retention:**
- Application logs: 30 days
- Access logs: 90 days
- Error logs: 180 days
- Audit logs: 365 days (compliance)

**Centralized Logging:**
Use Loki or ELK Stack for aggregating logs from all containers.

---

## 7. Backup & Disaster Recovery

### 💾 Backup Strategy

#### Automated Daily Backups

**Database Backup (included in docker-compose.prod.yml):**
```bash
# Runs automatically via backup service
# Creates: backup/backup_YYYYMMDD_HHMMSS.sql
# Retention: Keep last 30 days locally
```

**Full System Backup Script:**

```bash
#!/bin/bash
# /scripts/full-backup.sh

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full_backup_${DATE}.tar.gz"

echo "Starting full system backup..."

# Stop containers (optional, for consistent backup)
# docker-compose -f docker-compose.prod.yml stop

# Backup database
docker-compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U invoiceuser -d invoices > "${BACKUP_DIR}/db_${DATE}.sql"

# Backup volumes and data
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
  uploads/ \
  storage/ \
  logs/ \
  .env.production \
  "${BACKUP_DIR}/db_${DATE}.sql"

# Restart containers
# docker-compose -f docker-compose.prod.yml start

# Upload to S3 or Backblaze B2
# rclone copy "${BACKUP_DIR}/${BACKUP_NAME}" remote:backups/

# Clean old backups (keep last 30 days)
find "${BACKUP_DIR}" -name "full_backup_*.tar.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -name "db_*.sql" -mtime +30 -delete

echo "Backup completed: ${BACKUP_NAME}"
```

#### Backup Schedule (Cron Jobs)

```bash
# Add to crontab
# Database backup: Every day at 2 AM
0 2 * * * /app/scripts/full-backup.sh >> /app/logs/backup.log 2>&1

# Log rotation: Every week
0 0 * * 0 find /app/logs -name "*.log" -mtime +7 -delete

# Docker system cleanup: Every week
0 1 * * 0 docker system prune -af --volumes >> /app/logs/cleanup.log 2>&1
```

### 🔄 Disaster Recovery Plan

#### RTO (Recovery Time Objective): 4 hours
#### RPO (Recovery Point Objective): 24 hours

**Recovery Procedures:**

1. **Database Corruption:**
   ```bash
   # Stop app
   docker-compose -f docker-compose.prod.yml stop app

   # Restore from backup
   docker-compose -f docker-compose.prod.yml exec -T db \
     psql -U invoiceuser -d invoices < backup/backup_YYYYMMDD_HHMMSS.sql

   # Restart app
   docker-compose -f docker-compose.prod.yml start app
   ```

2. **Full Server Failure:**
   ```bash
   # Provision new VPS
   # Install Docker & dependencies
   # Clone repository
   # Restore backup files
   # Run deployment script
   ./scripts/deploy.sh
   ```

3. **Application Crash:**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs app --tail 100

   # Restart service
   docker-compose -f docker-compose.prod.yml restart app

   # If persists, rollback to previous version
   git checkout <previous-commit>
   ./scripts/deploy.sh
   ```

---

## 8. Performance Optimization

### ⚡ Optimization Checklist

#### Frontend Optimization
- ✅ Code splitting (lazy loading implemented)
- ✅ Tree shaking (Vite configured)
- ✅ Compression (nginx gzip enabled)
- ✅ CDN for static assets (optional)
- ✅ Image optimization
- ✅ Browser caching headers

#### Backend Optimization
- ✅ Database connection pooling (Prisma configured)
- ✅ Redis caching for frequently accessed data
- ✅ API response compression
- ✅ Database query optimization (indexes)
- ✅ Rate limiting (nginx configured)

#### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices("createdAt");
CREATE INDEX idx_projects_client ON projects("clientId");
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_expenses_date ON expenses("expenseDate");
```

#### Docker Image Optimization
- ✅ Multi-stage builds implemented
- ✅ Alpine Linux base image
- ✅ Layer caching optimization
- ✅ .dockerignore configured
- Image size target: < 500 MB

---

## 9. Deployment Steps

### 📝 Step-by-Step Deployment Guide

#### Step 1: VPS Initial Setup (30 minutes)

```bash
# Connect to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Set timezone to Indonesia (WIB)
timedatectl set-timezone Asia/Jakarta

# Create non-root user
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Configure SSH
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Install required packages
apt install -y \
  docker.io \
  docker-compose \
  git \
  ufw \
  fail2ban \
  certbot \
  htop \
  ncdu

# Configure firewall
ufw allow 2222/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Start Docker on boot
systemctl enable docker
systemctl start docker

# Add deploy user to docker group
usermod -aG docker deploy
```

#### Step 2: Deploy Application (20 minutes)

```bash
# Switch to deploy user
su - deploy

# Create application directory
mkdir -p /home/deploy/monomi-finance
cd /home/deploy/monomi-finance

# Clone repository
git clone <your-repository-url> .

# Create .env.production file
nano .env.production
# (Paste your environment variables)

# Set permissions
chmod 600 .env.production
chmod +x scripts/*.sh

# Create required directories
mkdir -p uploads storage logs backup ssl nginx/conf.d

# Run deployment script
./scripts/deploy.sh
```

#### Step 3: Verify Deployment (10 minutes)

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail 50

# Test health endpoint
curl http://YOUR_VPS_IP/health
# Expected: {"status":"ok",...}

# Test API health
curl http://YOUR_VPS_IP/api/v1/health
# Expected: {"status":"ok","database":{"status":"ok"},...}

# Test frontend
curl -I http://YOUR_VPS_IP
# Expected: HTTP/1.1 200
```

---

## 10. Post-Deployment

### ✅ Post-Deployment Checklist

- [ ] Verify all services are running
- [ ] Test login functionality
- [ ] Create test client/project/invoice
- [ ] Test PDF generation
- [ ] Verify email notifications
- [ ] Check SSL certificate validity
- [ ] Configure monitoring alerts
- [ ] Set up backup cron jobs
- [ ] Document admin credentials (securely)
- [ ] Notify stakeholders

### 🎯 Initial Configuration

1. **Create Admin User:**
   - Login with default admin: `admin@monomi.id` / `password123`
   - Change default password immediately
   - Update admin email

2. **Configure Company Settings:**
   - Navigate to Settings → Company
   - Upload company logo
   - Set company details (name, address, tax ID)
   - Configure payment terms

3. **Set up Email Templates:**
   - Customize invoice email templates
   - Configure quotation approval emails

4. **Create Initial Data:**
   - Create project types
   - Create expense categories
   - Set up chart of accounts (if using accounting module)

---

## 11. Maintenance Procedures

### 🔧 Regular Maintenance Tasks

#### Daily Tasks (Automated)
- Database backup
- Log rotation
- Health checks
- Security scans

#### Weekly Tasks (Manual)
- Review error logs
- Check disk space
- Monitor performance metrics
- Review failed login attempts

#### Monthly Tasks (Manual)
- Security updates
- Database optimization
- Backup restoration test
- SSL certificate renewal check

#### Quarterly Tasks (Manual)
- Full system audit
- Disaster recovery drill
- Performance tuning
- Cost optimization review

### 🔄 Update Procedures

```bash
# Pull latest code
cd /home/deploy/monomi-finance
git pull origin main

# Backup current state
./scripts/full-backup.sh

# Run deployment
./scripts/deploy.sh

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail 50

# Test application
curl https://yourdomain.com/health
```

---

## 12. Troubleshooting Guide

### 🔍 Common Issues & Solutions

#### Issue 1: Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check resource usage
docker stats

# Restart container
docker-compose -f docker-compose.prod.yml restart app

# If persists, rebuild
docker-compose -f docker-compose.prod.yml up -d --build app
```

#### Issue 2: Database Connection Failed

```bash
# Check database container
docker-compose -f docker-compose.prod.yml logs db

# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U invoiceuser

# Restart database
docker-compose -f docker-compose.prod.yml restart db
```

#### Issue 3: High Memory Usage

```bash
# Check memory usage
docker stats

# Clear unused containers/images
docker system prune -af

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### Issue 4: SSL Certificate Expired

```bash
# Renew certificate
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### Issue 5: Slow Performance

```bash
# Check database queries
docker-compose -f docker-compose.prod.yml exec db \
  psql -U invoiceuser -d invoices -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check disk space
df -h

# Check container resources
docker stats

# Optimize database
docker-compose -f docker-compose.prod.yml exec db \
  psql -U invoiceuser -d invoices -c "VACUUM ANALYZE;"
```

---

## 📞 Support Contacts

### Emergency Contacts
- **System Administrator:** [Your Contact]
- **Database Administrator:** [Your Contact]
- **Security Team:** [Your Contact]

### Vendor Support
- **VPS Provider:** [Provider Support]
- **Domain Registrar:** [Registrar Support]
- **SSL Provider:** [SSL Support]

---

## 📚 Additional Resources

### Documentation
- [NestJS Production Deployment](https://docs.nestjs.com/deployment)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Nginx Security](https://www.nginx.com/blog/nginx-security-best-practices/)

### Monitoring Dashboards
- Grafana: `http://YOUR_VPS_IP:3001`
- Portainer (optional): `http://YOUR_VPS_IP:9443`

---

## ✅ Deployment Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| VPS Setup | 30 min | ⏳ Pending |
| Application Deployment | 20 min | ⏳ Pending |
| Verification | 10 min | ⏳ Pending |
| Monitoring Setup | 30 min | ⏳ Pending |
| **Total** | **1.5 hours** | |

---

## 🎉 Conclusion

This deployment plan provides a comprehensive guide for deploying Monomi Finance to a production VPS environment. Follow each step carefully and verify at each stage.

**Remember:**
- Security first
- Test backups regularly
- Monitor actively
- Document everything
- Keep systems updated

**Next Steps:**
1. Review this plan with your team
2. Prepare VPS and domain
3. Configure environment variables
4. Execute deployment
5. Set up monitoring
6. Train users

---

**Document Status:** ✅ **Ready for Implementation**

**Approval Required From:**
- [ ] Technical Lead
- [ ] Security Officer
- [ ] Operations Manager
- [ ] Project Manager
