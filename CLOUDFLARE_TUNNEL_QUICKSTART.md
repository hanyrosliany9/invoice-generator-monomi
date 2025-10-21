# Cloudflare Tunnel Quick Start Guide
## Make Your Invoice Generator Accessible to the World! 🌍

**Setup Time**: 15-30 minutes
**Cost**: **FREE** (domain required, ~$10/year)
**Skill Level**: Beginner-friendly

---

## 🎯 What You'll Get

After setup, your app will be accessible from anywhere:
- ✅ **https://invoice.yourdomain.com** - Beautiful, professional URL
- ✅ **Free SSL certificate** - Automatic HTTPS encryption
- ✅ **No port forwarding** - Works behind any firewall/NAT
- ✅ **DDoS protection** - Cloudflare's enterprise-grade security
- ✅ **Global CDN** - Fast loading from anywhere in the world
- ✅ **Zero exposed ports** - Maximum security

---

## 📋 Prerequisites

### 1. **Cloudflare Account** (Free)
- Sign up: https://dash.cloudflare.com/sign-up
- Takes 2 minutes

### 2. **Domain Name** (~$10/year)

**Already have a domain?** Perfect! Just add it to Cloudflare.

**Don't have one yet?** Get one from:
- **Namecheap**: https://www.namecheap.com (~$10/year for .com)
- **Cloudflare Registrar**: https://www.cloudflare.com/products/registrar/ (at-cost pricing)
- **GoDaddy**: https://www.godaddy.com
- **Porkbun**: https://porkbun.com (affordable)

**Free options** (limited):
- Freenom: .tk, .ml, .ga domains (may have limitations)

### 3. **Add Domain to Cloudflare**

Once you have a domain:

1. **Login to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Click "Add a Site"**
3. **Enter your domain** (e.g., `monomi.finance`)
4. **Select Free plan** (more than enough!)
5. **Cloudflare will scan your DNS records**
6. **Update nameservers at your domain registrar**:
   - Copy the 2 nameservers Cloudflare provides
   - Go to your domain registrar (Namecheap, GoDaddy, etc.)
   - Find "DNS Settings" or "Nameservers"
   - Replace with Cloudflare's nameservers
   - Save changes
7. **Wait for activation** (5-30 minutes, usually quick!)

**Example Nameservers** (yours will be different):
```
ns1.cloudflare.com
ns2.cloudflare.com
```

---

## 🚀 Quick Setup (Automated Script)

### Option 1: Run the Automated Setup Script

```bash
cd /home/jeff/projects/monomi/internal/invoice-generator

# Run the setup script
bash cloudflare-tunnel-setup.sh
```

The script will:
1. ✅ Install cloudflared automatically
2. ✅ Guide you through Cloudflare authentication
3. ✅ Create and configure the tunnel
4. ✅ Setup DNS records
5. ✅ Install as a system service
6. ✅ Test everything

**That's it!** Just follow the prompts.

---

## 📝 Manual Setup (Step by Step)

If you prefer to do it manually or the script fails:

### Step 1: Install cloudflared

```bash
# Download
cd /tmp
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify
cloudflared --version
```

### Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will:
- Open your browser
- Ask you to select your domain
- Authorize cloudflared
- Save credentials to `~/.cloudflared/cert.pem`

### Step 3: Create a Tunnel

```bash
# Create tunnel
cloudflared tunnel create invoice-app

# Copy the Tunnel ID from the output
# Example: Created tunnel invoice-app with id abc123-def456-ghi789
```

### Step 4: Configure the Tunnel

```bash
# Create config file
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this configuration (replace `TUNNEL_ID` and domains):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/TUNNEL_ID.json

ingress:
  # Frontend (React)
  - hostname: invoice.yourdomain.com
    service: http://localhost:3000

  # Backend API (NestJS)
  - hostname: api.yourdomain.com
    service: http://localhost:5000

  # Catch-all
  - service: http_status:404
```

### Step 5: Setup DNS Routes

```bash
# Route frontend
cloudflared tunnel route dns invoice-app invoice.yourdomain.com

# Route backend API
cloudflared tunnel route dns invoice-app api.yourdomain.com
```

### Step 6: Test the Tunnel

```bash
# Test run (Ctrl+C to stop)
cloudflared tunnel run invoice-app
```

Visit `https://invoice.yourdomain.com` in your browser!

### Step 7: Install as Service

```bash
# Install service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable auto-start on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

---

## 🎨 Recommended URL Structure

Choose a clear, professional structure:

### Option A: Subdomain Pattern (Recommended)
```
https://invoice.monomi.finance     → Frontend
https://api.monomi.finance         → Backend API
```

### Option B: Path Pattern
```
https://monomi.finance             → Frontend
https://monomi.finance/api         → Backend API
```

### Option C: Separate Subdomains
```
https://app.monomi.finance         → Frontend
https://api-app.monomi.finance     → Backend API
```

---

## 🔍 Testing & Verification

After setup, test your deployment:

### 1. Check Tunnel Status
```bash
# Service status
sudo systemctl status cloudflared

# Tunnel information
cloudflared tunnel info invoice-app

# View logs
sudo journalctl -u cloudflared -f
```

### 2. Test Backend API
```bash
# Health check
curl https://api.yourdomain.com/api/v1/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 3. Test Frontend
```bash
# Check if accessible
curl -I https://invoice.yourdomain.com

# Should return HTTP/2 200
```

