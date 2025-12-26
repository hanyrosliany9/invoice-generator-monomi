# Property Management System - Implementation Plan
**Digital Marketing Agency Equipment & Asset Tracking**

## Executive Summary

This document outlines the implementation plan for a Property Management system within the Monomi Finance application. The system will track physical assets (cameras, lenses, lighting, computers, etc.) used by the digital marketing agency, enabling efficient check-in/check-out, maintenance tracking, usage analytics, and integration with existing project/invoice workflows.

**Note**: Advanced financial tracking features including depreciation calculation and Indonesian PSAK compliance will be implemented in future updates after the core system is stable and adopted by users.

---

## 1. Business Context & Requirements

### 1.1 Target Users
- **Creative Team**: Videographers, photographers, content creators checking out equipment
- **Operations Team**: Equipment managers tracking inventory and maintenance
- **Finance Team**: Basic asset cost tracking (advanced depreciation in future update)
- **Project Managers**: Assigning equipment to projects and tracking usage

### 1.2 Core Business Problems to Solve
1. **Equipment Accountability**: Know who has what equipment at any time
2. **Double Booking Prevention**: Avoid scheduling conflicts for limited equipment
3. **Maintenance Management**: Track service schedules and repair history
4. **Cost Allocation**: Track equipment costs per project for accurate pricing
5. **Damage/Loss Prevention**: Maintain usage history and condition reports
6. **Usage Analytics**: Understand equipment utilization and needs

### 1.3 Indonesian Business Context
- **Asset Registry**: Maintain basic equipment records for business operations
- **Cost Tracking**: Track purchase prices and maintenance costs
- **Documentation**: Proper documentation for warranty and insurance purposes
- **Future Compliance**: Database structure ready for future Indonesian PSAK depreciation implementation

---

## 2. Asset Types & Categories

### 2.1 Equipment Categories

#### Camera Equipment
- **DSLRs & Mirrorless Cameras**
  - Body only
  - Sensor type (Full Frame, APS-C, Micro Four Thirds)
  - Megapixel count
  - Video capabilities (4K, 6K, 8K)

- **Lenses**
  - Focal length (e.g., 24-70mm, 50mm, 70-200mm)
  - Aperture (e.g., f/1.4, f/2.8)
  - Mount type (Canon EF, Sony E, Nikon F, etc.)
  - Special features (IS/VR, Macro, Tilt-Shift)

- **Accessories**
  - Memory cards (SD, CF, CFexpress)
  - Batteries & chargers
  - Camera bags & cases
  - Lens filters (UV, ND, Polarizer)
  - Remote triggers

#### Lighting Equipment
- **Strobes & Continuous Lights**
  - Power output (watt-seconds)
  - Color temperature
  - Battery or AC powered

- **Light Modifiers**
  - Softboxes
  - Umbrellas
  - Beauty dishes
  - Reflectors

- **Accessories**
  - Light stands
  - C-stands
  - Sandbags
  - Extension cords

#### Audio Equipment
- **Microphones**
  - Type (Shotgun, Lavalier, Handheld)
  - Connection (XLR, USB, Wireless)
  - Phantom power requirements

- **Audio Recorders**
  - Channel count
  - Recording format
  - Storage type

#### Video Production
- **Stabilization**
  - Gimbals (phone, mirrorless, cinema)
  - Tripods & monopods
  - Sliders & dollies

- **Drones**
  - Model & payload capacity
  - Flight time
  - Camera specs
  - Registration number (Indonesia DGCA)

#### Computing Equipment
- **Computers & Laptops**
  - Specs (CPU, RAM, Storage, GPU)
  - Operating system
  - Primary use (editing, design, admin)

- **Monitors & Displays**
  - Size & resolution
  - Color accuracy (sRGB, Adobe RGB)
  - Calibration status

- **Storage Devices**
  - External HDDs/SSDs
  - NAS devices
  - Capacity & interface

#### Miscellaneous
- **Backdrops & Sets**
- **Props & Set Dressing**
- **Transportation Cases**
- **Power Equipment** (generators, UPS)

---

## 3. Core Features & Functionality

### 3.1 Asset Registration & Management

#### Asset Profile
```typescript
interface Asset {
  // Basic Information
  id: string
  assetCode: string // e.g., CAM-001, LENS-050, LIGHT-023
  name: string // e.g., "Canon EOS R5"
  category: AssetCategory
  subcategory: string

  // Specifications
  manufacturer: string
  model: string
  serialNumber: string
  specifications: Record<string, any> // Flexible JSON for category-specific specs

  // Acquisition Details
  purchaseDate: Date
  purchasePrice: number // IDR
  supplier: string
  invoiceNumber?: string
  warrantyExpiration?: Date

  // Financial Tracking (Basic - for future depreciation)
  currentValue?: number // Optional: manually updated or future auto-calculation
  notes_financial?: string // Notes about value, condition affecting price

  // Status & Condition
  status: 'available' | 'checked_out' | 'in_maintenance' | 'retired' | 'lost' | 'damaged'
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair'
  location: string // Storage location when not in use

  // Documentation
  photos: string[] // URLs to asset photos
  documents: string[] // Manuals, receipts, etc.
  qrCode: string // Generated QR code for scanning
  rfidTag?: string

  // Metadata
  tags: string[]
  notes: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

#### Asset Kit/Bundle System
- Group related equipment into kits (e.g., "Event Photography Kit", "Interview Setup")
- One-click checkout of entire kit
- Automatic availability checking for all kit items
- Track kit usage patterns

### 3.2 Check-In / Check-Out System

#### Reservation & Booking
```typescript
interface AssetReservation {
  id: string
  assetId: string | string[] // Single asset or kit
  userId: string
  projectId?: string // Link to project if equipment is for a project

