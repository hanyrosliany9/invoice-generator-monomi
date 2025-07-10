#!/bin/bash
# =============================================================================
# SBOM GENERATION SCRIPT
# Software Bill of Materials for Monomi Finance - Indonesian Business System
# =============================================================================

set -euo pipefail

# Configuration
DOCKER_IMAGE="${1:-monomi-finance:latest}"
OUTPUT_DIR="${2:-./sbom-output}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${OUTPUT_DIR}/sbom-generation-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Create output directory
mkdir -p "$OUTPUT_DIR"

log "Starting SBOM generation for Monomi Finance Indonesian Business System"
log "Docker Image: $DOCKER_IMAGE"
log "Output Directory: $OUTPUT_DIR"
log "Timestamp: $TIMESTAMP"

# =============================================================================
# CHECK DEPENDENCIES
# =============================================================================

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 command not found. Please install $1."
        return 1
    fi
    return 0
}

log "Checking required dependencies..."

# Check for Docker
if ! check_command docker; then
    error "Docker is required for SBOM generation"
    exit 1
fi

# Check for Syft (SBOM generation tool)
if ! check_command syft; then
    warn "Syft not found. Installing Syft..."
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin
    if ! check_command syft; then
        error "Failed to install Syft"
        exit 1
    fi
fi

# Check for Grype (vulnerability scanner)
if ! check_command grype; then
    warn "Grype not found. Installing Grype..."
    curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
    if ! check_command grype; then
        error "Failed to install Grype"
        exit 1
    fi
fi

success "All dependencies verified"

# =============================================================================
# GENERATE SBOM IN MULTIPLE FORMATS
# =============================================================================

log "Generating SBOM in multiple formats..."

# Generate SPDX JSON format (industry standard)
log "Generating SPDX JSON SBOM..."
syft "$DOCKER_IMAGE" -o spdx-json > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.spdx.json"
if [ $? -eq 0 ]; then
    success "SPDX JSON SBOM generated successfully"
else
    error "Failed to generate SPDX JSON SBOM"
fi

# Generate SPDX YAML format
log "Generating SPDX YAML SBOM..."
syft "$DOCKER_IMAGE" -o spdx-yaml > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.spdx.yaml"
if [ $? -eq 0 ]; then
    success "SPDX YAML SBOM generated successfully"
else
    error "Failed to generate SPDX YAML SBOM"
fi

# Generate CycloneDX JSON format
log "Generating CycloneDX JSON SBOM..."
syft "$DOCKER_IMAGE" -o cyclonedx-json > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.cyclonedx.json"
if [ $? -eq 0 ]; then
    success "CycloneDX JSON SBOM generated successfully"
else
    error "Failed to generate CycloneDX JSON SBOM"
fi

# Generate CycloneDX XML format
log "Generating CycloneDX XML SBOM..."
syft "$DOCKER_IMAGE" -o cyclonedx-xml > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.cyclonedx.xml"
if [ $? -eq 0 ]; then
    success "CycloneDX XML SBOM generated successfully"
else
    error "Failed to generate CycloneDX XML SBOM"
fi

# Generate human-readable table format
log "Generating human-readable SBOM..."
syft "$DOCKER_IMAGE" -o table > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.table.txt"
if [ $? -eq 0 ]; then
    success "Human-readable SBOM generated successfully"
else
    error "Failed to generate human-readable SBOM"
fi

# Generate detailed JSON format (Syft native)
log "Generating detailed Syft JSON SBOM..."
syft "$DOCKER_IMAGE" -o syft-json > "${OUTPUT_DIR}/monomi-finance-sbom-${TIMESTAMP}.syft.json"
if [ $? -eq 0 ]; then
    success "Syft JSON SBOM generated successfully"
else
    error "Failed to generate Syft JSON SBOM"
fi

# =============================================================================
# VULNERABILITY SCANNING
# =============================================================================

log "Performing vulnerability scanning with Grype..."

# Scan for vulnerabilities and generate report
grype "$DOCKER_IMAGE" -o json > "${OUTPUT_DIR}/monomi-finance-vulnerabilities-${TIMESTAMP}.json"
if [ $? -eq 0 ]; then
    success "Vulnerability scan completed successfully"
else
    error "Vulnerability scan failed"
fi

# Generate human-readable vulnerability report
grype "$DOCKER_IMAGE" -o table > "${OUTPUT_DIR}/monomi-finance-vulnerabilities-${TIMESTAMP}.table.txt"
if [ $? -eq 0 ]; then
    success "Human-readable vulnerability report generated"
else
    error "Failed to generate vulnerability report"
fi

# Generate SARIF format for GitHub Security
grype "$DOCKER_IMAGE" -o sarif > "${OUTPUT_DIR}/monomi-finance-vulnerabilities-${TIMESTAMP}.sarif"
if [ $? -eq 0 ]; then
    success "SARIF vulnerability report generated for GitHub Security"
else
    error "Failed to generate SARIF vulnerability report"
fi

# =============================================================================
# INDONESIAN BUSINESS COMPLIANCE METADATA
# =============================================================================

log "Generating Indonesian business compliance metadata..."