### 4. Browser Test
Open in your browser:
- `https://invoice.yourdomain.com`
- Should see your Invoice Generator app!

---

## 🛠️ Troubleshooting

### Problem: "Tunnel not found"
**Solution**:
```bash
# List all tunnels
cloudflared tunnel list

# Use the correct tunnel ID/name
```

### Problem: "DNS not resolving"
**Solution**:
- Wait 2-5 minutes for DNS propagation
- Clear browser cache: Ctrl+Shift+Delete
- Check Cloudflare DNS: https://1.1.1.1/ → DNS Checker

### Problem: "Service won't start"
**Solution**:
```bash
# Check logs for errors
sudo journalctl -u cloudflared -n 50

# Validate config
cloudflared tunnel ingress validate

# Check config file
cat ~/.cloudflared/config.yml
```

### Problem: "502 Bad Gateway"
**Solution**:
- Check if your app is running: `docker compose -f docker-compose.dev.yml ps`
- Check app logs: `docker compose -f docker-compose.dev.yml logs`
- Verify ports 3000 and 5000 are accessible locally:
  ```bash
  curl http://localhost:3000
  curl http://localhost:5000/api/v1/health
  ```

### Problem: "Authentication failed"
**Solution**:
```bash
# Re-authenticate
cloudflared tunnel login

# Check certificate
ls -la ~/.cloudflared/cert.pem
```

---

## 📊 Monitoring & Management

### View Tunnel Dashboard
1. Go to: https://one.dash.cloudflare.com/
2. Navigate: **Access** → **Tunnels**
3. Find your tunnel: **invoice-app**
4. View: Traffic, Logs, Configuration

### Service Commands
```bash
# Check status
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# Stop tunnel
sudo systemctl stop cloudflared

# View logs
sudo journalctl -u cloudflared -f

# View last 100 log lines
sudo journalctl -u cloudflared -n 100
```

### Tunnel Commands
```bash
# List all tunnels
cloudflared tunnel list

# Get tunnel info
cloudflared tunnel info invoice-app

# Test configuration
cloudflared tunnel ingress validate

# Test specific URL
cloudflared tunnel ingress rule https://invoice.yourdomain.com
```

---

## 🔒 Security Best Practices

Your tunnel is already secure, but consider:

### 1. **Enable Cloudflare Access** (Optional)
Add authentication before accessing your app:
- Dashboard → Access → Applications
- Protect sensitive routes
- Add team members with email authentication

### 2. **Configure WAF Rules**
- Dashboard → Security → WAF
- Enable Bot Fight Mode (free)
- Configure rate limiting

### 3. **Monitor Traffic**
- Dashboard → Analytics
- Watch for suspicious activity
- Set up alerts

### 4. **Update Environment Variables**
Make sure your app knows its public URL:

```bash
# Edit .env file
nano .env

# Update these:
FRONTEND_URL=https://invoice.yourdomain.com
CORS_ORIGIN=https://invoice.yourdomain.com
```

Restart your app:
```bash
docker compose -f docker-compose.dev.yml restart
```

---

## 🎯 What's Next?

Now that your app is public:

### Immediate Actions:
- [ ] Test from another device/network
- [ ] Share URL with team members
- [ ] Update bookmarks/links
- [ ] Test all features work over HTTPS

### Optional Enhancements:
- [ ] Add authentication (JWT already configured)
- [ ] Setup monitoring (Uptime Kuma)
- [ ] Configure backups
- [ ] Add custom error pages
- [ ] Setup email notifications

### Production Checklist:
- [ ] Change default passwords
- [ ] Enable 2FA on Cloudflare account
- [ ] Configure backup strategy
- [ ] Setup monitoring/alerting
- [ ] Document for team
- [ ] Plan for updates/maintenance

---

## 🆘 Need Help?

### Documentation
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Zero Trust Dashboard**: https://one.dash.cloudflare.com/
- **Community Forum**: https://community.cloudflare.com/

### Quick Commands Reference
```bash
# Setup
bash cloudflare-tunnel-setup.sh

# Status
sudo systemctl status cloudflared
cloudflared tunnel list

# Logs
sudo journalctl -u cloudflared -f

# Restart
sudo systemctl restart cloudflared

# Test
curl https://api.yourdomain.com/api/v1/health
```

### Common Issues & Solutions
See the **Troubleshooting** section above.

---

## 💡 Pro Tips

1. **Use a short domain**: `invoice.yourdomain.com` is better than `invoice-generator-app.yourdomain.com`

2. **Enable Always Use HTTPS**: In Cloudflare dashboard → SSL/TLS → Edge Certificates → Always Use HTTPS

3. **Enable HTTP/2**: Already enabled by default with Cloudflare

4. **Monitor logs**: Regularly check `sudo journalctl -u cloudflared -f`

5. **Backup your config**:
   ```bash
   cp ~/.cloudflared/config.yml ~/cloudflared-config-backup.yml
   ```

6. **Use environment-specific tunnels**:
   - `invoice-app-dev` for development
   - `invoice-app-staging` for staging
   - `invoice-app-prod` for production

---

## 🎉 Success!

You now have a **globally accessible, SSL-secured Invoice Generator**!

**Share your new URL**: `https://invoice.yourdomain.com` 🚀

---

**Questions? Issues? Need help?**
Check the troubleshooting section or review the full setup plan in `EXTERNAL_ACCESS_PLAN.md`

Happy invoicing! 📊💰
