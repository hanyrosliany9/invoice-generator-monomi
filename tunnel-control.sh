#!/bin/bash

# Tunnel Control Script for Biznet Gio VPS
# Manages SSH reverse tunnel: VPS (103.150.226.171) -> Local Machine

VPS_USER="cryptobeast"
VPS_IP="103.150.226.171"
FRONTEND_LOCAL_PORT=3000
FRONTEND_REMOTE_PORT=8888
BACKEND_LOCAL_PORT=5000
BACKEND_REMOTE_PORT=9999

case "$1" in
    start)
        echo "🚀 Starting public access tunnel..."

        # Check if local apps are running
        if ! curl -s http://localhost:$FRONTEND_LOCAL_PORT > /dev/null; then
            echo "⚠️  Frontend not running on port $FRONTEND_LOCAL_PORT"
            echo "Start it with: docker compose -f docker-compose.dev.yml up"
            exit 1
        fi

        if ! curl -s http://localhost:$BACKEND_LOCAL_PORT/api/v1/health > /dev/null 2>&1; then
            echo "⚠️  Backend not running on port $BACKEND_LOCAL_PORT"
            echo "Start it with: docker compose -f docker-compose.dev.yml up"
            exit 1
        fi

        # Check if tunnels already running
        if ps aux | grep -q "[s]sh.*$FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT"; then
            echo "⚠️  Frontend tunnel already running"
        else
            # Start frontend tunnel
            ssh -f -N -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
                -R $FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT $VPS_USER@$VPS_IP
            echo "✅ Frontend tunnel started"
        fi

        if ps aux | grep -q "[s]sh.*$BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT"; then
            echo "⚠️  Backend tunnel already running"
        else
            # Start backend tunnel
            ssh -f -N -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
                -R $BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT $VPS_USER@$VPS_IP
            echo "✅ Backend tunnel started"
        fi

        sleep 2

        echo ""
        echo "✅ Public access tunnels are ACTIVE!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   Your app is PUBLIC at:"
        echo "   http://$VPS_IP"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Tunnels:"
        echo "  Frontend: localhost:$FRONTEND_LOCAL_PORT → VPS:$FRONTEND_REMOTE_PORT"
        echo "  Backend:  localhost:$BACKEND_LOCAL_PORT → VPS:$BACKEND_REMOTE_PORT"
        echo ""
        ;;

    stop)
        echo "🛑 Stopping tunnels..."
        ps aux | grep "[s]sh.*$FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT" | awk '{print $2}' | xargs kill 2>/dev/null
        ps aux | grep "[s]sh.*$BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT" | awk '{print $2}' | xargs kill 2>/dev/null
        sleep 1
        echo "✅ Tunnels stopped"
        ;;

    status)
        FRONTEND_RUNNING=$(ps aux | grep -q "[s]sh.*$FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT" && echo "yes" || echo "no")
        BACKEND_RUNNING=$(ps aux | grep -q "[s]sh.*$BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT" && echo "yes" || echo "no")

        if [ "$FRONTEND_RUNNING" = "yes" ] && [ "$BACKEND_RUNNING" = "yes" ]; then
            echo "✅ Tunnels are RUNNING"
            echo ""
            echo "Public URL: http://$VPS_IP"
            echo ""
            echo "Active tunnels:"
            ps aux | grep "[s]sh.*$FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT"
            ps aux | grep "[s]sh.*$BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT"
        elif [ "$FRONTEND_RUNNING" = "yes" ]; then
            echo "⚠️  Frontend tunnel running, but backend tunnel is DOWN"
            ps aux | grep "[s]sh.*$FRONTEND_REMOTE_PORT:localhost:$FRONTEND_LOCAL_PORT"
        elif [ "$BACKEND_RUNNING" = "yes" ]; then
            echo "⚠️  Backend tunnel running, but frontend tunnel is DOWN"
            ps aux | grep "[s]sh.*$BACKEND_REMOTE_PORT:localhost:$BACKEND_LOCAL_PORT"
        else
            echo "❌ Tunnels are NOT running"
            echo ""
            echo "Start with: $0 start"
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
