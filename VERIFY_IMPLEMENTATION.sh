#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Call Sheet PDF Export Upgrade - Implementation Verification   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Helper functions
check_file() {
  local file=$1
  local name=$2
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $name: Found"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name: NOT FOUND"
    ((FAILED++))
  fi
}

check_content() {
  local file=$1
  local search=$2
  local name=$3
  if grep -q "$search" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $name: Found in $file"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name: NOT found in $file"
    ((FAILED++))
  fi
}

echo "${BLUE}1. Checking File Existence${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$(dirname "$0")"

check_file "backend/prisma/schema.prisma" "Prisma Schema"
check_file "backend/src/modules/pdf/templates/call-sheet.html.ts" "PDF Template"
check_file "backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts" "CallSheet DTO"
check_file "backend/src/modules/call-sheets/dto/create-cast-call.dto.ts" "Cast Call DTO"
check_file "backend/src/modules/call-sheets/call-sheets.service.ts" "Service File"
check_file "CALL_SHEET_PDF_EXPORT_UPGRADE_IMPLEMENTED.md" "Implementation Guide"
check_file "DEPLOYMENT_GUIDE.md" "Deployment Guide"
check_file "QUICK_REFERENCE.md" "Quick Reference"
check_file "IMPLEMENTATION_SUMMARY.md" "Summary Document"

echo ""
echo "${BLUE}2. Checking Schema Updates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_content "backend/prisma/schema.prisma" "companyName.*String?" "Company Name Field"
check_content "backend/prisma/schema.prisma" "upm.*String?" "UPM Field"
check_content "backend/prisma/schema.prisma" "crewParking.*String?" "Crew Parking Field"
check_content "backend/prisma/schema.prisma" "artNotes.*String?" "Art Notes Field"
check_content "backend/prisma/schema.prisma" "model CallSheetStandIn" "Stand-In Model"
check_content "backend/prisma/schema.prisma" "model CallSheetAdvanceDay" "Advance Day Model"
check_content "backend/prisma/schema.prisma" "model CallSheetAdvanceScene" "Advance Scene Model"

echo ""
echo "${BLUE}3. Checking PDF Template${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "header-grid" "3-Column Header"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "logistics-row" "Logistics Row"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "safety-banner" "Safety Banner"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "meal-banner" "Meal Banner"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "move-banner" "Move Banner"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "status-badge" "Status Badge"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "dept-notes-grid" "Dept Notes"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "advance-schedule" "Advance Schedule"
check_content "backend/src/modules/pdf/templates/call-sheet.html.ts" "footer-grid" "Enhanced Footer"

echo ""
echo "${BLUE}4. Checking DTO Updates${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_content "backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts" "@IsOptional.*companyName" "Company Name DTO"
check_content "backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts" "@IsOptional.*upm" "UPM DTO"
check_content "backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts" "@IsOptional.*crewParking" "Crew Parking DTO"
check_content "backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts" "@IsOptional.*artNotes" "Art Notes DTO"
check_content "backend/src/modules/call-sheets/dto/create-cast-call.dto.ts" "@IsOptional.*fittingTime" "Fitting Time DTO"

echo ""
echo "${BLUE}5. Checking Service Integration${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_content "backend/src/modules/call-sheets/call-sheets.service.ts" "import.*generateCallSheetHTML" "Template Import"
check_content "backend/src/modules/call-sheets/call-sheets.service.ts" "generateCallSheetHTML(callSheet)" "Template Usage"

echo ""
echo "${BLUE}6. Checking Documentation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_content "CALL_SHEET_PDF_EXPORT_UPGRADE_IMPLEMENTED.md" "Phase 1" "Implementation Guide"
check_content "DEPLOYMENT_GUIDE.md" "migration" "Deployment Guide"
check_content "QUICK_REFERENCE.md" "Status.*Complete" "Quick Reference"
check_content "IMPLEMENTATION_SUMMARY.md" "Status.*COMPLETE" "Summary Document"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        VERIFICATION SUMMARY                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Checks Passed:  ${GREEN}${PASSED}${NC}"
echo -e "Checks Failed:  ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed! Implementation is complete.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review DEPLOYMENT_GUIDE.md for deployment instructions"
  echo "  2. Test on staging environment"
  echo "  3. Run: cd backend && npx prisma migrate dev --name add_call_sheet_pdf_export_upgrade"
  echo "  4. Build and test: npm run build && npm run start:dev"
  echo "  5. Generate test PDF and verify layout"
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Please review the implementation.${NC}"
  exit 1
fi
