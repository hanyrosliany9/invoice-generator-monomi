# PDF Generator Refactoring - 2025 Best Practices

**Date:** 2025-11-15
**Current Implementation:** Manual dimension calculation with back-and-forth sizing
**Target:** Robust, industry-standard approach using modern best practices

---

## 🔍 Research Findings (2025 Best Practices)

### Key Issues with Current Approach

1. **Manual Dimension Calculation**: We're calculating `chartWidth` and `chartHeight` manually, leading to constant adjustments
2. **Inconsistent Sizing**: Different paths (widget-based vs legacy) require different default dimensions
3. **Fragile Math**: Complex calculation with padding, margins, title height - easy to break
4. **Not Responsive**: Fixed pixel calculations don't adapt to content

### Industry Standard Approach (2025)

Based on research from Stack Overflow, Medium, and Chart.js documentation:

#### 1. **Use Fixed Dimensions with `responsive: false`**
```javascript
options: {
  responsive: false,        // ✅ For PDF, use fixed dimensions
  maintainAspectRatio: false,
  animation: false
}
```

**Why:** Puppeteer PDFs need predictable, fixed dimensions. Responsive mode causes inconsistent rendering.

#### 2. **Set Canvas Dimensions via Attributes (Not CSS)**
```html
<!-- ✅ CORRECT: Canvas render dimensions -->
<canvas id="chart" width="800" height="400"></canvas>

<!-- ❌ WRONG: CSS display dimensions (Chart.js ignores these) -->
<canvas id="chart" style="width: 800px; height: 400px;"></canvas>
```

**Why:** Chart.js uses canvas `width`/`height` attributes for rendering, not CSS styles.

#### 3. **Wait for Chart Rendering**
```javascript
// ✅ Current: Good (we have this)
await page.setContent(html, { waitUntil: 'networkidle0' });
await new Promise(resolve => setTimeout(resolve, 3000));
```

#### 4. **Use Print Media Type**
```javascript
// ✅ NEW: Add print media emulation
await page.emulateMediaType('print');
```

#### 5. **Container-Based Sizing**
```html
<!-- Parent container defines size -->
<div style="width: 800px; height: 400px;">
  <canvas id="chart"></canvas>
</div>
```

**Why:** Chart.js parent container approach is more reliable than manual calculations.

---

## 🎯 Proposed Refactoring Strategy

### Option 1: **Aspect Ratio-Based Sizing** (Recommended)

**Concept:** Define standard aspect ratios instead of complex calculations.

```typescript
// Define chart presets
const CHART_PRESETS = {
  full: { width: 750, height: 400 },      // Full width chart (16:9)
  wide: { width: 750, height: 300 },      // Wide chart (2.5:1)
  square: { width: 500, height: 500 },    // Square chart
  tall: { width: 400, height: 600 },      // Portrait chart
};

// Use preset based on chart type
const preset = viz.type === 'pie' ? CHART_PRESETS.square : CHART_PRESETS.full;
```

**Benefits:**
- ✅ Simple, predictable dimensions
- ✅ No complex math
- ✅ Easy to adjust
- ✅ Works for all chart types

**Implementation:**
1. Remove `calculateChartWrapperStyle()` complexity
2. Use presets for legacy visualizations
3. For widget-based layouts, convert grid dimensions to preset

---

### Option 2: **CSS Grid/Flexbox with Fixed Container** (Modern)

**Concept:** Let browser handle layout, we just set container size.

```html
<div class="chart-grid">
  <!-- Each chart gets a fixed-size container -->
  <div class="chart-container" style="width: 750px; height: 400px;">
    <canvas id="chart1"></canvas>
  </div>
</div>
```

**Benefits:**
- ✅ Browser-native layout
- ✅ Consistent across different content
- ✅ Easier to maintain

---

### Option 3: **Content-Aware Sizing** (Advanced)

**Concept:** Analyze chart data to determine optimal size.

```typescript
function calculateOptimalChartSize(viz: any, data: any[]) {
  const dataPoints = data.length;

  // More data points = wider chart
  if (dataPoints > 20) {
    return { width: 900, height: 400 };
  } else if (dataPoints > 10) {
    return { width: 750, height: 400 };
  } else {
    return { width: 600, height: 400 };
  }
}
```

**Benefits:**
- ✅ Adapts to content
- ✅ Prevents cramped charts

---

## 📋 Recommended Implementation Plan

### Phase 1: Simplify with Presets (1-2 hours)

**Goal:** Replace complex calculations with simple presets.