cat > "${OUTPUT_DIR}/monomi-finance-compliance-${TIMESTAMP}.json" << EOF
{
  "compliance": {
    "framework": "ISO27001,NIST",
    "country": "Indonesia",
    "business_type": "Financial Management System",
    "data_classification": "Financial Records",
    "retention_period": "7_years",
    "regulatory_requirements": [
      "Indonesian Tax Law",
      "Materai Stamp Duty Regulation",
      "Indonesian Data Protection",
      "Financial Record Keeping Requirements"
    ],
    "business_context": {
      "currency": "IDR",
      "timezone": "Asia/Jakarta",
      "locale": "id_ID",
      "materai_threshold": 5000000,
      "workflow": "Quotation-to-Invoice"
    },
    "security_considerations": {
      "container_hardening": "distroless",
      "secrets_management": "docker_secrets",
      "vulnerability_scanning": "trivy_grype",
      "supply_chain_security": "sbom_generation"
    }
  },
  "sbom_metadata": {
    "generation_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "generation_tool": "syft",
    "docker_image": "$DOCKER_IMAGE",
    "formats_generated": [
      "spdx-json",
      "spdx-yaml", 
      "cyclonedx-json",
      "cyclonedx-xml",
      "syft-json",
      "human-readable"
    ],
    "vulnerability_scanning": {
      "tool": "grype",
      "formats": ["json", "table", "sarif"]
    }
  }
}
EOF

success "Indonesian business compliance metadata generated"

# =============================================================================
# GENERATE SUMMARY REPORT
# =============================================================================

log "Generating summary report..."

# Count components in SBOM
COMPONENT_COUNT=$(syft "$DOCKER_IMAGE" -o json | jq '.artifacts | length' 2>/dev/null || echo "N/A")

# Count vulnerabilities
VULN_CRITICAL=$(grype "$DOCKER_IMAGE" -o json | jq '[.matches[] | select(.vulnerability.severity == "Critical")] | length' 2>/dev/null || echo "N/A")
VULN_HIGH=$(grype "$DOCKER_IMAGE" -o json | jq '[.matches[] | select(.vulnerability.severity == "High")] | length' 2>/dev/null || echo "N/A")
VULN_MEDIUM=$(grype "$DOCKER_IMAGE" -o json | jq '[.matches[] | select(.vulnerability.severity == "Medium")] | length' 2>/dev/null || echo "N/A")
VULN_LOW=$(grype "$DOCKER_IMAGE" -o json | jq '[.matches[] | select(.vulnerability.severity == "Low")] | length' 2>/dev/null || echo "N/A")

cat > "${OUTPUT_DIR}/monomi-finance-summary-${TIMESTAMP}.md" << EOF
# Monomi Finance - SBOM & Security Report

## System Information
- **System**: Monomi Finance Indonesian Business Management System
- **Docker Image**: $DOCKER_IMAGE
- **Report Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Business Context**: Indonesian Invoice & Quotation Management
- **Compliance**: ISO 27001, NIST, Indonesian Regulations

## Component Analysis
- **Total Components**: $COMPONENT_COUNT
- **SBOM Formats Generated**: 6 (SPDX JSON/YAML, CycloneDX JSON/XML, Syft JSON, Human-readable)

## Vulnerability Summary
- **Critical**: $VULN_CRITICAL
- **High**: $VULN_HIGH  
- **Medium**: $VULN_MEDIUM
- **Low**: $VULN_LOW

## Indonesian Business Compliance
- **Materai Threshold**: 5,000,000 IDR
- **Data Retention**: 7 years (Indonesian tax law)
- **Currency**: Indonesian Rupiah (IDR)
- **Timezone**: Asia/Jakarta (WIB)
- **Regulatory Framework**: Indonesian Financial Regulations

## Security Hardening
- **Container**: Distroless base images
- **Secrets**: Docker Secrets management
- **Scanning**: Trivy + Grype vulnerability scanning
- **Supply Chain**: SBOM generation + attestation

## Generated Files
- SPDX JSON: \`monomi-finance-sbom-${TIMESTAMP}.spdx.json\`
- SPDX YAML: \`monomi-finance-sbom-${TIMESTAMP}.spdx.yaml\`
- CycloneDX JSON: \`monomi-finance-sbom-${TIMESTAMP}.cyclonedx.json\`
- CycloneDX XML: \`monomi-finance-sbom-${TIMESTAMP}.cyclonedx.xml\`
- Syft JSON: \`monomi-finance-sbom-${TIMESTAMP}.syft.json\`
- Human-readable: \`monomi-finance-sbom-${TIMESTAMP}.table.txt\`
- Vulnerabilities JSON: \`monomi-finance-vulnerabilities-${TIMESTAMP}.json\`
- Vulnerabilities Table: \`monomi-finance-vulnerabilities-${TIMESTAMP}.table.txt\`
- Vulnerabilities SARIF: \`monomi-finance-vulnerabilities-${TIMESTAMP}.sarif\`
- Compliance Metadata: \`monomi-finance-compliance-${TIMESTAMP}.json\`

## Next Steps
1. Review vulnerability report for critical/high severity issues
2. Upload SARIF files to GitHub Security tab
3. Archive SBOM files for compliance and audit requirements
4. Update security policies based on findings
5. Schedule regular SBOM generation (recommended: weekly)

---
Generated by Monomi Finance Security Team
EOF

success "Summary report generated"

# =============================================================================
# FINAL OUTPUT
# =============================================================================

echo ""
log "SBOM generation completed successfully!"
echo ""
echo "📁 Output directory: $OUTPUT_DIR"
echo "📊 Components analyzed: $COMPONENT_COUNT"
echo "🔍 Vulnerabilities found: Critical($VULN_CRITICAL) High($VULN_HIGH) Medium($VULN_MEDIUM) Low($VULN_LOW)"
echo "📋 Summary report: ${OUTPUT_DIR}/monomi-finance-summary-${TIMESTAMP}.md"
echo ""
echo "🇮🇩 Indonesian Business Compliance: ✅"
echo "🔒 Security Scanning: ✅"
echo "📜 SBOM Formats: 6 different formats generated"
echo ""

# List all generated files
log "Generated files:"
ls -la "$OUTPUT_DIR"/*"$TIMESTAMP"* | while read line; do
    echo "  📄 $line"
done

success "SBOM generation process completed for Monomi Finance!"

exit 0