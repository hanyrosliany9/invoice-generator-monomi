#!/bin/bash
set -e

# Cloudflare API Configuration Script for share.monomiagency.com
# This script will:
# 1. Create DNS CNAME record for share.monomiagency.com
# 2. Add tunnel ingress rule for share subdomain

echo "==================================="
echo "Cloudflare Configuration Script"
echo "==================================="
echo ""

# Check for required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN not set"
    echo ""
    echo "To create an API token:"
    echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Click 'Create Token'"
    echo "3. Use 'Edit zone DNS' template"
    echo "4. Add permissions: Zone.DNS (Edit), Zone.Zone Settings (Read)"
    echo "5. Set zone resources: Include > Specific zone > monomiagency.com"
    echo ""
    echo "Then run:"
    echo "export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "./scripts/configure-cloudflare.sh"
    exit 1
fi

if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
    echo "❌ Error: CLOUDFLARE_ZONE_ID not set"
    echo ""
    echo "To find your Zone ID:"
    echo "1. Go to https://dash.cloudflare.com"
    echo "2. Select 'monomiagency.com' domain"
    echo "3. Scroll down to 'API' section on the right sidebar"
    echo "4. Copy the Zone ID"
    echo ""
    echo "Then run:"
    echo "export CLOUDFLARE_ZONE_ID='your-zone-id-here'"
    echo "./scripts/configure-cloudflare.sh"
    exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Error: CLOUDFLARE_ACCOUNT_ID not set"
    echo ""
    echo "To find your Account ID:"
    echo "1. Go to https://dash.cloudflare.com"
    echo "2. Click on any domain"
    echo "3. Look at the URL: https://dash.cloudflare.com/ACCOUNT_ID/..."
    echo "4. Or find it in the right sidebar under 'API' section"
    echo ""
    echo "Then run:"
    echo "export CLOUDFLARE_ACCOUNT_ID='your-account-id-here'"
    echo "./scripts/configure-cloudflare.sh"
    exit 1
fi

if [ -z "$CLOUDFLARE_TUNNEL_ID" ]; then
    echo "❌ Error: CLOUDFLARE_TUNNEL_ID not set"
    echo ""
    echo "To find your Tunnel ID:"
    echo "1. Go to https://one.dash.cloudflare.com"
    echo "2. Navigate to Networks > Tunnels"
    echo "3. Find your tunnel (serving admin.monomiagency.com)"
    echo "4. Copy the tunnel ID from the list or URL"
    echo ""
    echo "Then run:"
    echo "export CLOUDFLARE_TUNNEL_ID='your-tunnel-id-here'"
    echo "./scripts/configure-cloudflare.sh"
    exit 1
fi

echo "✅ All required environment variables set"
echo ""
echo "Configuration:"
echo "  Zone ID:    $CLOUDFLARE_ZONE_ID"
echo "  Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo "  Tunnel ID:  $CLOUDFLARE_TUNNEL_ID"
echo ""

# ============================================
# Step 1: Create DNS CNAME Record
# ============================================
echo "Step 1: Creating DNS CNAME record for share.monomiagency.com"
echo "-------------------------------------------------------------"

# Check if record already exists
EXISTING_RECORD=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=CNAME&name=share.monomiagency.com" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[0].id // empty')

