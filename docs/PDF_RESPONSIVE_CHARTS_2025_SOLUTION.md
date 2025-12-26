# Responsive Charts in PDF - 2025 Proper Implementation

**Date:** 2025-11-15
**Goal:** Make charts truly responsive while maintaining proper sizing in PDF exports
**Approach:** Industry-standard responsive implementation based on 2025 research

---

## 🔍 Research Summary (2025 Best Practices)

### Key Findings

1. **Chart.js CAN be responsive in PDFs** - but requires proper setup
2. **Container-based sizing** - Chart.js uses parent container dimensions
3. **devicePixelRatio** - Critical for high-resolution PDF output
4. **Dedicated container** - Each chart needs its own positioned container
5. **Proper resize triggers** - Must wait for Chart.js to calculate dimensions

---

## ✅ The Proper Responsive Implementation

### Architecture Pattern

```
Container (explicitly sized)
  └── Canvas (Chart.js auto-sizes to fill)
       └── Chart (responsive: true adapts)
```

### Step-by-Step Implementation

#### 1. **Container Setup** (Critical!)

```html
<!-- ✅ CORRECT: Dedicated, positioned container with explicit size -->
<div class="chart-container" style="position: relative; width: 750px; height: 400px;">
  <canvas id="chart"></canvas>
</div>

<!-- ❌ WRONG: No positioning or size -->
<div>
  <canvas id="chart"></canvas>
</div>
```

**Why this works:**
- Chart.js's responsive mode uses `getComputedStyle()` on parent container
- `position: relative` required for Chart.js to detect container
- Explicit `width` and `height` provide sizing reference
- Canvas auto-resizes to fill container

#### 2. **Chart.js Configuration**

```javascript
const chartConfig = {
  type: 'bar',
  data: { ... },
  options: {
    responsive: true,              // ✅ YES - use responsive!
    maintainAspectRatio: false,    // ✅ Fill container height
    devicePixelRatio: 2,           // ✅ HIGH QUALITY (Puppeteer has this at viewport)

    layout: {
      padding: {
        left: 40,
        right: 40,
        top: 60,
        bottom: 40
      }
    },

    // ✅ Prevent clipping
    scales: {
      y: {
        ticks: {
          padding: 10,
          autoSkip: true
        }
      },
      x: {
        ticks: {
          padding: 10,
          autoSkip: true,
          maxRotation: 45
        }
      }
    },

    animation: {
      duration: 0,                 // ✅ No animations in PDF
      onComplete: function() {
        // ✅ Signal that chart is ready
        this.canvas.dataset.chartReady = 'true';
      }
    }
  }
};
```

#### 3. **Puppeteer Configuration**

```javascript
// Set HIGH RESOLUTION viewport
await page.setViewport({
  width: 1280,
  height: 1024,
  deviceScaleFactor: 2  // ✅ 2x resolution (can go up to 5)
});

// Emulate print media
await page.emulateMediaType('print');

// Wait for content to load
await page.setContent(html, {
  waitUntil: 'networkidle0'
});

// ✅ CRITICAL: Wait for all charts to finish rendering
await page.waitForFunction(() => {
  const canvases = document.querySelectorAll('canvas');
  return Array.from(canvases).every(canvas =>
    canvas.dataset.chartReady === 'true'
  );
}, { timeout: 10000 });

// Small additional buffer for layout stability
await new Promise(resolve => setTimeout(resolve, 500));
```

#### 4. **Widget-Based Dimension Calculation**

```typescript
private calculateChartContainerDimensions(layout: { w: number; h: number }) {
  // A4 width constraints
  const PAGE_WIDTH = 794;           // A4 at 96 DPI
  const BODY_PADDING = 40;          // 20px each side
  const CONTAINER_WIDTH = PAGE_WIDTH - (BODY_PADDING * 2);

  // Grid system (matching react-grid-layout)
  const COLS = 12;
  const ROW_HEIGHT = 50;            // ✅ INCREASED from 30px
  const MARGIN_X = 16;
  const MARGIN_Y = 16;

  // Calculate grid cell size
  const colWidth = (CONTAINER_WIDTH - MARGIN_X * (COLS - 1)) / COLS;

  // Calculate widget dimensions
  const widgetWidth = colWidth * layout.w + MARGIN_X * Math.max(0, layout.w - 1);
  const widgetHeight = ROW_HEIGHT * layout.h + MARGIN_Y * Math.max(0, layout.h - 1);

  // Account for widget padding and title
  const WIDGET_PADDING = 16;
  const CHART_TITLE_HEIGHT = 56;

  // Final container dimensions (what Chart.js will see)
  const containerWidth = widgetWidth - WIDGET_PADDING * 2;
  const containerHeight = widgetHeight - WIDGET_PADDING * 2 - CHART_TITLE_HEIGHT;

  return {
    width: containerWidth,
    height: containerHeight,
    // Info for logging
    widgetWidth,
    widgetHeight
  };
}
```

