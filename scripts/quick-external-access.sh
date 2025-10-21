#!/bin/bash

# Quick External Access Setup Script
# Monomi Invoice Generator
# Run: bash scripts/quick-external-access.sh [option]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Monomi Invoice Generator - External Access Setup        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Get server IPs
LOCAL_IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}' | cut -d/ -f1)
TAILSCALE_IP=$(ip addr show tailscale0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d/ -f1 || echo "Not installed")
PUBLIC_IP=$(curl -s ifconfig.me || echo "Unable to determine")

echo -e "${GREEN}📊 Current Server Information:${NC}"
echo -e "  Local IP:      ${YELLOW}$LOCAL_IP${NC}"
echo -e "  Tailscale IP:  ${YELLOW}$TAILSCALE_IP${NC}"
echo -e "  Public IP:     ${YELLOW}$PUBLIC_IP${NC}"
echo ""

function show_menu() {
    echo -e "${BLUE}Choose External Access Method:${NC}"
    echo ""
    echo "1) 🏠 Local Network Access (5 min) - Access from same WiFi"
    echo "2) 🔐 Tailscale VPN Access (15 min) - Secure remote access"
    echo "3) ☁️  Cloudflare Tunnel (30 min) - Public access with free SSL"
    echo "4) 🚀 Production Deployment - Full production setup"
    echo "5) 📊 Check Current Status - View access information"
    echo "6) 🛡️  Security Hardening - Apply security measures"
    echo "0) Exit"
    echo ""
    read -p "Select option [0-6]: " option

    case $option in
        1) setup_local_network ;;
        2) setup_tailscale ;;
        3) setup_cloudflare_tunnel ;;
        4) setup_production ;;
        5) check_status ;;
        6) security_hardening ;;
        0) exit 0 ;;
        *) echo -e "${RED}Invalid option${NC}"; show_menu ;;
    esac
}