  // Timing
  reservationDate: Date
  startDate: Date
  endDate: Date
  expectedReturnDate: Date
  actualReturnDate?: Date

  // Purpose & Details
  purpose: string
  location: string // Where the equipment will be used
  notes: string

  // Condition Tracking
  checkoutCondition: AssetCondition
  checkoutNotes: string
  checkoutPhotos: string[]
  checkinCondition?: AssetCondition
  checkinNotes?: string
  checkinPhotos?: string[]

  // Approval Workflow (for expensive equipment)
  approvalRequired: boolean
  approvedBy?: string
  approvalDate?: Date
  approvalStatus: 'pending' | 'approved' | 'rejected'

  // Status
  status: 'reserved' | 'checked_out' | 'overdue' | 'returned' | 'cancelled'

  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

#### Check-Out Process
1. **Search & Reserve**: Browse available equipment, check calendar
2. **Pre-Checkout Inspection**: Document condition with photos
3. **Assignment**: Assign to user and optionally link to project
4. **QR Code Scan**: Quick checkout via mobile scanning
5. **Digital Signature**: User acknowledges responsibility
6. **Automated Notifications**: Email/SMS confirmation with return date

#### Check-In Process
1. **Return Notification**: User or manager initiates return
2. **Condition Inspection**: Compare checkout vs. return condition
3. **Damage Assessment**: Document any damage or issues
4. **Maintenance Check**: Flag if maintenance needed
5. **Availability Update**: Return to available pool
6. **Usage Logging**: Record usage hours/days for cost tracking

### 3.3 Calendar & Availability

#### Visual Calendar
- **Month/Week/Day Views**: See equipment availability at a glance
- **Conflict Detection**: Automatic prevention of double-booking
- **Drag & Drop Booking**: Easy rescheduling
- **Color Coding**:
  - Green: Available
  - Yellow: Reserved
  - Red: Checked out
  - Orange: In maintenance
  - Grey: Unavailable

#### Advanced Features
- **Recurring Reservations**: For regular shoots (e.g., weekly podcast recording)
- **Buffer Time**: Automatic padding between bookings for maintenance/transport
- **Priority Booking**: VIP users or urgent projects get priority
- **Waitlist**: Queue for high-demand equipment

### 3.4 Maintenance Management

#### Preventive Maintenance
```typescript
interface MaintenanceSchedule {
  id: string
  assetId: string

  // Schedule
  maintenanceType: 'preventive' | 'inspection' | 'calibration' | 'cleaning'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'usage_based'
  usageThreshold?: number // e.g., every 1000 shutter actuations
  lastMaintenanceDate: Date
  nextMaintenanceDate: Date

  // Details
  tasks: string[] // Checklist of tasks to perform
  estimatedDuration: number // minutes
  assignedTo?: string

  // Notifications
  reminderDays: number[] // e.g., [30, 14, 7, 1] days before due

  // Status
  status: 'scheduled' | 'overdue' | 'in_progress' | 'completed' | 'skipped'
}
```

#### Repair & Service History
```typescript
interface MaintenanceRecord {
  id: string
  assetId: string

  // Details
  maintenanceType: 'preventive' | 'repair' | 'calibration' | 'cleaning' | 'upgrade'
  issueDescription: string
  workPerformed: string
  partsReplaced: string[]

  // Service Provider
  serviceProvider: 'in_house' | 'external'
  vendorName?: string
  technicianName: string

  // Timing
  reportedDate: Date
  startDate: Date
  completionDate: Date
  downtimeHours: number

  // Costs
  laborCost: number
  partsCost: number
  totalCost: number
  invoiceNumber?: string

  // Documentation
  photos: string[]
  documents: string[] // Receipts, reports, etc.

  // Warranty
  coveredByWarranty: boolean
  warrantyClaim?: string

  // Quality Check
  postServiceInspection: boolean
  inspectedBy?: string
  approvedForUse: boolean

  createdAt: Date
}
```

#### Maintenance Dashboard
- **Overdue Alerts**: Red flags for overdue maintenance
- **Upcoming Schedule**: 30-day maintenance calendar
- **Cost Analysis**: Maintenance costs per asset/category
- **Downtime Tracking**: Equipment unavailability due to maintenance
- **Reliability Metrics**: MTBF (Mean Time Between Failures)

### 3.5 Usage Analytics & Reporting

#### Usage Metrics
```typescript
interface UsageMetrics {
  assetId: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'

  // Utilization
  totalDaysAvailable: number
  daysCheckedOut: number
  utilizationRate: number // percentage

  // Performance
  numberOfCheckouts: number
  averageCheckoutDuration: number
  mostFrequentUsers: { userId: string; count: number }[]

  // Issues
  damageIncidents: number
  maintenanceEvents: number
  downtimeDays: number

  // Basic Cost Tracking
  totalMaintenanceCosts: number // From maintenance records
  purchasePrice: number
}
```

#### Reports
1. **Equipment Utilization Report**: Which equipment is underused/overused
2. **Maintenance Cost Report**: Maintenance expenses by asset/category
3. **Project Equipment Report**: Equipment used per project
4. **User Activity Report**: Who checks out what equipment most
5. **Damage & Loss Report**: Track incidents and responsible parties
6. **Availability Report**: Equipment availability patterns

### 3.6 Mobile App Features

#### Essential Mobile Capabilities
- **QR Code Scanning**: Quick check-in/check-out
- **Availability Search**: "What's available today?"
- **Booking**: Reserve equipment on the go
- **Photo Documentation**: Capture condition during check-in/check-out
- **Push Notifications**:
  - Return reminders
  - Approval notifications
  - Maintenance alerts
- **Offline Mode**: Basic functionality without internet

### 3.7 Integration with Existing System

#### Project Integration
```typescript
interface ProjectEquipmentUsage {
  projectId: string
  assetId: string

  // Usage
  startDate: Date
  endDate: Date
  daysUsed: number

  // Costing (Basic tracking)
  notes: string

  // Billing
  billToClient: boolean
  invoiceLineItemId?: string // Link to invoice if billed to client
}
```

**Integration Points**:
1. **Project Page**: Show equipment assigned to project
2. **Quotation**: Add equipment rental charges to project quotes (optional)
3. **Invoice**: Include equipment rental charges (optional)
4. **Usage Tracking**: Track which equipment is used for which client/project

#### Client Integration
- Link equipment usage to client projects
- Track equipment used for each client
- Bill equipment rental/usage to clients (optional)

---

## 4. User Interface Design

### 4.1 Navigation Structure

```
Main Navigation (add to existing)
├── Property Management (new)
    ├── Dashboard
    │   ├── Overview stats
    │   ├── Availability calendar
    │   ├── Quick actions
    │   └── Alerts & notifications
    │
    ├── Assets
    │   ├── Asset List (searchable, filterable)
    │   ├── Asset Details
    │   ├── Add New Asset
    │   └── Asset Categories
    │
    ├── Check-In / Check-Out
    │   ├── Current Checkouts
    │   ├── Check Out Equipment
    │   ├── Check In Equipment
    │   └── Reservations Calendar
    │
    ├── Maintenance
    │   ├── Maintenance Schedule
    │   ├── Service History
    │   ├── Create Maintenance Task
    │   └── Maintenance Vendors
    │
    ├── Reports & Analytics
    │   ├── Utilization Report
    │   ├── Maintenance Cost Report
    │   └── Usage Analytics
    │
    └── Settings
        ├── Asset Categories
        ├── Locations
        └── Notification Preferences
```

### 4.2 Key Pages

#### Dashboard (Property Management Home)
**Layout**:
- **Top Stats Row** (4 metric cards):
  - Total Assets & Total Value (purchase price sum)
  - Currently Checked Out
  - Overdue Returns
  - Maintenance Due

- **Availability Calendar** (large central section):
  - Visual timeline of equipment availability
  - Color-coded status indicators
  - Quick booking functionality

- **Quick Actions** (right sidebar):
  - Check Out Equipment (primary button)
  - Check In Equipment
  - Report Issue
  - Schedule Maintenance

- **Recent Activity** (timeline):
  - Recent checkouts/returns
  - Maintenance completed
  - New assets added

- **Alerts & Notifications**:
  - Overdue returns (red)
  - Maintenance due soon (orange)
  - Equipment ready for pickup (green)

#### Asset List Page
**Features**:
- **Search & Filter**:
  - Text search (name, model, serial number)
  - Filter by category, status, location
  - Advanced filters (price range, purchase date, condition)

- **List/Grid Toggle**: Switch between table and card views

- **Bulk Actions**:
  - Export to Excel
  - Print QR codes
  - Bulk update (location, status)

- **Table Columns**:
  - Asset Code (clickable)
  - Photo thumbnail
  - Name & Model
  - Category
  - Status badge
  - Current Location/User
  - Purchase Price
  - Next Maintenance
  - Actions dropdown

#### Asset Detail Page
**Layout** (similar to existing detail pages):
- **Hero Card**:
  - Asset photo
  - Name, model, asset code
  - Status badge
  - QR code
  - Quick actions (Check Out, Edit, Maintenance)

- **Tabs**:
  1. **Overview**:
     - Specifications table
     - Purchase info & warranty
     - Current status

