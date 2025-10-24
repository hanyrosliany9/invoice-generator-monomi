#!/bin/bash

# Cloudflare Tunnel Management Script
# Free, stable, auto-reconnecting public access

LOCAL_PORT=3000
LOG_FILE="/tmp/cloudflare-tunnel.log"

case "$1" in
    start)
        echo "🚀 Starting Cloudflare Tunnel..."

        # Check if local app is running
        if ! curl -s http://localhost:$LOCAL_PORT > /dev/null 2>&1; then
            echo "⚠️  Local app not running on port $LOCAL_PORT"
            echo "Start it with: docker compose -f docker-compose.dev.yml up"
            exit 1
        fi

        # Check if tunnel already running
        if pgrep -f "cloudflared tunnel" > /dev/null; then
            echo "⚠️  Tunnel already running"
            echo ""
            echo "Current URL:"
            grep -E "https://.*\.trycloudflare\.com" $LOG_FILE | tail -1 | sed 's/.*|  //' | sed 's/  .*//'
            exit 0
        fi

        # Start tunnel
        echo "Creating tunnel..."
        nohup cloudflared tunnel --url http://localhost:$LOCAL_PORT > $LOG_FILE 2>&1 &

        # Wait for URL
        echo "Waiting for public URL..."
        for i in {1..15}; do
            if grep -q "trycloudflare.com" $LOG_FILE 2>/dev/null; then
                break
            fi
            sleep 1
            echo -n "."
        done
        echo ""

        # Extract and display URL
        URL=$(grep -E "https://.*\.trycloudflare\.com" $LOG_FILE | tail -1 | sed 's/.*|  //' | sed 's/  .*//')

        if [ -n "$URL" ]; then
            echo ""
            echo "✅ Cloudflare Tunnel is ACTIVE!"
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "   Your app is PUBLIC at:"
            echo "   $URL"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "Benefits:"
            echo "  ✓ Free forever"
            echo "  ✓ HTTPS enabled automatically"
            echo "  ✓ Cloudflare CDN & DDoS protection"
            echo "  ✓ Auto-reconnect on disconnect"
            echo ""
            echo "Note: URL changes each restart (upgrade to"
            echo "      named tunnel for permanent URL)"
            echo ""
        else
            echo "❌ Failed to get tunnel URL"
            echo "Check logs: tail -f $LOG_FILE"
            exit 1
        fi
        ;;

    stop)
        echo "🛑 Stopping Cloudflare Tunnel..."
        pkill -f "cloudflared tunnel"
        sleep 1
        echo "✅ Tunnel stopped"
        ;;

    status)
        if pgrep -f "cloudflared tunnel" > /dev/null; then
            echo "✅ Cloudflare Tunnel is RUNNING"
            echo ""

            URL=$(grep -E "https://.*\.trycloudflare\.com" $LOG_FILE 2>/dev/null | tail -1 | sed 's/.*|  //' | sed 's/  .*//')

            if [ -n "$URL" ]; then
                echo "Public URL: $URL"
            else
                echo "Getting URL from logs..."
            fi

            echo ""
            ps aux | grep "[c]loudflared tunnel"
        else
            echo "❌ Cloudflare Tunnel is NOT running"
            echo ""
            echo "Start with: $0 start"
        fi
        ;;

    url)
        URL=$(grep -E "https://.*\.trycloudflare\.com" $LOG_FILE 2>/dev/null | tail -1 | sed 's/.*|  //' | sed 's/  .*//')

        if [ -n "$URL" ]; then
            echo "$URL"
        else
            echo "No active tunnel URL found"
            exit 1
        fi
        ;;

    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f $LOG_FILE
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
        echo "Usage: $0 {start|stop|status|url|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Cloudflare Tunnel (get public HTTPS URL)"
        echo "  stop    - Stop the tunnel"
        echo "  status  - Check if tunnel is running"
        echo "  url     - Show current public URL"
        echo "  logs    - View tunnel logs"
        echo "  restart - Restart the tunnel"
        echo ""
        echo "Free Features:"
        echo "  ✓ No cost (0 IDR per month)"
        echo "  ✓ HTTPS/SSL included"
        echo "  ✓ Cloudflare CDN"
        echo "  ✓ DDoS protection"
        echo "  ✓ Auto-reconnect"
        echo ""
        exit 1
        ;;
esac
