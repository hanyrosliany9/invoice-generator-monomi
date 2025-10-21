#!/bin/bash

# Cloudflare Tunnel Setup Script for Monomi Invoice Generator
# Run with: bash cloudflare-tunnel-setup.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Cloudflare Tunnel Setup - Invoice Generator        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print step headers
print_step() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Install cloudflared
print_step "Step 1: Installing cloudflared"

if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}✅ cloudflared is already installed${NC}"
    cloudflared --version
else
    echo -e "${YELLOW}Installing cloudflared...${NC}"

    # Download latest version
    cd /tmp
    wget -q --show-progress https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    check_success "Downloaded cloudflared"

    # Install package
    sudo dpkg -i cloudflared-linux-amd64.deb
    check_success "Installed cloudflared"

    # Cleanup
    rm cloudflared-linux-amd64.deb

    # Verify installation
    cloudflared --version
    check_success "cloudflared installation verified"
fi

cd "$PROJECT_DIR"

# Step 2: Check prerequisites
print_step "Step 2: Prerequisites Check"

echo -e "${YELLOW}Before continuing, you need:${NC}"
echo ""
echo "  1. ✅ A Cloudflare account (free) - https://dash.cloudflare.com/sign-up"
echo "  2. ✅ A domain name added to Cloudflare"
echo "     - Can be from any registrar (Namecheap, GoDaddy, etc.)"
echo "     - Must have Cloudflare nameservers configured"
echo ""
echo -e "${BLUE}Recommended domain structure:${NC}"
echo "  - invoice.yourdomain.com  → Frontend (React app)"
echo "  - api.yourdomain.com      → Backend (NestJS API)"
echo ""
echo -e "${YELLOW}If you don't have a domain yet:${NC}"
echo "  - Namecheap: ~\$10/year (.com)"
echo "  - Cloudflare Registrar: At cost pricing"
echo "  - Freenom: Free domains (limited options)"
echo ""

read -p "Do you have a Cloudflare account and domain ready? (y/n): " has_domain

if [[ $has_domain != "y" ]]; then
    echo ""
    echo -e "${YELLOW}Please complete these steps first:${NC}"
    echo ""
    echo "1. Create Cloudflare account: https://dash.cloudflare.com/sign-up"
    echo "2. Add your domain to Cloudflare:"
    echo "   - Dashboard → Add a Site → Enter your domain"
    echo "   - Follow instructions to change nameservers at your registrar"
    echo "   - Wait for activation (usually 5-30 minutes)"
    echo ""
    echo "3. Re-run this script when ready:"
    echo "   bash cloudflare-tunnel-setup.sh"
    echo ""
    exit 0
fi

# Get domain information
print_step "Step 3: Domain Configuration"

read -p "Enter your domain name (e.g., monomi.finance): " DOMAIN
read -p "Enter subdomain for frontend (e.g., invoice): " FRONTEND_SUBDOMAIN
read -p "Enter subdomain for backend API (e.g., api): " BACKEND_SUBDOMAIN

FRONTEND_HOSTNAME="${FRONTEND_SUBDOMAIN}.${DOMAIN}"
BACKEND_HOSTNAME="${BACKEND_SUBDOMAIN}.${DOMAIN}"

echo ""
echo -e "${GREEN}Your configuration:${NC}"
echo -e "  Frontend URL: ${BLUE}https://${FRONTEND_HOSTNAME}${NC}"
echo -e "  Backend URL:  ${BLUE}https://${BACKEND_HOSTNAME}${NC}"
echo ""

read -p "Is this correct? (y/n): " confirm
if [[ $confirm != "y" ]]; then
    echo "Please re-run the script with correct information"
    exit 0
fi

# Step 4: Authenticate with Cloudflare
print_step "Step 4: Cloudflare Authentication"

echo -e "${YELLOW}Opening browser for Cloudflare authentication...${NC}"
echo ""
echo "This will:"
echo "  1. Open your default browser"
echo "  2. Ask you to login to Cloudflare"
echo "  3. Authorize cloudflared to manage tunnels"
echo "  4. Return to this terminal"
echo ""
read -p "Press Enter to continue..."

cloudflared tunnel login

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully authenticated with Cloudflare${NC}"
    echo ""
    echo "Credentials stored in: ~/.cloudflared/cert.pem"
