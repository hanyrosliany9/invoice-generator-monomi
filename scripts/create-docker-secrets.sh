#!/bin/bash

# =============================================================================
# DOCKER SECRETS MANAGEMENT SCRIPT
# Monomi Finance - Create and manage Docker secrets securely
# =============================================================================

set -e

echo "🔐 Creating Docker secrets for Monomi Finance..."

# Initialize Docker Swarm if not already initialized
if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q active; then
    echo "🐝 Initializing Docker Swarm..."
    docker swarm init --advertise-addr 127.0.0.1 2>/dev/null || true
fi

# Function to create secret if it doesn't exist
create_secret() {
    local secret_name=$1
    local secret_file=$2
    
    if docker secret inspect "$secret_name" >/dev/null 2>&1; then
        echo "✅ Secret '$secret_name' already exists"
    else
        if [ -f "$secret_file" ]; then
            docker secret create "$secret_name" "$secret_file"
            echo "✅ Created secret: $secret_name"
        else
            echo "❌ Secret file not found: $secret_file"
            return 1
        fi
    fi
}

# Create secrets from files
create_secret "monomi_db_password" "./secrets/db_password.txt"
create_secret "monomi_jwt_secret" "./secrets/jwt_secret.txt"
create_secret "monomi_redis_password" "./secrets/redis_password.txt"
create_secret "monomi_smtp_password" "./secrets/smtp_password.txt"

echo ""
echo "🔐 Docker secrets created successfully!"
echo "📋 Available secrets:"
docker secret ls --format "table {{.Name}}\t{{.CreatedAt}}\t{{.UpdatedAt}}"

echo ""
echo "🛡️ Security Notes:"
echo "- Secrets are encrypted at rest and in transit"
echo "- Only containers with explicit access can read secrets"
echo "- Secrets are mounted at /run/secrets/ in containers"
echo "- Original secret files should be deleted after creation"

echo ""
echo "🧹 Cleanup original secret files? (y/n)"
read -r cleanup_response
if [[ "$cleanup_response" =~ ^[Yy]$ ]]; then
    rm -f ./secrets/*.txt
    echo "✅ Original secret files deleted"
else
    echo "⚠️  Remember to securely delete ./secrets/*.txt files manually"
fi