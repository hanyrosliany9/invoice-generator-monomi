# PDF Chart Cropping Solution - Research-Based Fix

**Date:** 2025-11-15
**Issue:** Charts in PDF exports are getting cropped (labels cut off, axis overflow)
**Root Cause:** Combination of `responsive: true`, insufficient padding, and container size mismatch

---

## 🔍 Research Findings

### Key Issues Identified

1. **`responsive: true` + Fixed Dimensions Conflict**
   - Chart.js `responsive: true` tries to adapt to container
   - But we're setting fixed dimensions via inline styles
   - This causes unpredictable rendering in Puppeteer

2. **Insufficient Layout Padding**
   - Current: `padding: 20px` (all sides)
   - Problem: Not enough for long axis labels, legends
   - Chart.js needs extra space to prevent clipping

3. **No `deviceScaleFactor` in Puppeteer**
   - Charts render at low resolution
   - Blurry or pixelated in PDFs

4. **Missing `clip: false` Option**
   - Chart.js v4+ clips chart elements by default
   - Causes labels to be cut off at canvas edges

---

## ✅ Industry-Standard Solutions (2025)

### Solution 1: Proper Chart.js Configuration

```javascript
options: {
  responsive: false,              // ✅ CRITICAL: Use fixed dimensions for PDF
  maintainAspectRatio: false,     // ✅ Don't enforce aspect ratio
  animation: false,               // ✅ No animations in PDF

  layout: {
    padding: {
      left: 40,    // ✅ INCREASED: Accommodate Y-axis labels
      right: 40,   // ✅ INCREASED: Prevent right overflow
      top: 60,     // ✅ INCREASED: Room for legend
      bottom: 40   // ✅ INCREASED: X-axis labels
    }
  },

  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        padding: 15,  // ✅ Space between legend items
        boxWidth: 12
      }
    }
  },

  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        padding: 10,     // ✅ Space between axis and labels
        maxRotation: 0,  // ✅ Prevent rotated labels
        autoSkip: true   // ✅ Skip labels if too many
      }
    },
    x: {
      ticks: {
        padding: 10,
        maxRotation: 45,   // ✅ Rotate if needed
        minRotation: 0,
        autoSkip: true
      }
    }
  },

  // ✅ Chart.js v4+ only
  clip: false  // Prevent clipping at canvas edges
}
```

### Solution 2: Enhanced Puppeteer Configuration

```javascript
await page.setViewport({
  width: 1280,
  height: 1024,
  deviceScaleFactor: 2  // ✅ Higher resolution for crisp charts
});

await page.emulateMediaType('print');  // ✅ Use print styles
```

### Solution 3: Canvas Dimensions via Attributes

```html
<!-- ✅ CORRECT: Use canvas attributes -->
<canvas id="chart" width="800" height="500"></canvas>

<!-- ❌ WRONG: Don't use inline styles for dimensions -->
<div style="width: 800px; height: 500px;">
  <canvas id="chart"></canvas>
</div>
```

### Solution 4: Widget-Responsive Sizing

For widget-based layouts, calculate dimensions that **leave room for padding**:

```typescript
// Current calculation
const chartWidth = widgetWidth - WIDGET_PADDING * 2;
const chartHeight = widgetHeight - WIDGET_PADDING * 2 - CHART_TITLE_HEIGHT;

// ✅ IMPROVED: Add extra buffer for Chart.js internal padding
const CHART_INTERNAL_PADDING = 80; // 40px left + 40px right (from layout.padding)
const CHART_INTERNAL_PADDING_VERTICAL = 100; // 60px top + 40px bottom

const canvasWidth = chartWidth - CHART_INTERNAL_PADDING;
const canvasHeight = chartHeight - CHART_INTERNAL_PADDING_VERTICAL;
```

---

## 📋 Implementation Plan

### Step 1: Fix Chart.js Options (High Priority)

**File:** `pdf-generator.service.ts` ~line 1265

```typescript
// BEFORE (causing cropping)
options: {
  responsive: true,  // ❌ Wrong for PDF
  maintainAspectRatio: false,
  animation: false,
  layout: {
    padding: {
      left: 20,   // ❌ Too small
      right: 20,
      top: 20,
      bottom: 20
    }
  },
  ...
}

// AFTER (prevents cropping)
options: {
  responsive: false,  // ✅ Fixed dimensions
  maintainAspectRatio: false,
  animation: false,

  layout: {
    padding: {
      left: 40,    // ✅ Doubled for safety
      right: 40,
      top: 60,     // ✅ Extra room for legend
      bottom: 40
    }
  },

  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        padding: 15,
        boxWidth: 12
      }
    },
    title: { display: false }
  },

  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        padding: 10,
        maxRotation: 0,
        autoSkip: true
      }
    },
    x: {
      ticks: {
        padding: 10,
        maxRotation: 45,
        minRotation: 0,
        autoSkip: true
      }
    }
  },

  clip: false  // ✅ Chart.js v4+ (check version first)
}
```

### Step 2: Adjust Canvas Sizing Calculation

**File:** `pdf-generator.service.ts` ~line 1343

```typescript
// Current: Container div gets dimensions
<div class="chart-wrapper" style="${dimensions.style}">
  <canvas id="${chartId}"></canvas>
</div>

// ✅ IMPROVED: Canvas gets explicit dimensions
<div class="chart-wrapper">
  <canvas
    id="${chartId}"
    width="${dimensions.width}"
    height="${dimensions.height}"
  ></canvas>
</div>
```

