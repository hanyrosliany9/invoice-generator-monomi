# Hybrid Deployment Plan - Monomi Finance
## VPS Reverse Proxy + Home PC Application Server

**Document Version:** 3.0
**Last Updated:** October 17, 2025
**Author:** System Deployment Team

---

## 🎯 Deployment Architecture

This deployment uses a **hybrid architecture** combining:
- **BiznetGio VPS (Jakarta)** - Internet-facing reverse proxy
- **Home PC (Ubuntu)** - Main application server with database
- **Secure Tunnel** - Encrypted connection between VPS and home PC

### **Architecture Diagram**

```
Internet Users (Cafe, Mobile, Anywhere)
            ↓
    [BiznetGio VPS - Jakarta]
    - Nginx Reverse Proxy
    - SSL/TLS Termination
    - Firewall (UFW)
    - Fail2ban Protection
    - Specs: 1 vCPU, 2GB RAM, 50GB SSD
            ↓
    [Encrypted Tunnel Layer]
    - Tailscale VPN (Recommended) OR
    - WireGuard VPN
    - Auto-reconnect on network changes
            ↓
    [Home PC - Ubuntu]
    - Docker Application Stack
    - PostgreSQL Database
    - All Business Logic
    - Data Storage
    - Monitoring (Prometheus/Grafana)
    - Specs: 6 cores, 16GB RAM
            ↓
    [External Hard Drive]
    - Local Backups
```

---

## 📋 Table of Contents