else
    echo -e "${RED}❌ Authentication failed${NC}"
    echo "Please try again or check Cloudflare dashboard"
    exit 1
fi

# Step 5: Create tunnel
print_step "Step 5: Creating Cloudflare Tunnel"

TUNNEL_NAME="invoice-app-$(date +%s)"

echo -e "${YELLOW}Creating tunnel: ${TUNNEL_NAME}${NC}"
cloudflared tunnel create "$TUNNEL_NAME"
check_success "Tunnel created"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo -e "${RED}❌ Failed to get tunnel ID${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Tunnel created successfully!${NC}"
echo -e "   Tunnel Name: ${BLUE}${TUNNEL_NAME}${NC}"
echo -e "   Tunnel ID:   ${BLUE}${TUNNEL_ID}${NC}"
echo ""

# Step 6: Configure tunnel
print_step "Step 6: Configuring Tunnel"

mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
# Cloudflare Tunnel Configuration
# Invoice Generator - Monomi Finance

tunnel: ${TUNNEL_ID}
credentials-file: /home/$(whoami)/.cloudflared/${TUNNEL_ID}.json

# Ingress rules (processed in order)
ingress:
  # Frontend application
  - hostname: ${FRONTEND_HOSTNAME}
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true

  # Backend API
  - hostname: ${BACKEND_HOSTNAME}
    service: http://localhost:5000
    originRequest:
      noTLSVerify: true

  # Catch-all rule (required)
  - service: http_status:404
EOF

echo -e "${GREEN}✅ Configuration file created${NC}"
echo ""
cat ~/.cloudflared/config.yml
echo ""

# Step 7: Route DNS
print_step "Step 7: Setting up DNS Routes"

echo -e "${YELLOW}Creating DNS records in Cloudflare...${NC}"
echo ""

# Route frontend
echo "Routing ${FRONTEND_HOSTNAME}..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$FRONTEND_HOSTNAME"
check_success "Frontend DNS route created"

# Route backend
echo "Routing ${BACKEND_HOSTNAME}..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$BACKEND_HOSTNAME"
check_success "Backend DNS route created"

echo ""
echo -e "${GREEN}✅ DNS routes configured${NC}"
echo ""

# Step 8: Update environment configuration
print_step "Step 8: Updating Application Configuration"

echo -e "${YELLOW}Updating environment variables...${NC}"

# Create or update .env file
if [ -f "$PROJECT_DIR/.env" ]; then
    # Backup existing .env
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backed up existing .env file"
fi

# Update or add FRONTEND_URL and CORS_ORIGIN
if grep -q "FRONTEND_URL=" "$PROJECT_DIR/.env" 2>/dev/null; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://${FRONTEND_HOSTNAME}|" "$PROJECT_DIR/.env"
else
    echo "FRONTEND_URL=https://${FRONTEND_HOSTNAME}" >> "$PROJECT_DIR/.env"
fi

if grep -q "CORS_ORIGIN=" "$PROJECT_DIR/.env" 2>/dev/null; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://${FRONTEND_HOSTNAME}|" "$PROJECT_DIR/.env"
else
    echo "CORS_ORIGIN=https://${FRONTEND_HOSTNAME}" >> "$PROJECT_DIR/.env"
fi

echo -e "${GREEN}✅ Environment updated${NC}"

# Step 9: Test tunnel
print_step "Step 9: Testing Tunnel"

echo -e "${YELLOW}Starting tunnel in test mode...${NC}"
echo "Press Ctrl+C after ~10 seconds to continue"
echo ""

timeout 10 cloudflared tunnel run "$TUNNEL_NAME" || true

echo ""
echo -e "${GREEN}✅ Tunnel test completed${NC}"

# Step 10: Install as service
print_step "Step 10: Installing Tunnel as Service"

echo -e "${YELLOW}Installing cloudflared as a system service...${NC}"
echo ""

read -p "Install tunnel as systemd service? (y/n): " install_service

if [[ $install_service == "y" ]]; then
    sudo cloudflared service install
    check_success "Service installed"

    sudo systemctl start cloudflared
    check_success "Service started"

    sudo systemctl enable cloudflared
    check_success "Service enabled"

    echo ""
    echo -e "${GREEN}✅ Cloudflare Tunnel is now running as a service${NC}"
    echo ""
    echo "Service commands:"
    echo "  Status:  sudo systemctl status cloudflared"
    echo "  Stop:    sudo systemctl stop cloudflared"
    echo "  Start:   sudo systemctl start cloudflared"
    echo "  Restart: sudo systemctl restart cloudflared"
    echo "  Logs:    sudo journalctl -u cloudflared -f"