### Step 3: Update Dimension Calculation

**File:** `pdf-generator.service.ts` ~line 1145

Add buffer for Chart.js internal padding:

```typescript
private calculateChartWrapperStyle(layout: any): {
  style: string;
  aspectRatio: number;
  width: number;
  height: number;
  canvasWidth: number;   // ✅ NEW: Actual canvas size
  canvasHeight: number;  // ✅ NEW: Actual canvas size
} {
  const w = layout?.w || 12;
  const h = layout?.h || 12;  // Default h=12 for good height

  // ... existing calculations ...

  const chartWidth = widgetWidth - WIDGET_PADDING * 2;
  const chartHeight = widgetHeight - WIDGET_PADDING * 2 - CHART_TITLE_HEIGHT;

  // ✅ NEW: Calculate actual canvas dimensions
  // Subtract Chart.js internal padding from layout.padding option
  const CHART_PADDING_BUFFER = 80;  // 40px left + 40px right
  const CHART_PADDING_BUFFER_V = 100; // 60px top + 40px bottom

  const canvasWidth = Math.max(chartWidth - CHART_PADDING_BUFFER, 300);
  const canvasHeight = Math.max(chartHeight - CHART_PADDING_BUFFER_V, 200);

  // Validate
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      style: `width: 400px; height: 300px;`,
      aspectRatio: 4/3,
      width: 400,
      height: 300,
      canvasWidth: 320,   // 400 - 80
      canvasHeight: 200   // 300 - 100
    };
  }

  return {
    style: `width: ${chartWidth}px; height: ${chartHeight}px; position: relative;`,
    aspectRatio: chartWidth / chartHeight,
    width: chartWidth,
    height: chartHeight,
    canvasWidth,   // ✅ Actual canvas size
    canvasHeight   // ✅ Actual canvas size
  };
}
```

### Step 4: Add deviceScaleFactor to Puppeteer

**File:** `pdf-generator.service.ts` ~line 1458

```typescript
// BEFORE
await page.setViewport({ width: 1280, height: 1024 });

// AFTER
await page.setViewport({
  width: 1280,
  height: 1024,
  deviceScaleFactor: 2  // ✅ Higher resolution (1 = normal, 2 = retina, max 5)
});

// ✅ ADD: Print media emulation
await page.emulateMediaType('print');
```

---

## 🎯 Expected Results

**Before:**
- ❌ Y-axis labels cut off on left
- ❌ Legend overlaps chart
- ❌ X-axis labels cropped at bottom
- ❌ Chart elements clipped at edges
- ❌ Blurry text in PDF

**After:**
- ✅ All labels visible with breathing room
- ✅ Legend positioned properly above chart
- ✅ No cropping at any edge
- ✅ Clean, professional appearance
- ✅ Crisp, high-resolution text

---

## 📊 Padding Comparison

| Location | Before | After | Reason |
|----------|--------|-------|--------|
| `layout.padding.left` | 20px | 40px | Y-axis labels |
| `layout.padding.right` | 20px | 40px | Overflow prevention |
| `layout.padding.top` | 20px | 60px | Legend + title space |
| `layout.padding.bottom` | 20px | 40px | X-axis labels |
| `ticks.padding` | 5px | 10px | Label spacing |
| **Total Buffer** | **50px** | **180px** | **3.6x more space** |

---

## 🧪 Testing Checklist

After implementing changes:

- [ ] **Bar Chart** - Verify Y-axis labels not cut off
- [ ] **Line Chart** - Check legend doesn't overlap
- [ ] **Pie Chart** - Ensure labels visible
- [ ] **Long Labels** - Test with 20+ character labels
- [ ] **Many Data Points** - Test with 50+ points
- [ ] **Small Widget** - 4×4 grid (minimum size)
- [ ] **Large Widget** - 12×12 grid (maximum size)
- [ ] **PDF Quality** - Zoom to 200% - text should be crisp

---

## 🚀 Quick Implementation Steps

1. **Update Chart.js options** (lines 1265-1294, 1322-1334)
   - Change `responsive: true` → `responsive: false`
   - Increase all padding values
   - Add `clip: false` if Chart.js v4+

2. **Use canvas attributes** (line 1343)
   - Add `width="${dimensions.canvasWidth}"`
   - Add `height="${dimensions.canvasHeight}"`

3. **Calculate canvas dimensions** (line 1145)
   - Add `canvasWidth` and `canvasHeight` to return type
   - Subtract padding buffer from widget dimensions

4. **Enhance Puppeteer** (line 1458)
   - Add `deviceScaleFactor: 2`
   - Add `await page.emulateMediaType('print')`

**Total Time:** 30-45 minutes

---

## 📖 References

- [Chart.js: Prevent labels from being cut off](https://stackoverflow.com/questions/26498171/how-do-i-prevent-the-scale-labels-from-being-cut-off-in-chartjs)
- [Chart.js v4 clip option](https://github.com/chartjs/Chart.js/issues/9691)
- [Puppeteer viewport deviceScaleFactor](https://stackoverflow.com/questions/69267937/puppeteer-and-pdf-generation-with-canvas)
- [Chart.js layout.padding documentation](https://www.chartjs.org/docs/latest/configuration/layout.html)

---

**Key Insight:** The solution isn't just bigger default dimensions - it's proper Chart.js configuration with adequate padding, fixed (not responsive) sizing, and canvas attributes instead of CSS styles.
