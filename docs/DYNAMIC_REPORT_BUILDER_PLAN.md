# Dynamic Report Builder Implementation Plan
**Goal:** Transform the report interface into a visual, drag-and-drop builder combining Google Looker Studio, Google Slides, and Notion features.

---

## 🎯 Key Features to Implement

### 1. **Visual Canvas Builder (Google Slides-like)**
- Drag-and-drop grid layout system
- Resizable widgets/components
- Snap-to-grid alignment
- Multi-select and bulk operations
- Undo/redo functionality
- Zoom in/out controls

### 2. **Component Palette (Looker Studio-like)**
- **Data Visualizations:**
  - Line Chart
  - Bar Chart
  - Area Chart
  - Pie Chart
  - Metric Card
  - Data Table
  - Scorecard
  - Gauge Chart (new)

- **Content Blocks:**
  - Rich Text Block (Notion-like)
  - Image Block
  - Divider
  - Spacer
  - Callout Box
  - Section Header

### 3. **Rich Text Editor (Notion-like)**
- Inline formatting: **Bold**, *Italic*, <u>Underline</u>, ~~Strikethrough~~
- Headings (H1, H2, H3)
- Bulleted/Numbered lists
- Links and mentions
- Code blocks
- Callouts (info, warning, success, error)
- Text color and background color
- Keyboard shortcuts (Cmd+B, Cmd+I, etc.)

### 4. **Properties Panel**
- Context-sensitive based on selected element
- Chart configuration (X/Y axis, colors, labels)
- Text styling options
- Layout controls (width, height, position)
- Data binding controls

### 5. **Real-time Preview**
- Live updates as users configure
- Preview mode toggle
- Mobile/tablet/desktop responsive preview

---

## 🏗️ Architecture Design

### Frontend Structure
```
src/
├── components/
│   ├── report-builder/
│   │   ├── ReportBuilderCanvas.tsx          # Main canvas with grid
│   │   ├── ComponentPalette.tsx             # Left sidebar with widgets
│   │   ├── PropertiesPanel.tsx              # Right sidebar for config
│   │   ├── Toolbar.tsx                      # Top actions bar
│   │   ├── widgets/
│   │   │   ├── ChartWidget.tsx              # Wrapper for all chart types
│   │   │   ├── TextWidget.tsx               # Rich text block
│   │   │   ├── MetricWidget.tsx             # Metric card
│   │   │   ├── ImageWidget.tsx              # Image block
│   │   │   ├── DividerWidget.tsx            # Divider line
│   │   │   └── CalloutWidget.tsx            # Callout box
│   │   ├── editors/
│   │   │   ├── RichTextEditor.tsx           # Notion-like editor
│   │   │   ├── ChartEditor.tsx              # Chart configuration
│   │   │   └── DataBindingEditor.tsx        # Data source selector
│   │   └── grid/
│   │       ├── GridLayout.tsx               # react-grid-layout wrapper
│   │       └── WidgetContainer.tsx          # Individual grid item
│   └── reports/
│       └── ReportRenderer.tsx               # Read-only report display
```

### Backend Schema Updates
```prisma
model ReportSection {
  id              String   @id @default(cuid())
  reportId        String
  order           Int
  title           String
  description     String?

  // CSV Data
  csvFileName     String
  csvFilePath     String?
  rawData         Json
  columnTypes     Json
  rowCount        Int

  // NEW: Layout Configuration
  layout          Json     // Grid layout positions
  widgets         Json     // Widget configurations

  // Timestamps
  importedAt      DateTime @default(now())
  updatedAt       DateTime @updatedAt

  report          SocialMediaReport @relation(...)
}
```

