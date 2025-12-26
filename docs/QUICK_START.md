# Monomi Finance - Quick Deployment Reference

**Last Updated:** October 17, 2025

## 📋 Your Configuration at a Glance

### IP Addresses
| Component | IP Address | Purpose |
|-----------|------------|---------|
| **VPS Public IP** | `103.150.226.171` | External access (BiznetGio Jakarta) |
| **Home PC Local IP** | `192.168.88.254` | Local network access (static) |
| **Home PC Tailscale IP** | `100.114.215.21` | Secure tunnel (already installed!) |

### Access URLs
| Access Type | URL | Usage |
|-------------|-----|-------|
| **Internet Access** | `http://103.150.226.171` | From anywhere (cafe, mobile, office) |
| **Local Access** | `http://192.168.88.254:5000` | From home network only |
| **Monitoring** | `http://100.114.215.21:3001` | Grafana (Tailscale only) |

---

## 🚀 Quick Commands

### SSH to VPS
```bash
ssh root@103.150.226.171
```

### Check VPS Status
```bash
# On VPS
systemctl status nginx
ping 100.114.215.21  # Test tunnel to home PC
curl http://100.114.215.21:5000/health  # Test app
```

### Check Home PC Status
```bash
# On home PC
docker-compose -f ~/monomi-finance/docker-compose.prod.yml ps
sudo tailscale status  # Verify tunnel
curl http://localhost:5000/health  # Test app locally
```

---

## 🔐 Default Credentials

**⚠️ CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN!**

**Admin Account:**
- **URL:** `http://103.150.226.171`
- **Email:** `admin@monomi.id`
- **Password:** `password123`

**Grafana (Monitoring):**
- **URL:** `http://100.114.215.21:3001` (Tailscale) or `http://103.150.226.171/grafana`
- **Username:** `admin`
- **Password:** (set during Phase 4 deployment)

---

## 📂 Important File Locations

### Home PC
| Path | Description |
|------|-------------|
| `~/monomi-finance/` | Application directory |
| `~/monomi-finance/.env.production` | Production environment config |
| `~/monomi-finance/docker-compose.prod.yml` | Docker production config |
| `/mnt/backup-hdd/monomi-finance-backups/` | Backup location (external HDD) |
| `~/monomi-finance/scripts/backup-to-external.sh` | Backup script |
| `~/monomi-finance/logs/` | Application logs |

### VPS
| Path | Description |
|------|-------------|
| `/etc/nginx/sites-available/monomi-finance` | Nginx config |
| `/var/log/nginx/monomi-error.log` | Nginx error log |
| `/var/log/nginx/monomi-access.log` | Nginx access log |
| `/usr/local/bin/check-tunnel.sh` | Tunnel health check script |
| `/var/log/tunnel-check.log` | Tunnel health log |

---

## 🛠️ Common Tasks

### Restart Application (Home PC)
```bash
cd ~/monomi-finance
docker-compose -f docker-compose.prod.yml restart
```

### View Application Logs (Home PC)
```bash
cd ~/monomi-finance
docker-compose -f docker-compose.prod.yml logs -f
# Press Ctrl+C to exit
```

### Restart Nginx (VPS)
```bash
ssh root@103.150.226.171
systemctl restart nginx
systemctl status nginx
```

### Manual Backup (Home PC)
```bash
~/monomi-finance/scripts/backup-to-external.sh
```

### Restore from Backup (Home PC)
```bash
# Stop containers
cd ~/monomi-finance
docker-compose -f docker-compose.prod.yml down

# Restore database (replace DATE with actual backup date)
BACKUP_DATE="20251017_020000"
docker-compose -f docker-compose.prod.yml up -d db
cat /mnt/backup-hdd/monomi-finance-backups/db_${BACKUP_DATE}.sql | \
  docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U invoiceuser invoices

# Restore volumes
tar -xzf /mnt/backup-hdd/monomi-finance-backups/volumes_${BACKUP_DATE}.tar.gz \
  -C ~/monomi-finance/

# Start all containers
docker-compose -f docker-compose.prod.yml up -d
```

### Check Tunnel Status
```bash
# On home PC
sudo tailscale status

# On VPS
ssh root@103.150.226.171
sudo tailscale status
ping 100.114.215.21
```

### Restart Tunnel (if disconnected)
```bash
# On both home PC and VPS
sudo systemctl restart tailscaled
sudo tailscale up
```

---

## 📊 Monitoring

### Quick Health Checks
```bash
# From VPS
curl http://100.114.215.21:5000/health

# From internet
curl http://103.150.226.171/health

# From home PC
curl http://localhost:5000/health
```

### Container Resource Usage (Home PC)
```bash
docker stats
```

### System Resource Usage (Home PC)
```bash
htop  # Interactive
# Or
top
```

### Disk Usage
```bash
# Check main disk
df -h

# Check backup HDD
df -h | grep backup-hdd

# Check Docker disk usage
docker system df
```

