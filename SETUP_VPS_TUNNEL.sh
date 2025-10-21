#!/bin/bash

# One-time VPS setup - Run these commands manually

echo "======================================"
echo "🔧 VPS Setup for Tunnel"
echo "======================================"
echo ""
echo "Run these commands:"
echo ""
echo "# 1. SSH to your VPS"
echo "ssh root@103.150.226.171"
echo ""
echo "# 2. Paste this entire block:"
cat << 'VPSCOMMANDS'

# Update and install nginx
apt update && apt install -y nginx

# Configure SSH for reverse tunneling
if ! grep -q "GatewayPorts yes" /etc/ssh/sshd_config; then
    echo "GatewayPorts yes" >> /etc/ssh/sshd_config
    systemctl restart sshd
fi

# Create nginx config
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable

# Restart nginx
nginx -t && systemctl restart nginx && systemctl enable nginx

echo "✅ VPS configured! Type 'exit' to return to local machine."

VPSCOMMANDS

echo ""
echo "======================================"
