# Backup Data Migration Analysis

## Summary
This document analyzes the backup data from `invoice_db_backup_20251103_211942.sql.gz` and maps it to the current Prisma schema for production data seeding.

## Backup Source
- **File**: `backup/invoice_db_backup_20251103_211942.sql.gz`
- **Date**: November 3, 2025
- **Size**: 36KB (compressed), 7542 lines (extracted)
- **Status**: Real production data from early usage

## Key Production Data Found

### 1. Users (8 users)
**Table**: `users`
**Current Schema**: ✅ Compatible (all fields match)

| Email | Name | Role | Status |
|-------|------|------|--------|
| admin@monomiagency.com | Admin Monomi | ADMIN | Active |
| super.admin@monomi.id | Super Admin | SUPER_ADMIN | Active |
| user@bisnis.co.id | User Bisnis (Legacy) | USER | Active |
| finance.manager@monomi.id | Finance Manager | FINANCE_MANAGER | Active |
| accountant@monomi.id | Accountant | ACCOUNTANT | Active |
| project.manager@monomi.id | Project Manager | PROJECT_MANAGER | Active |
| staff@monomi.id | Staff User | STAFF | Active |
| viewer@monomi.id | Viewer | VIEWER | Active |

**Migration Strategy**: ✅ Keep all users (already seeded in current setup)

---

### 2. Clients (1 real client)
**Table**: `clients`
**Current Schema**: ✅ Compatible

```
ID: cmhiyns030000muz1gnwyukwc
Name: MIRA SOUTHSEA PEARLS
Email: mirasouthseapearls@gmail.com
Phone: +6281247139637
Address: Apartment Puri Gandaria
Company: MIRA SOUTHSEA PEARLS
Contact Person: Yasmine
Payment Terms: Cash
Status: active
```

**Migration Strategy**: ✅ Replace fake client data with this real client

---

### 3. Project Type Configs (6 types)
**Table**: `project_type_configs`
**Current Schema**: ✅ Compatible

| Code | Name | Prefix | Color | Description |
|------|------|--------|-------|-------------|
| PRODUCTION | Production Work | PH | #52c41a | Website development, software development |
| SOCIAL_MEDIA | Social Media Management | SM | #1890ff | Content creation, social media management |
| CONSULTATION | Consultation Services | CS | #722ed1 | Business consultation, technical consultation |
| MAINTENANCE | Maintenance & Support | MT | #fa8c16 | System maintenance, bug fixes |
| OTHER | Other Services | OT | #595959 | Miscellaneous services |
| ADS_MANAGEMENT | Ads Management | AD | #ff18f3 | Ads Management |

**Migration Strategy**: ✅ Replace current 5 types with these 6 real types

---

### 4. Projects (2 real projects)
**Table**: `projects`
**Current Schema**: ✅ Mostly compatible (some minor field additions)

#### Project 1: Photography Services
```
Number: PRJ-PH-202511-001
Description: Photography Services
Output: Photography Services
Client: MIRA SOUTHSEA PEARLS
Project Type: PRODUCTION (PH)
Start Date: 2025-11-03
End Date: 2025-11-12
Budget: Rp 2,000,000
Status: IN_PROGRESS
Price Breakdown: {
  "total": 2000000,
  "products": [
    {
      "name": "Photography Service",
      "price": 2000000,
      "quantity": 1,
      "subtotal": 2000000,
      "description": "Photography Services Jakarta"
    }
  ]
}
```