### Widget Configuration Schema (JSON)
```typescript
interface Widget {
  id: string;
  type: 'chart' | 'text' | 'metric' | 'image' | 'divider' | 'callout';

  // Grid position (react-grid-layout format)
  layout: {
    x: number;      // Grid column position
    y: number;      // Grid row position
    w: number;      // Width in grid units
    h: number;      // Height in grid units
    minW?: number;  // Minimum width
    minH?: number;  // Minimum height
  };

  // Widget-specific config
  config: ChartConfig | TextConfig | MetricConfig | ImageConfig | CalloutConfig;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  xAxis?: string;
  yAxis?: string[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

interface TextConfig {
  content: any;  // Slate/Lexical JSON
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontWeight?: number;
}

interface MetricConfig {
  title: string;
  valueKey: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  precision: number;
  prefix?: string;
  suffix?: string;
  trend?: {
    enabled: boolean;
    compareKey?: string;
    showPercentage?: boolean;
  };
}

interface CalloutConfig {
  type: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  content: any;  // Rich text content
  icon?: string;
}
```

---

## 📦 Required Dependencies

### Core Libraries
```bash
# Grid layout system
npm install react-grid-layout @types/react-grid-layout

# Rich text editor (choose one)
npm install slate slate-react slate-history
# OR
npm install lexical @lexical/react

# Drag and drop utilities
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Color picker
npm install react-color @types/react-color

# Icons
npm install @ant-design/icons  # Already installed

# State management for builder
npm install immer  # For immutable state updates
```

---

## 🎨 UI/UX Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar: [Save] [Preview] [Export PDF] [Undo] [Redo]      │
├───────┬───────────────────────────────────────────┬─────────┤
│       │                                           │         │
│ Comp. │                                           │  Props  │
│ Palette│              Canvas Grid                │  Panel  │
│       │                                           │         │
│ [📊]  │   ┌───────┐  ┌─────────────────┐        │ ┌─────┐ │
│ Chart │   │ Text  │  │   Line Chart    │        │ │ Type│ │
│       │   │ Block │  │                 │        │ ├─────┤ │
│ [📝]  │   └───────┘  └─────────────────┘        │ │Title│ │
│ Text  │                                           │ ├─────┤ │
│       │   ┌──────────┐  ┌──────┐  ┌──────┐      │ │X-Ax│ │
│ [📈]  │   │  Metric  │  │Metric│  │Metric│      │ ├─────┤ │
│ Metric│   │  Card    │  │ Card │  │ Card │      │ │Y-Ax│ │
│       │   └──────────┘  └──────┘  └──────┘      │ └─────┘ │
│ [🖼️]  │                                           │         │
│ Image │   ┌─────────────────────────────────┐    │         │
│       │   │      Data Table Preview         │    │         │
│ [➖]  │   └─────────────────────────────────┘    │         │
│Divider│                                           │         │
└───────┴───────────────────────────────────────────┴─────────┘
```

### Component Palette Categories
1. **📊 Charts**
   - Line Chart
   - Bar Chart
   - Area Chart
   - Pie Chart
   - Combo Chart

2. **📈 Metrics**
   - Metric Card
   - Scorecard
   - Gauge
   - Progress Bar

3. **📝 Content**
   - Text Block
   - Heading
   - Callout
   - Divider

4. **📋 Data**
   - Data Table
   - Pivot Table (future)

---

## 🔄 User Workflow

### Creating a Report
1. **Upload CSV Data** (existing flow)
2. **Enter Builder Mode**
   - Click "Design Report" button
   - Opens visual canvas
3. **Add Components**
   - Drag chart from palette → canvas
   - Click to configure in properties panel
   - Select data columns for X/Y axes
4. **Add Text Commentary**
   - Drag text block → canvas
   - Write insights using rich editor
   - Format with Notion-style shortcuts
5. **Arrange Layout**
   - Drag to reposition
   - Resize handles for dimensions
   - Snap-to-grid alignment
6. **Preview & Export**
   - Toggle preview mode
   - Export to PDF (respects layout)
   - Share with client

### Example Report Structure
```
┌─────────────────────────────────────────┐
│  Executive Summary (Text Block)         │
│  "Campaign performance exceeded targets"│
├─────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ Reach  │  │Engage. │  │  ROI   │    │
│  │ 125K   │  │  8.5%  │  │ 3.2x   │    │
│  └────────┘  └────────┘  └────────┘    │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │   Impressions Over Time (Line)  │   │
│  │                            📈    │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  Key Insights (Callout - Success)      │
│  ✓ Best performing day: Monday         │
│  ✓ Peak engagement: 2-4 PM             │
└─────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Install dependencies
- ✅ Create basic grid layout component
- ✅ Implement component palette UI
- ✅ Add drag-and-drop functionality
- ✅ Basic widget containers

