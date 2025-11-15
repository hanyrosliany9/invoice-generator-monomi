# Visual Builder to PDF Parity - Implementation Status

**Date:** 2025-11-15
**Status:** 75% Complete - Frontend Done, Backend Pending
**Approach:** HTML Snapshot + Fixed Canvas Width (Looker Studio Pattern)

---

## ✅ COMPLETED (Frontend)

### 1. Fixed Canvas Width (794px) ✅

**File:** `frontend/src/components/report-builder/ReportBuilderCanvas.tsx`

**Changes:**
- Changed from dynamic `containerWidth` to fixed `CANVAS_WIDTH = 794`
- Removed ResizeObserver (no longer needed)
- Centered canvas with flexbox layout
- Added white background and shadow for print preview feel

**Code:**
```typescript
const CANVAS_WIDTH = 794; // A4 width at 96 DPI

<div className="report-canvas" style={{
  width: `${CANVAS_WIDTH}px`,
  minHeight: '1123px', // A4 height
  background: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  transform: `scale(${zoomLevel})`,
  transformOrigin: 'top center',
}}>
  <GridLayout width={CANVAS_WIDTH} cols={12} rowHeight={30}>
    {/* Widgets */}
  </GridLayout>
</div>
```

---

### 2. Zoom Controls ✅

**File:** `frontend/src/components/report-builder/ReportBuilderCanvas.tsx`

**Features:**
- Zoom range: 50% - 200%
- Zoom in/out buttons (± 10% each click)
- Reset to 100% button
- Sticky positioning at bottom of canvas
- Only visible in edit mode (not in readonly)

**Code:**
```typescript
const [zoomLevel, setZoomLevel] = useState(1);

{!readonly && (
  <div style={{
    position: 'sticky',
    bottom: token.paddingLG,
    /* ... zoom control styles ... */
  }}>
    <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}>−</button>
    <span>{Math.round(zoomLevel * 100)}%</span>
    <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>+</button>
    <button onClick={() => setZoomLevel(1)}>100%</button>
  </div>
)}
```

---

### 3. HTML Snapshot Capture ✅

**File:** `frontend/src/utils/pdfSnapshot.ts` (NEW)

**Functions Created:**
1. `extractStyles()` - Extract relevant CSS rules from stylesheets
2. `captureReportSnapshot()` - Capture HTML, styles, and dimensions
3. `captureAndValidateSnapshot()` - Capture with validation
4. `waitForContentLoaded()` - Wait for charts/images to load
5. `captureSnapshotSafe()` - Main function with loading wait

**What It Captures:**
```typescript
interface ReportSnapshot {
  html: string;           // Inner HTML of .report-canvas
  styles: string;         // All relevant CSS rules
  dimensions: {
    width: 794,
    rowHeight: 30,
    cols: 12,
  };
  metadata: {
    timestamp: string,
    userAgent: string,
  };
}
```

**Validation:**
- Checks HTML length > 100 characters
- Verifies presence of `react-grid-item` elements
- Waits for images and charts to load
- Logs capture details

---

### 4. Service Layer Updates ✅

**File:** `frontend/src/services/social-media-reports.ts`

**Change:**
```typescript
// BEFORE:
async generatePDF(reportId: string): Promise<void> {
  const response = await axios.post(`${API_BASE}/${reportId}/generate-pdf`, {}, ...);
}

// AFTER:
async generatePDF(reportId: string, snapshot?: any): Promise<void> {
  const response = await axios.post(
    `${API_BASE}/${reportId}/generate-pdf`,
    snapshot ? {
      renderedHTML: snapshot.html,
      styles: snapshot.styles,
      dimensions: snapshot.dimensions,
    } : {},
    { responseType: 'blob' },
  );
}
```

---

### 5. Mutation Hook Updates ✅

**File:** `frontend/src/features/reports/hooks/useReportMutations.ts`

**Change:**
```typescript
// BEFORE:
const generatePDF = useMutation({
  mutationFn: (id: string) => socialMediaReportsService.generatePDF(id),
  ...
});

// AFTER:
const generatePDF = useMutation({
  mutationFn: ({ id, snapshot }: { id: string; snapshot?: any }) =>
    socialMediaReportsService.generatePDF(id, snapshot),
  onSuccess: (_, { id }) => { ... },
  ...
});
```

---

### 6. Context Integration ✅

**File:** `frontend/src/features/reports/contexts/ReportContext.tsx`