```typescript
// 1. Define chart size presets
const CHART_SIZES = {
  // For legacy visualizations (no layout)
  default: { width: 750, height: 400 },

  // For widget-based layouts (calculate from grid)
  fromLayout: (layout: { w: number; h: number }) => {
    // Simple conversion: each grid unit = pixels
    const GRID_UNIT_WIDTH = 60;   // 750px / 12 cols
    const GRID_UNIT_HEIGHT = 50;  // Reasonable unit

    return {
      width: Math.min(layout.w * GRID_UNIT_WIDTH, 750),
      height: layout.h * GRID_UNIT_HEIGHT
    };
  }
};

// 2. Update generateChartCanvas
private generateChartCanvas(viz: any, data: any[], chartId: string, layout?: any): string {
  // Get dimensions from preset
  const dimensions = layout
    ? CHART_SIZES.fromLayout(layout)
    : CHART_SIZES.default;

  // Use canvas attributes (not CSS)
  return `
    <div class="chart-container">
      <div class="chart-title">${viz.title}</div>
      <canvas id="${chartId}" width="${dimensions.width}" height="${dimensions.height}"></canvas>
    </div>
    <script>
      const ctx = document.getElementById('${chartId}').getContext('2d');
      new Chart(ctx, {
        ...chartConfig,
        options: {
          ...chartConfig.options,
          responsive: false,  // ✅ Fixed dimensions for PDF
          maintainAspectRatio: false
        }
      });
    </script>
  `;
}
```

**Changes:**
- ✅ Remove `calculateChartWrapperStyle()` complexity
- ✅ Use canvas `width`/`height` attributes
- ✅ Set `responsive: false` in Chart.js options
- ✅ Simple preset-based sizing

---

### Phase 2: Add Print Media Support (30 min)

```typescript
// In htmlToPDF()
await page.emulateMediaType('print');

// Add print CSS
<style>
  @media print {
    .chart-container {
      page-break-inside: avoid;
    }
  }
</style>
```

---

### Phase 3: Content-Aware Sizing (Optional, 1 hour)

Add logic to adjust chart size based on data complexity:

```typescript
function getOptimalChartSize(viz: any, data: any[]) {
  const dataPoints = data.length;
  const hasMultipleYAxis = Array.isArray(viz.yAxis) && viz.yAxis.length > 1;

  let height = 400;

  // Adjust for data complexity
  if (dataPoints > 30) height = 500;
  if (hasMultipleYAxis) height += 50;

  return { width: 750, height };
}
```

---

## 📊 Comparison: Current vs Proposed

| Aspect | Current | Proposed (Option 1) |
|--------|---------|---------------------|
| **Complexity** | High (160 lines calculation) | Low (20 lines preset) |
| **Maintainability** | Hard to modify | Easy to adjust |
| **Consistency** | Varies by path | Uniform across all |
| **Debugging** | Complex math to trace | Simple preset lookup |
| **Flexibility** | Limited by formula | Easy to add presets |

---

## 🚀 Quick Win: Immediate Fix (15 min)

**Minimal change to current code:**

```typescript
// Replace lines 1222-1229 with:
} else {
  // Simple default: 750x400 (standard chart size)
  const DEFAULT_WIDTH = 750;
  const DEFAULT_HEIGHT = 400;

  dimensions = {
    style: `width: ${DEFAULT_WIDTH}px; height: ${DEFAULT_HEIGHT}px; position: relative;`,
    aspectRatio: DEFAULT_WIDTH / DEFAULT_HEIGHT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  };

  this.logger.log(
    `Generating chart with DEFAULT sizing: ${viz.type} chart "${viz.title}" ` +
    `(${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}px fixed preset)`
  );
}
```

**Benefits:**
- ✅ No back-and-forth sizing adjustments needed
- ✅ Predictable 750x400 size for all legacy charts
- ✅ Simple to understand and maintain

---

## 🎯 Recommended Action

**Start with Quick Win:**
1. Apply 15-minute fix above
2. Test PDF generation
3. If satisfactory, stop here

**If more refinement needed:**
1. Implement Phase 1 (presets) for better control
2. Add Phase 2 (print media) for robustness
3. Consider Phase 3 (content-aware) for polish

---

## 📖 References

- [Chart.js Responsive Documentation](https://www.chartjs.org/docs/latest/configuration/responsive.html)
- [Stack Overflow: Puppeteer with Chart.js](https://stackoverflow.com/questions/63692177/puppeteer-with-chart-js)
- [Medium: Generating PDF Reports with Charts](https://dev.to/carlbarrdahl/generating-pdf-reports-with-charts-using-react-and-puppeteer-4245)
- [Chart.js Canvas Sizing Best Practices](https://stackoverflow.com/questions/44333963/how-to-set-a-fixed-size-for-canvas-on-chart-js)

---

**Conclusion:** Stop calculating dimensions dynamically. Use fixed, preset dimensions with `responsive: false`. This is the 2025 industry standard for PDF chart generation.
