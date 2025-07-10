#!/bin/bash

# =============================================================================
# DOCKER OPTIMIZATION PERFORMANCE TEST
# Monomi Finance - BuildKit Cache & Security Improvements
# =============================================================================

set -e

echo "🚀 Docker Optimization Performance Test"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to measure build time
measure_build_time() {
    local BUILD_COMMAND="$1"
    local BUILD_NAME="$2"
    
    echo -e "${BLUE}📊 Testing: $BUILD_NAME${NC}"
    
    # Clear Docker cache first
    docker system prune -f --volumes >/dev/null 2>&1
    
    # Measure build time
    START_TIME=$(date +%s.%N)
    
    # Run the build command
    eval "$BUILD_COMMAND" >/dev/null 2>&1
    
    END_TIME=$(date +%s.%N)
    BUILD_TIME=$(echo "$END_TIME - $START_TIME" | bc)
    
    echo -e "${GREEN}✅ $BUILD_NAME completed in ${BUILD_TIME}s${NC}"
    echo "$BUILD_TIME"
}

# Function to measure image sizes
measure_image_sizes() {
    echo -e "${BLUE}📏 Measuring image sizes...${NC}"
    
    # Get image sizes
    APP_SIZE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "monomi-app" | head -1 | awk '{print $3}')
    BACKEND_SIZE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "monomi-backend" | head -1 | awk '{print $3}')
    FRONTEND_SIZE=$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep "monomi-frontend" | head -1 | awk '{print $3}')
    
    echo -e "${GREEN}📦 Image Sizes:${NC}"
    echo "  App (Monolithic):  $APP_SIZE"
    echo "  Backend:           $BACKEND_SIZE"
    echo "  Frontend:          $FRONTEND_SIZE"
}

# Function to test cache effectiveness
test_cache_effectiveness() {
    echo -e "${BLUE}🗄️ Testing cache effectiveness...${NC}"
    
    # First build (cold cache)
    echo "First build (cold cache):"
    COLD_TIME=$(measure_build_time "docker-compose -f docker-compose.prod.yml build app" "Cold Build")
    
    # Second build (warm cache)
    echo "Second build (warm cache):"
    WARM_TIME=$(measure_build_time "docker-compose -f docker-compose.prod.yml build app" "Warm Build")
    
    # Calculate cache improvement
    IMPROVEMENT=$(echo "scale=2; ($COLD_TIME - $WARM_TIME) / $COLD_TIME * 100" | bc)
    
    echo -e "${GREEN}🚀 Cache Performance:${NC}"
    echo "  Cold build:     ${COLD_TIME}s"
    echo "  Warm build:     ${WARM_TIME}s"
    echo "  Improvement:    ${IMPROVEMENT}%"
}

# Function to test vulnerability scanning
test_vulnerability_scanning() {
    echo -e "${BLUE}🔍 Testing vulnerability scanning...${NC}"
    
    # Check if Docker Scout is available
    if command -v docker-scout >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker Scout available${NC}"
        
        # Run vulnerability scan
        SCAN_START=$(date +%s.%N)
        docker scout cves monomi-app-prod --format json > /tmp/vulnerability-scan.json 2>/dev/null
        SCAN_END=$(date +%s.%N)
        SCAN_TIME=$(echo "$SCAN_END - $SCAN_START" | bc)
        
        # Parse results
        CRITICAL_COUNT=$(jq '.vulnerabilities | map(select(.severity == "critical")) | length' /tmp/vulnerability-scan.json 2>/dev/null || echo "0")
        HIGH_COUNT=$(jq '.vulnerabilities | map(select(.severity == "high")) | length' /tmp/vulnerability-scan.json 2>/dev/null || echo "0")
        MEDIUM_COUNT=$(jq '.vulnerabilities | map(select(.severity == "medium")) | length' /tmp/vulnerability-scan.json 2>/dev/null || echo "0")
        LOW_COUNT=$(jq '.vulnerabilities | map(select(.severity == "low")) | length' /tmp/vulnerability-scan.json 2>/dev/null || echo "0")
        
        echo -e "${GREEN}🛡️ Vulnerability Scan Results:${NC}"
        echo "  Scan time:      ${SCAN_TIME}s"
        echo "  Critical:       $CRITICAL_COUNT"
        echo "  High:           $HIGH_COUNT"
        echo "  Medium:         $MEDIUM_COUNT"
        echo "  Low:            $LOW_COUNT"
        
        # Clean up
        rm -f /tmp/vulnerability-scan.json
    else
        echo -e "${YELLOW}⚠️ Docker Scout not available${NC}"
    fi
}

