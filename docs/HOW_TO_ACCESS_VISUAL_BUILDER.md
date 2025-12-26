# How to Access the Visual Builder

## 🎨 Quick Start Guide

The **Visual Builder** is now integrated into the Social Media Reports system! Here's how to access and use it:

---

## Step-by-Step Instructions

### 1. Navigate to Social Media Reports
- Open your browser: `http://localhost:3001`
- Log in with credentials:
  - **Email**: `admin@monomi.id`
  - **Password**: `password123`
- Click on **Social Media Reports** in the sidebar menu

### 2. Create a New Report
- Click **"Create New Report"** button
- Fill in:
  - **Project**: Select from dropdown
  - **Title**: e.g., "January 2025 Campaign Report"
  - **Description**: Optional description
  - **Month**: Select month
  - **Year**: Select year
- Click **"Create Report"**

### 3. Add a Section with Data
- Click **"Add Section"** button
- Fill in section details:
  - **Section Title**: e.g., "Facebook Ads Performance"
  - **Description**: Optional

- **Upload CSV Data** (Choose one option):

  **Option A: Quick Test with Sample Data** (Recommended for first try)
  - Click one of the sample data buttons:
    - **"Load Social Media Sample"** - Facebook/Instagram ads data
    - **"Load Sales Sample"** - Sales performance data
    - **"Load Analytics Sample"** - Website analytics data

  **Option B: Upload Your Own CSV**
  - Click **"Select File"** button
  - Choose a CSV file from your computer
  - Select which columns to include in the report

- Click **"Add Section"**

### 4. Open the Visual Builder 🎯
Once your section is created, you'll see it in the report with action buttons:

- **Visual Builder** (Blue primary button) - **← THIS IS THE NEW FEATURE!**
- Edit Charts (Legacy editor)
- Remove (Delete section)
- Arrow buttons (Reorder)

**Click the "Visual Builder" button** to open the drag-and-drop interface!

---

## 🎨 Using the Visual Builder

### Main Interface Layout

```
┌────────────────────────────────────────────────────────────┐
│  [← Back]  Section Title       [Preview] [Save Layout]    │
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │               │
│ PALETTE  │         CANVAS                  │  PROPERTIES   │
│          │                                 │               │
│ Charts:  │   [Drag widgets here]          │  Selected:    │
│ • Line   │                                 │  Line Chart   │
│ • Bar    │   ┌─────────────┐              │               │
│ • Area   │   │ Line Chart  │              │  X-Axis: Date │
│ • Pie    │   │ [Chart Viz] │              │  Y-Axis:      │
│          │   └─────────────┘              │  • Reach      │
│ Content: │                                 │  • Clicks     │
│ • Metric │   ┌────┐  ┌────┐               │               │
│ • Text   │   │KPI │  │KPI │               │  [Update]     │
│ • Callout│   └────┘  └────┘               │               │
│ • Divider│                                 │               │
│          │                                 │               │
│ Data:    │                                 │               │
│ • Table  │                                 │               │
└──────────┴─────────────────────────────────┴───────────────┘
```

### Widget Types Available

#### 📊 Charts (4 types)
1. **Line Chart** - Time series, trends
2. **Bar Chart** - Comparisons, rankings
3. **Area Chart** - Volume over time
4. **Pie Chart** - Proportions, percentages

#### 📈 Content (4 types)
5. **Metric Card** - KPI with aggregation (sum, avg, count, min, max)
6. **Text Block** - Explanatory text (rich text in Phase 2)
7. **Callout Box** - Alerts (info, success, warning, error)
8. **Divider** - Visual separators (solid, dashed, dotted)

#### 📋 Data (1 type)
9. **Table Widget** - Data tables with column selection

### How to Build Your Report

#### A. Add Widgets
1. **Drag** widget from left palette
2. **Drop** onto canvas
3. Widget appears with default size

#### B. Configure Widgets
1. **Click** on a widget to select it
2. **Properties panel** appears on the right
3. **Configure** based on widget type:
   - **Charts**: Select X-axis, Y-axis columns
   - **Metrics**: Choose column and aggregation
   - **Text/Callout**: Enter content
   - **Table**: Select columns to display

#### C. Resize & Position
1. **Drag** widget to reposition
2. **Resize** using corner/edge handles
3. Grid snaps to 12 columns for alignment

#### D. Delete Widgets
1. **Click** widget to select
2. **Click** trash icon in widget header
3. Confirm deletion