function setup_local_network() {
    echo -e "${GREEN}🏠 Setting up Local Network Access...${NC}"
    echo ""

    # Check if ports are already accessible
    if netstat -tuln | grep -q ":3000.*0.0.0.0"; then
        echo -e "${GREEN}✅ Port 3000 is already bound to 0.0.0.0 (all interfaces)${NC}"
    else
        echo -e "${YELLOW}⚠️  Port 3000 is not accessible from network${NC}"
        echo "Run development mode with: docker compose -f docker-compose.dev.yml up"
    fi

    echo ""
    echo -e "${GREEN}📝 Access Information:${NC}"
    echo ""
    echo -e "  From any device on your network (192.168.88.x):"
    echo -e "  ${BLUE}Frontend:${NC} http://$LOCAL_IP:3000"
    echo -e "  ${BLUE}Backend:${NC}  http://$LOCAL_IP:5000"
    echo ""
    echo -e "  ${YELLOW}Test from another device:${NC}"
    echo -e "  curl http://$LOCAL_IP:5000/api/v1/health"
    echo ""

    read -p "Configure firewall rules? (y/n): " configure_fw
    if [[ $configure_fw == "y" ]]; then
        configure_firewall_local
    fi

    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function setup_tailscale() {
    echo -e "${GREEN}🔐 Setting up Tailscale VPN Access...${NC}"
    echo ""

    # Check if Tailscale is installed
    if ! command -v tailscale &> /dev/null; then
        echo -e "${YELLOW}Tailscale not installed. Installing...${NC}"
        curl -fsSL https://tailscale.com/install.sh | sh
    fi

    # Check Tailscale status
    if ! tailscale status &> /dev/null; then
        echo -e "${YELLOW}Tailscale not authenticated. Please run:${NC}"
        echo "  sudo tailscale up"
        echo ""
        read -p "Press Enter after authentication..."
    fi

    TAILSCALE_IP=$(tailscale ip -4)

    echo -e "${GREEN}✅ Tailscale is configured!${NC}"
    echo ""
    echo -e "${GREEN}📝 Access Information:${NC}"
    echo ""
    echo -e "  From any device with Tailscale installed:"
    echo -e "  ${BLUE}Frontend:${NC} http://$TAILSCALE_IP:3000"
    echo -e "  ${BLUE}Backend:${NC}  http://$TAILSCALE_IP:5000"
    echo ""
    echo -e "  ${YELLOW}To share with team:${NC}"
    echo "  1. Go to https://login.tailscale.com/admin/machines"
    echo "  2. Find this machine ($(hostname))"
    echo "  3. Click 'Share' and invite team members"
    echo ""

    # Configure firewall for Tailscale
    echo -e "${YELLOW}Configuring firewall for Tailscale...${NC}"
    if command -v ufw &> /dev/null; then
        sudo ufw allow in on tailscale0 comment 'Tailscale VPN'
        sudo ufw reload
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi

    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function setup_cloudflare_tunnel() {
    echo -e "${GREEN}☁️  Setting up Cloudflare Tunnel...${NC}"
    echo ""

    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${YELLOW}Installing cloudflared...${NC}"
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    fi

    echo -e "${GREEN}✅ cloudflared installed${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Authenticate with Cloudflare:"
    echo "   ${YELLOW}cloudflared tunnel login${NC}"
    echo ""
    echo "2. Create tunnel:"
    echo "   ${YELLOW}cloudflared tunnel create invoice-app${NC}"
    echo ""
    echo "3. Configure tunnel (edit ~/.cloudflared/config.yml):"
    cat << 'EOF'
tunnel: invoice-app
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: invoice.yourdomain.com
    service: http://localhost:3000
  - hostname: api-invoice.yourdomain.com
    service: http://localhost:5000
  - service: http_status:404
EOF
    echo ""
    echo "4. Route DNS:"
    echo "   ${YELLOW}cloudflared tunnel route dns invoice-app invoice.yourdomain.com${NC}"
    echo ""
    echo "5. Run tunnel:"
    echo "   ${YELLOW}cloudflared tunnel run invoice-app${NC}"
    echo ""
    echo "6. Install as service:"
    echo "   ${YELLOW}sudo cloudflared service install${NC}"
    echo "   ${YELLOW}sudo systemctl start cloudflared${NC}"
    echo ""

    echo -e "${BLUE}Would you like to see the detailed guide? (y/n):${NC} "
    read show_guide
    if [[ $show_guide == "y" ]]; then
        less "$PROJECT_DIR/EXTERNAL_ACCESS_PLAN.md"
    fi

    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function setup_production() {
    echo -e "${GREEN}🚀 Production Deployment Setup${NC}"
    echo ""

    echo -e "${RED}⚠️  WARNING: This will switch from development to production mode${NC}"
    echo ""
    read -p "Continue? (y/n): " continue_prod

    if [[ $continue_prod != "y" ]]; then
        show_menu
        return
    fi

    cd "$PROJECT_DIR"

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        echo -e "${YELLOW}Creating .env.production...${NC}"

        # Generate secure passwords
        DB_PASSWORD=$(openssl rand -base64 32)
        JWT_SECRET=$(openssl rand -base64 64)
        REDIS_PASSWORD=$(openssl rand -base64 32)

        cat > .env.production << EOF
# Database
DB_PASSWORD=$DB_PASSWORD
POSTGRES_PASSWORD=$DB_PASSWORD

# Security
JWT_SECRET=$JWT_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD

# Email (Configure your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@monomi.finance

# Application
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=info
EOF

        echo -e "${GREEN}✅ .env.production created with secure passwords${NC}"
        echo -e "${YELLOW}⚠️  Please edit .env.production and update:${NC}"
        echo "  - SMTP settings"
        echo "  - FRONTEND_URL and CORS_ORIGIN"
        echo ""
        read -p "Press Enter to edit .env.production..."
        ${EDITOR:-nano} .env.production
    fi

    # Check SSL certificates
    if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
        echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
        echo ""
        echo "Choose SSL option:"
        echo "1) Generate self-signed certificate (testing)"
        echo "2) Use Let's Encrypt (requires domain)"
        echo "3) Use Cloudflare Tunnel (automatic SSL)"
        echo "0) Skip for now"
        read -p "Select [0-3]: " ssl_option

        case $ssl_option in
            1) generate_self_signed_cert ;;
            2) setup_letsencrypt ;;
            3) setup_cloudflare_tunnel; return ;;
            0) echo "Skipping SSL setup" ;;
        esac
    fi

    # Stop development environment
    echo -e "${YELLOW}Stopping development environment...${NC}"
    docker compose -f docker-compose.dev.yml down

    # Start production environment
    echo -e "${GREEN}Starting production environment...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d

    # Wait for services
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 10

    # Check status
    docker compose -f docker-compose.prod.yml ps

    echo ""
    echo -e "${GREEN}✅ Production environment started!${NC}"
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  https://your-domain.com (configure domain in nginx.conf)"
    echo ""
    echo -e "${YELLOW}Monitor logs:${NC}"
    echo "  docker compose -f docker-compose.prod.yml logs -f"
    echo ""

    read -p "Press Enter to continue..."
    show_menu
}

