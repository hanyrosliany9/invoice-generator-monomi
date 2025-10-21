#!/bin/bash

# ngrok Setup Script - Quick Public Access
# Recommended solution for robust public access without domain

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           ngrok Setup - Invoice Generator                 ║${NC}"
echo -e "${BLUE}║     Public Access in 5 Minutes (No Domain Required)       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

# Step 1: Install ngrok
print_step "Step 1: Installing ngrok"

if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ ngrok is already installed${NC}"
    ngrok version
else
    echo -e "${YELLOW}Installing ngrok...${NC}"

    # Add ngrok repository and install
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
      | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null

    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
      | sudo tee /etc/apt/sources.list.d/ngrok.list

    sudo apt update
    sudo apt install ngrok -y

    check_success "ngrok installation"

    ngrok version
fi

# Step 2: Account setup
print_step "Step 2: ngrok Account Setup"

echo -e "${YELLOW}To use ngrok, you need a free account${NC}"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Visit: ${BLUE}https://dashboard.ngrok.com/signup${NC}"
echo "2. Sign up with:"
echo "   - GitHub account (recommended)"
echo "   - Google account"
echo "   - Or email"
echo ""
echo "3. After signup, go to: ${BLUE}https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
echo "4. Copy your authtoken"
echo ""

read -p "Have you signed up and copied your authtoken? (y/n): " has_token

if [[ $has_token != "y" ]]; then
    echo ""
    echo -e "${YELLOW}Please complete signup first, then re-run this script${NC}"
    exit 0
fi

# Step 3: Configure authtoken
print_step "Step 3: Configure Authentication"

echo -e "${YELLOW}Enter your ngrok authtoken:${NC}"
read -p "Authtoken: " NGROK_TOKEN

ngrok config add-authtoken "$NGROK_TOKEN"
check_success "Authentication configured"

# Step 4: Create static domains
print_step "Step 4: Setup Static Domains (Free)"

echo -e "${YELLOW}ngrok provides 1 FREE static domain!${NC}"
echo ""
echo "Please follow these steps to create your static domains:"
echo ""
echo "1. Visit: ${BLUE}https://dashboard.ngrok.com/domains${NC}"
echo "2. Click ${GREEN}\"+ Create Domain\"${NC}"
echo "3. You'll get a domain like: ${CYAN}your-app-1234.ngrok-free.app${NC}"
echo "4. Create TWO domains:"
echo "   - One for Frontend (e.g., invoice-frontend-1234.ngrok-free.app)"
echo "   - One for Backend (e.g., invoice-backend-1234.ngrok-free.app)"
echo ""
echo "${YELLOW}Note: Free tier includes 1 static domain. You can create 2 endpoints${NC}"
echo "${YELLOW}using subdomains if you have a paid plan, but for free tier we'll${NC}"
echo "${YELLOW}guide you through an alternative approach.${NC}"
echo ""

read -p "Have you created your static domain(s)? (y/n): " has_domains

if [[ $has_domains != "y" ]]; then
    echo ""
    echo -e "${YELLOW}Please create domains first, then re-run this script${NC}"
    exit 0
fi

echo ""
read -p "Enter your static domain for the app (e.g., my-invoice.ngrok-free.app): " STATIC_DOMAIN

# Step 5: Configure application
print_step "Step 5: Update Application Configuration"

FRONTEND_URL="https://${STATIC_DOMAIN}"
BACKEND_URL="https://${STATIC_DOMAIN}/api"

echo -e "${YELLOW}Updating .env configuration...${NC}"

# Backup existing .env
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backed up existing .env file"
fi

# Update FRONTEND_URL
if grep -q "FRONTEND_URL=" "$PROJECT_DIR/.env" 2>/dev/null; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|" "$PROJECT_DIR/.env"
else
    echo "FRONTEND_URL=${FRONTEND_URL}" >> "$PROJECT_DIR/.env"
fi

# Update CORS_ORIGIN
if grep -q "CORS_ORIGIN=" "$PROJECT_DIR/.env" 2>/dev/null; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=${FRONTEND_URL}|" "$PROJECT_DIR/.env"
else
    echo "CORS_ORIGIN=${FRONTEND_URL}" >> "$PROJECT_DIR/.env"
fi

echo -e "${GREEN}✅ Application configuration updated${NC}"

# Step 6: Create ngrok configuration
print_step "Step 6: Create ngrok Configuration File"

cat > "$HOME/.ngrok.yml" <<EOF
version: 2
authtoken: ${NGROK_TOKEN}
tunnels:
  invoice-app:
    proto: http
    addr: 3000
    domain: ${STATIC_DOMAIN}
    inspect: true
EOF

echo -e "${GREEN}✅ ngrok configuration created${NC}"

# Step 7: Create systemd service
print_step "Step 7: Install as System Service"

read -p "Install ngrok as a system service (auto-start on boot)? (y/n): " install_service

if [[ $install_service == "y" ]]; then
    sudo tee /etc/systemd/system/ngrok-invoice.service > /dev/null <<EOF
