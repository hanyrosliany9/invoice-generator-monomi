#!/bin/bash

# SSH Reverse Tunnel to Biznet Gio VPS
# This exposes your LOCAL application via VPS public IP

VPS_IP="103.150.226.171"
VPS_USER="root"
LOCAL_PORT=3000
REMOTE_PORT=8080

echo "======================================"
echo "🌐 Starting SSH Tunnel to VPS"
echo "======================================"
echo "VPS IP: $VPS_IP"
echo "Local Port: $LOCAL_PORT"
echo "Remote Port: $REMOTE_PORT"
echo ""
echo "Your app will be accessible at:"
echo "http://$VPS_IP"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo "======================================"
echo ""

# Create SSH tunnel with auto-reconnect
while true; do
    ssh -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -N -R $REMOTE_PORT:localhost:$LOCAL_PORT \
        $VPS_USER@$VPS_IP

    echo "⚠️  Tunnel disconnected. Reconnecting in 5 seconds..."
    sleep 5
done