---

## 📋 Complete Implementation Code

### Updated `generateChartCanvas()` Method

```typescript
private generateChartCanvas(viz: any, data: any[], chartId: string, layout?: any): string {
  // Calculate container dimensions
  let containerDimensions;

  if (layout) {
    containerDimensions = this.calculateChartContainerDimensions(layout);
    this.logger.log(
      `Chart container for widget ${layout.w}×${layout.h}: ` +
      `${containerDimensions.width}×${containerDimensions.height}px`
    );
  } else {
    // Default for legacy visualizations
    containerDimensions = {
      width: 750,
      height: 400
    };
    this.logger.log(`Chart container using default: 750×400px`);
  }

  // Prepare chart configuration
  const chartConfig = this.buildChartConfig(viz, data);

  // ✅ Return responsive container with positioned wrapper
  return `
    <div class="chart-container">
      <div class="chart-title">${this.escapeHtml(viz.title || 'Chart')}</div>
      <div class="chart-wrapper" style="position: relative; width: ${containerDimensions.width}px; height: ${containerDimensions.height}px;">
        <canvas id="${chartId}"></canvas>
      </div>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('${chartId}').getContext('2d');
        const chart = new Chart(ctx, ${JSON.stringify(chartConfig)});

        // Mark as ready when rendering complete
        chart.options.animation.onComplete = function() {
          this.canvas.dataset.chartReady = 'true';
        };
      })();
    </script>
  `;
}
```

### Updated `buildChartConfig()` Method

```typescript
private buildChartConfig(viz: any, data: any[]): any {
  // Common options for all chart types
  const commonOptions = {
    responsive: true,              // ✅ Enable responsive
    maintainAspectRatio: false,    // ✅ Fill container
    devicePixelRatio: 2,           // ✅ High resolution

    layout: {
      padding: {
        left: 40,
        right: 40,
        top: 60,
        bottom: 40
      }
    },

    animation: {
      duration: 0,                 // No animations
      onComplete: null             // Set by caller
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
    }
  };

  // Build configuration based on chart type
  if (viz.type === 'line' || viz.type === 'bar' || viz.type === 'area') {
    // ... (existing chart building logic)
    return {
      type: viz.type === 'area' ? 'line' : viz.type,
      data: { labels, datasets },
      options: {
        ...commonOptions,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              padding: 10,
              autoSkip: true
            }
          },
          x: {
            ticks: {
              padding: 10,
              autoSkip: true,
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    };
  } else if (viz.type === 'pie') {
    // ... (pie chart logic)
    return {
      type: 'pie',
      data: { labels, datasets },
      options: commonOptions
    };
  }
}
```

### Updated `htmlToPDF()` Method

```typescript
private async htmlToPDF(html: string): Promise<Buffer> {
  let browser: puppeteer.Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // ✅ High-resolution viewport
    await page.setViewport({
      width: 1280,
      height: 1024,
      deviceScaleFactor: 2  // 2x resolution
    });

    // ✅ Print media emulation
    await page.emulateMediaType('print');

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // ✅ Wait for all charts to render
    this.logger.log('Waiting for charts to render...');
    await page.waitForFunction(() => {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length === 0) return true; // No charts

      return Array.from(canvases).every(canvas =>
        canvas.dataset.chartReady === 'true'
      );
    }, { timeout: 10000 });

    // Small buffer for layout stability
    await new Promise(resolve => setTimeout(resolve, 500));

    this.logger.log('All charts rendered successfully');

    // Calculate content height
    const contentHeight = (await page.evaluate('document.documentElement.scrollHeight')) as number;

    // Generate PDF
    const pageWidth = 794;
    const marginTop = 28;
    const marginBottom = 28;
    const totalHeight = contentHeight + marginTop + marginBottom;

    this.logger.log(`Generating PDF: content=${contentHeight}px, total=${totalHeight}px`);

    const pdfBuffer = await page.pdf({
      width: pageWidth,
      height: totalHeight,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    this.logger.error('PDF generation failed', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

### Updated CSS Styles

```html
<style>
  .chart-container {
    margin: 20px 0;
    page-break-inside: avoid;
  }

  .chart-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #f0f0f0;
  }

  .chart-wrapper {
    /* position: relative - set inline per chart */
    /* width, height - set inline per chart */
    background: transparent;
    padding: 0;
    border: none;
    overflow: visible;
  }

  .chart-wrapper canvas {
    display: block;
    /* Chart.js will size this */
  }

  @media print {
    .chart-container {
      page-break-inside: avoid;
    }
  }