[Unit]
Description=ngrok tunnel for Invoice Generator
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME
ExecStart=/usr/bin/ngrok start invoice-app --config=$HOME/.ngrok.yml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable ngrok-invoice
    sudo systemctl start ngrok-invoice

    check_success "Service installed and started"

    echo ""
    echo -e "${GREEN}✅ ngrok is now running as a system service${NC}"
    echo ""
    echo "Service commands:"
    echo "  Status:  sudo systemctl status ngrok-invoice"
    echo "  Stop:    sudo systemctl stop ngrok-invoice"
    echo "  Start:   sudo systemctl start ngrok-invoice"
    echo "  Restart: sudo systemctl restart ngrok-invoice"
    echo "  Logs:    sudo journalctl -u ngrok-invoice -f"
else
    echo ""
    echo -e "${YELLOW}⚠️  Service not installed${NC}"
    echo ""
    echo "To start ngrok manually:"
    echo "  ngrok start invoice-app --config=$HOME/.ngrok.yml"
fi

# Step 8: Restart application
print_step "Step 8: Restart Application"

echo -e "${YELLOW}Restarting application to apply new configuration...${NC}"

cd "$PROJECT_DIR"
docker compose -f docker-compose.dev.yml restart

check_success "Application restarted"

# Final summary
print_step "🎉 Setup Complete!"

echo -e "${GREEN}✅ ngrok is configured and running!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Your Public URLs:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Application: ${GREEN}${FRONTEND_URL}${NC}"
echo -e "  🔌 API:         ${GREEN}${BACKEND_URL}${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}Features:${NC}"
echo "  ✅ Static URL (won't change on restart)"
echo "  ✅ Auto HTTPS/SSL"
echo "  ✅ Works behind any firewall"
echo "  ✅ No router configuration needed"
echo "  ✅ Traffic inspection available"
echo ""

echo -e "${YELLOW}⚠️  Free Tier Note:${NC}"
echo "  Browser traffic will show an interstitial warning page"
echo "  This is normal and doesn't affect API calls"
echo "  Click 'Visit Site' to proceed"
echo ""

echo -e "${CYAN}Traffic Inspection:${NC}"
echo "  Visit: ${BLUE}http://localhost:4040${NC}"
echo "  View all requests/responses in real-time"
echo ""

echo -e "${CYAN}Default Login:${NC}"
echo "  Email:    admin@monomi.id"
echo "  Password: password123"
echo "  ${RED}⚠️  Change this password immediately!${NC}"
echo ""

echo -e "${CYAN}Monitoring:${NC}"
echo "  # View ngrok logs"
echo "  sudo journalctl -u ngrok-invoice -f"
echo ""
echo "  # View application logs"
echo "  docker compose -f docker-compose.dev.yml logs -f"
echo ""
echo "  # ngrok dashboard"
echo "  https://dashboard.ngrok.com/"
echo ""

echo -e "${CYAN}Testing:${NC}"
echo "  # Test from any device/network:"
echo "  curl ${FRONTEND_URL}/api/v1/health"
echo ""

# Save configuration
cat > "$PROJECT_DIR/NGROK_INFO.txt" <<EOF
ngrok Configuration for Invoice Generator
==========================================
Generated: $(date)

Public URLs:
- Application: ${FRONTEND_URL}
- API: ${BACKEND_URL}

Configuration Files:
- ngrok config: $HOME/.ngrok.yml
- Application config: $PROJECT_DIR/.env

Service Management:
- Status:  sudo systemctl status ngrok-invoice
- Start:   sudo systemctl start ngrok-invoice
- Stop:    sudo systemctl stop ngrok-invoice
- Restart: sudo systemctl restart ngrok-invoice
- Logs:    sudo journalctl -u ngrok-invoice -f

Manual Start (if not using service):
- ngrok start invoice-app --config=$HOME/.ngrok.yml

Traffic Inspection:
- Web UI: http://localhost:4040
- Dashboard: https://dashboard.ngrok.com/

Security:
- Change default password: admin@monomi.id / password123
- Enable 2FA on ngrok account
- Monitor traffic via inspection UI
- Review ngrok dashboard regularly

Troubleshooting:
- Check service: sudo systemctl status ngrok-invoice
- Check app: docker compose -f docker-compose.dev.yml ps
- View logs: sudo journalctl -u ngrok-invoice -f
- Test locally: curl http://localhost:3000

Upgrade Options:
- ngrok Paid ($8/mo): Remove interstitial, branded domains
- Cloudflare Tunnel: Enterprise features, needs domain
- VPS Deployment: Full control, static IP

For more options, see: ROBUST_PUBLIC_ACCESS_OPTIONS.md
EOF

echo -e "${GREEN}✅ Configuration saved to: NGROK_INFO.txt${NC}"
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                🎊 Setup Complete! 🎊                       ║${NC}"
echo -e "${BLUE}║   Your Invoice Generator is now publicly accessible!      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}⏱️  Wait 10-15 seconds for ngrok tunnel to establish${NC}"
echo ""

read -p "Would you like to open the app in browser? (y/n): " open_browser
if [[ $open_browser == "y" ]]; then
    sleep 5  # Give ngrok time to start
    if command -v xdg-open &> /dev/null; then
        xdg-open "${FRONTEND_URL}"
    elif command -v open &> /dev/null; then
        open "${FRONTEND_URL}"
    else
        echo "Please open manually: ${FRONTEND_URL}"
    fi
fi

echo ""
echo -e "${CYAN}Share this URL with anyone: ${GREEN}${FRONTEND_URL}${NC}"
echo ""
echo -e "${CYAN}Happy invoicing! 📊💰${NC}"
echo ""