1. [Architecture Components](#1-architecture-components)
2. [Network Flow](#2-network-flow)
3. [Security Model](#3-security-model)
4. [Tunnel Configuration](#4-tunnel-configuration)
5. [Component Deployment](#5-component-deployment)
6. [Monitoring Strategy](#6-monitoring-strategy)
7. [Backup Strategy](#7-backup-strategy)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Components

### 🌐 **Component A: BiznetGio VPS (Internet Gateway)**

**Role:** Reverse Proxy Only
**Location:** Jakarta Data Center
**Responsibilities:**
- Accept incoming HTTP/HTTPS requests from internet
- SSL/TLS termination (if using domain with Let's Encrypt)
- Reverse proxy to home PC via tunnel
- Rate limiting and DDoS protection
- Firewall (first line of defense)
- Minimal resource usage

**What Runs on VPS:**
```
✅ Nginx (reverse proxy)
✅ Tailscale/WireGuard (tunnel client)
✅ UFW (firewall)
✅ Fail2ban (brute force protection)
✅ Minimal monitoring (uptime checks)

❌ NO application code
❌ NO database
❌ NO heavy processing
```

**Resource Usage (Expected):**
- CPU: 5-10% idle, 20-30% under load
- RAM: 200-400 MB
- Disk: 2-3 GB total
- Network: Depends on user traffic

**Why This Works with 1 vCPU / 2GB RAM:**
Nginx is extremely efficient. This VPS can handle 100+ concurrent connections easily since it only proxies traffic, doesn't process it.

---

### 🏠 **Component B: Home PC (Application Server)**

**Role:** Main Application & Database Server
**Location:** Your Home/Office
**Local IP:** 192.168.88.254
**Responsibilities:**
- Run all Docker containers
- PostgreSQL database (all business data)
- Application logic (NestJS backend)
- Frontend serving (React)
- Redis caching
- PDF generation (Puppeteer)
- Email notifications
- Full monitoring stack (Prometheus/Grafana/Loki)
- Local backups to external HDD

**What Runs on Home PC:**
```
✅ Docker containers:
   - NestJS backend
   - React frontend
   - PostgreSQL 15
   - Redis 7
   - Nginx (local)
   - Prometheus
   - Grafana
   - Loki
✅ Tailscale/WireGuard (tunnel server)
✅ Backup scripts
✅ All business data
```

**Resource Usage (Expected):**
- CPU: 10-15% idle, 30-50% under load
- RAM: 4-6 GB (plenty of headroom from 16GB)
- Disk: 20-30 GB for application + database growth
- External HDD: Backups (recommend 500GB+)

**Why This Works:**
Your 6-core CPU and 16GB RAM is overkill for 50-100 users. Plenty of room for growth.

---

### 🔐 **Component C: Secure Tunnel**

**Role:** Encrypted Connection Between VPS and Home PC

**Option 1: Tailscale** ⭐ **RECOMMENDED**
- **You already have it installed!** (`100.114.215.21`)
- Mesh VPN network
- Auto-discovery, auto-reconnect
- Works behind CGNAT (perfect for Biznet Home)
- Web-based admin panel
- Free for personal use

**Option 2: WireGuard**
- Manual configuration
- Slightly faster than Tailscale
- More control over routing
- Requires key management

**Connection Details:**
```
VPS (Tailscale IP)  ←→  Home PC (Tailscale IP: 100.114.215.21)
        Encrypted Tunnel (UDP)
        Auto-reconnect on disconnect
        NAT traversal built-in
```

---

## 2. Network Flow

### **User Request Flow**

```
1. User opens browser → http://VPS_PUBLIC_IP
                         ↓
2. Internet → BiznetGio VPS Public IP (Jakarta)
                         ↓
3. VPS Nginx receives request
   - Checks rate limits
   - Logs request
   - Applies security headers
                         ↓
4. Nginx proxies to Tailscale IP: http://100.114.215.21:5000
                         ↓
5. Through encrypted tunnel → Home PC
                         ↓
6. Home PC Nginx/Docker receives request
                         ↓
7. Application processes (NestJS backend)
                         ↓
8. Database query (PostgreSQL on same machine)
                         ↓
9. Response generated
                         ↓
10. Back through tunnel → VPS
                         ↓
11. VPS Nginx sends response → User
```

**Latency Breakdown:**
- VPS to User: 10-50ms (depends on user location)
- VPS to Home PC (via tunnel): 5-15ms (same ISP, Jakarta to your home)
- Application processing: 50-200ms
- **Total: 65-265ms** (acceptable for business app)

---

## 3. Security Model

### **3-Layer Security Implementation**

#### **Layer 1: VPS Internet Firewall**
```bash
# VPS UFW Configuration
ufw allow 22/tcp      # SSH (custom port recommended)
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS (if using SSL)
ufw allow 41641/udp   # Tailscale (or WireGuard port)
ufw default deny incoming
ufw default allow outgoing
ufw enable
```

**Fail2ban on VPS:**
- Blocks brute force SSH attempts
- Blocks HTTP flood attacks
- Ban time: 1 hour
- Max retries: 3 attempts

---

#### **Layer 2: Tunnel Encryption**
- **Tailscale:** WireGuard-based encryption (ChaCha20-Poly1305)
- **WireGuard:** Same encryption standard
- All traffic between VPS and home is encrypted
- Home PC is NOT exposed to internet directly

---

#### **Layer 3: Home PC Security**
```bash
# Home PC Firewall (Minimal - only tunnel access)
ufw allow from 100.0.0.0/8 to any    # Allow Tailscale network
ufw allow 192.168.88.0/24            # Allow local network
ufw default deny incoming
ufw enable
```

**Why minimal firewall?**
Home PC is not exposed to internet. Only VPS can reach it via tunnel.

---

#### **Layer 4: Application Security**
- JWT authentication (NestJS)
- Rate limiting on API endpoints
- SQL injection prevention (Prisma ORM)
- XSS protection headers
- CSRF protection
- Password hashing (bcrypt)

---

## 4. Tunnel Configuration

### **Option A: Tailscale Setup** ⭐ **RECOMMENDED**

#### **Home PC (Already Installed!)**
```bash
# Check Tailscale status
sudo tailscale status

# Should show: 100.114.215.21
# If not running, start it:
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
```

#### **BiznetGio VPS (New Installation)**
```bash
# Install Tailscale on VPS
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
sudo tailscale up

# Login to same account as home PC
# This will give you a login URL - open it in browser

# Verify connection to home PC
ping 100.114.215.21
```

**That's it!** No configuration files, no keys to manage.

---

### **Option B: WireGuard Setup** (Manual)

#### **Home PC (Server)**
```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Create config: /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <HOME_PC_PRIVATE_KEY>
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
PublicKey = <VPS_PUBLIC_KEY>
AllowedIPs = 10.0.0.2/32

# Start WireGuard
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

#### **VPS (Client)**
```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Create config: /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <VPS_PRIVATE_KEY>
Address = 10.0.0.2/24

[Peer]
PublicKey = <HOME_PC_PUBLIC_KEY>
Endpoint = <YOUR_HOME_PUBLIC_IP>:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25

# Start WireGuard
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

**Note:** WireGuard requires your home's public IP (which may change). Tailscale handles this automatically.

---

## 5. Component Deployment

### **Deployment Order**

1. ✅ **Home PC Setup** (Do this first)
   - Install Docker
   - Deploy application
   - Test locally (http://192.168.88.254)
   - Verify database working
   - Set up monitoring
   - Configure backups

2. ✅ **Tunnel Setup**
   - Install Tailscale/WireGuard on both sides
   - Verify connectivity between VPS and home PC
   - Test: Can VPS ping home PC via tunnel?

3. ✅ **VPS Setup** (Do this last)
   - Install Nginx
   - Configure reverse proxy
   - Set up firewall (UFW)
   - Set up Fail2ban
   - Test external access

---

## 6. Monitoring Strategy

### **Home PC Monitoring** (Full Stack)
```
Prometheus + Grafana + Loki
- Application metrics
- Database performance
- Docker container health
- System resources (CPU, RAM, Disk)
- Backup job status
- Tunnel connection status

Access: http://100.114.215.21:3001 (via Tailscale)
```

### **VPS Monitoring** (Minimal)
```
Simple health checks:
- Nginx status
- Tunnel connectivity
- System resources
- Fail2ban activity

Method: SSH to VPS + simple scripts
```

### **Tunnel Health Monitoring**
```bash
# On VPS - Check if home PC is reachable
*/5 * * * * ping -c 1 100.114.215.21 || systemctl restart tailscaled
```

---

## 7. Backup Strategy

### **Home PC Backups** (Primary)
```
Daily automated backups to external HDD:
- PostgreSQL database dump
- Docker volumes
- Configuration files
- Application logs

Script: /home/jeff/monomi-finance/scripts/backup.sh
Schedule: Daily at 2 AM via cron
Retention: 30 days local, older backups archived
```

### **VPS Backups** (Configuration Only)
```
Weekly backup of VPS configuration:
- Nginx config files
- UFW rules
- Tailscale/WireGuard config
- Fail2ban config

Size: < 1 MB
Can be stored in Git repository
```

### **Disaster Recovery**

**Scenario 1: Home PC Hardware Failure**
```
1. Get new PC or repair
2. Install Ubuntu
3. Install Docker
4. Install Tailscale (rejoin network)
5. Restore from external HDD backup
6. Test locally
7. Tunnel automatically reconnects
8. Service restored
Time: 2-4 hours
```

**Scenario 2: VPS Failure**
```
1. Spin up new VPS
2. Install Nginx + Tailscale
3. Restore config from Git/backup
4. Point to home PC Tailscale IP
5. Service restored
Time: 30 minutes
```

**Scenario 3: Tunnel Failure**
```
- Tailscale: Auto-reconnects within seconds
- WireGuard: May need manual restart
- Fallback: Upgrade to Biznet Home Gamers (public IP)
```

**Scenario 4: Internet Outage at Home**
```
- Service is offline (expected)
- No data loss (database is local)
- Auto-resumes when internet returns
- Tailscale auto-reconnects
```

---

## 8. Troubleshooting

### **Issue: Cannot Access from Internet**

**Check VPS:**
```bash
# SSH to VPS
ssh user@vps-ip

# Check Nginx status
sudo systemctl status nginx

# Check if Nginx is listening
sudo netstat -tlnp | grep nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test if VPS can reach home PC
ping 100.114.215.21
curl http://100.114.215.21:5000/health
```

**Check Home PC:**
```bash
# Check if app is running
docker-compose -f docker-compose.prod.yml ps

# Check if app responds locally
curl http://localhost:5000/health

# Check Tailscale status
sudo tailscale status

# Check Tailscale logs
sudo journalctl -u tailscaled -f
```

---

### **Issue: Slow Performance**

**Check Tunnel:**
```bash
# On VPS, ping home PC
ping 100.114.215.21

# Should be < 20ms
# If > 50ms, tunnel may be routing through relay
```

**Check Application:**
```bash
# On home PC, check container stats
docker stats

# Check database slow queries
docker-compose -f docker-compose.prod.yml exec db \
  psql -U invoiceuser -d invoices -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

### **Issue: Tunnel Disconnected**

**Tailscale:**
```bash
# On both VPS and home PC
sudo tailscale status

# If offline, restart
sudo systemctl restart tailscaled

# Check logs
sudo journalctl -u tailscaled -n 50
```

**WireGuard:**
```bash
# Check status
sudo wg show

# Restart
sudo wg-quick down wg0
sudo wg-quick up wg0

# Check logs
sudo journalctl -xe | grep wireguard
```

---

## 9. Cost Analysis

### **Monthly Costs**

| Component | Cost | Notes |
|-----------|------|-------|
| BiznetGio VPS | $0 | You already have subscription |
| Biznet Home Internet | Existing | Your regular internet plan |
| Tailscale | $0 | Free for personal use |
| Domain (optional) | $0-15/year | Optional - can use VPS IP |
| SSL (Let's Encrypt) | $0 | Free if using domain |
| **Total** | **$0/month** | 🎉 |

### **One-Time Costs**

| Item | Cost | Priority |
|------|------|----------|
| External HDD (500GB-1TB) | $30-50 | ✅ Required |
| UPS for home PC | $50-150 | ⭐ Recommended |
| Static IP from Biznet | $0 | ❌ Not needed (tunnel handles it) |
| **Total** | **$80-200** | One-time |

---

## 10. Performance Expectations

### **Expected Response Times**

| Metric | Target | Expected |
|--------|--------|----------|
| **VPS → Home (tunnel)** | < 20ms | 10-15ms |
| **Page Load Time** | < 2s | 1.5s |
| **API Response** | < 300ms | 150-250ms |
| **PDF Generation** | < 5s | 3-4s |
| **Database Query** | < 100ms | 50ms |

### **Capacity**

| Metric | Capacity |
|--------|----------|
| **Concurrent Users** | 50-100 |
| **Daily Active Users** | 200-500 |
| **Database Size** | Up to 100GB (plenty of room) |
| **Uptime SLA** | 99%+ (dependent on home internet) |

---

## 11. Advantages of Hybrid Architecture

### ✅ **Pros**

1. **Zero Extra Cost** - Using existing VPS subscription
2. **Data Sovereignty** - All business data stays on your hardware at home
3. **Full Control** - Physical access to database server
4. **Bypasses CGNAT** - Works with any home internet
5. **Scalable** - Upgrade home PC hardware anytime
6. **Low Latency** - VPS in Jakarta (same network as home)
7. **Secure** - Home PC not exposed to internet
8. **Flexible** - Can add SSL, domain, Cloudflare easily
9. **Cost-Effective Backups** - External HDD cheaper than cloud
10. **High Performance** - Home PC has better specs than typical VPS

### ⚠️ **Considerations**

1. **Tunnel Dependency** - If tunnel breaks, app is offline
   - Mitigation: Tailscale auto-reconnects

2. **Home Internet Dependency** - If internet down, app offline
   - Mitigation: Biznet typically stable, get UPS

3. **Two Points of Monitoring** - Need to watch both VPS and home PC
   - Mitigation: Centralized monitoring on home PC, simple checks on VPS

4. **Power Stability** - Home PC needs reliable power
   - Mitigation: UPS (you're getting one)

5. **Upload Bandwidth** - Home upload speed matters
   - Status: Biznet typically has good upload speeds (check yours)

---

## 12. Next Steps

### **Pre-Deployment Checklist**

**Home PC:**
- [ ] Ubuntu installed and updated
- [ ] Static local IP configured (192.168.88.254)
- [ ] Docker installed
- [ ] External HDD connected and formatted
- [ ] UPS installed (recommended)

**BiznetGio VPS:**
- [ ] Ubuntu 24.04 LTS installed
- [ ] Public IP noted
- [ ] Root/sudo access verified
- [ ] SSH access configured

**Network:**
- [ ] Home internet stable
- [ ] Tailscale account created (or ready to install WireGuard)
- [ ] Decision made: Tailscale or WireGuard?
- [ ] Decision made: Domain name or just use VPS IP?

**Passwords Generated:**
- [ ] Database password (32+ chars)
- [ ] JWT secret (64+ chars)
- [ ] Redis password (32+ chars)
- [ ] Grafana password

---

## 🎯 Deployment Timeline

| Phase | Duration | Location |
|-------|----------|----------|
| Home PC Setup | 45 min | Home |
| Tunnel Configuration | 30 min | Both |
| VPS Setup | 30 min | VPS |
| Nginx Reverse Proxy | 20 min | VPS |
| Testing & Verification | 30 min | Both |
| Monitoring Setup | 20 min | Home |
| Backup Configuration | 15 min | Home |
| **Total** | **3-3.5 hours** | |

---

**Document Status:** ✅ **Ready for Implementation**

**Next Document:** DEPLOYMENT_IMPLEMENTATION_GUIDE.md (step-by-step commands)

**Architecture:** Hybrid (VPS Reverse Proxy + Home PC Application Server)

**Cost:** $0/month (using existing resources)

**Deployment Time:** 3-3.5 hours
