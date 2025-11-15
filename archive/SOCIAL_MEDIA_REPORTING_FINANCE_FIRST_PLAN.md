# 🎯 Social Media Reporting System - Finance-First + Import-First Architecture
## Based on Actual Codebase Analysis & User Workflow Research

**Document Version:** 4.0 (VERIFIED & READY - Post-Analysis Update)
**Created:** 2025-11-08
**Updated:** 2025-11-09 (Verified Against Actual Codebase)
**Status:** ✅ APPROVED FOR IMPLEMENTATION

---

## 🔍 **VERIFICATION RESULTS (2025-11-09)**

### ✅ **Confirmed Facts from Actual Codebase:**

1. **CampaignDataImport EXISTS** in backend/prisma/schema.prisma
   - Already tracking imports with: fileName, recordCount, successCount, failureCount
   - Has status tracking: ImportStatus enum (COMPLETED, FAILED, ROLLED_BACK)
   - **Decision**: Keep for campaign-specific imports, add unified DataImport for project-level

2. **Campaign.projectId is OPTIONAL** (String?)
   - No breaking changes needed for existing campaigns
   - Form TODO exists: "Add Client and Project selectors" (line 52, 376)
   - **Decision**: Keep optional in DB, make required in UI form

3. **User Decisions:**
   - PDF Library: **Puppeteer** (full HTML/CSS support)
   - Timeline: **Flexible** (AI-powered, ~1-2 hours for full implementation)
   - Email: **Skip for MVP** (manual download only)
   - Priority: **Both Instagram + Facebook simultaneously**

### 📋 **Implementation Plan Adjustments:**

**Original Timeline (V3.0):** 4 weeks
**Realistic Timeline (V4.0):** ~2 hours with Claude Code AI implementation

**Why Faster:**
- AI can write all backend code simultaneously
- No human context switching overhead
- Parallel processing of frontend + backend
- Automated testing and validation

---

## 🚨 CRITICAL USER WORKFLOW INSIGHT

**Primary Data Entry Method**: CSV Import & Copy-Paste (90%+ of usage)
- Users export data from Meta Ads Manager, Instagram Insights, Facebook Page Insights
- They upload CSV files OR copy-paste from Excel/Google Sheets
- Manual data entry is RARE (only for corrections)

**Implications for Design:**
1. ✅ Import functionality must be PROMINENT on every page
2. ✅ Support multiple platform formats (Meta, Instagram, Facebook)
3. ✅ Copy-paste from clipboard (not just file upload)
4. ✅ Real-time validation and preview before import
5. ✅ Platform-specific templates and auto-detection
6. ✅ Bulk operations (import entire months at once)
7. ✅ Import history and audit trail

---

## 📊 **Current State (What You Have)**

### ✅ **Finance System (Complete & Comprehensive)**
- **Revenue Cycle**: Quotations → Invoices → Payments
- **Expense Management**: Full expense tracking with categories, approvals, budgets
- **Accounting**: Full double-entry system (GL, Journal Entries, Financial Statements)
- **Vendors**: Purchase orders, vendor invoices, accounts payable
- **Assets**: Fixed assets, depreciation schedules
- **Project Profitability**: Budget vs Actual, Gross/Net margins, Cost allocations

### ✅ **Social Media Ads System (Already Implemented)**
- **Campaigns**: Campaign management with platform integration
- **Daily Metrics**: CampaignDailyMetric (impressions, clicks, spend, CTR)
- **Monthly Reports**: CampaignMonthlyReport (aggregated metrics per campaign)
- **Data Import**: CSV import functionality
- **Content Calendar**: ContentCalendarItem with media attachments
- **Frontend Pages**: Campaigns, Campaign Analytics, Campaign Import, Content Calendar

### ❌ **Missing (The Gap)**
1. **Organic Social Media**: No Instagram/Facebook insights tracking
2. **Project-Level Reports**: CampaignMonthlyReport is campaign-centric, not project-centric
3. **Campaign → Expense Link**: No connection between campaign spend and expenses
4. **Unified Reporting**: No single report combining paid + organic + content
5. **Copy-Paste Import**: Only file upload supported, no clipboard paste
6. **Platform Templates**: No Meta/Instagram/Facebook-specific import templates
7. **Import Audit Trail**: No CampaignDataImport tracking in database

---

## 📋 **Platform-Specific CSV Formats (Real-World Data)**

### Meta Ads Manager Export Format
**How users get this data:**
1. Open Meta Ads Manager
2. Select campaign/ad sets
3. Click "Reports" → "Export Table Data"
4. Choose CSV or Excel format
5. Upload to our system OR copy-paste

**Standard Columns (Meta Ads Manager):**
```csv
Campaign name,Start date,End date,Amount spent (IDR),Impressions,Reach,Clicks (all),Results,CTR (all),CPC (all),CPM (cost per 1,000 impressions)
Summer Sale Campaign,2025-01-01,2025-01-31,25000000,1500000,1200000,12000,850,0.8,2083,16667
```

**Flexible Column Names (Our System Supports):**
- Campaign Name: `campaign_name`, `campaignName`, `Campaign name`, `Campaign Name`
- Date: `date`, `Date`, `DATE`, `Day`, `day`
- Spent: `spent`, `amountSpent`, `Amount spent`, `Amount Spent (IDR)`
- Impressions: `impressions`, `Impressions`, `IMPRESSIONS`
- Reach: `reach`, `Reach`, `REACH`
- Clicks: `clicks`, `Clicks`, `Clicks (all)`, `Link clicks`

**Auto-Detection Logic:**
- If CSV contains "Amount spent" → Meta Ads format
- If CSV contains "Campaign name" + "Impressions" + "Reach" → Paid ads
- If CSV contains date column → Time-series data

---

### Instagram Insights Export Format
**How users get this data:**
1. Open Meta Business Suite
2. Go to Insights → Content
3. Click "Export Data"
4. Select Instagram account, date range
5. Generate CSV report
6. Upload to our system OR copy-paste

**Standard Columns (Instagram Insights):**
```csv
Date,Followers,Impressions,Reach,Profile visits,Website clicks,Engagement (likes + comments + saves + shares)
2025-01-01,10450,15234,12890,1234,234,456
2025-01-02,10458,16542,13200,1345,245,478
```

**Flexible Column Names (Our System Supports):**
- Date: `date`, `Date`, `Day`, `day`
- Followers: `followers`, `Followers`, `Follower Count`
- Impressions: `impressions`, `Impressions`, `Total Impressions`
- Reach: `reach`, `Reach`, `Accounts reached`
- Profile Visits: `profileViews`, `Profile visits`, `Profile Visits`
- Engagement: `engagement`, `Engagement`, `Total Engagement`

**Auto-Detection Logic:**
- If CSV contains "Followers" + "Profile visits" → Instagram Insights
- If no "Amount spent" column → Organic (not paid)
- If daily data → Time-series insights

---

### Facebook Page Insights Export Format
**How users get this data:**
1. Open Meta Business Suite
2. Go to Insights → Page Performance
3. Export data as CSV
4. Upload to our system OR copy-paste

**Standard Columns (Facebook Page Insights):**
```csv
Date,Page likes,Daily Page Engaged Users,Daily Total Reach,Daily Total Impressions,Daily Page Views
2025-01-01,5234,234,12000,15000,890
2025-01-02,5240,245,12500,15600,920
```

**Auto-Detection Logic:**
- If CSV contains "Page likes" + "Page Engaged Users" → Facebook Page format
- If contains "Daily" prefix → Facebook reporting format

---

## 🔄 **Import Methods Supported**

### Method 1: CSV File Upload (Existing - Enhanced)
```
[Upload Button]
┌─────────────────────────────────┐
│  📁 Drag & Drop CSV/Excel       │
│     or click to browse          │
│                                 │
│  Supported: .csv, .xlsx, .xls  │
│  Max size: 50 MB                │
└─────────────────────────────────┘
```

### Method 2: Copy-Paste from Clipboard (NEW - Critical!)
```
[Paste from Clipboard]
┌─────────────────────────────────┐
│  📋 Paste data from Excel       │
│                                 │
│  1. Copy data from spreadsheet  │
│  2. Click here and Ctrl+V       │
│  3. We'll auto-detect format    │
└─────────────────────────────────┘

Internal: Tab-separated values (\t)
Row separator: Newline (\n)
Parse using: SheetClip or PapaParse
```

### Method 3: Manual Entry (Rare - Last Resort)
```
[+ Add Manual Entry]
For corrections or one-off data points
```

---

## 🏗️ **Proposed Solution: Extend Existing Finance System**

### Core Principle: **Finance Integration First, Operations Second**