### Phase 2: Rich Text Editor (Week 2)
- ✅ Integrate Slate.js/Lexical
- ✅ Implement formatting toolbar
- ✅ Add keyboard shortcuts
- ✅ Style callouts and headings

### Phase 3: Chart Integration (Week 2-3)
- ✅ Wrap existing chart components
- ✅ Add data binding interface
- ✅ Implement chart configuration panel
- ✅ Support all chart types

### Phase 4: Properties Panel (Week 3)
- ✅ Dynamic panel based on selection
- ✅ Chart editor forms
- ✅ Text styling controls
- ✅ Layout controls (size, position)

### Phase 5: Backend Integration (Week 4)
- ✅ Update Prisma schema
- ✅ Create layout save/load endpoints
- ✅ Update PDF generator for custom layouts
- ✅ Migration script for existing reports

### Phase 6: Polish & Features (Week 5)
- ✅ Undo/redo functionality
- ✅ Keyboard shortcuts
- ✅ Responsive preview modes
- ✅ Templates/presets
- ✅ Auto-save

---

## 📊 Database Migration Strategy

### Migration: Add Layout Support
```sql
-- Add new columns to ReportSection
ALTER TABLE "ReportSection"
ADD COLUMN "layout" JSONB DEFAULT '{"widgets": []}',
ADD COLUMN "layoutVersion" INTEGER DEFAULT 1;

-- Migrate existing reports to new format
UPDATE "ReportSection"
SET "layout" = jsonb_build_object(
  'widgets',
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'type', 'chart',
      'layout', jsonb_build_object('x', 0, 'y', 0, 'w', 12, 'h', 8),
      'config', "visualizations"
    )
  )
)
WHERE "visualizations" IS NOT NULL;
```

---

## 🎯 Success Metrics

### User Experience
- Time to create report: < 5 minutes (vs 15 mins currently)
- User satisfaction: 9/10+
- Feature adoption: 80%+ of users use visual builder

### Technical
- Page load time: < 2 seconds
- Autosave latency: < 500ms
- PDF generation: < 10 seconds

---

## 🔮 Future Enhancements

### Advanced Features
1. **Collaboration**
   - Real-time co-editing (WebSockets)
   - Comments and annotations
   - Version history

2. **Smart Suggestions**
   - AI-powered chart recommendations
   - Auto-insights from data
   - Template suggestions

3. **Data Connections**
   - Connect to live data sources
   - Auto-refresh schedules
   - Multiple CSV files per report

4. **Interactive Elements**
   - Filters and slicers
   - Drill-down capabilities
   - Hover tooltips

5. **Templates**
   - Pre-built report templates
   - Industry-specific layouts
   - Clone/duplicate reports

---

## 📝 Notes

### Why react-grid-layout?
- Battle-tested, 22k+ stars on GitHub
- Supports drag, drop, resize, responsive
- Works well with React
- SSR compatible for PDF generation

### Why Slate.js?
- Full control over rendering
- Extensible plugin architecture
- Better for custom Notion-like features
- Smaller bundle size than Draft.js

### Alternative: Lexical
- Facebook's new editor (used in Facebook Messenger)
- More modern, better TypeScript support
- Growing ecosystem
- Consider if Slate limitations found

---

## 🛠️ Development Setup

### Environment Variables
```env
# No new environment variables needed
# Uses existing R2 storage for images
```

### Testing Strategy
1. Unit tests: Widget components
2. Integration tests: Drag-and-drop flows
3. E2E tests: Full report creation workflow
4. Visual regression: PDF output consistency

---

## 📚 Resources & References

- **react-grid-layout**: https://github.com/react-grid-layout/react-grid-layout
- **Slate.js**: https://docs.slatejs.org/
- **Lexical**: https://lexical.dev/
- **Ant Design**: https://ant.design/ (already using)
- **Notion API**: https://developers.notion.com/ (for inspiration)
- **Looker Studio**: https://lookerstudio.google.com/ (for UX patterns)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Install dependencies and create basic grid layout component
