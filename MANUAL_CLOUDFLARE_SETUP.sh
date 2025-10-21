#!/bin/bash
# Manual Cloudflare Tunnel Setup - Step by Step
# Copy and paste these commands one at a time

echo "================================================"
echo "Cloudflare Tunnel Manual Setup"
echo "================================================"
echo ""

# Step 1: Install cloudflared
echo "Step 1: Installing cloudflared..."
echo "Run these commands:"
echo ""
cat << 'EOF'
cd /tmp
wget -q --show-progress https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version
EOF

echo ""
read -p "Press Enter after completing Step 1..."

# Step 2: Authenticate
echo ""
echo "Step 2: Authenticate with Cloudflare"
echo "Run this command (it will open your browser):"
echo ""
echo "cloudflared tunnel login"
echo ""
read -p "Press Enter after completing Step 2..."

# Step 3: Create tunnel
echo ""
echo "Step 3: Create tunnel"
echo "Run this command:"
echo ""
echo "cloudflared tunnel create invoice-app"
echo ""
echo "IMPORTANT: Copy the Tunnel ID from the output!"
echo ""
read -p "Press Enter after completing Step 3..."

# Step 4: Get tunnel info
echo ""
echo "Step 4: Get your Tunnel ID"
echo "Run this command:"
echo ""
echo "cloudflared tunnel list"
echo ""
read -p "Enter your Tunnel ID: " TUNNEL_ID
read -p "Enter your domain (e.g., monomi.finance): " DOMAIN

# Step 5: Create config
echo ""
echo "Step 5: Create tunnel configuration"
echo "Run these commands:"
echo ""
cat << EOF
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << 'CONFIGEOF'
tunnel: ${TUNNEL_ID}
credentials-file: /home/$(whoami)/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: invoice.${DOMAIN}
    service: http://localhost:3000
  - hostname: api.${DOMAIN}
    service: http://localhost:5000
  - service: http_status:404
CONFIGEOF

cat ~/.cloudflared/config.yml
EOF

echo ""
read -p "Press Enter after creating config..."

# Step 6: Route DNS
echo ""
echo "Step 6: Setup DNS routing"
echo "Run these commands:"
echo ""
cat << EOF
cloudflared tunnel route dns invoice-app invoice.${DOMAIN}
cloudflared tunnel route dns invoice-app api.${DOMAIN}
EOF

echo ""
read -p "Press Enter after completing DNS routing..."

# Step 7: Test tunnel
echo ""
echo "Step 7: Test the tunnel"
echo "Run this command (press Ctrl+C after 10 seconds):"
echo ""
echo "cloudflared tunnel run invoice-app"
echo ""
read -p "Press Enter after testing..."

# Step 8: Install as service
echo ""
echo "Step 8: Install as systemd service"
echo "Run these commands:"
echo ""
cat << 'EOF'
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
sudo systemctl status cloudflared
EOF

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Your URLs:"
echo "  Frontend: https://invoice.${DOMAIN}"
echo "  Backend:  https://api.${DOMAIN}"
echo ""
echo "Wait 2-5 minutes for DNS propagation, then test:"
echo "  curl https://api.${DOMAIN}/api/v1/health"
echo ""