```
┌─────────────────────────────────────────────────────┐
│  FINANCE LAYER (Existing - Core Business Logic)    │
├─────────────────────────────────────────────────────┤
│  Project (Hub)                                      │
│    ├─ Revenue: Quotations → Invoices → Payments ✅ │
│    ├─ Costs: Expenses → Journal Entries ✅         │
│    ├─ Profitability: Margins, Budget vs Actual ✅  │
│    └─ NEW: Campaign Expenses (COGS tracking)       │
│                                                     │
│  Expense (Enhanced)                                 │
│    ├─ Existing: Categories, Approvals, Budgets ✅  │
│    └─ NEW: campaignId link (for ad spend)          │
├─────────────────────────────────────────────────────┤
│  OPERATIONS LAYER (Existing + New)                 │
├─────────────────────────────────────────────────────┤
│  Paid Advertising (Existing) ✅                     │
│    ├─ Campaign                                      │
│    ├─ CampaignDailyMetric                          │
│    ├─ CampaignDataImport                           │
│    └─ ContentCalendarItem                          │
│                                                     │
│  Organic Social Media (NEW) ❌                      │
│    ├─ InstagramInsight (daily metrics)             │
│    └─ FacebookPageInsight (daily metrics)          │
│                                                     │
│  Deliverables (NEW) ❌                              │
│    └─ ProjectMonthlyReport (PDF for clients)       │
└─────────────────────────────────────────────────────┘
```

---

## 📊 **Financial Flow (How It Actually Works)**

### Example: Social Media Management Project - January 2025

#### 1. **Finance: Revenue Recognition**
```
Quotation Q-2025-001 (Approved)
Client: PT Example
Project: Social Media Management - Jan 2025

Line Items:
1. Campaign Management Fee          Rp  5,000,000
2. Ad Spend (pass-through)          Rp 25,000,000
3. Management Fee (10% of spend)    Rp  2,500,000
4. Content Creation (10 posts)      Rp  3,000,000
5. Monthly Report Preparation       Rp  1,000,000
                                    ─────────────
Total                               Rp 36,500,000

↓ (Quotation Approved)

Invoice INV-2025-001
Due: Feb 5, 2025
Total: Rp 36,500,000

Project.totalInvoicedAmount = Rp 36,500,000 ✅
```

#### 2. **Operations: Service Delivery**
```
Campaign "Summer Sale"
├─ Platform: Meta Ads
├─ Budget: Rp 25,000,000
├─ Daily Metrics:
│   ├─ Jan 1: Spent Rp 800,000, 50K impressions
│   ├─ Jan 2: Spent Rp 850,000, 52K impressions
│   └─ ... (31 days)
└─ Total Spent: Rp 24,500,000 ✅ (under budget!)

Instagram Organic (NEW)
├─ Jan 1: 10,450 followers, 15K impressions
├─ Jan 2: 10,458 followers, 16K impressions
└─ Jan 31: 10,695 followers (+ 245 growth!)

Content Calendar
├─ 10 posts published
├─ 5 posts scheduled for Feb
└─ All posts linked to project
```

#### 3. **Finance: Cost Recognition (CRITICAL)**
```
Expense EXP-2025-012
Category: COGS - Advertising (5-50100)
Description: "Meta Ads - Summer Sale Campaign"
Amount: Rp 24,500,000
Project: Social Media Mgmt - Jan 2025
Vendor: Meta Platforms
Status: Billable (pass-through)

NEW FIELD:
campaignId: "camp-summer-sale" ← Links to Campaign!

↓ (Auto Journal Entry)

Journal Entry:
Debit:  5-50100 COGS - Advertising  Rp 24,500,000
Credit: 2-10100 Accounts Payable    Rp 24,500,000

Project.totalDirectCosts += Rp 24,500,000 ✅
```

#### 4. **Finance: Profitability Analysis**
```
Project: Social Media Management - Jan 2025

Revenue:
  Invoiced:             Rp 36,500,000

Direct Costs (COGS):
  Ad Spend (linked):    Rp 24,500,000
  Designer Labor:       Rp  1,500,000
  Report Prep:          Rp    500,000
  Total Direct:         Rp 26,500,000

Gross Profit:           Rp 10,000,000
Gross Margin:           27.4% ✅

Indirect Costs:
  Tools (Hootsuite):    Rp    500,000
  PM Overhead:          Rp  1,500,000
  Total Indirect:       Rp  2,000,000

Net Profit:             Rp  8,000,000
Net Margin:             21.9% ✅

Status: PROFITABLE ✅
```

#### 5. **Deliverable: Monthly Report (NEW)**
```
ProjectMonthlyReport
Project: Social Media Mgmt - Jan 2025
Month: 1, Year: 2025

Data Sources:
✅ 1 campaign (Summer Sale)
✅ Instagram insights (31 days)
✅ Facebook page insights (31 days)
✅ 10 content posts

Generated PDF:
├─ Page 1: Executive Summary
├─ Page 2-3: Campaign Performance
│   • Total Spent: Rp 24.5M
│   • Total Reach: 1.5M
│   • Avg CTR: 0.8%
├─ Page 4: Instagram Organic
│   • Follower Growth: +245
│   • Engagement Rate: 4.2%
├─ Page 5: Facebook Page
│   • Page Likes: +120
├─ Page 6: Content Performance
│   • 10 posts published
│   • Top post: 2,500 engagements
└─ Page 7: Recommendations

Linked to Invoice: INV-2025-001
PDF URL: https://r2.../monthly-report-jan-2025.pdf
Status: SENT (Feb 5, 2025)
```

---

## 🗄️ **Database Changes (Minimal, Additive Only)**

### 1. **Enhance Existing Expense Model**
```prisma
model Expense {
  // ... existing fields ...

  // NEW: Link to campaign for ad spend tracking
  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])

  // This enables:
  // - Tracking which expenses are campaign-related
  // - Automatic project profitability calculations
  // - Finance → Operations bridge
}
```

### 2. **Add New Models (Organic Social Media)**
```prisma
// Daily Instagram organic performance
model InstagramInsight {
  id        String   @id @default(cuid())
  projectId String   // REQUIRED: Must belong to project
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  date      DateTime @db.Date

  // Account metrics
  followers       Int @default(0)
  followersChange Int @default(0)  // Daily net change
  following       Int @default(0)

  // Content performance
  impressions     Int @default(0)
  reach           Int @default(0)
  profileViews    Int @default(0)

  // Engagement
  likes     Int @default(0)
  comments  Int @default(0)
  shares    Int @default(0)
  saves     Int @default(0)

  // Website traffic
  websiteClicks Int @default(0)

  // Calculated
  engagementRate Float?  // (likes + comments + shares + saves) / reach * 100

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, date])  // One record per day
  @@index([projectId, date])
  @@map("instagram_insights")
}

// Daily Facebook page performance
model FacebookPageInsight {
  id        String   @id @default(cuid())
  projectId String   // REQUIRED
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  date      DateTime @db.Date

  // Page metrics
  pageLikes       Int @default(0)
  pageLikesChange Int @default(0)
  pageFollowers   Int @default(0)
  pageViews       Int @default(0)

  // Content performance
  pageImpressions Int @default(0)
  pageReach       Int @default(0)
  postEngagement  Int @default(0)

  // Post metrics (aggregate)
  postImpressions Int @default(0)
  postReach       Int @default(0)
  postClicks      Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, date])
  @@index([projectId, date])
  @@map("facebook_page_insights")
}
```

### 3. **Add Project-Level Monthly Report**
```prisma
// Monthly client deliverable (replaces campaign-centric reports)
model ProjectMonthlyReport {
  id        String  @id @default(cuid())
  projectId String  // REQUIRED: Project-centric
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Reporting period
  year  Int  // 2025
  month Int  // 1-12

  // What data to include (toggles)
  includeCampaigns  Boolean @default(true)
  includeInstagram  Boolean @default(true)
  includeFacebook   Boolean @default(true)
  includeContent    Boolean @default(true)

  // Report content (editable)
  executiveSummary String? @db.Text
  keyHighlights    String? @db.Text
  recommendations  String? @db.Text

  // Cached data snapshot (performance)
  metricsSnapshot Json?  // Aggregated metrics from all sources

  // PDF output
  pdfUrl      String?
  pdfKey      String?  // R2 storage key
  generatedAt DateTime?

  // Delivery tracking
  status  ReportStatus @default(DRAFT)
  sentAt  DateTime?
  sentTo  String?  // Email addresses

  // Finance link (IMPORTANT!)
  invoiceId String?  // Which invoice includes this deliverable
  invoice   Invoice? @relation(fields: [invoiceId], references: [id])

  // Audit
  createdBy String
  creator   User   @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, year, month])  // One report per month
  @@index([projectId, status])
  @@index([year, month])
  @@map("project_monthly_reports")
}

enum ReportStatus {
  DRAFT           // Being prepared
  PENDING_REVIEW  // Awaiting approval
  APPROVED        // Ready to send
  SENT            // Delivered to client
  ARCHIVED        // Historical record
}
```

### 4. **Enhance Project Model (Relations Only)**
```prisma
model Project {
  // ... all existing fields ...

  // NEW: Relations to organic social media
  instagramInsights     InstagramInsight[]
  facebookPageInsights  FacebookPageInsight[]
  monthlyReports        ProjectMonthlyReport[]

  // NEW: Social media account info
  instagramUsername String?
  instagramAccountId String?
  facebookPageId    String?
  facebookPageName  String?
}
```

### 5. **Enhance Campaign Model (Relations Only)**
```prisma
model Campaign {
  // ... all existing fields ...

  // NEW: Link to expenses (for financial tracking)
  expenses Expense[] // Ad spend expenses linked to this campaign
}
```

### 6. **Add Unified DataImport Model (Project-Level Imports)**

**NOTE:** CampaignDataImport already exists for campaign-specific imports.
This new model is for PROJECT-LEVEL imports (Instagram, Facebook organic data).

