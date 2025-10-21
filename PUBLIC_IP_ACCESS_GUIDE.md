# Public IP Access Guide - Invoice Generator

## Current Status ✅

Your application is **running successfully** and accessible locally:

- **Backend API**: http://localhost:5000 ✅
- **Frontend**: http://localhost:3000 ✅
- **Public IP**: 182.253.124.104
- **Firewall**: Ports 3000 and 5000 are OPEN ✅
- **CORS**: Configured for public IP ✅

## External Access Setup Required

To make your application accessible from the internet via **http://182.253.124.104:3000**, you need to configure **port forwarding** on your router.

---

## Step 1: Configure Router Port Forwarding

### Find Your Router's Admin Panel

1. **Determine your router's IP address**:
   ```bash
   ip route | grep default
   ```
   Common router IPs: `192.168.1.1`, `192.168.0.1`, `10.0.0.1`

2. **Open router admin panel** in your browser:
   - Visit: http://192.168.1.1 (or your router's IP)
   - Login with admin credentials (check router label/manual)

### Configure Port Forwarding Rules

Add these two port forwarding rules:

#### Rule 1: Frontend (Port 3000)
- **Service Name**: Invoice-Frontend
- **External Port**: 3000
- **Internal IP**: Your server's local IP (find with `hostname -I`)
- **Internal Port**: 3000
- **Protocol**: TCP
- **Enable**: Yes

#### Rule 2: Backend API (Port 5000)
- **Service Name**: Invoice-Backend
- **External Port**: 5000
- **Internal IP**: Your server's local IP
- **Internal Port**: 5000
- **Protocol**: TCP
- **Enable**: Yes

### Common Router Brands Setup

**TP-Link**:
- Navigate to: **Advanced** → **NAT Forwarding** → **Virtual Servers**
- Click **Add**, enter details above

**D-Link**:
- Navigate to: **Advanced** → **Port Forwarding**
- Add new rule with details above

**ASUS**:
- Navigate to: **WAN** → **Virtual Server / Port Forwarding**
- Add entries for both ports

**Netgear**:
- Navigate to: **Advanced** → **Advanced Setup** → **Port Forwarding/Port Triggering**

---

## Step 2: Test External Access

After configuring port forwarding, test from another device (mobile phone using cellular data, NOT WiFi):

### Test Backend API:
```bash
curl http://182.253.124.104:5000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T...",
  "environment": "development"
}
```

### Test Frontend:
Open in browser: **http://182.253.124.104:3000**

You should see the Invoice Generator login page.

---

## Step 3: Access Your Application

Once port forwarding is configured:

### Frontend (User Interface)
```
http://182.253.124.104:3000
```

### Backend API
```
http://182.253.124.104:5000
```

### Default Login Credentials
- **Email**: admin@monomi.id
- **Password**: password123

---

## Troubleshooting

### Port Forwarding Not Working?

1. **Check ISP restrictions**:
   - Some ISPs block incoming connections on certain ports
   - Contact your ISP if ports are blocked
   - They may require business plan for port forwarding

2. **Verify your public IP**:
   ```bash
   curl -s ifconfig.me
   ```
   If different from 182.253.124.104, update `.env` file:
   ```bash
   FRONTEND_URL=http://NEW_IP:3000
   CORS_ORIGIN=http://NEW_IP:3000
   ```
   Then restart: `docker compose -f docker-compose.dev.yml restart`

3. **Dynamic IP address**:
   - If your ISP gives dynamic IP, it may change
   - Consider using Dynamic DNS services (DynDNS, No-IP)
   - Or upgrade to static IP from ISP

4. **Router firewall**:
   - Some routers have additional firewall rules
   - Check router's security/firewall settings
   - Ensure incoming traffic is allowed on ports 3000/5000

5. **Test local connectivity first**:
   ```bash
   # From another device on same network
   curl http://LOCAL_IP:5000/api/v1/health
   curl -I http://LOCAL_IP:3000
   ```

---

## Security Considerations ⚠️

Since your application will be **publicly accessible**, follow these security measures:

### Immediate Actions Required:

1. **Change default admin password**:
   - Login to application
   - Go to Settings/Profile
   - Change password from `password123` to strong password

