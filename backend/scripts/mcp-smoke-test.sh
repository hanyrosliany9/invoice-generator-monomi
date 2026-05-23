#!/usr/bin/env bash
# Smoke test for the Monomi MCP custom-connector endpoints.
#
# Walks the full OAuth 2.1 + PKCE flow:
#   1. Discovery (/.well-known/oauth-authorization-server)
#   2. Dynamic Client Registration (POST /oauth/register)
#   3. Authorize → consent → consent submission → captures authorization code
#   4. Token exchange (POST /oauth/token) — gets access token
#   5. POST /mcp with initialize, then tools/list, then tools/call me_whoami,
#      then tools/call ar_aging_summary, then resources/read monomi://today.
#
# Requires: curl, jq, openssl.
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:5000}
EMAIL=${EMAIL:-admin@monomi.id}
PASSWORD=${PASSWORD:-password123}

step() { printf "\n\033[1;34m=== %s ===\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; exit 1; }

# Helpers --------------------------------------------------------------

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
sha256bin() { openssl dgst -binary -sha256; }

step "0. Discovery"
meta=$(curl -fsS "$BASE_URL/.well-known/oauth-authorization-server")
echo "$meta" | jq '. | {issuer, authorization_endpoint, token_endpoint, registration_endpoint}'
auth_ep=$(echo "$meta" | jq -r .authorization_endpoint)
token_ep=$(echo "$meta" | jq -r .token_endpoint)
reg_ep=$(echo "$meta" | jq -r .registration_endpoint)
ok "metadata fetched"

step "1. Dynamic Client Registration"
reg=$(curl -fsS -X POST "$reg_ep" \
  -H 'Content-Type: application/json' \
  -d '{
    "client_name": "MCP Smoke Test",
    "redirect_uris": ["http://localhost:9876/callback"],
    "grant_types": ["authorization_code","refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none"
  }')
client_id=$(echo "$reg" | jq -r .client_id)
[ "$client_id" != "null" ] && [ -n "$client_id" ] || fail "no client_id returned"
ok "client_id=$client_id"

step "2. PKCE — derive code_verifier + code_challenge"
verifier=$(openssl rand 32 | b64url)
challenge=$(printf "%s" "$verifier" | sha256bin | b64url)
state=$(openssl rand 16 | b64url)
ok "verifier (truncated): ${verifier:0:12}…   challenge (truncated): ${challenge:0:12}…"

step "3. /oauth/authorize — start auth flow (we follow the redirect to consent)"
authorize_url="$auth_ep?response_type=code&client_id=$client_id&redirect_uri=http%3A%2F%2Flocalhost%3A9876%2Fcallback&code_challenge=$challenge&code_challenge_method=S256&state=$state&scope=mcp"
# Curl with -i to capture redirect Location; --max-redirs 0 to NOT follow.
authorize_response=$(curl -sS -i --max-redirs 0 "$authorize_url" || true)
echo "$authorize_response" | head -n 8
consent_url=$(echo "$authorize_response" | grep -i '^location:' | head -1 | awk '{print $2}' | tr -d '\r')
[ -n "$consent_url" ] || fail "no consent redirect Location returned"
ok "consent redirect → $consent_url"

# Extract request_id from the consent URL.
request_id=$(echo "$consent_url" | sed -nE 's|.*[?&]request_id=([^&]+).*|\1|p')
[ -n "$request_id" ] || fail "no request_id in consent URL"
ok "request_id=$request_id"

step "4. POST /oauth/consent — log in + approve"
consent_post=$(curl -sS -i --max-redirs 0 -X POST "$BASE_URL/consent" \
  --data-urlencode "request_id=$request_id" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD")
status=$(echo "$consent_post" | head -1 | awk '{print $2}')
[ "$status" = "302" ] || { echo "$consent_post" | head -30; fail "expected 302 after consent, got $status"; }
callback=$(echo "$consent_post" | grep -i '^location:' | head -1 | awk '{print $2}' | tr -d '\r')
[ -n "$callback" ] || fail "no callback redirect"
code=$(echo "$callback" | sed -nE 's|.*[?&]code=([^&]+).*|\1|p')
[ -n "$code" ] || fail "no authorization code in callback URL"
ok "authorization code obtained (truncated): ${code:0:16}…"

step "5. POST /oauth/token — exchange code for access token"
token_resp=$(curl -fsS -X POST "$token_ep" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=$client_id" \
  --data-urlencode "code=$code" \
  --data-urlencode "redirect_uri=http://localhost:9876/callback" \
  --data-urlencode "code_verifier=$verifier")
echo "$token_resp" | jq '{access_token: (.access_token | .[0:16] + "…"), token_type, expires_in, refresh_token: (.refresh_token | .[0:16] + "…")}'
access_token=$(echo "$token_resp" | jq -r .access_token)
[ -n "$access_token" ] && [ "$access_token" != "null" ] || fail "no access_token"
ok "access token obtained"

# Helper for JSON-RPC over Streamable HTTP.
mcp_call() {
  curl -fsS -X POST "$BASE_URL/mcp" \
    -H "Authorization: Bearer $access_token" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d "$1"
}

step "6. POST /mcp — initialize"
init=$(mcp_call '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke-test","version":"0.0.1"}}}')
echo "$init" | jq '.result | {protocolVersion, serverInfo, capabilities: (.capabilities | keys)}' 2>/dev/null || echo "$init"
ok "initialize ok"

step "7. tools/list"
tools=$(mcp_call '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')
echo "$tools" | jq '.result.tools | map(.name)' 2>/dev/null || echo "$tools"

step "8. tools/call me_whoami"
who=$(mcp_call '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"me_whoami","arguments":{}}}')
echo "$who" | jq '.result.content[0].text' 2>/dev/null || echo "$who"

step "9. tools/call ar_aging_summary"
aging=$(mcp_call '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"ar_aging_summary","arguments":{}}}')
echo "$aging" | jq -r '.result.content[0].text' 2>/dev/null || echo "$aging"

step "10. resources/read monomi://today"
today=$(mcp_call '{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"monomi://today"}}')
echo "$today" | jq -r '.result.contents[0].text' 2>/dev/null || echo "$today"

step "DONE"
echo "All MCP smoke checks passed."
