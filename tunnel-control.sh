#!/bin/bash

# Tunnel Control Script for Biznet Gio VPS
# Manages SSH reverse tunnel: VPS (103.150.226.171) -> Local Machine

VPS_USER="cryptobeast"
VPS_IP="103.150.226.171"
LOCAL_PORT=3000
REMOTE_PORT=8888

case "$1" in
    start)
        echo "🚀 Starting public access tunnel..."

        # Check if local app is running
        if ! curl -s http://localhost:$LOCAL_PORT > /dev/null; then
            echo "⚠️  Local app not running on port $LOCAL_PORT"
            echo "Start it with: docker compose -f docker-compose.dev.yml up"
            exit 1
        fi

        # Check if tunnel already running
        if ps aux | grep -q "[s]sh.*$REMOTE_PORT:localhost:$LOCAL_PORT"; then
            echo "⚠️  Tunnel already running"
            exit 0
        fi

        # Start tunnel
        ssh -f -N -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
            -R $REMOTE_PORT:localhost:$LOCAL_PORT $VPS_USER@$VPS_IP

        sleep 2

        if ps aux | grep -q "[s]sh.*$REMOTE_PORT:localhost:$LOCAL_PORT"; then
            echo "✅ Tunnel started successfully!"
            echo ""
            echo "Your app is now PUBLIC at:"
            echo "  http://$VPS_IP"
            echo ""
        else
            echo "❌ Failed to start tunnel"
            exit 1
        fi
        ;;

    stop)
        echo "🛑 Stopping tunnel..."
        ps aux | grep "[s]sh.*$REMOTE_PORT:localhost:$LOCAL_PORT" | awk '{print $2}' | xargs kill 2>/dev/null
        sleep 1
        echo "✅ Tunnel stopped"
        ;;

    status)
        if ps aux | grep -q "[s]sh.*$REMOTE_PORT:localhost:$LOCAL_PORT"; then
            echo "✅ Tunnel is RUNNING"
            echo ""
            echo "Public URL: http://$VPS_IP"
            echo ""
            ps aux | grep "[s]sh.*$REMOTE_PORT:localhost:$LOCAL_PORT"
        else
            echo "❌ Tunnel is NOT running"
        fi
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    *)
        echo "Usage: $0 {start|stop|status|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the tunnel (make app public)"
        echo "  stop    - Stop the tunnel (make app private)"
        echo "  status  - Check if tunnel is running"
        echo "  restart - Restart the tunnel"
        echo ""
        echo "Your app will be accessible at: http://$VPS_IP"
        exit 1
        ;;
esac