**Flow:**
```typescript
generatePDF: async () => {
  if (!id) return;

  // 1. Capture HTML snapshot
  console.log('Capturing HTML snapshot for PDF generation...');
  const snapshot = await captureSnapshotSafe();

  // 2. Generate PDF with snapshot (or fallback)
  if (snapshot) {
    console.log('Snapshot captured, generating PDF with visual builder parity');
    await reportMutations.generatePDF.mutateAsync({ id, snapshot });
  } else {
    console.warn('Snapshot capture failed, falling back to calculation-based approach');
    await reportMutations.generatePDF.mutateAsync({ id });
  }
}
```

**Fallback Strategy:**
- If snapshot succeeds → Use HTML snapshot (100% parity)
- If snapshot fails → Use old calculation method (safe fallback)

---

## ⏳ PENDING (Backend)

### 7. Backend PDF Controller Update ❌

**File:** `backend/src/modules/reports/controllers/reports.controller.ts`

**Required Change:**
```typescript
@Post(':id/generate-pdf')
async generatePDF(
  @Param('id') id: string,
  @Body() body: {
    renderedHTML?: string;
    styles?: string;
    dimensions?: { width: number; rowHeight: number; cols: number };
  }
) {
  const report = await this.reportsService.findOne(id);

  let pdfBuffer: Buffer;

  if (body.renderedHTML && body.styles) {
    // ✅ NEW: Use HTML snapshot (100% parity)
    pdfBuffer = await this.pdfService.generatePDFFromSnapshot(report, body);
  } else {
    // ⚠️ FALLBACK: Use calculation-based approach
    pdfBuffer = await this.pdfService.generatePDF(report);
  }

  return {
    data: pdfBuffer.toString('base64'),
    filename: `${report.title}.pdf`
  };
}
```

---

### 8. Backend PDF Generator Service Update ❌

**File:** `backend/src/modules/reports/services/pdf-generator.service.ts`