2. **Use HTTPS instead of HTTP** (Recommended):
   - Option A: Use Cloudflare Tunnel (free SSL) - see `CLOUDFLARE_TUNNEL_QUICKSTART.md`
   - Option B: Use Let's Encrypt with domain name
   - Option C: Use ngrok for temporary secure tunnels

3. **Implement rate limiting**:
   - Limit login attempts to prevent brute force
   - Already configured in NestJS backend

4. **Monitor access logs**:
   ```bash
   # Watch application logs
   docker compose -f docker-compose.dev.yml logs -f app
   ```

5. **Regular security updates**:
   ```bash
   # Keep system updated
   sudo apt update && sudo apt upgrade
   ```

### Production Security Checklist:

- [ ] Change default passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules (UFW already configured)
- [ ] Setup fail2ban for brute force protection
- [ ] Enable application-level authentication
- [ ] Regular database backups
- [ ] Monitor server logs
- [ ] Keep dependencies updated
- [ ] Use environment-specific secrets

---

## Alternative Solutions

If port forwarding doesn't work or isn't available:

### Option 1: Cloudflare Tunnel (Recommended)
- **Free SSL certificate**
- **No port forwarding needed**
- **DDoS protection**
- **Requires domain name** (~$10/year)
- See: `CLOUDFLARE_TUNNEL_QUICKSTART.md`

### Option 2: ngrok (Quick Testing)
```bash
# Install ngrok
snap install ngrok

# Authenticate (free account)
ngrok authtoken YOUR_TOKEN

# Expose frontend
ngrok http 3000

# Expose backend (in another terminal)
ngrok http 5000
```

Pros: Instant public URLs, HTTPS included
Cons: URLs change on restart (unless paid plan)

### Option 3: Tailscale VPN
- **No port forwarding needed**
- **Secure mesh network**
- **Free for personal use**
- See: `EXTERNAL_ACCESS_PLAN.md` → Section 2

### Option 4: VPS Deployment
- Deploy to cloud: DigitalOcean, AWS, Google Cloud
- Get static IP and domain
- Full control over networking

---

## Current Configuration Summary

### Firewall (UFW)
```bash
# Check current status
sudo ufw status

# Configured rules:
3000/tcp                   ALLOW       Anywhere
5000/tcp                   ALLOW       Anywhere
```

### Environment (.env)
```bash
FRONTEND_URL=http://182.253.124.104:3000
CORS_ORIGIN=http://182.253.124.104:3000
PORT=5000
NODE_ENV=development
```

### Docker Services
```bash
# Check running containers
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

---

## Quick Commands Reference

### Check if ports are listening:
```bash
sudo ss -tulpn | grep -E ':(3000|5000)'
```

### Test local access:
```bash
curl http://localhost:5000/api/v1/health
curl -I http://localhost:3000
```

### Test external access (from another device):
```bash
curl http://182.253.124.104:5000/api/v1/health
```

### Restart application:
```bash
docker compose -f docker-compose.dev.yml restart
```

### View application logs:
```bash
docker compose -f docker-compose.dev.yml logs -f app
```

---

## Next Steps

1. ✅ **Application is running locally**
2. ⏳ **Configure router port forwarding** (see Step 1)
3. ⏳ **Test external access** (see Step 2)
4. ⏳ **Implement security measures** (see Security section)
5. ⏳ **Share URLs with users**

---

## Need Help?

### Check Router Port Forwarding Status:
- Visit: https://www.yougetsignal.com/tools/open-ports/
- Enter IP: 182.253.124.104
- Test ports: 3000 and 5000

### Router-Specific Guides:
- TP-Link: https://www.tp-link.com/support/faq/171/
- D-Link: https://support.dlink.com/faq/view.asp?prod_id=3083
- ASUS: https://www.asus.com/support/FAQ/1037906/
- Port Forward Database: https://portforward.com/

### Contact ISP:
If port forwarding doesn't work, your ISP may be blocking ports. Contact them and request:
- Port forwarding enablement
- Static IP address (may require business plan)

---

## Summary

Your Invoice Generator is **ready for external access**. The application is running correctly on your server with firewall configured. You just need to:

1. **Configure port forwarding** on your router (ports 3000 and 5000)
2. **Test access** from external network
3. **Implement security measures** (change passwords, enable HTTPS)

**Current Access URLs** (after port forwarding):
- Frontend: http://182.253.124.104:3000
- Backend: http://182.253.124.104:5000/api/v1

Happy invoicing! 📊💰