function check_status() {
    echo -e "${GREEN}📊 Current Status${NC}"
    echo ""

    # Check which environment is running
    if docker ps | grep -q "invoice-app-dev"; then
        echo -e "${BLUE}Running:${NC} Development Environment"
        echo ""
        docker compose -f docker-compose.dev.yml ps
        echo ""
        echo -e "${GREEN}Access URLs:${NC}"
        echo -e "  Local:     http://localhost:3000"
        echo -e "  Network:   http://$LOCAL_IP:3000"
        if [[ $TAILSCALE_IP != "Not installed" ]]; then
            echo -e "  Tailscale: http://$TAILSCALE_IP:3000"
        fi
    elif docker ps | grep -q "invoice-app-prod"; then
        echo -e "${BLUE}Running:${NC} Production Environment"
        echo ""
        docker compose -f docker-compose.prod.yml ps
        echo ""
        echo -e "${GREEN}Access URLs:${NC}"
        echo -e "  Configure domain in nginx.conf"
    else
        echo -e "${RED}❌ No environment is running${NC}"
    fi

    echo ""
    echo -e "${BLUE}Network Interfaces:${NC}"
    ip addr show | grep "inet " | grep -v "127.0.0.1"

    echo ""
    echo -e "${BLUE}Open Ports:${NC}"
    sudo netstat -tuln | grep -E ":(3000|5000|80|443) "

    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

function security_hardening() {
    echo -e "${GREEN}🛡️  Security Hardening${NC}"
    echo ""

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Please run security hardening with sudo${NC}"
        echo "sudo bash $0"
        read -p "Press Enter to continue..."
        show_menu
        return
    fi

    echo "Applying security measures..."
    echo ""

    # Install fail2ban
    if ! command -v fail2ban-client &> /dev/null; then
        echo -e "${YELLOW}Installing fail2ban...${NC}"
        apt update -qq
        apt install -y fail2ban
        systemctl enable fail2ban
        systemctl start fail2ban
        echo -e "${GREEN}✅ fail2ban installed${NC}"
    fi

    # Configure firewall
    echo -e "${YELLOW}Configuring firewall...${NC}"
    if command -v ufw &> /dev/null; then
        ufw --force enable
        ufw allow 22/tcp comment 'SSH'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        ufw reload
        echo -e "${GREEN}✅ Firewall configured${NC}"
    fi

    # Secure SSH
    echo -e "${YELLOW}Checking SSH configuration...${NC}"
    if grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config; then
        echo -e "${YELLOW}⚠️  Root login is enabled${NC}"
        read -p "Disable root login? (y/n): " disable_root
        if [[ $disable_root == "y" ]]; then
            sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
            systemctl reload sshd
            echo -e "${GREEN}✅ Root login disabled${NC}"
        fi
    fi

    # Setup logrotate
    echo -e "${YELLOW}Configuring log rotation...${NC}"
    cat > /etc/logrotate.d/invoice-app << 'EOF'
/home/jeff/projects/monomi/internal/invoice-generator/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 jeff jeff
    sharedscripts
}
EOF
    echo -e "${GREEN}✅ Log rotation configured${NC}"

    echo ""
    echo -e "${GREEN}✅ Security hardening complete!${NC}"
    echo ""
    echo -e "${BLUE}Security Status:${NC}"
    echo "  Firewall: $(ufw status | head -1)"
    echo "  fail2ban: $(systemctl is-active fail2ban)"
    echo "  SSH root login: $(grep "^PermitRootLogin" /etc/ssh/sshd_config)"
    echo ""

    read -p "Press Enter to continue..."
    show_menu
}

function configure_firewall_local() {
    echo -e "${YELLOW}Configuring firewall for local network access...${NC}"

    if command -v ufw &> /dev/null; then
        sudo ufw allow from 192.168.0.0/16 to any port 3000 comment 'Invoice Frontend'
        sudo ufw allow from 192.168.0.0/16 to any port 5000 comment 'Invoice Backend'
        sudo ufw reload
        echo -e "${GREEN}✅ Firewall rules added${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --permanent --add-port=5000/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✅ Firewall rules added${NC}"
    else
        echo -e "${YELLOW}⚠️  No firewall detected (ufw or firewalld)${NC}"
    fi
}

function generate_self_signed_cert() {
    echo -e "${YELLOW}Generating self-signed SSL certificate...${NC}"

    mkdir -p "$PROJECT_DIR/ssl"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$PROJECT_DIR/ssl/privkey.pem" \
        -out "$PROJECT_DIR/ssl/fullchain.pem" \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Monomi/CN=invoice.local"

    echo -e "${GREEN}✅ Self-signed certificate generated${NC}"
    echo -e "${YELLOW}⚠️  Browsers will show security warning (normal for self-signed)${NC}"
}

function setup_letsencrypt() {
    echo -e "${YELLOW}Setting up Let's Encrypt...${NC}"
    echo ""

    read -p "Enter your domain name: " domain
    read -p "Enter your email: " email

    # Install certbot
    if ! command -v certbot &> /dev/null; then
        apt update -qq
        apt install -y certbot
    fi

    # Get certificate
    echo -e "${YELLOW}Obtaining certificate (make sure port 80 is accessible)...${NC}"
    certbot certonly --standalone \
        -d "$domain" \
        --email "$email" \
        --agree-tos \
        --non-interactive

    # Copy certificates
    cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$PROJECT_DIR/ssl/"
    cp "/etc/letsencrypt/live/$domain/privkey.pem" "$PROJECT_DIR/ssl/"
    chown -R jeff:jeff "$PROJECT_DIR/ssl/"

    echo -e "${GREEN}✅ Let's Encrypt certificate installed${NC}"

    # Setup auto-renewal
    echo "0 3 * * * certbot renew --quiet --deploy-hook 'docker compose -f $PROJECT_DIR/docker-compose.prod.yml restart nginx'" | crontab -
    echo -e "${GREEN}✅ Auto-renewal configured${NC}"
}

# Main execution
if [ $# -eq 1 ]; then
    case $1 in
        status) check_status ;;
        local) setup_local_network ;;
        tailscale) setup_tailscale ;;
        cloudflare) setup_cloudflare_tunnel ;;
        production) setup_production ;;
        security) security_hardening ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
else
    show_menu
fi