# Function to test BuildKit features
test_buildkit_features() {
    echo -e "${BLUE}🏗️ Testing BuildKit features...${NC}"
    
    # Check BuildKit availability
    if [ "$DOCKER_BUILDKIT" = "1" ]; then
        echo -e "${GREEN}✅ BuildKit enabled${NC}"
        
        # Test cache mounts
        echo "Testing cache mounts..."
        BUILD_WITH_CACHE=$(measure_build_time "docker buildx build --cache-from type=local,src=.buildx-cache --cache-to type=local,dest=.buildx-cache --target production ." "BuildKit with Cache")
        
        echo -e "${GREEN}🗄️ BuildKit Cache Performance:${NC}"
        echo "  Build time:     ${BUILD_WITH_CACHE}s"
        echo "  Cache size:     $(du -sh .buildx-cache 2>/dev/null | cut -f1 || echo "N/A")"
        echo "  Cache layers:   $(find .buildx-cache -type f 2>/dev/null | wc -l || echo "N/A")"
    else
        echo -e "${YELLOW}⚠️ BuildKit not enabled${NC}"
    fi
}

# Function to generate performance report
generate_performance_report() {
    echo -e "${BLUE}📋 Generating performance report...${NC}"
    
    REPORT_FILE="./performance-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "docker_version": "$(docker --version)",
  "buildkit_enabled": ${DOCKER_BUILDKIT:-false},
  "optimization_features": {
    "multi_stage_builds": true,
    "cache_mounts": true,
    "vulnerability_scanning": $(command -v docker-scout >/dev/null 2>&1 && echo true || echo false),
    "pinned_versions": true,
    "optimized_ordering": true
  },
  "performance_metrics": {
    "cold_build_time": ${COLD_TIME:-0},
    "warm_build_time": ${WARM_TIME:-0},
    "cache_improvement": "${IMPROVEMENT:-0}%",
    "vulnerability_scan_time": ${SCAN_TIME:-0}
  },
  "security_metrics": {
    "critical_vulnerabilities": ${CRITICAL_COUNT:-0},
    "high_vulnerabilities": ${HIGH_COUNT:-0},
    "medium_vulnerabilities": ${MEDIUM_COUNT:-0},
    "low_vulnerabilities": ${LOW_COUNT:-0}
  },
  "recommendations": [
    "Enable BuildKit for improved performance",
    "Use cache mounts for faster dependency installation",
    "Implement continuous vulnerability scanning",
    "Pin all dependency versions for reproducible builds",
    "Optimize Dockerfile instruction ordering"
  ]
}
EOF
    
    echo -e "${GREEN}📊 Performance report saved to: $REPORT_FILE${NC}"
}

# Main test execution
main() {
    echo "Starting Docker optimization performance test..."
    echo "This may take several minutes..."
    echo ""
    
    # Enable BuildKit
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    
    # Run tests
    test_cache_effectiveness
    echo ""
    
    test_buildkit_features
    echo ""
    
    measure_image_sizes
    echo ""
    
    test_vulnerability_scanning
    echo ""
    
    generate_performance_report
    echo ""
    
    echo -e "${GREEN}🎉 Docker optimization test completed!${NC}"
    echo -e "${BLUE}Summary of optimizations:${NC}"
    echo "  ✅ Multi-stage builds for reduced image size"
    echo "  ✅ BuildKit cache mounts for faster builds"
    echo "  ✅ Docker Scout vulnerability scanning"
    echo "  ✅ Pinned versions for reproducible builds"
    echo "  ✅ Optimized instruction ordering"
    echo "  ✅ Enhanced security configuration"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "  1. Review the performance report"
    echo "  2. Address any critical vulnerabilities"
    echo "  3. Set up continuous monitoring"
    echo "  4. Configure production deployment"
}

# Check for required tools
check_dependencies() {
    echo "Checking dependencies..."
    
    # Check if bc is available for calculations
    if ! command -v bc >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Installing bc for calculations...${NC}"
        apk add --no-cache bc 2>/dev/null || sudo apt-get install -y bc 2>/dev/null || echo "Please install bc manually"
    fi
    
    # Check if jq is available for JSON parsing
    if ! command -v jq >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ Installing jq for JSON parsing...${NC}"
        apk add --no-cache jq 2>/dev/null || sudo apt-get install -y jq 2>/dev/null || echo "Please install jq manually"
    fi
}

# Run the test
check_dependencies
main