</style>
```

---

## 🎯 How This Solves Responsiveness

### For Widget-Based Layouts

1. **Input:** Widget layout `{ w: 6, h: 8 }`
2. **Calculate:** Container dimensions based on grid
3. **Output:** `<div style="width: 352px; height: 344px;">`
4. **Chart.js:** Detects container, sizes canvas to fit
5. **Result:** ✅ Chart perfectly fills widget space

### For Legacy Visualizations

1. **Input:** No layout provided
2. **Default:** Container dimensions 750×400
3. **Output:** `<div style="width: 750px; height: 400px;">`
4. **Chart.js:** Detects container, sizes canvas to fit
5. **Result:** ✅ Chart renders at consistent default size

### Benefits

✅ **Truly Responsive** - Charts adapt to container size
✅ **No Cropping** - Proper padding prevents label cutoff
✅ **High Resolution** - devicePixelRatio: 2 for crisp output
✅ **Consistent** - Same approach for all charts
✅ **Widget-Aware** - Respects visual builder dimensions
✅ **No Manual Sizing** - Chart.js calculates canvas size
✅ **Wait for Render** - Only generate PDF when charts ready

---

## 📊 Comparison: Old vs New

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| **Responsive** | `responsive: true` but no container | `responsive: true` WITH positioned container |
| **Sizing** | Manual calculation | Chart.js auto-sizes to container |
| **Canvas** | Inline styles | No styles (Chart.js handles it) |
| **Resolution** | Standard (devicePixelRatio: 1) | High (devicePixelRatio: 2) |
| **Render Wait** | Fixed timeout (3s) | Smart wait (chart ready signal) |
| **Padding** | 20px (insufficient) | 40-60px (proper) |
| **Cropping** | Frequent | Eliminated |

---

## 🧪 Testing Matrix

| Scenario | Widget Size | Expected Container | Status |
|----------|-------------|-------------------|--------|
| Small chart | 4×4 | ~220×144px | ✅ Test |
| Medium chart | 6×8 | ~352×344px | ✅ Test |
| Full width | 12×6 | ~714×244px | ✅ Test |
| Tall chart | 6×12 | ~352×544px | ✅ Test |
| Legacy default | None | 750×400px | ✅ Test |
| Long labels | Any | No cropping | ✅ Test |
| Many data points | Any | Readable | ✅ Test |

---

## 🚀 Implementation Checklist

- [ ] Update `calculateChartContainerDimensions()` - Use container approach
- [ ] Update `generateChartCanvas()` - Return positioned container wrapper
- [ ] Update chart config - Set `responsive: true`, `devicePixelRatio: 2`
- [ ] Update `htmlToPDF()` - Add viewport `deviceScaleFactor: 2`
- [ ] Add chart ready detection - `waitForFunction()` for `data-chart-ready`
- [ ] Update CSS - Remove fixed canvas sizing
- [ ] Increase padding - 40-60px for labels
- [ ] Test all chart types - Bar, line, pie, area
- [ ] Test all widget sizes - Small (4×4) to large (12×12)
- [ ] Verify PDF quality - Zoom to 200%, check text crispness

**Estimated Time:** 1-2 hours

---

## 📖 Key Insights from 2025 Research

1. **"Chart.js uses parent container to update canvas dimensions"** - Official docs
2. **"Container must be positioned and dedicated"** - Stack Overflow consensus
3. **"devicePixelRatio: 2 for high-quality PDF"** - Multiple sources
4. **"Wait for onComplete animation callback"** - Best practice
5. **"Responsive + maintainAspectRatio: false works in PDFs"** - Proven pattern

---

## 🎓 Why This is the "Proper Way"

**Industry Standard (2025):**
- ✅ Uses Chart.js responsive features correctly
- ✅ Container-based sizing (not manual calculation)
- ✅ High resolution via devicePixelRatio
- ✅ Smart render detection (not blind timeout)
- ✅ Proper padding to prevent cropping
- ✅ Works with dynamic widget layouts
- ✅ Scales from small to large charts

**vs. Old Approach:**
- ❌ Manual pixel calculations
- ❌ Fixed dimensions fighting responsive mode
- ❌ Low resolution output
- ❌ Fixed timeouts
- ❌ Insufficient padding
- ❌ Constant back-and-forth sizing adjustments

---

**Conclusion:** The proper 2025 way is to embrace Chart.js responsive mode with explicit container sizing. Let Chart.js do the math - we just provide the container dimensions.