```prisma
// Unified import tracking for PROJECT-LEVEL data sources
// (CampaignDataImport stays for campaign-specific imports)
model DataImport {
  id              String       @id @default(cuid())

  // What was imported
  importType      ImportType   // CAMPAIGN_METRICS, INSTAGRAM_INSIGHTS, FACEBOOK_PAGE
  source          ImportSource @default(CSV_UPLOAD) // CSV_UPLOAD, CLIPBOARD_PASTE, API

  // Where it belongs
  projectId       String?
  project         Project?     @relation(fields: [projectId], references: [id])
  campaignId      String?
  campaign        Campaign?    @relation(fields: [campaignId], references: [id])

  // File information
  fileName        String?
  fileSize        Int?         // Bytes
  fileType        String?      // "text/csv", "application/vnd.ms-excel"

  // Processing results
  status          ImportStatus @default(PENDING)
  totalRows       Int          @default(0)
  successRows     Int          @default(0)
  failedRows      Int          @default(0)
  skippedRows     Int          @default(0)

  // Date range of imported data
  dataStartDate   DateTime?    @db.Date
  dataEndDate     DateTime?    @db.Date

  // Error tracking
  errors          Json?        // Array of {row, column, error, value}
  warnings        Json?        // Non-fatal issues

  // Column mapping used
  columnMapping   Json?        // Store detected column mapping

  // Audit
  importedBy      String
  importer        User         @relation(fields: [importedBy], references: [id])
  importedAt      DateTime     @default(now())

  // Processing time
  startedAt       DateTime     @default(now())
  completedAt     DateTime?
  durationMs      Int?         // Milliseconds

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([projectId, importType])
  @@index([campaignId])
  @@index([importedBy])
  @@index([importedAt])
  @@index([status])
  @@map("data_imports")
}

enum ImportType {
  CAMPAIGN_METRICS      // Paid campaign daily metrics
  INSTAGRAM_INSIGHTS    // Instagram organic performance
  FACEBOOK_PAGE         // Facebook page insights
  TIKTOK_ADS           // Future: TikTok ads (reserved)
  GOOGLE_ADS           // Future: Google Ads (reserved)
}

enum ImportSource {
  CSV_UPLOAD           // File upload (.csv, .xlsx)
  CLIPBOARD_PASTE      // Copy-paste from Excel/Sheets
  API                  // Direct API integration (future)
  MANUAL_ENTRY         // Individual manual entry
}

enum ImportStatus {
  PENDING              // Queued
  PROCESSING           // In progress
  COMPLETED            // All rows successful
  PARTIAL              // Some rows failed
  FAILED               // Complete failure
}
```

---

## 🎨 **Navigation & UX (Minimal Changes)**

### Current Navigation (Keep 95%)
```
✅ Dashboard              (existing)
✅ Projects               (existing - enhance)
✅ Calendar               (existing)
✅ Campaigns              (existing - enhance)
✅ Content Calendar       (existing)
✅ Quotations             (existing)
✅ Invoices               (existing)
✅ Clients                (existing)
✅ Vendors                (existing)
✅ Accounting (submenu)   (existing)
✅ Reports                (existing)
✅ Users                  (existing)
✅ Settings               (existing)
```

### Option 1: Add Submenu Under Campaigns
```
🚀 Campaigns (make it expandable)
  ├─ All Campaigns         (existing CampaignsPage)
  ├─ Campaign Analytics    (existing)
  ├─ Import Campaign Data  (existing)
  ├─ NEW: Instagram Insights
  └─ NEW: Facebook Page Insights
```

### Option 2: New Top-Level Item (Recommended)
```
Add: 📱 Social Analytics
  ├─ Paid Campaigns (link to existing)
  ├─ Instagram Insights (NEW)
  └─ Facebook Page Insights (NEW)
```

---

## 📄 **Enhanced Project Detail Page**

### Current Project Page + New Tabs

```
Project: Social Media Management - Jan 2025

Existing Tabs:
├─ Overview (existing)
├─ Budget (existing)
├─ Timeline (existing)

NEW Tabs:
├─ 💰 Financial Performance
│   ├─ Revenue: Quotations, Invoices, Payments
│   ├─ Costs: Expenses (with campaign breakdown)
│   ├─ Profitability: Margins, Budget vs Actual
│   └─ Quick Actions: View GL, Add Expense
│
├─ 🚀 Marketing Activities
│   ├─ Paid Campaigns (3 active)
│   │   → View all campaigns for this project
│   │   → Total spend: Rp 24.5M
│   ├─ Instagram Organic
│   │   → Follower growth: +245
│   │   → Engagement rate: 4.2%
│   ├─ Facebook Page
│   │   → Page likes: +120
│   └─ Content Calendar
│       → 10 posts published
│       → 5 posts scheduled
│
└─ 📄 Monthly Reports
    ├─ Report Cards (Jan 2025, Dec 2024, ...)
    ├─ [+ Generate New Report] button
    └─ Status filters: Draft | Sent | Archived
```

### Financial Performance Tab (Detailed Layout)
```
┌────────────────────────────────────────────────┐
│ Financial Performance                          │
├────────────────────────────────────────────────┤
│ Revenue Summary:                               │
│  ┌──────────────┬──────────────┬─────────────┐│
│  │ Quoted       │ Invoiced     │ Paid        ││
│  │ Rp 36.5M     │ Rp 36.5M     │ Rp 36.5M ✅ ││
│  └──────────────┴──────────────┴─────────────┘│
│                                                │
│ Cost Breakdown:                                │
│  Direct Costs (COGS):                          │
│  • Campaign Ad Spend       Rp 24,500,000       │
│    → Linked to "Summer Sale" campaign         │
│  • Designer Labor          Rp  1,500,000       │
│  • Report Preparation      Rp    500,000       │
│  ─────────────────────────────────────────     │
│  Total Direct Costs        Rp 26,500,000       │
│                                                │
│  Indirect Costs:                               │
│  • Tools (Hootsuite)       Rp    500,000       │
│  • PM Overhead             Rp  1,500,000       │
│  ─────────────────────────────────────────     │
│  Total Indirect Costs      Rp  2,000,000       │
│                                                │
│ Profitability:                                 │
│  ┌──────────────┬──────────────┬─────────────┐│
│  │ Gross Profit │ Net Profit   │ Net Margin  ││
│  │ Rp 10M       │ Rp 8M        │ 21.9% ✅    ││
│  └──────────────┴──────────────┴─────────────┘│
│                                                │
│ Quick Actions:                                 │
│  [View GL Entries] [Add Expense]               │
│  [View Invoice] [Download P&L Report]          │
└────────────────────────────────────────────────┘
```

### Marketing Activities Tab (Detailed Layout)
```
┌────────────────────────────────────────────────┐
│ Marketing Activities                           │
├────────────────────────────────────────────────┤
│ 🚀 Paid Campaigns (3 active)                   │
│  ┌──────────────────────────────────────────┐ │
│  │ Campaign Name     │ Spent    │ Results   │ │
│  ├──────────────────┼──────────┼───────────┤ │
│  │ Summer Sale      │ Rp 24.5M │ 1.5M reach│ │
│  │ Brand Awareness  │ Rp  8.5M │ 500K reach│ │
│  │ Conversion Test  │ Rp  2.0M │ 150 leads │ │
│  └──────────────────┴──────────┴───────────┘ │
│  [View All Campaigns] [Import Metrics]        │
│                                                │
│ 📸 Instagram Organic Performance              │
│  ┌──────────────────────────────────────────┐ │
│  │ KPIs (Last 30 Days):                     │ │
│  │ • Follower Growth:      +245 (↑ 2.4%)   │ │
│  │ • Avg Engagement Rate:  4.2%             │ │
│  │ • Total Impressions:    85,000           │ │
│  │ • Profile Views:        12,500           │ │
│  └──────────────────────────────────────────┘ │
│  [View Detailed Analytics] [Import Data]      │
│                                                │
│ 👍 Facebook Page Performance                  │
│  ┌──────────────────────────────────────────┐ │
│  │ KPIs (Last 30 Days):                     │ │
│  │ • Page Likes Growth:    +120 (↑ 1.2%)   │ │
│  │ • Total Reach:          65,000           │ │
│  │ • Post Engagement:      3,200            │ │
│  │ • Page Views:           8,500            │ │
│  └──────────────────────────────────────────┘ │
│  [View Detailed Analytics] [Import Data]      │
│                                                │
│ 📅 Content Calendar                           │
│  • 10 posts published this month              │
│  • 5 posts scheduled for next month           │
│  [View Content Calendar]                       │
└────────────────────────────────────────────────┘
```