  2. **Usage History**:
     - Timeline of all checkouts
     - Usage statistics
     - Project assignments

  3. **Maintenance**:
     - Service history
     - Upcoming maintenance
     - Cost breakdown

  4. **Documents**:
     - Photos
     - Manuals
     - Receipts
     - Service reports

#### Check-Out Flow
**Step 1: Select Equipment**
- Search or scan QR code
- Show availability status
- Add to checkout cart
- Option to add kit/bundle

**Step 2: Booking Details**
- Select user (or self)
- Link to project (optional)
- Set expected return date
- Specify purpose/location
- Add notes

**Step 3: Condition Check**
- Pre-checkout inspection checklist
- Upload condition photos
- Note any existing damage
- Digital signature

**Step 4: Confirmation**
- Review checkout details
- Print/email receipt
- Generate QR code for easy check-in

#### Calendar Page
**Features**:
- **Month/Week/Day Views**
- **Equipment List Sidebar**:
  - Shows all equipment
  - Color indicators for availability
  - Click to see details

- **Timeline View**:
  - Horizontal bars showing booking periods
  - Drag to reschedule
  - Click to edit/cancel

- **Legend**: Status color meanings
- **Filters**: Category, location, user
- **Conflicts Highlighted**: Red borders for overlapping bookings

### 4.3 UI Components (Reusable)

#### PropertyCard Component
```typescript
interface PropertyCardProps {
  asset: Asset
  showStatus: boolean
  showActions: boolean
  onClick?: () => void
}
```
- Display asset photo, name, status
- Quick action buttons (check out, view details)
- Status badge with color coding
- Utilization progress bar

#### CheckOutForm Component
- Step-by-step wizard
- Asset selection with availability check
- User/project assignment
- Condition documentation
- Confirmation screen

#### MaintenanceSchedule Component
- Calendar view of maintenance tasks
- Overdue highlighting
- Drag-and-drop rescheduling
- Quick complete/skip actions

---

## 5. Database Schema

### 5.1 New Tables

```sql
-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),

  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  specifications JSONB,

  purchase_date DATE NOT NULL,
  purchase_price DECIMAL(15,2) NOT NULL,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  warranty_expiration DATE,

  -- Basic value tracking (for future depreciation system)
  current_value DECIMAL(15,2),
  notes_financial TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'available',
  condition VARCHAR(50) NOT NULL DEFAULT 'good',
  location VARCHAR(255),

  photos TEXT[],
  documents TEXT[],
  qr_code TEXT,
  rfid_tag VARCHAR(100),

  tags TEXT[],
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Asset reservations/checkouts
CREATE TABLE asset_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),

  reservation_date TIMESTAMP NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  expected_return_date TIMESTAMP NOT NULL,
  actual_return_date TIMESTAMP,

  purpose TEXT,
  location VARCHAR(255),
  notes TEXT,

  checkout_condition VARCHAR(50),
  checkout_notes TEXT,
  checkout_photos TEXT[],
  checkin_condition VARCHAR(50),
  checkin_notes TEXT,
  checkin_photos TEXT[],

  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approval_date TIMESTAMP,
  approval_status VARCHAR(50),

  status VARCHAR(50) NOT NULL DEFAULT 'reserved',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance schedules
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),

  maintenance_type VARCHAR(50) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  usage_threshold INTEGER,
  last_maintenance_date DATE,
  next_maintenance_date DATE NOT NULL,

  tasks TEXT[],
  estimated_duration INTEGER,
  assigned_to UUID REFERENCES users(id),

  reminder_days INTEGER[],

  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance records
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  schedule_id UUID REFERENCES maintenance_schedules(id),

  maintenance_type VARCHAR(50) NOT NULL,
  issue_description TEXT,
  work_performed TEXT,
  parts_replaced TEXT[],

  service_provider VARCHAR(50),
  vendor_name VARCHAR(255),
  technician_name VARCHAR(255),

  reported_date DATE,
  start_date DATE NOT NULL,
  completion_date DATE,
  downtime_hours DECIMAL(10,2),

  labor_cost DECIMAL(15,2),
  parts_cost DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  invoice_number VARCHAR(100),

  photos TEXT[],
  documents TEXT[],

  covered_by_warranty BOOLEAN DEFAULT FALSE,
  warranty_claim VARCHAR(255),

  post_service_inspection BOOLEAN DEFAULT FALSE,
  inspected_by UUID REFERENCES users(id),
  approved_for_use BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Asset kits/bundles
CREATE TABLE asset_kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),

  kit_code VARCHAR(50) UNIQUE NOT NULL,
  qr_code TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Kit items (many-to-many)
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID REFERENCES asset_kits(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,

  UNIQUE(kit_id, asset_id)
);

-- Project equipment usage (integration with projects)
CREATE TABLE project_equipment_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  asset_id UUID REFERENCES assets(id),
  reservation_id UUID REFERENCES asset_reservations(id),

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_used INTEGER,

  notes TEXT,

  bill_to_client BOOLEAN DEFAULT FALSE,
  invoice_line_item_id UUID,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset categories (predefined + custom)
CREATE TABLE asset_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  parent_category_id UUID REFERENCES asset_categories(id),
  description TEXT,

  custom_fields JSONB, -- Define category-specific fields

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_asset_code ON assets(asset_code);
CREATE INDEX idx_reservations_asset_id ON asset_reservations(asset_id);
CREATE INDEX idx_reservations_user_id ON asset_reservations(user_id);
CREATE INDEX idx_reservations_dates ON asset_reservations(start_date, end_date);
CREATE INDEX idx_reservations_status ON asset_reservations(status);
CREATE INDEX idx_maintenance_records_asset_id ON maintenance_records(asset_id);
CREATE INDEX idx_maintenance_schedules_next_date ON maintenance_schedules(next_maintenance_date);
```

### 5.2 Modified Tables (Existing)

```sql
-- Add to projects table (optional)
ALTER TABLE projects ADD COLUMN equipment_usage_notes TEXT;

-- Add to invoice_line_items (for billing equipment to clients)
ALTER TABLE invoice_line_items ADD COLUMN asset_id UUID REFERENCES assets(id);
ALTER TABLE invoice_line_items ADD COLUMN equipment_usage_id UUID REFERENCES project_equipment_usage(id);
```

---

## 6. API Endpoints

### 6.1 Asset Management

```typescript
// Assets
GET    /api/assets                    // List all assets (with filters)
POST   /api/assets                    // Create new asset
GET    /api/assets/:id                // Get asset details
PUT    /api/assets/:id                // Update asset
DELETE /api/assets/:id                // Delete/retire asset
GET    /api/assets/:id/history        // Get usage history
POST   /api/assets/:id/photos         // Upload asset photos
GET    /api/assets/:id/qrcode         // Generate QR code
GET    /api/assets/available          // Get available assets (for booking)
POST   /api/assets/bulk-import        // Bulk import from CSV/Excel

// Asset Categories
GET    /api/asset-categories           // List categories
POST   /api/asset-categories           // Create category
PUT    /api/asset-categories/:id      // Update category
DELETE /api/asset-categories/:id      // Delete category
```

### 6.2 Reservations & Checkouts

```typescript
// Reservations
GET    /api/reservations               // List reservations
POST   /api/reservations               // Create reservation
GET    /api/reservations/:id          // Get reservation details
PUT    /api/reservations/:id          // Update reservation
DELETE /api/reservations/:id          // Cancel reservation

// Check-out/Check-in
POST   /api/reservations/:id/checkout // Check out equipment
POST   /api/reservations/:id/checkin  // Check in equipment
GET    /api/reservations/current      // Currently checked out
GET    /api/reservations/overdue      // Overdue returns

// Calendar & Availability
GET    /api/reservations/calendar     // Calendar data
GET    /api/assets/:id/availability   // Check asset availability
POST   /api/reservations/check-conflicts // Check for booking conflicts
```

### 6.3 Maintenance

```typescript
// Maintenance Schedules
GET    /api/maintenance/schedules        // List schedules
POST   /api/maintenance/schedules        // Create schedule
PUT    /api/maintenance/schedules/:id   // Update schedule
DELETE /api/maintenance/schedules/:id   // Delete schedule
GET    /api/maintenance/schedules/upcoming // Upcoming maintenance

// Maintenance Records
GET    /api/maintenance/records          // List maintenance records
POST   /api/maintenance/records          // Create record
GET    /api/maintenance/records/:id     // Get record details
PUT    /api/maintenance/records/:id     // Update record
DELETE /api/maintenance/records/:id     // Delete record
GET    /api/assets/:id/maintenance      // Asset's maintenance history
```

### 6.4 Kits & Bundles

```typescript
GET    /api/kits                      // List kits
POST   /api/kits                      // Create kit
GET    /api/kits/:id                  // Get kit details
PUT    /api/kits/:id                  // Update kit
DELETE /api/kits/:id                  // Delete kit
POST   /api/kits/:id/items            // Add item to kit
DELETE /api/kits/:id/items/:itemId   // Remove item from kit
GET    /api/kits/:id/availability     // Check kit availability
```

### 6.5 Reports & Analytics

```typescript
GET    /api/reports/utilization       // Utilization report
GET    /api/reports/maintenance-costs // Maintenance cost report
GET    /api/reports/project-equipment // Equipment costs by project
GET    /api/reports/user-activity     // User checkout activity
GET    /api/reports/availability      // Availability patterns
GET    /api/reports/export            // Export report (PDF/Excel)
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Basic asset tracking and management

**Tasks**:
- [ ] Database schema implementation
- [ ] Asset CRUD API endpoints
- [ ] Asset list page (table view)
- [ ] Asset detail page
- [ ] Add/edit asset forms
- [ ] QR code generation
- [ ] Basic search and filtering

**Deliverables**:
- Can add, view, edit, and delete assets
- Generate QR codes for each asset
- Basic search functionality

### Phase 2: Check-In/Check-Out (Weeks 3-4)
**Goal**: Core booking and checkout functionality

**Tasks**:
- [ ] Reservation system backend
- [ ] Check-out workflow UI
- [ ] Check-in workflow UI
- [ ] Availability calendar (basic)
- [ ] Conflict detection
- [ ] Status tracking (available, checked out, overdue)
- [ ] Email notifications (checkout confirmation, return reminders)

**Deliverables**:
- Users can check out and check in equipment
- Calendar shows availability
- Automatic overdue detection and notifications

### Phase 3: Maintenance Management (Weeks 5-6)
**Goal**: Track maintenance and service history

**Tasks**:
- [ ] Maintenance schedule system
- [ ] Maintenance record creation
- [ ] Service history timeline
- [ ] Preventive maintenance alerts
- [ ] Maintenance cost tracking
- [ ] Vendor management

**Deliverables**:
- Schedule preventive maintenance
- Track repair history and costs
- Maintenance due notifications

### Phase 4: Advanced Features (Weeks 7-8)
**Goal**: Kits, analytics, and integrations

**Tasks**:
- [ ] Asset kits/bundles
- [ ] Advanced calendar (drag-and-drop, recurring bookings)
- [ ] Usage analytics dashboard
- [ ] Utilization reports
- [ ] Project integration (link equipment to projects)
- [ ] Client billing integration (add equipment charges to invoices)
- [ ] Mobile-responsive views

**Deliverables**:
- Create and manage equipment kits
- Link equipment to projects
- Bill equipment usage to clients
- Comprehensive analytics

### Phase 5: Mobile & Polish (Weeks 9-10)
**Goal**: Mobile app and final refinements

**Tasks**:
- [ ] Mobile app (React Native or PWA)
- [ ] QR code scanning (mobile)
- [ ] Photo upload (condition documentation)
- [ ] Push notifications
- [ ] Offline mode
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] User training documentation

**Deliverables**:
- Fully functional mobile app
- Complete documentation
- Production-ready system

---

## 8. Technical Considerations

### 8.1 Technology Stack

**Backend**:
- NestJS (existing) - API and business logic
- Prisma (existing) - Database ORM
- PostgreSQL (existing) - Primary database
- Redis (existing) - Caching, queue management

**Frontend**:
- React 19 (existing) - UI framework
- Ant Design 5.x (existing) - UI components
- TanStack Query (existing) - Data fetching
- Zustand (existing) - State management

**New Dependencies Needed**:
- `qrcode` - QR code generation
- `node-schedule` - Scheduled tasks (maintenance reminders)
- `@react-pdf/renderer` or `puppeteer` - PDF reports
- `exceljs` - Excel export functionality
- `date-fns` - Date manipulation (reservations, calendars)

**Mobile (Future)**:
- React Native or PWA
- Expo (if React Native)
- Mobile QR scanner library

### 8.2 Performance Considerations

**Optimization Strategies**:
1. **Database Indexes**: Index on frequently queried fields (status, dates, asset_code)
2. **Caching**: Redis cache for:
   - Asset availability queries
   - Frequently accessed asset details
   - Calendar data
3. **Pagination**: Implement pagination for asset lists and histories
4. **Lazy Loading**: Load asset photos on demand
5. **Background Jobs**:
   - Overdue checks (run every hour)
   - Maintenance reminders (run daily)

### 8.3 Security & Permissions

**Role-Based Access Control (RBAC)**:

```typescript
enum PropertyPermission {
  // Assets
  ASSET_VIEW = 'asset:view',
  ASSET_CREATE = 'asset:create',
  ASSET_EDIT = 'asset:edit',
  ASSET_DELETE = 'asset:delete',