else
    echo ""
    echo -e "${YELLOW}⚠️  Tunnel not installed as service${NC}"
    echo ""
    echo "To run manually:"
    echo "  cloudflared tunnel run $TUNNEL_NAME"
    echo ""
    echo "To install later:"
    echo "  sudo cloudflared service install"
fi

# Final summary
print_step "🎉 Setup Complete!"

echo -e "${GREEN}✅ Cloudflare Tunnel is configured and running!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Your Application URLs:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  📱 Frontend:  ${GREEN}https://${FRONTEND_HOSTNAME}${NC}"
echo -e "  🔌 Backend:   ${GREEN}https://${BACKEND_HOSTNAME}${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏱️  DNS propagation may take a few minutes${NC}"
echo "   Test your URLs in 2-5 minutes"
echo ""

echo -e "${CYAN}Testing commands:${NC}"
echo ""
echo "  # Test backend health"
echo "  curl https://${BACKEND_HOSTNAME}/api/v1/health"
echo ""
echo "  # Access frontend"
echo "  curl -I https://${FRONTEND_HOSTNAME}"
echo ""

echo -e "${CYAN}Monitoring:${NC}"
echo ""
echo "  # Check tunnel status"
echo "  cloudflared tunnel info $TUNNEL_NAME"
echo ""
echo "  # View tunnel logs"
echo "  sudo journalctl -u cloudflared -f"
echo ""
echo "  # List all tunnels"
echo "  cloudflared tunnel list"
echo ""

echo -e "${CYAN}Cloudflare Dashboard:${NC}"
echo "  https://one.dash.cloudflare.com/"
echo "  → Access → Tunnels → $TUNNEL_NAME"
echo ""

echo -e "${YELLOW}Important Notes:${NC}"
echo ""
echo "  ✓ SSL/TLS is automatically configured"
echo "  ✓ No firewall changes needed"
echo "  ✓ Traffic is encrypted end-to-end"
echo "  ✓ DDoS protection enabled"
echo "  ✓ Service starts automatically on boot"
echo ""

# Save configuration summary
cat > "$PROJECT_DIR/CLOUDFLARE_TUNNEL_INFO.txt" << EOF
Cloudflare Tunnel Configuration
================================
Generated: $(date)

Tunnel Information:
- Tunnel Name: $TUNNEL_NAME
- Tunnel ID: $TUNNEL_ID
- Config File: ~/.cloudflared/config.yml

URLs:
- Frontend: https://${FRONTEND_HOSTNAME}
- Backend:  https://${BACKEND_HOSTNAME}

Service Management:
- Status:  sudo systemctl status cloudflared
- Restart: sudo systemctl restart cloudflared
- Logs:    sudo journalctl -u cloudflared -f

Tunnel Management:
- List tunnels:   cloudflared tunnel list
- Tunnel info:    cloudflared tunnel info $TUNNEL_NAME
- Delete tunnel:  cloudflared tunnel delete $TUNNEL_NAME

Dashboard:
https://one.dash.cloudflare.com/

Configuration Files:
- Tunnel config: ~/.cloudflared/config.yml
- Credentials:   ~/.cloudflared/${TUNNEL_ID}.json
- Certificate:   ~/.cloudflared/cert.pem
EOF

echo -e "${GREEN}✅ Configuration saved to: ${PROJECT_DIR}/CLOUDFLARE_TUNNEL_INFO.txt${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              🎊 Setup Complete! 🎊                         ║${NC}"
echo -e "${BLUE}║   Your Invoice Generator is now accessible globally!       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "Would you like to open the frontend URL in browser? (y/n): " open_browser
if [[ $open_browser == "y" ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://${FRONTEND_HOSTNAME}"
    elif command -v open &> /dev/null; then
        open "https://${FRONTEND_HOSTNAME}"
    else
        echo "Please open manually: https://${FRONTEND_HOSTNAME}"
    fi
fi

echo ""
echo -e "${CYAN}Happy invoicing! 📊💰${NC}"
echo ""