### Monthly Reports Tab (Detailed Layout)
```
┌────────────────────────────────────────────────┐
│ Monthly Reports                                │
│ [+ Generate New Report]                        │
├────────────────────────────────────────────────┤
│ Filter: [All ▼] [2025 ▼]                      │
├────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┐           │
│ │ 📄 January 2025                  │           │
│ │ Status: ✅ Sent (Feb 5, 2025)    │           │
│ │ Sent to: client@example.com      │           │
│ │                                  │           │
│ │ Included Data:                   │           │
│ │ ✅ 3 campaigns (Rp 35M spent)    │           │
│ │ ✅ Instagram (+245 followers)    │           │
│ │ ✅ Facebook (+120 page likes)    │           │
│ │ ✅ 10 content posts              │           │
│ │                                  │           │
│ │ Linked to: Invoice #INV-2025-001│           │
│ │                                  │           │
│ │ [View PDF] [Resend] [Download]  │           │
│ └──────────────────────────────────┘           │
│                                                │
│ ┌──────────────────────────────────┐           │
│ │ 📄 December 2024                 │           │
│ │ Status: ✅ Sent (Jan 5, 2025)    │           │
│ │ [View PDF] [Download]            │           │
│ └──────────────────────────────────┘           │
│                                                │
│ ┌──────────────────────────────────┐           │
│ │ 📄 November 2024                 │           │
│ │ Status: 📦 Archived              │           │
│ │ [View PDF]                       │           │
│ └──────────────────────────────────┘           │
└────────────────────────────────────────────────┘
```

---

## 📊 **REVISED Implementation Plan (AI-Powered, ~2 Hours Total)**

### **Phase 1: Database Schema (15 minutes)**

**Tasks:**
1. ✅ Add `campaignId` to Expense model
2. ✅ Add InstagramInsight model (daily metrics)
3. ✅ Add FacebookPageInsight model (daily metrics)
4. ✅ Add ProjectMonthlyReport model (deliverables)
5. ✅ Add DataImport model (project-level audit trail)
6. ✅ Add social media fields to Project model
7. ✅ Update relations (expenses, campaigns, projects)
8. ✅ Generate migration: `20250109_add_social_media_insights_and_reports.sql`
9. ✅ Apply migration in Docker container

### **Phase 2: Backend Infrastructure (30 minutes)**

**Tasks:**
1. ✅ Install dependencies: `papaparse`, `handlebars`, `puppeteer`, `@types/papaparse`
2. ✅ CSV/Clipboard parser utilities (platform auto-detection)
3. ✅ Instagram insights backend module (CRUD + import APIs)
4. ✅ Facebook insights backend module (CRUD + import APIs)
5. ✅ ProjectMonthlyReports module (generate, aggregate, PDF)
6. ✅ Puppeteer PDF service with Indonesian template
7. ✅ Update app.module.ts with new modules

**Backend Shared Services:**
```typescript
// backend/src/common/utils/csv-parser.util.ts
export class CsvParserUtil {
  // Parse CSV with flexible column mapping
  static parseFlexible(csvData: string, columnMappings: ColumnMapping[]): ParsedData

  // Auto-detect platform format
  static detectPlatformFormat(headers: string[]): PlatformFormat

  // Validate data against schema
  static validate(rows: any[], schema: ValidationSchema): ValidationResult

  // Calculate metrics (CTR, engagement rate, etc.)
  static calculateMetrics(row: any): CalculatedMetrics
}

// backend/src/common/utils/clipboard-parser.util.ts
export class ClipboardParserUtil {
  // Parse tab-separated clipboard data
  static parseTabSeparated(text: string): string[][]

  // Convert to CSV format
  static toCSV(data: string[][]): string

  // Detect headers and data rows
  static detectHeaders(data: string[][]): { headers: string[], dataRows: string[][] }
}

// Supported Platform Formats:
enum PlatformFormat {
  META_ADS_MANAGER    // "Amount spent", "Campaign name"
  INSTAGRAM_INSIGHTS  // "Followers", "Profile visits"
  FACEBOOK_PAGE       // "Page likes", "Daily Page Engaged Users"
  GENERIC_CAMPAIGN    // Fallback generic format
  UNKNOWN             // Cannot detect
}
```

#### Backend Import APIs (2 days)
```
POST   /projects/:id/instagram-insights/import
  Body: { source: 'CSV_UPLOAD' | 'CLIPBOARD_PASTE', data: string | File }
  Response: DataImport record with validation results

GET    /projects/:id/instagram-insights
  Query: ?startDate=2025-01-01&endDate=2025-01-31
  Response: InstagramInsight[]

GET    /projects/:id/instagram-insights/summary
  Response: { followerGrowth, avgEngagementRate, totalImpressions, ... }

POST   /projects/:id/facebook-insights/import
  Similar to Instagram

GET    /projects/:id/imports
  Query: ?type=INSTAGRAM_INSIGHTS&status=COMPLETED
  Response: DataImport[] (import history)

GET    /imports/:importId
  Response: DataImport (detailed import record with errors)
```

**Deliverables:**
- ✅ Migration file: `20250108_add_social_media_and_imports.sql`
- ✅ CSV/Clipboard parsing utilities
- ✅ Platform auto-detection logic
- ✅ Backend modules: instagram-insights, facebook-insights, data-imports
- ✅ API endpoints documented in Swagger
- ✅ Unit tests for parsers and import services

---

### **Phase 3: Frontend Components (45 minutes)**

**Tasks:**
1. ✅ Add Project selector to CampaignFormPage (fix TODO)
2. ✅ Create InstagramInsightsPage with import wizard
3. ✅ Create FacebookPageInsightsPage with import wizard
4. ✅ Build BulkDataImportWizard component (clipboard paste + CSV)
5. ✅ Enhance ProjectDetailPage with Financial Performance tab
6. ✅ Enhance ProjectDetailPage with Marketing Activities tab
7. ✅ Create ProjectMonthlyReportsTab with report cards
8. ✅ Create ReportGenerationWizard (5-step flow)
9. ✅ Add routes to App.tsx and navigation menu
10. ✅ Create services: instagram-insights.ts, facebook-insights.ts, project-monthly-reports.ts

### **Phase 4: PDF Template & Testing (30 minutes)**

**Tasks:**
1. ✅ Design Indonesian PDF template (Handlebars)
2. ✅ Generate sample charts (followers, spend trends)
3. ✅ Test PDF generation with Puppeteer
4. ✅ Test clipboard paste import flow
5. ✅ Test report generation wizard end-to-end
6. ✅ Verify all API endpoints working
7. ✅ Check Financial Performance tab calculations
8. ✅ Smoke test all new pages

**PDF Template Structure:**
├── project-monthly-reports.controller.ts
├── project-monthly-reports.service.ts
├── dto/
│   ├── generate-report.dto.ts
│   └── update-report.dto.ts
└── templates/
    └── monthly-report-indonesian.hbs
```

**Services:**
```typescript
class ProjectMonthlyReportsService {
  // Core CRUD
  async create(projectId, dto): ProjectMonthlyReport
  async findByProject(projectId, filters): ProjectMonthlyReport[]
  async findOne(reportId): ProjectMonthlyReport
  async update(reportId, dto): ProjectMonthlyReport

  // Report Generation
  async generateReport(projectId, year, month, options): ProjectMonthlyReport
  async regeneratePDF(reportId): ProjectMonthlyReport

  // Data Aggregation
  async aggregateCampaignData(projectId, startDate, endDate): CampaignMetrics
  async aggregateInstagramData(projectId, startDate, endDate): InstagramMetrics
  async aggregateFacebookData(projectId, startDate, endDate): FacebookMetrics
  async aggregateContentData(projectId, startDate, endDate): ContentMetrics

  // PDF Generation
  async generatePDF(report): { pdfUrl, pdfKey }

  // Delivery
  async sendReport(reportId, recipients): EmailResult
}
```

**PDF Generation Service:**
```typescript
// backend/src/modules/pdf/monthly-report-pdf.service.ts

class MonthlyReportPdfService {
  async generate(report: ProjectMonthlyReport): Promise<Buffer> {
    // 1. Fetch aggregated data
    const metrics = JSON.parse(report.metricsSnapshot)

    // 2. Generate charts as base64 images
    const followerChart = await this.generateFollowerGrowthChart(metrics.instagram)
    const spendChart = await this.generateCampaignSpendChart(metrics.campaigns)
    const engagementChart = await this.generateEngagementChart(metrics)

    // 3. Render HTML template (Indonesian)
    const html = await this.renderTemplate('monthly-report-indonesian', {
      project: report.project,
      report,
      metrics,
      charts: { followerChart, spendChart, engagementChart },
      formatCurrency: (amount) => `Rp ${amount.toLocaleString('id-ID')}`,
      formatNumber: (num) => num.toLocaleString('id-ID'),
      formatDate: (date) => dayjs(date).locale('id').format('DD MMMM YYYY')
    })

    // 4. Convert to PDF using Puppeteer
    const pdf = await this.htmlToPdf(html, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    })

    // 5. Upload to R2
    const { url, key } = await this.uploadToR2(
      pdf,
      `reports/${report.projectId}/${report.year}-${report.month}.pdf`
    )

    return { pdf, url, key }
  }
}
```

**API Endpoints:**
```
POST   /projects/:id/reports/generate
  Body: { year, month, includeCampaigns, includeInstagram, includeFacebook,
          executiveSummary, recommendations }
  Response: ProjectMonthlyReport

GET    /projects/:id/reports
  Query: ?year=2025&month=1&status=SENT
  Response: ProjectMonthlyReport[]

GET    /projects/:id/reports/:reportId
  Response: ProjectMonthlyReport

PUT    /projects/:id/reports/:reportId
  Body: { executiveSummary, recommendations, status }
  Response: ProjectMonthlyReport

POST   /projects/:id/reports/:reportId/regenerate-pdf
  Response: ProjectMonthlyReport (with new PDF)

POST   /projects/:id/reports/:reportId/send
  Body: { recipients: ['client@example.com'] }
  Response: { success, sentAt }