if [ -n "$EXISTING_RECORD" ]; then
    echo "⚠️  DNS record already exists (ID: $EXISTING_RECORD)"
    echo "   Updating existing record..."

    RESPONSE=$(curl -s -X PATCH \
      "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$EXISTING_RECORD" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{
        \"type\": \"CNAME\",
        \"name\": \"share\",
        \"content\": \"$CLOUDFLARE_TUNNEL_ID.cfargotunnel.com\",
        \"ttl\": 1,
        \"proxied\": true
      }")
else
    echo "Creating new DNS record..."

    RESPONSE=$(curl -s -X POST \
      "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{
        \"type\": \"CNAME\",
        \"name\": \"share\",
        \"content\": \"$CLOUDFLARE_TUNNEL_ID.cfargotunnel.com\",
        \"ttl\": 1,
        \"proxied\": true,
        \"comment\": \"Public sharing subdomain for media collaboration\"
      }")
fi

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    RECORD_ID=$(echo "$RESPONSE" | jq -r '.result.id')
    echo "✅ DNS record configured successfully"
    echo "   Record ID: $RECORD_ID"
    echo "   Type: CNAME"
    echo "   Name: share.monomiagency.com"
    echo "   Target: $CLOUDFLARE_TUNNEL_ID.cfargotunnel.com"
    echo "   Proxied: Yes (orange cloud)"
else
    echo "❌ Failed to create DNS record"
    echo "$RESPONSE" | jq .
    exit 1
fi

echo ""

# ============================================
# Step 2: Add Tunnel Ingress Configuration
# ============================================
echo "Step 2: Adding tunnel ingress rule for share.monomiagency.com"
echo "--------------------------------------------------------------"

# Get current tunnel configuration
echo "Fetching current tunnel configuration..."
TUNNEL_CONFIG=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

CONFIG_SUCCESS=$(echo "$TUNNEL_CONFIG" | jq -r '.success')
if [ "$CONFIG_SUCCESS" != "true" ]; then
    echo "❌ Failed to fetch tunnel configuration"
    echo "$TUNNEL_CONFIG" | jq .
    echo ""
    echo "⚠️  Note: Tunnel ingress configuration must be done via Cloudflare Dashboard"
    echo "   1. Go to https://one.dash.cloudflare.com"
    echo "   2. Navigate to Networks > Tunnels"
    echo "   3. Click on your tunnel"
    echo "   4. Go to 'Public Hostname' tab"
    echo "   5. Click 'Add a public hostname'"
    echo "   6. Configure:"
    echo "      - Subdomain: share"
    echo "      - Domain: monomiagency.com"
    echo "      - Service Type: HTTP"
    echo "      - URL: nginx:80"
    exit 0
fi

# Extract current ingress rules
CURRENT_INGRESS=$(echo "$TUNNEL_CONFIG" | jq -r '.result.config.ingress // []')

# Check if share.monomiagency.com already exists
SHARE_EXISTS=$(echo "$CURRENT_INGRESS" | jq -r '.[] | select(.hostname == "share.monomiagency.com") | .hostname' | head -1)

if [ -n "$SHARE_EXISTS" ]; then
    echo "✅ Tunnel ingress rule for share.monomiagency.com already exists"
    echo "$CURRENT_INGRESS" | jq '.[] | select(.hostname == "share.monomiagency.com")'
else
    echo "Adding new ingress rule..."

    # Build new ingress array (add share rule before catch-all)
    NEW_INGRESS=$(echo "$CURRENT_INGRESS" | jq '. |=
      # Remove catch-all (service without hostname)
      map(select(.hostname != null)) +
      # Add new share rule
      [{
        "hostname": "share.monomiagency.com",
        "service": "http://nginx:80",
        "originRequest": {
          "noTLSVerify": false,
          "connectTimeout": 30
        }
      }] +
      # Re-add catch-all at the end
      (map(select(.hostname == null)) | if length == 0 then [{"service": "http_status:404"}] else . end)
    ')

    # Update tunnel configuration
    UPDATE_RESPONSE=$(curl -s -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$CLOUDFLARE_TUNNEL_ID/configurations" \
      -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{
        \"config\": {
          \"ingress\": $NEW_INGRESS
        }
      }")

    UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success')
    if [ "$UPDATE_SUCCESS" = "true" ]; then
        echo "✅ Tunnel ingress rule added successfully"
        echo "$NEW_INGRESS" | jq '.[] | select(.hostname == "share.monomiagency.com")'
    else
        echo "❌ Failed to update tunnel configuration"
        echo "$UPDATE_RESPONSE" | jq .
        echo ""
        echo "⚠️  Please configure manually via Cloudflare Dashboard"
        exit 1
    fi
fi

echo ""

# ============================================
# Step 3: Verify Configuration
# ============================================
echo "Step 3: Verifying configuration"
echo "--------------------------------"

echo "Waiting 5 seconds for DNS propagation..."
sleep 5

echo "Testing DNS resolution..."
DNS_RESULT=$(dig +short share.monomiagency.com @1.1.1.1 | head -1)
if [ -n "$DNS_RESULT" ]; then
    echo "✅ DNS resolves to: $DNS_RESULT"
else
    echo "⚠️  DNS not yet propagated (this is normal, can take a few minutes)"
fi

echo ""
echo "Testing HTTPS connectivity..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L https://share.monomiagency.com/api/v1/health --max-time 10 || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HTTPS endpoint responding: 200 OK"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo "⚠️  Connection timeout (tunnel may need restart or DNS not propagated)"
else
    echo "⚠️  HTTP status: $HTTP_STATUS"
fi

echo ""
echo "==================================="
echo "Configuration Complete!"
echo "==================================="
echo ""
echo "DNS Record: ✅ share.monomiagency.com → $CLOUDFLARE_TUNNEL_ID.cfargotunnel.com"
echo "Tunnel Rule: ✅ share.monomiagency.com → http://nginx:80"
echo ""
echo "Next steps:"
echo "1. Wait 1-2 minutes for DNS propagation"
echo "2. Test public sharing link generation via admin panel"
echo "3. Verify anonymous access to shared projects"
echo ""
echo "Monitor logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f cloudflared nginx"