#### E. Undo/Redo
- **Undo**: Revert last change
- **Redo**: Reapply undone change
- History tracked for all operations

#### F. Save Layout
1. Click **"Save Layout"** button
2. Layout saved to database
3. Success notification appears

#### G. Preview Mode
1. Click **"Preview"** toggle
2. Hides editing controls
3. Shows final report appearance

---

## 🎯 Example Workflow

### Creating a Facebook Ads Report

1. **Add Section** with sample social media data
2. **Open Visual Builder**
3. **Add widgets** in this order:

   a. **Top Row**: 3 Metric Cards
   - Drag "Metric Card" → Configure: Total Reach (Sum)
   - Drag "Metric Card" → Configure: Avg Engagement (Average)
   - Drag "Metric Card" → Configure: Total Clicks (Sum)

   b. **Middle Row**: Line Chart
   - Drag "Line Chart" → Configure:
     - X-Axis: Date
     - Y-Axis: Reach, Clicks, Impressions

   c. **Bottom Row**: Bar Chart
   - Drag "Bar Chart" → Configure:
     - X-Axis: Campaign
     - Y-Axis: Conversions

   d. **Add Text**: Insights
   - Drag "Text Block" → Write summary insights

   e. **Add Callout**: Recommendation
   - Drag "Callout Box" → Type: Success
   - Write: "Campaign X performed 25% better!"

4. **Save Layout**
5. **Go back** to report detail page
6. **Generate PDF** to see custom layout in action!

---

## 📥 PDF Generation

The PDF generator now respects your custom widget layouts!

1. Go back to **Report Detail** page
2. Click **"Generate PDF"** button
3. PDF includes:
   - Your custom widget layout
   - All charts rendered with Chart.js
   - Metric cards with calculated values
   - Text blocks and callouts
   - Data tables

**Note**: PDF layout follows reading order (top-to-bottom, left-to-right)

---

## 🔧 Troubleshooting

### Visual Builder Button Not Visible?
- Make sure you've added at least one section to the report
- The button appears in the section card's action area
- Look for the blue "Visual Builder" button with grid icon

### Can't Drag Widgets?
- Make sure you're not in Preview mode
- Check that the canvas area is visible
- Try clicking the widget in palette first, then dragging

### Configuration Not Saving?
- Click "Update" button in properties panel after changes
- Then click "Save Layout" button in toolbar
- Check browser console for errors

### Charts Not Showing?
- Verify your CSV has the columns you selected
- For line/bar/area: X-axis needs categories, Y-axis needs numbers
- For pie: Need name and value columns
- For metrics: Need numeric column

### Route Not Found?
- Verify route in browser: `/social-media-reports/:reportId/sections/:sectionId/builder`
- Check that both IDs are valid UUIDs
- Make sure backend is running on port 5000

---

## 🎓 Tips & Best Practices

### Layout Design
- **Start with metrics** at the top (KPIs first)
- **Use charts** for trends and comparisons
- **Add text** to explain insights
- **Use callouts** for key findings
- **End with data table** for details

### Widget Sizing
- **Metric Cards**: 3-4 columns wide works well
- **Charts**: 6-12 columns for readability
- **Text Blocks**: 12 columns (full width) for paragraphs
- **Tables**: 12 columns (full width)

### Color & Style
- Charts use predefined color palette (10 colors)
- Callout types: Info (blue), Success (green), Warning (orange), Error (red)
- Divider styles: Solid, Dashed, Dotted

### Performance
- Limit to 10-15 widgets per section for PDF performance
- Use metric cards instead of charts when possible (faster rendering)
- Tables auto-limit to 50 rows in PDF

---

## 🚀 What's Next (Phase 2 Features)

- **Rich Text Editor** with Slate.js (bold, italic, headings, lists)
- **Image Upload** to R2 storage
- **Report Templates** (pre-built layouts)
- **Widget Themes** (color schemes)
- **Advanced Filters** (date ranges, dynamic data)
- **Collaboration** (real-time editing)
- **AI Suggestions** (recommended visualizations)

---

## 📞 Need Help?

- Check browser console for errors (F12)
- Check backend logs: `docker compose -f docker-compose.dev.yml logs -f app`
- Review implementation docs: `DYNAMIC_BUILDER_IMPLEMENTATION_COMPLETE.md`
- Check plan: `DYNAMIC_REPORT_BUILDER_PLAN.md`

---

**Happy Report Building! 🎨📊**

The visual builder combines the best of Google Looker Studio, Google Slides, and Notion to give you complete control over your report layouts!
