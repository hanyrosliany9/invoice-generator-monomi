# Call Sheet PDF Export Upgrade - Deployment & Migration Guide

**Last Updated:** December 23, 2025
**Status:** Ready for Deployment ✅
**Complexity:** Medium (Database schema + Service updates)

---

## Overview

This deployment guide covers the implementation of the professional call sheet PDF export upgrade. The changes include:

1. **Database Schema Updates** - New fields for production info, logistics, personnel, department notes
2. **PDF Template Rewrite** - Industry-standard 9-phase layout with professional styling
3. **Backend Service Updates** - New DTOs and service integration
4. **Backward Compatibility** - Existing call sheets continue to work

---

## Files Modified/Created

### Database Schema
- ✅ `backend/prisma/schema.prisma` - Added 20+ new fields and 2 new models

### PDF Template
- ✅ `backend/src/modules/pdf/templates/call-sheet.html.ts` - Complete rewrite with 9 phases

### DTOs (Data Transfer Objects)
- ✅ `backend/src/modules/call-sheets/dto/create-call-sheet.dto.ts` - Added new fields
- ✅ `backend/src/modules/call-sheets/dto/create-cast-call.dto.ts` - Added `fittingTime` field
- ✅ `backend/src/modules/call-sheets/dto/update-call-sheet.dto.ts` - Auto-inherits from CreateCallSheetDto

### Backend Service
- ✅ `backend/src/modules/call-sheets/call-sheets.service.ts` - Updated to use new template

### Documentation
- ✅ `CALL_SHEET_PDF_EXPORT_UPGRADE_IMPLEMENTED.md` - Implementation details
- ✅ `CALL_SHEET_PDF_EXPORT_UPGRADE.md` - Original requirements (reference)
- ✅ `DEPLOYMENT_GUIDE.md` - This file

---

## Quick Start: Deploy to Staging

```bash
# 1. Pull latest code
git pull origin main
cd backend
npm install

# 2. Apply database migrations
npx prisma migrate dev --name add_call_sheet_pdf_export_upgrade

# 3. Build and test
npm run build
npm run start:dev

# 4. Test PDF generation
# Create/update a call sheet via API and generate PDF
```

---

## Pre-Deployment Checklist

### 1. Backup & Environment
- [ ] Backup production database
- [ ] Test on staging environment first
- [ ] Ensure PostgreSQL 13+ is running
- [ ] Verify Node.js version: 16+ required

### 2. Code Review
- [ ] Review all schema changes for data type correctness
- [ ] Verify no breaking changes to existing fields
- [ ] Check backward compatibility with existing call sheets
- [ ] Review new DTO validations

### 3. Dependencies
- [ ] All npm packages up to date
- [ ] Prisma CLI installed: `npm install -g @prisma/cli`
- [ ] Puppeteer dependencies available (for PDF generation)

---

## Detailed Deployment Steps

### Step 1: Prepare Environment
```bash
# Clone/pull latest code
git pull origin main
cd backend

# Install dependencies
npm install

# Check current migration status
npx prisma migrate status
```

### Step 2: Create & Apply Migration
```bash
# Create migration from schema changes
npx prisma migrate dev --name add_call_sheet_pdf_export_upgrade

# This will:
# ✓ Create migration file in prisma/migrations/
# ✓ Apply it to database
# ✓ Generate Prisma client with new types
```

### Step 3: Verify Changes
```bash
# Validate schema
npx prisma schema validate

# Check migration was applied
npx prisma migrate status

# Generate updated types
npx prisma generate
```

### Step 4: Build & Test
```bash
# Build TypeScript
npm run build

# Type check
npm run type-check

# Start development server
npm run start:dev
```

### Step 5: Test PDF Generation
```bash
# In another terminal, test the API:
curl -X GET http://localhost:5000/api/call-sheets/{id}/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output test-call-sheet.pdf

# Verify in PDF viewer:
# - Professional 3-column header layout
# - Logistics row with 6 columns
# - Inline meals/moves in schedule
# - 9-column cast table
# - All sections render correctly
```

---

## Database Migration Details

### What Gets Added

**New CallSheet Fields (20+):**
```
companyName, companyAddress, upm, firstAd, secondAd, secondAdPhone,
productionOfficePhone, setMedic, setMedicPhone, scriptVersion, 
scheduleVersion, crewParking, basecamp, bathrooms, lunchLocation,
workingTrucks, artNotes, vehicleNotes, cameraGripNotes, stuntNotes
```

**New CallSheetCast Field:**
```
fittingTime
```

**New Models:**
```
CallSheetStandIn - Stand-ins and photo doubles
CallSheetAdvanceDay - Upcoming shoot days
CallSheetAdvanceScene - Scenes in advance schedule
```

### Migration Time
- Typical migration: 5-10 seconds
- No downtime required
- All new fields are optional (nullable)

### Rollback Safety
```bash
# If needed, rollback (preserves data):
npx prisma migrate resolve --rolled-back add_call_sheet_pdf_export_upgrade

# Full rollback with database restore:
pg_restore -U invoiceuser -d invoices /path/to/backup.sql
```

---

## Verification Checklist

After deployment, verify:

- [ ] Database migrations applied: `npx prisma migrate status`
- [ ] New tables exist: `\d call_sheet_standins` in psql
- [ ] New columns exist: `\d call_sheets` in psql
- [ ] Application builds: `npm run build` succeeds
- [ ] No TypeScript errors: `npm run type-check` passes
- [ ] Backend starts: `npm run start:dev` runs
- [ ] PDF generates: API call returns PDF buffer
- [ ] PDF layout correct: All 9 phases visible
- [ ] Backward compatible: Old call sheets still work

---

## Testing Data

Create test call sheet with new fields:

```bash
curl -X POST http://localhost:5000/api/call-sheets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "scheduleId": "sched-123",
    "shootDayId": "shootday-456",
    "shootDate": "2024-12-25T08:00:00Z",
    "productionName": "Test Production",
    "companyName": "Acme Films LLC",
    "companyAddress": "123 Film Ave, Hollywood, CA 90028",
    "producer": "John Doe",
    "director": "Jane Smith",
    "upm": "Bob Johnson",
    "firstAd": "Alice Williams",
    "secondAd": "Charlie Brown",
    "crewCallTime": "7:00 AM",
    "crewParking": "Lot A at 1808 Miller Rd",
    "basecamp": "Zeke'\''s House (1879 Miller Rd)",
    "bathrooms": "On Site",
    "lunchLocation": "Craft Services Tent",
    "workingTrucks": "Back Lot",
    "safetyNotes": "Safety vests required. No forced calls.",
    "artNotes": "Props ready by 6:30 AM",
    "cameraGripNotes": "A & B cameras for action sequence"
  }'
```

Then generate PDF:
```bash
# Get the ID from response above
curl -X GET http://localhost:5000/api/call-sheets/{id}/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output professional-call-sheet.pdf
```

Open `professional-call-sheet.pdf` to verify:
1. Company name and address in header
2. Large crew call time (7:00 AM) in gold
3. Logistics row with all 6 columns populated
4. Safety banner with notes
5. Professional styling and layout

---

## Troubleshooting

### "Migration already exists" Error
```bash
npx prisma migrate resolve --rolled-back add_call_sheet_pdf_export_upgrade
npx prisma migrate dev --name add_call_sheet_pdf_export_upgrade
```

### "Column already exists" Error
```bash
# Check if migration partially applied
npx prisma db execute --stdin < migration.sql

# If failed, manually rollback and retry
psql -U invoiceuser -d invoices < rollback.sql
npx prisma migrate dev --name add_call_sheet_pdf_export_upgrade
```

### "Puppeteer: ENOENT" (PDF generation fails)
```bash
# Install Chrome/Chromium dependencies
# Ubuntu/Debian:
sudo apt-get install -y chromium-browser

# Or use Docker to avoid system dependencies
docker-compose up -d
```

### TypeScript errors about new types
```bash
npx prisma generate
npm run build
```

### PDF doesn't look right
1. Check browser console for errors: `npm run start:dev`
2. Verify call sheet data has all fields populated
3. Test with curl to check HTML response
4. Inspect PDF directly in debug browser

---

## Performance Monitoring

After deployment, monitor:

### Database
```sql
-- Check migration execution time
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;

-- Check new index performance
EXPLAIN ANALYZE SELECT * FROM call_sheet_standins WHERE "callSheetId" = '...';
```

### Application
```bash
# Monitor PDF generation times
npm run start:dev 2>&1 | grep "generatePdf"

# Check memory usage
node --max-old-space-size=2048 dist/main.js
```

### Suggested Thresholds
- PDF generation: < 5 seconds
- Database query: < 100ms
- Memory: < 500MB idle

---

## Rollback Procedure

### If Critical Issues Occur

```bash
# 1. Immediate rollback (keeps data, uses old template)
git checkout HEAD~1 backend/src/modules/call-sheets/call-sheets.service.ts
npm run build
npm run start:dev

# 2. Full data rollback (if data corruption)
pg_restore -U invoiceuser -d invoices /path/to/backup.sql

# 3. Database-only rollback (if schema issues)
npx prisma migrate resolve --rolled-back add_call_sheet_pdf_export_upgrade
```

---

## Post-Deployment

### Day 1
- [ ] Monitor logs for errors
- [ ] Test PDF generation with real data
- [ ] Verify backward compatibility
- [ ] Check performance metrics

### Week 1
- [ ] Collect user feedback
- [ ] Monitor database performance
- [ ] Address any issues
- [ ] Plan frontend UI updates

### Month 1
- [ ] Analyze field adoption
- [ ] Optimize if needed
- [ ] Update documentation
- [ ] Training for team

---

## Support Contacts

For issues during deployment:
- **Database Issues**: Check PostgreSQL logs, verify user permissions
- **Code Issues**: Review migration file, check TypeScript types
- **PDF Issues**: Verify Puppeteer installation, check HTML output
- **Performance**: Monitor query times, check database indexes

---

## Version Information

- **Deployment Date**: December 23, 2025
- **Prisma Version**: 5.0+
- **PostgreSQL**: 13+
- **Node.js**: 16+
- **npm**: 8+

---

**✅ Ready to Deploy**

This guide provides everything needed for a successful deployment. Test thoroughly on staging before proceeding to production.