### View Container Logs
```bash
# All containers
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs -f

# Specific container
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs -f app
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs -f db
```

---

## 🚨 Troubleshooting

### Can't Access from Internet
```bash
# 1. Check VPS Nginx
ssh root@103.150.226.171
systemctl status nginx
curl http://localhost  # Should return app response

# 2. Check tunnel from VPS to home PC
ping 100.114.215.21
curl http://100.114.215.21:5000/health

# 3. If tunnel fails, restart Tailscale on both machines
sudo systemctl restart tailscaled

# 4. Check VPS firewall
ufw status verbose
```

### Application Not Responding on Home PC
```bash
# Check containers
docker-compose -f ~/monomi-finance/docker-compose.prod.yml ps

# Restart unhealthy containers
docker-compose -f ~/monomi-finance/docker-compose.prod.yml restart

# View logs for errors
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs --tail=100

# Nuclear option: rebuild and restart
docker-compose -f ~/monomi-finance/docker-compose.prod.yml down
docker-compose -f ~/monomi-finance/docker-compose.prod.yml up -d --build
```

### Tunnel Disconnected
```bash
# On home PC
sudo tailscale status
sudo tailscale up

# On VPS
ssh root@103.150.226.171
sudo tailscale status
sudo tailscale up

# Test connectivity
ping 100.114.215.21
```

### Database Issues
```bash
# Check database container
docker-compose -f ~/monomi-finance/docker-compose.prod.yml logs db

# Connect to database
docker-compose -f ~/monomi-finance/docker-compose.prod.yml exec db \
  psql -U invoiceuser invoices

# Inside psql:
# \dt  -- List tables
# \l   -- List databases
# \q   -- Quit
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes  # ⚠️ Deletes unused images/volumes

# Clean old backups (keep last 30 days)
find /mnt/backup-hdd/monomi-finance-backups/ -name "*.sql" -mtime +30 -delete
find /mnt/backup-hdd/monomi-finance-backups/ -name "*.tar.gz" -mtime +30 -delete

# Clean old logs
find ~/monomi-finance/logs/ -name "*.log" -mtime +30 -delete
```

---

## 🔒 Security Checklist

- [ ] Changed default admin password (`admin@monomi.id`)
- [ ] Changed Grafana password
- [ ] VPS firewall (UFW) is enabled
- [ ] Fail2ban is active on VPS
- [ ] Home PC is NOT exposed to internet directly
- [ ] Tailscale tunnel is encrypted
- [ ] External HDD backups are working (check cron)
- [ ] Backup restoration tested at least once

---

## 📞 Emergency Contacts & Resources

### Documentation
- **DEPLOYMENT_IMPLEMENTATION_GUIDE.md** - Full step-by-step deployment guide
- **HYBRID_DEPLOYMENT_PLAN.md** - Architecture and planning document
- **DEPLOYMENT_READY.md** - Deployment readiness checklist

### External Resources
- Tailscale Docs: https://tailscale.com/kb/
- NestJS Docs: https://docs.nestjs.com/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Docker Docs: https://docs.docker.com/

### Quick Support Commands
```bash
# Get system info (home PC)
uname -a
docker --version
docker-compose --version
tailscale version

# Get VPS info
ssh root@103.150.226.171 "uname -a && nginx -v"

# Network diagnostics
traceroute 103.150.226.171  # From home PC to VPS
ping 100.114.215.21  # VPS to home PC via Tailscale
```

---

## 📈 Performance Baselines

**Expected Performance:**
- Page load time: 0.8-1.2s
- API response time: 50-150ms
- PDF generation: 2-3s
- Database queries: 20-50ms
- Tunnel latency (VPS ↔ Home PC): 5-20ms

**If performance degrades:**
1. Check Docker resource usage: `docker stats`
2. Check system resources: `htop`
3. Check database slow queries
4. Check tunnel latency: `ping 100.114.215.21`
5. Review nginx logs for errors

---

## 🎉 Quick Test After Deployment

**Run these to verify everything works:**

```bash
# 1. Test from home PC
curl http://localhost:5000/health
# Expected: {"status":"ok"}

# 2. Test from VPS to home PC
ssh root@103.150.226.171
curl http://100.114.215.21:5000/health
# Expected: {"status":"ok"}

# 3. Test from internet (use phone with mobile data)
curl http://103.150.226.171/health
# Expected: {"status":"ok"}

# 4. Test login in browser
# Open: http://103.150.226.171
# Login: admin@monomi.id / password123
# ⚠️ CHANGE PASSWORD IMMEDIATELY!

# 5. Test backup
~/monomi-finance/scripts/backup-to-external.sh
ls -lh /mnt/backup-hdd/monomi-finance-backups/
```

---

**Configuration Version:** 3.0
**Deployment Status:** Ready for implementation
**Total Deployment Time:** 3-3.5 hours
**Monthly Cost:** $5-10 (electricity only)
