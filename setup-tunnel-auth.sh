#!/bin/bash

# Copy SSH key to VPS for passwordless authentication

VPS_USER="cryptobeast"
VPS_IP="103.150.226.171"

echo "======================================"
echo "🔑 Setting up SSH Key Authentication"
echo "======================================"
echo ""

# Try ssh-copy-id
ssh-copy-id -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP}

echo ""
echo "✅ SSH key copied! You can now SSH without password."