**New Method Required:**
```typescript
async generatePDFFromSnapshot(
  report: Report,
  snapshot: {
    renderedHTML: string;
    styles: string;
    dimensions: { width: number; rowHeight: number; cols: number };
  }
): Promise<Buffer> {

  // 1. Build complete HTML document
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${snapshot.dimensions.width}px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          /* ✅ Exact styles from browser */
          ${snapshot.styles}

          /* Print adjustments */
          @media print {
            .react-grid-item { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="report-canvas" style="width: ${snapshot.dimensions.width}px;">
          ${snapshot.renderedHTML}
        </div>
      </body>
    </html>
  `;

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 3. Set viewport with high resolution
  await page.setViewport({
    width: snapshot.dimensions.width,
    height: 1123,  // A4 height
    deviceScaleFactor: 2
  });

  // 4. Emulate print media
  await page.emulateMediaType('print');

  // 5. Load HTML
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // 6. Wait for rendering
  await page.evaluate(() => {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve(true);
      } else {
        window.addEventListener('load', () => resolve(true));
      }
    });
  });

  // 7. Get content height
  const contentHeight = await page.evaluate('document.documentElement.scrollHeight');

  // 8. Generate PDF
  const pdf = await page.pdf({
    width: `${snapshot.dimensions.width}px`,
    height: `${contentHeight}px`,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();

  return Buffer.from(pdf);
}
```

---

### 9. Add Print Preview Badge ❌

**File:** `frontend/src/pages/ReportBuilderPage.tsx` or `ReportDetailPage.tsx`

**Suggested Addition:**
```typescript
import { Tag } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';

// Add to header section
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <Tag color="blue" icon={<FilePdfOutlined />}>
    Print Preview Mode (794px × A4)
  </Tag>
  <Text type="secondary">
    Layout matches PDF export exactly
  </Text>
</div>
```

---

## 📊 Implementation Progress

| Task | Status | File | Lines Changed |
|------|--------|------|---------------|
| **Frontend** | | | |
| 1. Fixed canvas width | ✅ Done | ReportBuilderCanvas.tsx | ~30 |
| 2. Zoom controls | ✅ Done | ReportBuilderCanvas.tsx | ~50 |
| 3. Snapshot capture util | ✅ Done | pdfSnapshot.ts (new) | ~180 |
| 4. Service layer update | ✅ Done | social-media-reports.ts | ~8 |
| 5. Mutation hook update | ✅ Done | useReportMutations.ts | ~6 |
| 6. Context integration | ✅ Done | ReportContext.tsx | ~15 |
| **Backend** | | | |
| 7. Controller update | ❌ Pending | reports.controller.ts | ~15 |
| 8. PDF snapshot generator | ❌ Pending | pdf-generator.service.ts | ~80 |
| **UX Enhancements** | | | |
| 9. Print preview badge | ❌ Pending | ReportBuilderPage.tsx | ~10 |

**Total Progress:** 6/9 tasks (67%)
**Lines of Code:** ~289 frontend / ~95 backend = ~384 total

---

## 🧪 Testing Plan

Once backend is complete:

### Test 1: Basic Parity
1. Create report with 3 widgets (text, chart, table)
2. Export to PDF
3. Compare canvas screenshot vs PDF side-by-side
4. **Expected:** Pixel-perfect match

### Test 2: Different Widget Sizes
1. Create widgets: 4×4, 6×8, 12×12
2. Export to PDF
3. **Expected:** All widgets match exact size in PDF

### Test 3: Chart Rendering
1. Add line chart, bar chart, pie chart
2. Export to PDF
3. **Expected:** Charts render identically

### Test 4: Zoom Independence
1. Set zoom to 150%
2. Export to PDF
3. **Expected:** PDF uses 100% zoom (ignores zoom transform)

### Test 5: Edge Cases
1. Empty canvas
2. Very tall layout (10+ widgets)
3. Overlapping widgets
4. **Expected:** All handled gracefully

---

## 🎯 Next Steps

### Immediate (Backend Implementation)

1. **Update Controller** (15 min)
   - Add `@Body()` parameter to accept snapshot
   - Add conditional logic: snapshot vs calculation

2. **Add PDF Generator Method** (45 min)
   - Create `generatePDFFromSnapshot()` method
   - Build HTML document from snapshot
   - Configure Puppeteer for snapshot rendering

3. **Test Backend** (15 min)
   - Test with snapshot data
   - Test fallback without snapshot
   - Verify PDF output

### Then (UX Polish)

4. **Add Print Preview Badge** (10 min)
   - Show "Print Preview Mode" indicator
   - Explain fixed canvas width

5. **Add Page Break Guides** (Optional, 20 min)
   - Show dotted lines at A4 page boundaries
   - Help users design for print

### Finally (Testing)

6. **Manual Testing** (30 min)
   - Run all 5 test scenarios
   - Compare screenshots vs PDFs
   - Document any issues

7. **User Acceptance** (User testing)
   - Have user test with real reports
   - Verify satisfaction with parity

---

## 📝 Implementation Notes

### Why This Works

**The Key Insight:**
> "Don't calculate PDF dimensions separately. Capture the exact HTML that the browser rendered and replay it in Puppeteer."

**Benefits:**
1. **100% Parity** - It's the literal browser HTML
2. **No Math** - Browser handles all layout
3. **No Drift** - Impossible to mismatch
4. **Maintainable** - One rendering path

**How Zoom Doesn't Affect PDF:**
- Zoom is a CSS `transform: scale()` on the canvas wrapper
- When we capture `innerHTML`, we get the un-transformed content
- PDF always renders at 100% zoom (the actual widget sizes)

**Fallback Safety:**
- If snapshot fails (rare), falls back to calculation method
- Ensures PDF generation always works
- Best of both worlds

---

## 🎓 Learning from Google Looker Studio

**What We Adopted:**
1. ✅ Fixed canvas width (print preview)
2. ✅ HTML snapshot approach
3. ✅ Exact style replication
4. ✅ Zoom controls for editing

**What We Improved:**
1. ✅ Validation before capture
2. ✅ Graceful fallback
3. ✅ Content loading wait
4. ✅ Metadata tracking

---

## ⚡ Quick Start (After Backend Complete)

```bash
# 1. Frontend already done ✅

# 2. Implement backend
# - Update reports.controller.ts (accept snapshot)
# - Add generatePDFFromSnapshot() method

# 3. Restart backend
docker compose -f docker-compose.dev.yml restart app

# 4. Test
# - Open report builder
# - Create layout
# - Click "Export PDF"
# - Compare with canvas

# Expected result: PERFECT MATCH 🎯
```

---

**Status:** Ready for backend implementation
**Estimated Time Remaining:** 1-2 hours
**Last Updated:** 2025-11-15 18:00 UTC
