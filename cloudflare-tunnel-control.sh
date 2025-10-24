#!/bin/bash

# Cloudflare Tunnel Control Script
# Manages Cloudflare Tunnel for admin.monomiagency.com

TUNNEL_TOKEN="eyJhIjoiMjA5ODk2YjYyMzFiMWY4MjQ2NjIwYmUzYWI1MjZiM2YiLCJ0IjoiZTg0MjE1ZGMtNzJkYi00OTk5LWJhMWMtMDk1YjE4NWE5YzhiIiwicyI6IlpEbGpNelEwWW1FdE1tTmxZaTAwWkRjMUxUZzVaakV0TmpjNFlUWXpZamN4TWpZMCJ9"
LOG_FILE="/tmp/cloudflare-tunnel.log"

case "$1" in
    start)
        echo "🚀 Starting Cloudflare Tunnel..."

        # Check if local app is running
        if ! curl -s http://localhost:3000 > /dev/null; then
            echo "⚠️  Local app not running on port 3000"
            echo "Start it with: docker compose -f docker-compose.dev.yml up"
            exit 1
        fi

        # Check if tunnel already running
        if ps aux | grep -q "[c]loudflared tunnel run"; then
            echo "⚠️  Tunnel already running"
            exit 0
        fi

        # Start tunnel with token - remote config will be used from Cloudflare dashboard
        # The tunnel ID is embedded in the token, configuration comes from Cloudflare zero trust dashboard
        # Using aggressive proxy settings to handle Vite dev server on-demand optimization
        nohup cloudflared tunnel run \
          --token "$TUNNEL_TOKEN" \
          --proxy-connect-timeout 300s \
          --proxy-keepalive-timeout 10m \
          --proxy-keepalive-connections 1000 \
          --proxy-tls-timeout 120s > "$LOG_FILE" 2>&1 &
        sleep 4

        if ps aux | grep -q "[c]loudflared tunnel run"; then
            echo "✅ Cloudflare Tunnel started successfully!"
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "   Your app is PUBLIC at:"
            echo "   https://admin.monomiagency.com"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "Features:"
            echo "  ✓ Free forever"
            echo "  ✓ HTTPS automatic"
            echo "  ✓ Cloudflare CDN & DDoS protection"
            echo "  ✓ Custom domain"
            echo ""
        else
            echo "❌ Failed to start tunnel"
            echo "Check logs: tail -f $LOG_FILE"
            exit 1
        fi
        ;;

    stop)
        echo "🛑 Stopping Cloudflare Tunnel..."
        pkill -f "cloudflared tunnel run"
        sleep 1
        echo "✅ Tunnel stopped"
        ;;

    status)
        if ps aux | grep -q "[c]loudflared tunnel run"; then
            echo "✅ Cloudflare Tunnel is RUNNING"
            echo ""
            echo "Public URL: https://admin.monomiagency.com"
            echo ""
            echo "Process:"
            ps aux | grep "[c]loudflared tunnel run"
        else
            echo "❌ Cloudflare Tunnel is NOT running"
            echo ""
            echo "Start with: $0 start"
        fi
        ;;

    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo "No logs found. Start tunnel first: $0 start"
        fi
        ;;

    restart)
        $0 stop
        sleep 2
        $0 start
        ;;

    *)
        echo "Cloudflare Tunnel Manager"
        echo ""
        echo "Usage: $0 {start|stop|status|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Cloudflare Tunnel"
        echo "  stop    - Stop the tunnel"
        echo "  status  - Check if tunnel is running"
        echo "  logs    - View tunnel logs"
        echo "  restart - Restart the tunnel"
        echo ""
        echo "Public URL: https://admin.monomiagency.com"
        echo ""
        exit 1
        ;;
esac