GET    /projects/:id/reports/:reportId/pdf
  Response: PDF file (binary)
```

**PDF Template Structure:**
```handlebars
<!-- templates/monthly-report-indonesian.hbs -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Bulanan - {{report.month}}/{{report.year}}</title>
  <style>
    /* Indonesian-optimized PDF styling */
    body {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      color: #1f2937;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .kpi-card {
      border: 1px solid #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      background: #f9fafb;
    }
    .chart-container {
      margin: 20px 0;
      text-align: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <!-- Page 1: Cover & Executive Summary -->
  <div class="page">
    <div class="header">
      <img src="{{company.logo}}" alt="Logo" style="height: 60px;">
      <h1>Laporan Kinerja Media Sosial</h1>
      <h2>{{project.description}}</h2>
      <p style="font-size: 18px;">
        Periode: {{formatMonthYear report.month report.year}}
      </p>
      <p>Klien: {{project.client.name}}</p>
    </div>

    <div class="executive-summary" style="padding: 40px;">
      <h2>Ringkasan Eksekutif</h2>
      {{{report.executiveSummary}}}
    </div>

    <div class="highlights" style="padding: 0 40px 40px;">
      <h2>Sorotan Utama</h2>
      <ul style="font-size: 16px; line-height: 2;">
        {{#each highlights}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
  </div>

  <!-- Page 2-3: Campaign Performance -->
  {{#if metrics.campaigns}}
  <div class="page" style="padding: 40px; page-break-before: always;">
    <h2>Kinerja Kampanye Iklan</h2>

    <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Total Pengeluaran</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{formatCurrency metrics.campaigns.totalSpent}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Total Impresi</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{formatNumber metrics.campaigns.totalImpressions}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Rata-rata CTR</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{metrics.campaigns.avgCtr}}%
        </div>
      </div>
    </div>

    <div class="chart-container">
      <h3>Pengeluaran Iklan per Hari</h3>
      <img src="{{charts.spendChart}}" alt="Campaign Spend Chart" style="max-width: 100%;">
    </div>

    <h3 style="margin-top: 40px;">Detail Kampanye</h3>
    <table>
      <thead>
        <tr>
          <th>Nama Kampanye</th>
          <th>Pengeluaran</th>
          <th>Impresi</th>
          <th>Klik</th>
          <th>CTR</th>
        </tr>
      </thead>
      <tbody>
        {{#each metrics.campaigns.details}}
        <tr>
          <td>{{this.name}}</td>
          <td>{{formatCurrency this.spent}}</td>
          <td>{{formatNumber this.impressions}}</td>
          <td>{{formatNumber this.clicks}}</td>
          <td>{{this.ctr}}%</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  {{/if}}

  <!-- Page 4: Instagram Insights -->
  {{#if metrics.instagram}}
  <div class="page" style="padding: 40px; page-break-before: always;">
    <h2>Kinerja Instagram (Organik)</h2>

    <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Pertumbuhan Pengikut</div>
        <div style="font-size: 28px; font-weight: 700; color: #10b981;">
          +{{formatNumber metrics.instagram.followerGrowth}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Total Impresi</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{formatNumber metrics.instagram.totalImpressions}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Engagement Rate</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{metrics.instagram.avgEngagementRate}}%
        </div>
      </div>
    </div>

    <div class="chart-container">
      <h3>Pertumbuhan Pengikut</h3>
      <img src="{{charts.followerChart}}" alt="Follower Growth Chart" style="max-width: 100%;">
    </div>
  </div>
  {{/if}}

  <!-- Page 5: Facebook Page -->
  {{#if metrics.facebook}}
  <div class="page" style="padding: 40px; page-break-before: always;">
    <h2>Kinerja Halaman Facebook (Organik)</h2>

    <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0;">
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Pertumbuhan Suka Halaman</div>
        <div style="font-size: 28px; font-weight: 700; color: #10b981;">
          +{{formatNumber metrics.facebook.pageLikesGrowth}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Total Jangkauan</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{formatNumber metrics.facebook.totalReach}}
        </div>
      </div>
      <div class="kpi-card">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">Engagement</div>
        <div style="font-size: 28px; font-weight: 700; color: #1f2937;">
          {{formatNumber metrics.facebook.totalEngagement}}
        </div>
      </div>
    </div>
  </div>
  {{/if}}

  <!-- Page 6: Content Performance -->
  {{#if metrics.content}}
  <div class="page" style="padding: 40px; page-break-before: always;">
    <h2>Kinerja Konten</h2>

    <p style="font-size: 16px; margin: 20px 0;">
      Total konten yang dipublikasikan: <strong>{{metrics.content.totalPosts}} post</strong>
    </p>

    <h3>Top 5 Konten Terbaik</h3>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Judul</th>
          <th>Platform</th>
          <th>Engagement</th>
        </tr>
      </thead>
      <tbody>
        {{#each metrics.content.topPosts}}
        <tr>
          <td>{{formatDate this.publishedAt}}</td>
          <td>{{this.title}}</td>
          <td>{{this.platform}}</td>
          <td>{{formatNumber this.engagement}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  {{/if}}

  <!-- Page 7: Recommendations -->
  <div class="page" style="padding: 40px; page-break-before: always;">
    <h2>Rekomendasi</h2>
    {{{report.recommendations}}}

    <div style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px;">
        Laporan ini dihasilkan secara otomatis oleh sistem Monomi<br>
        Tanggal: {{formatDate report.generatedAt}}<br>
        Project: {{project.description}}<br>
        Periode: {{formatMonthYear report.month report.year}}
      </p>
    </div>
  </div>
</body>
</html>
```

**Deliverables:**
- ✅ ProjectMonthlyReports backend module
- ✅ PDF generation service with Indonesian template
- ✅ Chart generation utilities
- ✅ R2 storage integration
- ✅ Email delivery service
- ✅ API endpoints documented
- ✅ Unit and integration tests

---

### **Week 3: Frontend - Import-First UI Components**
**Goal:** Build import wizards and clipboard paste functionality

#### 1. **Shared Import Components** (2 days)
Create reusable import components that work for all platforms:

```typescript
// frontend/src/components/import/BulkDataImportWizard.tsx

export const BulkDataImportWizard: React.FC<{
  importType: ImportType
  projectId: string
  onComplete: (importId: string) => void
}> = ({ importType, projectId, onComplete }) => {
  const [step, setStep] = useState(0)
  const [importSource, setImportSource] = useState<'CSV_UPLOAD' | 'CLIPBOARD_PASTE'>()
  const [parsedData, setParsedData] = useState<ParsedRow[]>()
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const steps = [
    { title: 'Choose Import Method', icon: <SelectOutlined /> },
    { title: 'Upload/Paste Data', icon: <InboxOutlined /> },
    { title: 'Map Columns', icon: <TableOutlined /> },
    { title: 'Preview & Validate', icon: <EyeOutlined /> },
    { title: 'Import', icon: <RocketOutlined /> },
  ]

  return (
    <Modal open={true} width={1000} footer={null}>
      <Steps current={step} items={steps} />

      {/* Step 0: Choose Method */}
      {step === 0 && (
        <ChooseImportMethodStep
          onSelect={(method) => {
            setImportSource(method)
            setStep(1)
          }}
        />
      )}

      {/* Step 1: Upload or Paste */}
      {step === 1 && importSource === 'CSV_UPLOAD' && (
        <UploadCSVStep
          onUpload={(data) => {
            setParsedData(data)
            setStep(2)
          }}
        />
      )}

      {step === 1 && importSource === 'CLIPBOARD_PASTE' && (
        <ClipboardPasteStep
          onPaste={(data) => {
            setParsedData(data)
            setStep(2)
          }}
        />
      )}

      {/* Step 2: Column Mapping (Auto or Manual) */}
      {step === 2 && (
        <ColumnMappingStep
          parsedData={parsedData}
          importType={importType}
          onMapped={(mappedData) => {
            setParsedData(mappedData)
            setStep(3)
          }}
        />
      )}

      {/* Step 3: Preview & Validate */}
      {step === 3 && (
        <PreviewValidateStep
          data={parsedData}
          errors={validationErrors}
          onConfirm={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: Execute Import */}
      {step === 4 && (
        <ExecuteImportStep
          projectId={projectId}
          importType={importType}
          data={parsedData}
          onComplete={onComplete}
        />
      )}
    </Modal>
  )
}
```

**Clipboard Paste Component (CRITICAL!):**
```typescript
// frontend/src/components/import/ClipboardPasteStep.tsx

export const ClipboardPasteStep: React.FC<{
  onPaste: (data: ParsedRow[]) => void
}> = ({ onPaste }) => {
  const [pastedText, setPastedText] = useState('')
  const [parsing, setParsing] = useState(false)

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    setPastedText(text)

    // Parse tab-separated data
    setParsing(true)
    try {
      const lines = text.split('\n').filter(l => l.trim())
      const rows = lines.map(line => line.split('\t'))

      // Detect headers (first row)
      const headers = rows[0]
      const dataRows = rows.slice(1)

      // Convert to objects
      const parsed = dataRows.map((row, index) => {
        const obj: any = { rowNumber: index + 2 }
        headers.forEach((header, i) => {
          obj[header.trim()] = row[i]?.trim() || ''
        })
        return obj
      })

      onPaste(parsed)
    } catch (error) {
      message.error('Failed to parse pasted data')
    } finally {
      setParsing(false)
    }
  }

  return (
    <Card>
      <Alert
        message="Paste Data from Spreadsheet"
        description={
          <div>
            <p><strong>How to use:</strong></p>
            <ol>
              <li>Open your spreadsheet (Excel, Google Sheets, etc.)</li>
              <li>Select the data you want to import (including headers)</li>
              <li>Copy (Ctrl+C or Cmd+C)</li>
              <li>Click in the box below and paste (Ctrl+V or Cmd+V)</li>
            </ol>
            <p><strong>Tip:</strong> Make sure to include the header row!</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <TextArea
        rows={15}
        placeholder="Click here and paste your data (Ctrl+V or Cmd+V)..."
        onPaste={handlePaste}
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      />

      {parsing && <Spin style={{ marginTop: 16 }} />}

      {pastedText && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            Detected {pastedText.split('\n').length} rows
          </Text>
        </div>
      )}
    </Card>
  )
}
```

#### 2. **Instagram Insights Page** (1.5 days)
**Route:** `/social-analytics/instagram`

```typescript
// frontend/src/pages/InstagramInsightsPage.tsx

export const InstagramInsightsPage: React.FC = () => {
  const [importWizardVisible, setImportWizardVisible] = useState(false)
  const [projectId, setProjectId] = useState<string>()
  const [insights, setInsights] = useState<InstagramInsight[]>([])
  const [summary, setSummary] = useState<InstagramSummary>()

  return (
    <div>
      <PageHeader
        title="Instagram Insights (Organic)"
        extra={[
          <Button
            key="template"
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setImportWizardVisible(true)}
            size="large"
          >
            Import Data
          </Button>
        ]}
      />

      {/* Import History Card */}
      <Card title="Recent Imports" style={{ marginBottom: 16 }}>
        <List
          dataSource={imports}
          renderItem={(imp) => (
            <List.Item>
              <List.Item.Meta
                avatar={imp.source === 'CLIPBOARD_PASTE' ? <ClipboardOutlined /> : <FileExcelOutlined />}
                title={`${imp.successRows} rows imported`}
                description={`${dayjs(imp.importedAt).fromNow()} • ${imp.source === 'CLIPBOARD_PASTE' ? 'Pasted from clipboard' : imp.fileName}`}
              />
              <Tag color={imp.status === 'COMPLETED' ? 'success' : 'error'}>
                {imp.status}
              </Tag>
            </List.Item>
          )}
        />
      </Card>

      {/* Filter & Project Selection */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="Select Project"
            style={{ width: 300 }}
            onChange={setProjectId}
            showSearch
          >
            {projects.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.description}
              </Select.Option>
            ))}
          </Select>

          <RangePicker
            defaultValue={[dayjs().subtract(30, 'days'), dayjs()]}
            onChange={handleDateChange}
          />
        </Space>
      </Card>

      {/* KPI Cards, Charts, Table... (same as before) */}

      {/* Import Wizard */}
      {importWizardVisible && (
        <BulkDataImportWizard
          importType="INSTAGRAM_INSIGHTS"
          projectId={projectId}
          onComplete={(importId) => {
            setImportWizardVisible(false)
            refetchData()
          }}
        />
      )}
    </div>
  )
}
```

#### 3. **Facebook Page Insights** (1 day)
Similar to Instagram, with copy-paste and CSV import.

#### 4. **Platform-Specific Templates** (0.5 days)
Create downloadable templates for each platform:

```typescript
// frontend/src/utils/template-generator.ts

export const downloadInstagramTemplate = () => {
  const template = [
    {
      date: '2025-01-01',
      followers: 10450,
      impressions: 15234,
      reach: 12890,
      profile_visits: 1234,
      website_clicks: 234,
      likes: 300,
      comments: 45,
      shares: 20,
      saves: 91,
    },
    {
      date: '2025-01-02',
      followers: 10458,
      impressions: 16542,
      reach: 13200,
      profile_visits: 1345,
      website_clicks: 245,
      likes: 320,
      comments: 48,
      shares: 22,
      saves: 88,
    },
  ]

  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Instagram Insights')
  XLSX.writeFile(wb, 'instagram_insights_template.xlsx')
}
```

#### 3. **Services**
```typescript
// frontend/src/services/instagram-insights.ts

export const instagramInsightsService = {
  getInsights: (projectId: string, filters?: {
    startDate?: string
    endDate?: string
  }): Promise<InstagramInsight[]> => {
    return api.get(`/projects/${projectId}/instagram-insights`, { params: filters })
  },

  getSummary: (projectId: string, startDate: string, endDate: string): Promise<InstagramSummary> => {
    return api.get(`/projects/${projectId}/instagram-insights/summary`, {
      params: { startDate, endDate }
    })
  },

  importCSV: (projectId: string, file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/projects/${projectId}/instagram-insights/bulk`, formData)
  },

  exportToExcel: (projectId: string, filters?: any): Promise<Blob> => {
    return api.get(`/projects/${projectId}/instagram-insights/export`, {
      params: filters,
      responseType: 'blob'
    })
  }
}

// frontend/src/services/facebook-insights.ts
// Similar structure

// frontend/src/services/project-monthly-reports.ts
export const projectMonthlyReportsService = {
  getReports: (projectId: string): Promise<ProjectMonthlyReport[]> => {
    return api.get(`/projects/${projectId}/reports`)
  },

  generateReport: (projectId: string, data: GenerateReportDto): Promise<ProjectMonthlyReport> => {
    return api.post(`/projects/${projectId}/reports/generate`, data)
  },

  sendReport: (projectId: string, reportId: string, recipients: string[]): Promise<void> => {
    return api.post(`/projects/${projectId}/reports/${reportId}/send`, { recipients })
  },

  downloadPDF: (projectId: string, reportId: string): Promise<Blob> => {
    return api.get(`/projects/${projectId}/reports/${reportId}/pdf`, {
      responseType: 'blob'
    })
  }
}
```

#### 4. **Types**
```typescript
// frontend/src/types/instagram-insights.ts

export interface InstagramInsight {
  id: string
  projectId: string
  date: string
  followers: number
  followersChange: number
  following: number
  impressions: number
  reach: number
  profileViews: number
  likes: number
  comments: number
  shares: number
  saves: number
  websiteClicks: number
  engagementRate: number
  createdAt: string
  updatedAt: string
}

export interface InstagramSummary {
  followerGrowth: number
  followerGrowthPercent: number
  avgEngagementRate: number
  totalImpressions: number
  totalReach: number
  totalProfileViews: number
  totalWebsiteClicks: number
}

// Similar for FacebookPageInsight, ProjectMonthlyReport
```

**Deliverables:**
- ✅ Instagram Insights page with charts and table
- ✅ Facebook Insights page with charts and table
- ✅ CSV import modals
- ✅ Services and types
- ✅ Excel export functionality

---

### **Week 4: Frontend - Project Enhancements**
**Goal:** Integrate everything into Project page

#### 1. **Enhance ProjectDetailPage**
```typescript
// frontend/src/pages/ProjectDetailPage.tsx

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project>()

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <InfoCircleOutlined />,
      children: <ProjectOverviewTab project={project} />
    },
    {
      key: 'budget',
      label: 'Budget',
      icon: <DollarOutlined />,
      children: <ProjectBudgetTab project={project} />
    },
    {
      key: 'timeline',
      label: 'Timeline',
      icon: <ClockCircleOutlined />,
      children: <ProjectTimelineTab project={project} />
    },
    // NEW TABS
    {
      key: 'financial',
      label: 'Financial Performance',
      icon: <DollarCircleOutlined />,
      children: <ProjectFinancialTab project={project} />
    },
    {
      key: 'marketing',
      label: 'Marketing Activities',
      icon: <RocketOutlined />,
      children: <ProjectMarketingTab project={project} />
    },
    {
      key: 'reports',
      label: 'Monthly Reports',
      icon: <FileTextOutlined />,
      children: <ProjectMonthlyReportsTab project={project} />
    }
  ]

  return (
    <div>
      <PageHeader
        title={project?.description}
        subTitle={`Project #${project?.number}`}
        extra={[
          <Button key="edit" icon={<EditOutlined />}>Edit</Button>
        ]}
      />

      <Tabs items={tabs} defaultActiveKey="overview" />
    </div>
  )
}
```

#### 2. **Financial Performance Tab**
```typescript
// frontend/src/components/project-tabs/ProjectFinancialTab.tsx

export const ProjectFinancialTab: React.FC<{ project: Project }> = ({ project }) => {
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Calculate metrics
  const totalRevenue = project.totalInvoicedAmount || 0
  const totalDirectCosts = project.totalDirectCosts || 0
  const totalIndirectCosts = project.totalIndirectCosts || 0
  const grossProfit = totalRevenue - totalDirectCosts
  const netProfit = totalRevenue - totalDirectCosts - totalIndirectCosts
  const grossMargin = (grossProfit / totalRevenue * 100).toFixed(2)
  const netMargin = (netProfit / totalRevenue * 100).toFixed(2)

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Revenue Summary */}
      <Card title="Revenue Summary">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Quoted"
              value={project.estimatedBudget}
              prefix="Rp"
              formatter={formatCurrency}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Invoiced"
              value={totalRevenue}
              prefix="Rp"
              formatter={formatCurrency}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Paid"
              value={project.totalPaidAmount}
              prefix="Rp"
              formatter={formatCurrency}
              valueStyle={{ color: '#10b981' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Cost Breakdown */}
      <Card title="Cost Breakdown">
        <Table
          dataSource={expenses}
          columns={[
            { title: 'Description', dataIndex: 'description' },
            { title: 'Category', dataIndex: ['category', 'name'] },
            { title: 'Amount', dataIndex: 'amount', render: formatCurrency },
            {
              title: 'Type',
              dataIndex: 'category',
              render: (cat) => (
                <Tag color={cat.class === 'COGS' ? 'red' : 'blue'}>
                  {cat.class}
                </Tag>
              )
            },
            {
              title: 'Campaign',
              dataIndex: 'campaign',
              render: (campaign) => campaign ? (
                <Link to={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
              ) : '-'
            }
          ]}
        />

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Total Direct Costs (COGS)"
              value={totalDirectCosts}
              prefix="Rp"
              formatter={formatCurrency}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Total Indirect Costs"
              value={totalIndirectCosts}
              prefix="Rp"
              formatter={formatCurrency}
            />
          </Col>
        </Row>
      </Card>

      {/* Profitability */}
      <Card title="Profitability">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Gross Profit"
              value={grossProfit}
              prefix="Rp"
              formatter={formatCurrency}
              valueStyle={{ color: grossProfit >= 0 ? '#10b981' : '#ef4444' }}
            />
            <Text type="secondary">Margin: {grossMargin}%</Text>
          </Col>
          <Col span={8}>
            <Statistic
              title="Net Profit"
              value={netProfit}
              prefix="Rp"
              formatter={formatCurrency}
              valueStyle={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}
            />
            <Text type="secondary">Margin: {netMargin}%</Text>
          </Col>
          <Col span={8}>
            <Statistic
              title="Status"
              value={netProfit >= 0 ? 'PROFITABLE' : 'LOSS'}
              valueStyle={{
                color: netProfit >= 0 ? '#10b981' : '#ef4444',
                fontSize: '24px',
                fontWeight: 'bold'
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Quick Actions */}
      <Card>
        <Space>
          <Button icon={<BookOutlined />}>View GL Entries</Button>
          <Button icon={<PlusOutlined />} type="primary">Add Expense</Button>
          <Button icon={<FileTextOutlined />}>Download P&L Report</Button>
        </Space>
      </Card>
    </Space>
  )
}
```

#### 3. **Marketing Activities Tab**
```typescript
// frontend/src/components/project-tabs/ProjectMarketingTab.tsx

export const ProjectMarketingTab: React.FC<{ project: Project }> = ({ project }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [instagramSummary, setInstagramSummary] = useState<InstagramSummary>()
  const [facebookSummary, setFacebookSummary] = useState<FacebookSummary>()
  const [contentPosts, setContentPosts] = useState<ContentCalendarItem[]>([])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Paid Campaigns */}
      <Card title="🚀 Paid Campaigns">
        <Table
          dataSource={campaigns}
          columns={[
            { title: 'Campaign Name', dataIndex: 'name' },
            { title: 'Platform', dataIndex: ['platform', 'name'] },
            { title: 'Spent', dataIndex: 'totalSpent', render: formatCurrency },
            { title: 'Results', dataIndex: 'totalResults', render: formatNumber },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag>{s}</Tag> },
          ]}
        />
        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => navigate(`/campaigns?projectId=${project.id}`)}>
            View All Campaigns
          </Button>
          <Button icon={<UploadOutlined />}>Import Metrics</Button>
        </Space>
      </Card>

      {/* Instagram Organic */}
      <Card title="📸 Instagram Organic Performance">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Follower Growth"
              value={instagramSummary?.followerGrowth}
              prefix="+"
              suffix={`(${instagramSummary?.followerGrowthPercent}%)`}
              valueStyle={{ color: '#10b981' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Avg Engagement Rate"
              value={instagramSummary?.avgEngagementRate}
              suffix="%"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Impressions"
              value={instagramSummary?.totalImpressions}
              formatter={formatNumber}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Profile Views"
              value={instagramSummary?.totalProfileViews}
              formatter={formatNumber}
            />
          </Col>
        </Row>
        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/social-analytics/instagram')}>
            View Detailed Analytics
          </Button>
          <Button icon={<UploadOutlined />}>Import Data</Button>
        </Space>
      </Card>

      {/* Facebook Page */}
      <Card title="👍 Facebook Page Performance">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Page Likes Growth"
              value={facebookSummary?.pageLikesGrowth}
              prefix="+"
              valueStyle={{ color: '#10b981' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Total Reach"
              value={facebookSummary?.totalReach}
              formatter={formatNumber}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Post Engagement"
              value={facebookSummary?.totalEngagement}
              formatter={formatNumber}
            />
          </Col>
        </Row>
        <Space style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/social-analytics/facebook')}>
            View Detailed Analytics
          </Button>
          <Button icon={<UploadOutlined />}>Import Data</Button>
        </Space>
      </Card>

      {/* Content Calendar */}
      <Card title="📅 Content Calendar">
        <p>
          • {contentPosts.filter(p => p.status === 'PUBLISHED').length} posts published this month<br/>
          • {contentPosts.filter(p => p.status === 'SCHEDULED').length} posts scheduled for next month
        </p>
        <Button onClick={() => navigate('/content-calendar')}>
          View Content Calendar
        </Button>
      </Card>
    </Space>
  )
}
```

#### 4. **Monthly Reports Tab**
```typescript
// frontend/src/components/project-tabs/ProjectMonthlyReportsTab.tsx

export const ProjectMonthlyReportsTab: React.FC<{ project: Project }> = ({ project }) => {
  const [reports, setReports] = useState<ProjectMonthlyReport[]>([])
  const [wizardVisible, setWizardVisible] = useState(false)

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setWizardVisible(true)}
          >
            Generate New Report
          </Button>

          <Select defaultValue="all" style={{ width: 120 }}>
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="sent">Sent</Select.Option>
            <Select.Option value="archived">Archived</Select.Option>
          </Select>

          <Select defaultValue="2025" style={{ width: 100 }}>
            <Select.Option value="2025">2025</Select.Option>
            <Select.Option value="2024">2024</Select.Option>
          </Select>
        </Space>
      </Card>

      <Row gutter={16}>
        {reports.map(report => (
          <Col span={8} key={report.id}>
            <Card
              title={`📄 ${getMonthName(report.month)} ${report.year}`}
              extra={<Tag color={getStatusColor(report.status)}>{report.status}</Tag>}
            >
              {report.status === 'SENT' && (
                <Text type="secondary">
                  Sent on {dayjs(report.sentAt).format('DD MMM YYYY')}<br/>
                  To: {report.sentTo}
                </Text>
              )}

              <Divider />

              <Text strong>Included Data:</Text>
              <ul>
                {report.includeCampaigns && <li>✅ Campaigns</li>}
                {report.includeInstagram && <li>✅ Instagram</li>}
                {report.includeFacebook && <li>✅ Facebook</li>}
                {report.includeContent && <li>✅ Content</li>}
              </ul>

              {report.invoiceId && (
                <>
                  <Divider />
                  <Text type="secondary">
                    Linked to: <Link to={`/invoices/${report.invoiceId}`}>
                      Invoice #{report.invoice?.number}
                    </Link>
                  </Text>
                </>
              )}

              <Divider />

              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => handleViewPDF(report)}
                >
                  View PDF
                </Button>
                {report.status === 'SENT' && (
                  <Button icon={<SendOutlined />}>
                    Resend
                  </Button>
                )}
                <Button icon={<DownloadOutlined />}>
                  Download
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Report Generation Wizard */}
      <ReportGenerationWizard
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        project={project}
      />
    </Space>
  )
}
```

#### 5. **Report Generation Wizard**
```typescript
// frontend/src/components/modals/ReportGenerationWizard.tsx

export const ReportGenerationWizard: React.FC<{
  visible: boolean
  onClose: () => void
  project: Project
}> = ({ visible, onClose, project }) => {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    year: dayjs().year(),
    month: dayjs().month() + 1,
    includeCampaigns: true,
    includeInstagram: true,
    includeFacebook: true,
    includeContent: true,
    executiveSummary: '',
    recommendations: ''
  })

  const steps = [
    { title: 'Period', icon: <CalendarOutlined /> },
    { title: 'Data Sources', icon: <DatabaseOutlined /> },
    { title: 'Content', icon: <EditOutlined /> },
    { title: 'Preview', icon: <EyeOutlined /> },
    { title: 'Send', icon: <SendOutlined /> },
  ]

  const handleGenerate = async () => {
    const report = await projectMonthlyReportsService.generateReport(
      project.id,
      formData
    )
    message.success('Report generated successfully!')
    setStep(step + 1)
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      closable={false}
    >
      <Steps current={step} items={steps} style={{ marginBottom: 32 }} />

      {step === 0 && (
        <SelectPeriodStep
          value={formData}
          onChange={setFormData}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <SelectDataSourcesStep
          value={formData}
          onChange={setFormData}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <AddContentStep
          value={formData}
          onChange={setFormData}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <PreviewStep
          data={formData}
          onGenerate={handleGenerate}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <SendReportStep
          report={generatedReport}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}
```

**Deliverables:**
- ✅ Enhanced ProjectDetailPage with 3 new tabs
- ✅ Financial Performance tab with profitability metrics
- ✅ Marketing Activities tab with aggregated view
- ✅ Monthly Reports tab with report cards
- ✅ Report generation wizard (6-step flow)
- ✅ All components tested

---

## ✅ **Key Benefits of This Approach**

| Aspect | Finance-First Approach |
|--------|----------------------|
| **Finance Integration** | Campaign spend → Expense → Project P&L ✅ |
| **Profitability** | Automatic calculation from linked expenses ✅ |
| **No Breaking Changes** | 100% additive, zero rewrites ✅ |
| **User Learning** | Minimal - enhances existing pages ✅ |
| **Client Deliverable** | Monthly PDF reports with all data ✅ |
| **Data Integrity** | Single source of truth (Project model) ✅ |
| **Scalability** | Easy to add more platforms (TikTok, LinkedIn) ✅ |
| **Accounting Compliance** | Proper COGS tracking, GL integration ✅ |

---

## 🎯 **Success Metrics**

After full implementation, track:

1. **Adoption Metrics:**
   - % of projects with Instagram/Facebook insights imported
   - Number of monthly reports generated per month
   - User engagement with new tabs (analytics)

2. **Efficiency Metrics:**
   - Time to generate monthly report (target: < 5 minutes)
   - CSV import success rate (target: > 95%)
   - PDF generation time (target: < 30 seconds)

3. **Business Metrics:**
   - Client satisfaction with reports (survey)
   - Time saved vs manual report creation
   - Number of clients receiving monthly reports

4. **Financial Metrics:**
   - % of projects tracking campaign expenses
   - Accuracy of project profitability calculations
   - Time to close monthly books (should decrease)

---

## 🚀 **Future Enhancements (Post-Launch)**

### Phase 2: Advanced Features (Optional)

1. **Platform Expansion:**
   - TikTok Ads insights
   - LinkedIn Campaign Manager
   - Google Ads integration
   - YouTube analytics

2. **Automation:**
   - Auto-generate reports on 1st of every month
   - Auto-send reports to clients
   - Slack/email notifications for milestones

3. **AI-Powered Insights:**
   - Auto-generate executive summary
   - Trend analysis and predictions
   - Anomaly detection (unusual spend, engagement drops)
   - Recommendations engine

4. **Client Portal:**
   - Self-service report access
   - Real-time dashboard
   - Custom report requests

---

## 📋 **Migration Checklist**

### Pre-Launch (Development)
- [ ] Create migration file
- [ ] Test migration on dev database
- [ ] Verify no data loss
- [ ] Test rollback procedure
- [ ] Performance test (10K+ records)

### Launch Day (Production)
- [ ] Backup production database
- [ ] Run migration during off-hours
- [ ] Verify all tables created
- [ ] Verify relations intact
- [ ] Test API endpoints
- [ ] Test PDF generation
- [ ] Monitor error logs for 24 hours

### Post-Launch
- [ ] Train team on new features
- [ ] Create user documentation
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Fix bugs within 48 hours

---

## 📞 **Support & Questions**

For questions or issues during implementation:
1. Review this document first
2. Check existing code patterns in the codebase
3. Refer to Prisma/NestJS/React documentation
4. Test thoroughly in development first

---

**Document Status:** ✅ Ready for Implementation
**Next Step:** Begin Week 1 - Database + Import Infrastructure
**Timeline:** 4 weeks to full deployment

---

## 🎯 **IMPORT-FIRST APPROACH: Summary of Changes**

### What Changed from V2.0 → V3.0

#### 1. **Clipboard Paste Support (NEW CRITICAL FEATURE)**
- **Problem**: Users export from Meta/Instagram, copy to clipboard, need to paste directly
- **Solution**: TextArea component with `onPaste` handler
- **Parsing**: Tab-separated values (\t for columns, \n for rows)
- **UX**: Paste → Auto-detect format → Preview → Import (3 clicks!)

#### 2. **Platform-Specific Auto-Detection**
- **Problem**: Different platforms export different column names
- **Solution**: Smart column mapping with fuzzy matching
  ```typescript
  // Supports all these variations:
  "Amount spent", "Amount Spent (IDR)", "spent", "amountSpent"
  "Followers", "Follower Count", "followers"
  "Profile visits", "Profile Visits", "profileViews"
  ```

#### 3. **Import Audit Trail (DataImport Model)**
- **Problem**: No visibility into who imported what and when
- **Solution**: Complete audit trail with:
  - Who imported (user ID)
  - What was imported (import type, date range)
  - How it was imported (CSV upload vs clipboard paste)
  - Success/failure tracking (rows processed, errors)
  - Processing time

#### 4. **Import Wizard (5-Step Process)**
```
Step 1: Choose Method → [Upload CSV] or [Paste from Clipboard]
Step 2: Upload/Paste → Drag & drop or Ctrl+V
Step 3: Map Columns → Auto-detect or manual mapping
Step 4: Preview → See what will be imported, fix errors
Step 5: Import → Execute and show progress
```

#### 5. **Platform-Specific Templates**
- Meta Ads Manager template (with IDR currency)
- Instagram Insights template (with follower metrics)
- Facebook Page template (with page likes)
- Download Excel with sample data

#### 6. **Import History UI**
- Shows recent imports on each page
- Indicates source (clipboard paste icon vs file upload icon)
- Shows success/failure status
- Links to error details

### Implementation Priority Changes

**V2.0 Focus (Wrong):**
- Manual data entry forms
- Complex UI for individual metrics
- API-first, import as afterthought

**V3.0 Focus (Correct):**
- CSV/Clipboard import wizards (Week 1 + Week 3)
- Platform auto-detection (Week 1)
- Import audit trail (Week 1)
- User-friendly bulk operations (Week 3)
- Manual entry as fallback only

### User Workflow Optimization

**Before (V2.0 - Manual Entry Hell):**
1. Export from Meta Ads Manager (CSV)
2. Open CSV in Excel
3. Copy first row
4. Go to our system
5. Click "+ Add Metric"
6. Fill form fields manually (date, spent, impressions, reach, clicks)
7. Click Save
8. Repeat 30 times for 30 days of data
9. **Total time: 45 minutes per campaign**

**After (V3.0 - Import-First):**
1. Export from Meta Ads Manager (CSV)
2. Open CSV in Excel (or Google Sheets)
3. Select all data (Ctrl+A)
4. Copy (Ctrl+C)
5. Go to our system → Click "Import Data"
6. Click "Paste from Clipboard"
7. Ctrl+V
8. System auto-detects format
9. Preview data
10. Click "Import"
11. **Total time: 2 minutes per campaign (96% time savings!)**

### Key Metrics for Success

**Import Speed:**
- Target: Import 1,000 rows in < 10 seconds
- Progress bar during import
- Background processing for huge imports (>10K rows)

**Error Handling:**
- Show which rows failed and why
- Allow fixing errors and re-importing
- Download error report as CSV

**User Satisfaction:**
- 90%+ of users should use copy-paste (not CSV upload)
- < 5% error rate on imports
- < 3 clicks from export to imported

### Future Enhancements (Post-V3.0)

**Phase 2: API Integrations**
- Direct Meta Ads Manager API connection
- Direct Instagram Graph API connection
- Auto-import daily (schedule)

**Phase 3: Smart Paste**
- Paste directly from Meta Ads Manager UI (HTML tables)
- Auto-detect currency and convert
- Handle multi-platform exports in one paste

---

## 📢 **Message to Implementation Team**

**REMEMBER: Users hate manual data entry!**

Every page with data should have:
1. **BIG import button** in the top-right corner
2. **Import history** card showing recent imports
3. **Download template** link
4. **Copy-paste** option prominently displayed

**The Golden Rule:**
> If a user needs to type numbers into a form, we've failed.
> They should be able to copy-paste everything.

---

---

## 📋 **EXECUTION CHECKLIST (Claude Code AI)**

### Pre-Implementation Verification ✅
- [x] Verified CampaignDataImport exists in schema
- [x] Confirmed Campaign.projectId is optional (no breaking changes)
- [x] Confirmed user decisions: Puppeteer, skip email, both platforms
- [x] Plan updated to V4.0 with verification results

### Implementation Order (Claude executes all)
1. **Phase 1:** Update schema.prisma → Generate migration → Apply in Docker
2. **Phase 2:** Backend modules (3 new) + parsers + Puppeteer service
3. **Phase 3:** Frontend pages (2 new) + Project tabs + Import wizard
4. **Phase 4:** PDF template + End-to-end testing

### Success Criteria
- [ ] Can paste Instagram data from clipboard → Preview → Import
- [ ] Can paste Facebook data from clipboard → Preview → Import
- [ ] Financial Performance tab shows campaign expenses linked
- [ ] Marketing Activities tab shows Instagram + Facebook summaries
- [ ] Generate monthly report → PDF downloads with Indonesian text
- [ ] All migrations applied without errors
- [ ] No TypeScript compilation errors
- [ ] Backend builds and runs in Docker

---

**Document Status:** ✅ APPROVED - Ready for Claude Code Execution
**Estimated Time:** ~2 hours AI implementation
**Next Action:** Claude Code begins Phase 1 (Database Schema)