#### Project 2: Photography & Videography Services
```
Number: PRJ-PH-202511-002
Description: Photography & Videography Services
Output: Photography & Videography Services
Client: MIRA SOUTHSEA PEARLS
Project Type: PRODUCTION (PH)
Start Date: 2025-11-03
End Date: 2025-11-20
Budget: Rp 7,379,000
Base Price: Rp 21,000,000
Status: PLANNING
Price Breakdown: {
  "total": 21000000,
  "products": [
    {
      "name": "Photography & Videography Catalog Services",
      "price": 105000,
      "quantity": 100,
      "subtotal": 10500000,
      "description": "2 edited photos per catalog product (200 files)"
    },
    {
      "name": "Photography & Videography On Model Services",
      "price": 67000,
      "quantity": 100,
      "subtotal": 6700000,
      "description": "2 edited photos per on-model product (200 files)"
    },
    {
      "name": "Studio Rent",
      "price": 3800000,
      "quantity": 1,
      "subtotal": 3800000,
      "description": "Kyabin Studio - Studio 3 - 9 Hours"
    }
  ]
}
Scope of Work: (3000+ characters of detailed scope)
Estimated Expenses: {
  "direct": [
    {"notes": "Cititrans PP Bdg-Jkt", "amount": 840000, "categoryName": "Transportation Expenses"},
    {"notes": "Hotel Losari Blok M 2 Nights", "amount": 1248000, "categoryName": "Accomodation Expenses"},
    {"notes": "Kyabin Studio", "amount": 3800000, "categoryName": "Studio Rent Expenses"},
    {"notes": "Fujifilm XF 80mm Lens Rent", "amount": 400000, "categoryName": "Tools Rent Expenses"},
    {"notes": "AAkomodasi Transportasi", "amount": 491000, "categoryName": "Transportation Expenses"},
    {"notes": "Akomodasi Makanan & Minuman", "amount": 600000, "categoryName": "Accomodation Expenses"}
  ],
  "totalDirect": 7379000,
  "totalEstimated": 7379000
}
Projected Gross Margin: 64.86%
Projected Net Margin: 64.86%
Projected Profit: Rp 13,621,000
```

**Migration Strategy**: ✅ Replace fake project data with these 2 real projects (extremely detailed and valuable!)

---

### 5. Quotations (1 real quotation)
**Table**: `quotations`
**Current Schema**: ✅ Compatible

```
Quotation Number: QT-202511-001
Date: 2025-11-03
Valid Until: 2025-12-03
Client: MIRA SOUTHSEA PEARLS
Project: PRJ-PH-202511-001
Amount: Rp 2,000,000
Status: APPROVED
Payment Type: FULL_PAYMENT
Price Breakdown: (same as Project 1)
Terms: (10-point comprehensive terms)
```

**Migration Strategy**: ✅ Add this real quotation (already linked to Project 1)

---

### 6. Invoices (1 real invoice)
**Table**: `invoices`
**Current Schema**: ✅ Compatible

```
Invoice Number: INV-202511-001
Creation Date: 2025-11-03
Due Date: 2025-12-03
Quotation: QT-202511-001
Client: MIRA SOUTHSEA PEARLS
Project: PRJ-PH-202511-001
Amount: Rp 2,000,000
Status: SENT
Materai Required: false (< Rp 5,000,000)
Payment Info: Bank Transfer details (BCA: 3462676350)
Journal Entry: cmhj2jqsp0007vwq1k73wxw0x
```

**Migration Strategy**: ✅ Add this real invoice with journal entries

---

### 7. Journal Entries (1 entry, 2 line items)
**Table**: `journal_entries`, `journal_line_items`
**Current Schema**: ✅ Compatible

```
Entry Number: JE-2025-11-0001
Entry Date: 2025-11-03
Transaction Type: INVOICE_SENT
Status: POSTED
Description: "Auto-generated: Invoice INV-202511-001 - SENT"

Line Items:
1. Debit: Accounts Receivable (Rp 2,000,000)
2. Credit: Revenue (Rp 2,000,000)
```

**Migration Strategy**: ✅ Include this journal entry (shows accounting system works!)

---

### 8. Expense Categories (20 categories)
**Table**: `expense_categories`
**Current Schema**: ✅ Compatible

**Notable Categories:**
- Standard accounting categories (Salaries, Advertising, Office Rent, Utilities, etc.)
- Creative agency specific:
  - **Transportation Expenses** (6-2131) - Biaya Transportasi
  - **Accomodation Expenses** (6-2132) - Beban Akomodasi
  - **Studio Rent Expenses** (6-4010) - Beban Sewa Studio
  - **Tools Rent Expenses** (6-4011) - Beban Sewa Peralatan/Perlengkapan
  - Depreciation Expense (6-3010)
  - Bad Debt Expense (8-1010)

**Migration Strategy**: ✅ Merge with current categories (keep comprehensive PSAK setup + add these specific ones)

---

### 9. Company Settings
**Table**: `company_settings`
**Current Schema**: ✅ Compatible

```
Company Name: (not shown in data)
Default Payment Terms: NET 30
Materai Threshold: Rp 5,000,000
Invoice Prefix: INV-
Quotation Prefix: QT-
Auto Backup: true
Backup Frequency: daily
Backup Time: 02:00
Auto Materai Reminder: true
Default Currency: IDR
```

**Migration Strategy**: ✅ Update company settings with these real values

---

