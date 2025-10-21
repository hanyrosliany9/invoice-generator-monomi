#!/bin/bash

# Setup VPS as reverse proxy for local development
# Run this script ONCE on the VPS

set -e

echo "======================================"
echo "🔧 Setting up VPS Reverse Proxy"
echo "======================================"

# Install nginx
echo "📦 Installing nginx..."
apt update
apt install -y nginx

# Enable SSH tunneling in SSH config
echo "🔧 Configuring SSH for tunneling..."
if ! grep -q "GatewayPorts yes" /etc/ssh/sshd_config; then
    echo "GatewayPorts yes" >> /etc/ssh/sshd_config
    systemctl restart sshd
    echo "✅ SSH configured for reverse tunneling"
else
    echo "✅ SSH already configured"
fi

# Create nginx config
echo "🔧 Configuring nginx..."
cat > /etc/nginx/sites-available/tunnel-proxy << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/tunnel-proxy /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx
systemctl enable nginx

echo ""
echo "✅ VPS Reverse Proxy Setup Complete!"
echo ""
echo "Next steps on your LOCAL machine:"
echo "1. Ensure your app is running: docker compose -f docker-compose.dev.yml up"
echo "2. Start tunnel: ./scripts/tunnel-to-vps.sh"
echo ""