  // Reservations
  RESERVATION_VIEW = 'reservation:view',
  RESERVATION_CREATE = 'reservation:create',
  RESERVATION_EDIT_OWN = 'reservation:edit:own',
  RESERVATION_EDIT_ANY = 'reservation:edit:any',
  RESERVATION_APPROVE = 'reservation:approve',

  // Maintenance
  MAINTENANCE_VIEW = 'maintenance:view',
  MAINTENANCE_CREATE = 'maintenance:create',
  MAINTENANCE_EDIT = 'maintenance:edit',

  // Reports
  REPORTS_VIEW = 'reports:view',

  // Admin
  SETTINGS_MANAGE = 'settings:manage',
}
```

**Roles**:
- **Admin**: Full access to all features
- **Equipment Manager**: Manage assets, approve checkouts, manage maintenance
- **Team Member**: View assets, create reservations, check out equipment
- **Finance**: View cost reports and equipment value data
- **View Only**: Read-only access

### 8.4 Data Integrity

**Validation Rules**:
1. Cannot check out equipment that's already checked out
2. Cannot delete assets with active reservations
3. Cannot schedule overlapping reservations
4. Serial numbers must be unique
5. Purchase price must be positive
6. Return date must be after checkout date
7. Cannot retire equipment that's currently checked out

**Audit Trail**:
- Log all changes to asset records
- Track who checked out/returned equipment
- Record maintenance activities

### 8.5 Backup & Disaster Recovery

**Backup Strategy**:
- Daily automated backups of asset database
- Store asset photos in cloud storage (AWS S3 or similar)
- Weekly full backup to external location
- Keep QR codes and essential data offline

---

## 9. Testing Strategy

### 9.1 Unit Tests
- Asset CRUD operations
- Availability checking logic
- Conflict detection
- Cost calculations

### 9.2 Integration Tests
- Checkout/checkin workflows
- Project equipment integration
- Invoice billing integration
- Notification system
- Calendar synchronization

### 9.3 End-to-End Tests
- Complete checkout flow (browse → reserve → checkout → return)
- Maintenance workflow (schedule → perform → record)
- Reporting (generate reports, export data)
- Mobile QR scanning

### 9.4 Performance Tests
- Load testing for calendar queries
- Stress testing with 10,000+ assets
- Concurrent checkout conflicts
- Report generation speed

---

## 10. Training & Documentation

### 10.1 User Documentation
1. **Quick Start Guide**: Getting started with property management
2. **Equipment Manager Guide**: Managing assets and maintenance
3. **User Guide**: How to check out and return equipment
4. **Basic Cost Tracking Guide**: Understanding equipment costs
5. **Admin Guide**: System configuration and settings

### 10.2 Video Tutorials
- How to add new equipment
- Checking out equipment (step-by-step)
- Scheduling maintenance
- Running reports
- Mobile app usage

### 10.3 FAQs
- How do I check if equipment is available?
- What if I damage equipment?
- How do I extend a reservation?
- Can I book equipment for a client project?
- How do I track maintenance costs?

---

## 11. Success Metrics (KPIs)

### 11.1 Operational Metrics
- **Equipment Utilization Rate**: Target >60%
- **On-Time Return Rate**: Target >90%
- **Maintenance Compliance**: Target 100% (no overdue maintenance)
- **Average Checkout Time**: Target <5 minutes
- **Damage/Loss Rate**: Target <2%

### 11.2 Basic Cost Metrics
- **Total Asset Value**: Track total equipment portfolio value (purchase price)
- **Maintenance Cost per Asset**: Monitor maintenance expenses
- **Cost Savings**: Reduced external rentals due to better tracking

### 11.3 User Adoption Metrics
- **Active Users**: % of team using system
- **Check-Out Frequency**: Avg checkouts per week
- **Mobile App Usage**: % of mobile checkouts
- **Report Usage**: How often reports are run
- **User Satisfaction**: NPS score

---

## 12. Risk Analysis & Mitigation

### 12.1 Potential Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Users forget to return equipment | High | Medium | Automated reminders, overdue penalties |
| Equipment damage not reported | High | Medium | Mandatory condition check with photos |
| Double-booking due to system error | High | Low | Robust conflict detection, transaction locking |
| Loss of QR code labels | Medium | Medium | Backup RFID tags, easy QR regeneration |
| User adoption resistance | Medium | Medium | Training, gradual rollout, incentives |
| Data loss | High | Low | Regular backups, cloud storage |
| Mobile app performance issues | Medium | Medium | PWA as fallback, offline mode |
| Integration bugs with existing system | Medium | Medium | Comprehensive integration testing |

### 12.2 Contingency Plans
- **Manual Backup**: Paper checkout log as fallback
- **Equipment Lockdown**: Physical lock for high-value items
- **Insurance**: Equipment insurance for damage/loss
- **External Rental**: Backup rental vendors for critical equipment
- **Support Hotline**: Dedicated support for urgent issues

---

## 13. Future Enhancements (Post-Launch)

### 13.1 Financial Tracking & Depreciation (Major Feature - Planned)

**Depreciation Calculation Engine (Indonesian Standards)**:

This major feature will be implemented after the core system is stable and users have adopted the basic tracking functionality. It will include:

#### Indonesian Tax Compliance (PSAK)
- **Tax Depreciation Groups (Kelompok Harta)**:
  - Kelompok 1: 4 years (Computers, electronics)
  - Kelompok 2: 8 years (Camera equipment, production gear)
  - Kelompok 3: 16 years (Heavy machinery)
  - Kelompok 4: 20 years (Buildings)

- **Depreciation Methods**:
  - Straight-line method (Metode Garis Lurus)
  - Declining balance method (Metode Saldo Menurun)
  - Automatic calculation according to Indonesian tax law

- **Financial Reports**:
  - Depreciation schedule reports
  - Asset value tracking over time
  - Tax-compliant depreciation reports
  - Integration with accounting software (QuickBooks, Xero)

#### Features to be Added:
1. **Automated Depreciation Calculation**:
   - Nightly background job to calculate depreciation
   - Historical depreciation tracking
   - Future value projections

2. **Financial Dashboard**:
   - Total asset value (current vs. purchase)
   - Accumulated depreciation
   - Net book value
   - Depreciation expense for tax purposes

3. **Advanced Cost Analysis**:
   - Total Cost of Ownership (TCO)
   - ROI per asset
   - Cost per project analysis
   - Equipment profitability reports

4. **Tax Reporting**:
   - Generate tax-compliant asset depreciation schedules
   - Export for accountant review
   - Audit trail for all calculations

**Timeline**: Estimated 4-6 weeks after Phase 5 completion

**Prerequisites**:
- Core system fully operational
- Users comfortable with basic asset tracking
- Consultation with Indonesian tax accountant
- Approval from finance team

### 13.2 Advanced Features (6-12 months)
- **AI-Powered Predictions**: Predict equipment needs based on project schedule
- **Automated Pricing**: Calculate optimal rental rates based on usage and costs
- **Equipment Health Monitoring**: IoT sensors for real-time condition tracking
- **Blockchain Verification**: Immutable audit trail for high-value assets
- **AR Visualization**: Augmented reality for equipment manuals and troubleshooting
- **Marketplace Integration**: Rent out unused equipment to other agencies

### 13.3 Integration Opportunities
- **Calendar Integration**: Sync with Google Calendar, Outlook
- **Accounting Software**: QuickBooks, Xero integration
- **E-Procurement**: Link to supplier systems for automatic reordering
- **Insurance Platforms**: Auto-update insurance policies with asset changes
- **Project Management**: Jira, Asana, Monday.com integration

### 13.4 Scalability
- **Multi-Location**: Support for multiple offices/studios
- **Client Portal**: Let clients book equipment directly
- **Franchising**: White-label solution for other agencies
- **Equipment Rental Business**: Turn into revenue stream

---

## 14. Conclusion & Next Steps

### 14.1 Summary
This Property Management system will significantly improve equipment tracking, reduce loss/damage, ensure proper maintenance, and provide usage analytics for the digital marketing agency. The phased approach allows for gradual rollout and user adoption, with advanced financial features planned for future implementation once the core system is proven.

### 14.2 Immediate Actions
1. **Stakeholder Approval**: Review plan with management and operations team
2. **Budget Allocation**: Approve development resources
3. **Team Assignment**: Assign developers, designer, QA
4. **Data Preparation**: Start cataloging existing equipment
5. **Pilot Group**: Identify 5-10 users for beta testing

### 14.3 Timeline Summary
- **Phase 1-2**: 4 weeks (Basic asset tracking + checkout system)
- **Phase 3**: 2 weeks (Maintenance tracking)
- **Phase 4**: 2 weeks (Advanced features + integrations)
- **Phase 5**: 2 weeks (Mobile + polish)
- **Total**: 10 weeks (~2.5 months) to production
- **Future**: Depreciation system (4-6 weeks after launch)

### 14.4 Budget Estimate (Rough)
- **Development**: 10 weeks × developer rate
- **QR Code Hardware**: Labels, printers (~$500)
- **Cloud Storage**: Photo/document storage (~$50/month)
- **Mobile App**: Additional 2-4 weeks for native app (optional)
- **Training**: 2 days for team training
- **Contingency**: 20% buffer

---

## 15. Appendices

### Appendix A: Equipment List Template
- Suggested initial equipment to add
- Category structure
- Sample specifications

### Appendix B: Glossary
- **Asset**: Physical property owned by the company
- **Check-Out**: Process of assigning equipment to a user
- **Check-In**: Process of returning equipment
- **Depreciation**: Reduction in asset value over time (future feature)
- **TCO**: Total Cost of Ownership
- **MTBF**: Mean Time Between Failures
- **Utilization Rate**: Percentage of time asset is in use

### Appendix C: Sample QR Code Label Design
- Size recommendations
- Required information on label
- Placement guidelines

### Appendix D: Maintenance Checklist Templates
- Camera equipment inspection
- Lens cleaning procedure
- Lighting equipment check
- Computer/laptop maintenance

### Appendix E: Indonesian Depreciation Reference (For Future Implementation)
- Link to Indonesian tax depreciation groups
- PSAK accounting standards for assets
- Common useful life for production equipment
- Tax calculation examples

---

**Document Version**: 1.1
**Last Updated**: 2025-01-16
**Author**: System Analysis & Research
**Status**: Revised - Financial tracking moved to future enhancements
**Change Log**:
- v1.1: Moved financial tracking & depreciation to Section 13.1 (Future Enhancements)
- v1.1: Updated timeline from 12 weeks to 10 weeks (removed Phase 4)
- v1.1: Simplified database schema and API endpoints
- v1.1: Updated success metrics to focus on operational and basic cost tracking