### 10. User Preferences (1 record)
**Table**: `user_preferences`
**Current Schema**: ✅ Compatible

```
User: admin@monomiagency.com
Timezone: Asia/Jakarta
Language: id
Currency: IDR
Email Notifications: true
Push Notifications: true
Theme: light
```

**Migration Strategy**: ✅ Add this user preference

---

## Schema Compatibility Analysis

### ✅ Fully Compatible Tables
- `users` - No changes needed
- `clients` - No changes needed
- `project_type_configs` - No changes needed
- `quotations` - No changes needed
- `invoices` - No changes needed
- `expense_categories` - No changes needed
- `company_settings` - No changes needed
- `user_preferences` - No changes needed
- `journal_entries` - No changes needed
- `journal_line_items` - No changes needed

### ⚠️  Tables Requiring Mapping
- `projects` - Has additional fields in current schema (profit tracking, projections)
  - **Solution**: Preserve existing data, set new fields to null/default

### ❌ Tables with No Backup Data
Most other tables (assets, vendors, purchase orders, etc.) have no data in backup - these were new features added after backup date.

---

## Migration Strategy

### Phase 1: Preserve Current PSAK Setup
✅ Keep all 101+ Chart of Accounts (already comprehensive)
✅ Keep comprehensive expense categories from PSAK

### Phase 2: Replace Fake Data with Real Data
1. **Replace clients**: Remove "Acme Corp" → Add "MIRA SOUTHSEA PEARLS"
2. **Replace project types**: Update 5 basic types → Add 6 real types (including ADS_MANAGEMENT)
3. **Replace projects**: Remove fake projects → Add 2 detailed real projects
4. **Add real quotation**: QT-202511-001 (APPROVED)
5. **Add real invoice**: INV-202511-001 (SENT)
6. **Add real journal entries**: JE-2025-11-0001

### Phase 3: Merge Expense Categories
- Keep PSAK-compliant categories (103+ accounts)
- Add creative agency specific expense categories from backup
- Ensure no duplicates

### Phase 4: Update System Configuration
- Set real company settings (materai threshold, prefixes, etc.)
- Add admin user preferences

---

## Files to Modify

### 1. `backend/prisma/seed.ts`
**Changes Required:**
- Replace client seeding with MIRA SOUTHSEA PEARLS
- Replace project type configs with 6 real types
- Replace projects with 2 detailed real projects
- Add real quotation (linked to project 1)
- Add real invoice (linked to quotation)
- Add real journal entries
- Merge expense categories
- Update company settings
- Add user preferences

---

## Production Data Quality Assessment

### 🌟 Excellent Quality Data
1. **Projects** - Extremely detailed:
   - Comprehensive scope of work (3000+ characters)
   - Detailed price breakdown (multiple line items)
   - Estimated expenses by category
   - Profit projections and margins
   - Real-world data for jewelry photography business

2. **Client Data** - Real contact information:
   - Actual email: mirasouthseapearls@gmail.com
   - Real phone: +6281247139637
   - Real address: Apartment Puri Gandaria

3. **Expense Categories** - Industry-specific:
   - Transportation, Accommodation, Studio Rent, Tools Rent
   - Perfect for creative agency business model

4. **Financial Flow** - Complete workflow:
   - Quotation → Approval → Invoice → Journal Entry
   - Shows entire Indonesian business process

### 🎯 This Data is PERFECT for Production Seeding!

**Rationale:**
- **Real-world examples** help users understand the system
- **Detailed projects** demonstrate full feature capabilities
- **Indonesian business names** (Mira Southsea Pearls) show localization
- **Complete workflow** demonstrates quotation-to-invoice process
- **Creative agency focus** aligns with business model (photography, videography)

---

## Next Steps

1. ✅ Create backup migration seed script (`production-data-seed.ts`)
2. ✅ Test migration script in development environment
3. ✅ Update main `seed.ts` to use production data
4. ✅ Verify all relationships and foreign keys
5. ✅ Test complete workflow (quotation → invoice → journal entry)

---

## Data Preservation Notes

**IMPORTANT**: The backup contains:
- 1 REAL client (jewelry business)
- 2 REAL projects (photography services with detailed scope)
- 1 APPROVED quotation
- 1 SENT invoice
- Complete journal entries (accounting system functional)

This data should be **preserved and used** in production seeding as it provides:
1. Real-world examples for users
2. Proof of concept for accounting integration
3. Indonesian business workflow demonstration
4. Creative agency industry relevance

