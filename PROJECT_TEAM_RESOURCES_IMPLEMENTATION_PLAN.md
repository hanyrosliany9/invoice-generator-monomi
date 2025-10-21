# Project Team & Resources Management - Implementation Plan

**Status:** Planning Phase - Expense Integration Analysis Complete
**Created:** October 20, 2025
**Last Updated:** October 20, 2025 (Re-analyzed for Expense System Integration)
**Priority:** Medium
**Estimated Timeline:** 3-4 weeks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Requirements & Objectives](#requirements--objectives)
4. [Database Schema Design](#database-schema-design)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Integration Points](#integration-points)
8. [Testing Strategy](#testing-strategy)
9. [Rollout Plan](#rollout-plan)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Problem Statement

The **Team & Resources** tab in `ProjectDetailPage` is currently a placeholder showing "Team management functionality is coming soon." This prevents users from:
- Assigning team members to projects
- Tracking labor hours and costs
- Managing resource allocation
- Monitoring equipment usage
- Allocating project expenses
- Viewing comprehensive project resource costs

### Proposed Solution

Implement a comprehensive Team & Resources management system that integrates with existing expense, asset, and user management systems to provide:
- **Team Assignment**: Assign users to projects with roles and hourly rates
- **Labor Tracking**: Track time spent on projects with automatic cost calculation
- **Expense Allocation**: View and allocate project expenses with cost breakdown
- **Equipment Management**: Track asset/equipment usage on projects
- **Resource Reporting**: Real-time resource utilization and cost analytics

### Expense System Integration Strategy

**CRITICAL DECISION:** Labor entries will be **automatically converted to Expense records** upon approval, ensuring:
- ✅ **Unified Expense Management**: All costs (materials, services, labor) appear in ExpensesPage
- ✅ **Single Approval Workflow**: Reuse existing expense approval infrastructure
- ✅ **Consistent Reporting**: Labor costs included in all expense reports and analytics
- ✅ **PSAK 57 Compliance**: Automatic ProjectCostAllocation creation for labor expenses
- ✅ **Tax Integration**: Labor expenses participate in Indonesian tax compliance workflows

**How it Works:**
1. Team member creates labor entry (time tracking) → Status: DRAFT
2. Submit for approval → Status: SUBMITTED
3. Manager approves → Creates Expense record with `expenseClass = LABOR_COST`
4. Expense automatically linked to project via `projectId`
5. Expense appears in ExpensesPage with filter option for "Labor Costs"
6. ProjectCostAllocation automatically created with `costType = LABOR`

### Key Benefits

1. **Unified Cost Management**: All project costs (materials, services, labor) in one system
2. **Improved Project Costing**: Accurate labor and resource cost tracking feeds into profit margin calculations
3. **Better Resource Planning**: Visibility into team allocation and availability
4. **Indonesian Compliance**: Integrates with PSAK 57 cost allocation and e-Faktur standards
5. **Profitability Insights**: Direct integration with existing profit margin tracking
6. **Operational Efficiency**: Centralized resource management per project
7. **Expense Page Integration**: Labor costs visible and filterable in ExpensesPage

---

## Current State Analysis

### Existing Infrastructure

#### **Database Models (Already Implemented)**

1. ✅ **Project Model** (`backend/prisma/schema.prisma:83`)
   - Has relations to expenses, budgets, equipment usage, cost allocations
   - Profit margin tracking fields already implemented

2. ✅ **Expense Model** (`backend/prisma/schema.prisma:1003`)
   - Comprehensive Indonesian-compliant expense tracking
   - Project relationship via `projectId` field
   - Tax compliance (PPN, e-Faktur)
   - Approval workflows

3. ✅ **ProjectCostAllocation Model** (`backend/prisma/schema.prisma:2557`)
   - Links expenses to projects
   - Allocation methods: PERCENTAGE, HOURS, DIRECT
   - Cost types: MATERIAL, LABOR, OVERHEAD, SUBCONTRACTOR, EQUIPMENT
   - Direct/indirect cost classification

4. ✅ **ProjectEquipmentUsage Model** (`backend/prisma/schema.prisma:936`)
   - Tracks asset usage on projects
   - Start/end dates, condition tracking
   - Already integrated with Asset management

5. ✅ **WorkInProgress Model** (`backend/prisma/schema.prisma:2507`)
   - PSAK 57 compliant cost accumulation
   - Tracks direct material, labor, expenses, overhead
   - Used in profit margin calculations

6. ✅ **User Model** (`backend/prisma/schema.prisma:15`)
   - User management with RBAC
   - Relations to expenses, assets, approvals
   - Roles: SUPER_ADMIN, FINANCE_MANAGER, ACCOUNTANT, PROJECT_MANAGER, STAFF, VIEWER

#### **Existing Services**

1. ✅ **ExpensesService** - Full CRUD for expenses with approval workflows
2. ✅ **ProfitCalculationService** - Integrates cost allocations into profit calculations
3. ✅ **ProjectsService** - Project CRUD with financial tracking
4. ✅ **AssetsService** - Asset management (equipment tracking)

#### **Frontend Pages**

1. ✅ **ExpensesPage** (`frontend/src/pages/ExpensesPage.tsx`)
   - List/manage all expenses with filters
   - Filter by: status, payment status, category, **project**, date range
   - Shows expense statistics and metrics
   - Supports bulk actions
   - **Ready to display labor expenses** (just needs category filter enhancement)

2. ✅ **ExpenseCreatePage** - Create new expenses with project assignment
3. ✅ **ExpenseDetailPage** - View/edit expense details
4. ✅ **ProjectDetailPage** - Project overview with profit margin card
5. ❌ **Team & Resources Tab** - Currently placeholder (to be implemented)

### What's Missing

#### **Database Models (Need to Create)**

1. ❌ **ProjectTeamMember** - Assign users to projects with roles and rates
2. ❌ **LaborEntry** - Track time/hours worked (will create Expense on approval)
3. ❌ **ResourceAllocationBudget** - Budget allocations for team resources (Optional - Phase 2)

#### **Database Schema Updates (Extend Existing)**

1. ❌ **ExpenseClass Enum** - Add `LABOR_COST` value to existing enum
2. ❌ **ExpenseCategory** - Add "Labor Costs" / "Biaya Tenaga Kerja" category
3. ❌ **Expense Model** - Add optional `laborEntryId` field for linking

#### **Backend Services (Need to Create)**

1. ❌ **ProjectTeamService** - Manage team assignments
2. ❌ **LaborTrackingService** - Track labor hours and auto-create expenses on approval
3. ❌ **ExpensesService Enhancement** - Add labor expense filtering and display logic

#### **Backend Integration Points (Need to Implement)**

1. ❌ **Labor → Expense Conversion** - Service method to create expense from labor entry
2. ❌ **Expense Category Seeding** - Add "Labor Costs" category to database seed
3. ❌ **ExpensesController Enhancement** - Support filtering by `expenseClass = LABOR_COST`

#### **Frontend Components (Need to Create)**

1. ❌ **TeamMembersTable** - Display/manage project team members
2. ❌ **LaborEntryForm** - Add/edit labor time entries
3. ❌ **ExpenseAllocationTable** - View ALL expenses (including labor) allocated to project
4. ❌ **EquipmentUsageTable** - View equipment usage on project
5. ❌ **ResourceCostSummary** - Summary cards for resource costs (labor + expenses + equipment)
6. ❌ **TeamResourcesTab** - Complete tab implementation

#### **Frontend Enhancements (Extend Existing)**

1. ❌ **ExpensesPage** - Add filter for "Labor Costs" category
2. ❌ **ExpensesPage** - Add visual indicator for labor-type expenses (icon/badge)
3. ❌ **ExpenseDetailPage** - Show linked labor entry details (if applicable)

---

## Requirements & Objectives

### Functional Requirements

#### **FR-1: Team Member Assignment**
- **FR-1.1**: Assign users to projects with specific roles (e.g., "Lead Designer", "Developer", "Project Manager")
- **FR-1.2**: Set hourly rate for each team member assignment (overrides user default rate)
- **FR-1.3**: Define assignment start/end dates
- **FR-1.4**: Set allocation percentage (e.g., 50% time on this project)
- **FR-1.5**: Mark assignments as active/inactive
- **FR-1.6**: View team member assignment history

#### **FR-2: Labor Hour Tracking**
- **FR-2.1**: Record labor hours worked on project by date
- **FR-2.2**: Support different labor types: Regular, Overtime, Holiday
- **FR-2.3**: Add descriptions/notes to labor entries
- **FR-2.4**: Auto-calculate labor cost (hours × rate)
- **FR-2.5**: Allow editing and deletion of labor entries
- **FR-2.6**: Export labor entries to timesheet

#### **FR-3: Expense Allocation Display**
- **FR-3.1**: Display all expenses allocated to project
- **FR-3.2**: Show expense details: date, amount, category, status
- **FR-3.3**: Filter expenses by category, date range, status
- **FR-3.4**: View allocation percentage for shared expenses
- **FR-3.5**: Link to full expense detail page
- **FR-3.6**: Quick allocate existing expenses to project

#### **FR-4: Equipment/Asset Usage Display**
- **FR-4.1**: Display all equipment currently in use on project
- **FR-4.2**: Show usage period (start/end dates)
- **FR-4.3**: Track asset condition before/after usage
- **FR-4.4**: View usage cost calculations
- **FR-4.5**: Link to asset detail page

#### **FR-5: Resource Cost Analytics**
- **FR-5.1**: Display total labor costs
- **FR-5.2**: Display total expense costs (allocated)
- **FR-5.3**: Display total equipment usage costs
- **FR-5.4**: Break down costs by category
- **FR-5.5**: Compare costs vs. budget
- **FR-5.6**: Export resource cost report

### Non-Functional Requirements

#### **NFR-1: Performance**
- Labor entry queries should load in < 500ms
- Team member list should support pagination (20 per page)
- Resource cost calculations should be cached

#### **NFR-2: Security**
- Only PROJECT_MANAGER and above can assign team members
- Only assigned team members can add labor entries
- FINANCE_MANAGER can view all labor costs
- STAFF can only view their own labor entries

#### **NFR-3: Data Integrity**
- Labor entries cannot overlap for same user/project
- Team member hourly rates must be > 0
- Labor hours must be > 0 and < 24 per day

#### **NFR-4: Indonesian Compliance**
- Labor costs must integrate with PSAK 57 cost allocation
- Support bilingual labels (Indonesian/English)
- Integrate with existing expense e-Faktur system

#### **NFR-5: Integration**
- Must integrate with ProfitCalculationService for cost tracking
- Must use existing ProjectCostAllocation for expense linking
- Must support existing expense approval workflows

---

## Database Schema Design

### New Models

#### **1. ProjectTeamMember**

```prisma
model ProjectTeamMember {
  id String @id @default(cuid())

  // Project Reference
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // User Reference
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Assignment Details
  role                String // "Lead Designer", "Developer", "Project Manager"
  roleId              String? // Indonesian role name
  allocationPercent   Decimal @default(100) @db.Decimal(5, 2) // % of time on this project
  hourlyRate          Decimal @db.Decimal(12, 2) // Hourly rate for this assignment
  hourlyRateCurrency  String  @default("IDR")

  // Assignment Period
  assignedDate DateTime @default(now())
  startDate    DateTime // When assignment starts
  endDate      DateTime? // When assignment ends (null = ongoing)

  // Status
  isActive Boolean @default(true)

  // Notes
  notes   String? @db.Text
  notesId String? @db.Text // Indonesian notes

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  updatedBy String?

  // Relations
  laborEntries LaborEntry[]

  @@unique([projectId, userId, assignedDate]) // Unique assignment per project/user/date
  @@index([projectId])
  @@index([userId])
  @@index([isActive])
  @@index([startDate])
  @@index([endDate])
  @@map("project_team_members")
}
```

#### **2. LaborEntry**

```prisma
model LaborEntry {
  id String @id @default(cuid())

  // Project & Team Member Reference
  projectId       String
  project         Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  teamMemberId    String
  teamMember      ProjectTeamMember @relation(fields: [teamMemberId], references: [id], onDelete: Cascade)
  userId          String
  user            User              @relation(fields: [userId], references: [id])

  // Labor Details
  workDate        DateTime // Date of work
  hoursWorked     Decimal  @db.Decimal(5, 2) // Hours worked (e.g., 8.5)
  laborType       LaborType @default(REGULAR) // REGULAR, OVERTIME, HOLIDAY
  laborTypeRate   Decimal   @db.Decimal(3, 2) // Multiplier (1.0, 1.5, 2.0)

  // Cost Calculation
  hourlyRate      Decimal @db.Decimal(12, 2) // Rate at time of entry
  laborCost       Decimal @db.Decimal(15, 2) // hours × rate × typeRate

  // Indonesian Compliance
  costType        CostType @default(LABOR) // For PSAK 57 integration
  isDirect        Boolean  @default(true)   // Direct labor cost

  // Description
  description     String? @db.Text
  descriptionId   String? @db.Text // Indonesian description
  taskPerformed   String? @db.Text // What task was worked on

  // Approval Status
  status          LaborEntryStatus @default(DRAFT)
  submittedAt     DateTime?
  approvedBy      String? // User ID
  approvedAt      DateTime?
  rejectedReason  String? @db.Text

  // ⭐ EXPENSE SYSTEM INTEGRATION
  expenseId       String? // Link to created Expense record (set on approval)
  expense         Expense? @relation(fields: [expenseId], references: [id])

  // Accounting Integration
  journalEntryId  String? // Link to journal entry when approved
  costAllocationId String? // Link to ProjectCostAllocation (created with Expense)
  costAllocation   ProjectCostAllocation? @relation(fields: [costAllocationId], references: [id])

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?
  updatedBy String?

  @@unique([teamMemberId, workDate]) // One entry per day per team member
  @@index([projectId])
  @@index([userId])
  @@index([workDate])
  @@index([status])
  @@index([teamMemberId])
  @@index([expenseId]) // ⭐ NEW: Index for expense lookup
  @@map("labor_entries")
}
```

#### **3. ResourceAllocationBudget** (Optional - Future Phase)

```prisma
model ResourceAllocationBudget {
  id String @id @default(cuid())

  // Project Reference
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Budget Period
  periodStart DateTime
  periodEnd   DateTime

  // Budget Allocations
  laborBudget     Decimal @db.Decimal(15, 2)
  materialBudget  Decimal @db.Decimal(15, 2)
  equipmentBudget Decimal @db.Decimal(15, 2)
  overheadBudget  Decimal @db.Decimal(15, 2)
  totalBudget     Decimal @db.Decimal(15, 2)

  // Actual Costs (auto-calculated)
  actualLaborCost     Decimal @default(0) @db.Decimal(15, 2)
  actualMaterialCost  Decimal @default(0) @db.Decimal(15, 2)
  actualEquipmentCost Decimal @default(0) @db.Decimal(15, 2)
  actualOverheadCost  Decimal @default(0) @db.Decimal(15, 2)
  totalActualCost     Decimal @default(0) @db.Decimal(15, 2)

  // Variance
  variance        Decimal @db.Decimal(15, 2)
  variancePercent Decimal @db.Decimal(5, 2)

  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String?

  @@unique([projectId, periodStart]) // Unique budget per project/period
  @@index([projectId])
  @@index([periodStart])
  @@map("resource_allocation_budgets")
}
```

### New Enums

```prisma
enum LaborType {
  REGULAR   // Normal working hours (1.0x rate)
  OVERTIME  // Overtime hours (1.5x rate)
  HOLIDAY   // Holiday hours (2.0x rate)
  WEEKEND   // Weekend hours (1.5x rate)
}

enum LaborEntryStatus {
  DRAFT       // Created but not submitted
  SUBMITTED   // Submitted for approval
  APPROVED    // Approved by manager (creates Expense)
  REJECTED    // Rejected by manager
  BILLED      // Included in invoice (via Expense)
}
```

### Enum Updates (Extend Existing)

```prisma
// UPDATE existing ExpenseClass enum
enum ExpenseClass {
  SELLING       // Selling expenses (existing)
  GENERAL_ADMIN // General & administrative (existing)
  OTHER         // Other operating expenses (existing)
  LABOR_COST    // ⭐ NEW: Labor/personnel costs
}
```

### Schema Updates to Existing Models

#### **Update Expense Model** ⭐ NEW

Add relation to link back to labor entries:
```prisma
model Expense {
  // ... existing fields ...

  // ⭐ LABOR ENTRY INTEGRATION
  laborEntries LaborEntry[] @relation("ExpenseLaborEntries")

  // ... rest of model ...
}
```

**Note:** No field changes needed to Expense model. The `expenseClass` enum already supports categorization, we just add new `LABOR_COST` value.

#### **Update User Model**

Add relation:
```prisma
model User {
  // ... existing fields ...

  // Team & Resources Relations
  projectAssignments ProjectTeamMember[] @relation("UserProjectAssignments")
  laborEntries       LaborEntry[]        @relation("UserLaborEntries")

  // ... rest of model ...
}
```

#### **Update Project Model**

Add relations:
```prisma
model Project {
  // ... existing fields ...

  // Team & Resources Relations
  teamMembers            ProjectTeamMember[]        @relation("ProjectTeam")
  laborEntries           LaborEntry[]               @relation("ProjectLabor")
  resourceBudgets        ResourceAllocationBudget[] @relation("ProjectResourceBudgets") // Optional

  // ... rest of model ...
}
```

#### **Update ProjectCostAllocation Model**

Add relation:
```prisma
model ProjectCostAllocation {
  // ... existing fields ...

  // Labor Entry Relation
  laborEntries LaborEntry[] @relation("CostAllocationLabor")

  // ... rest of model ...
}
```

---

## Backend Implementation

### Phase 1: Database Migration

**File:** `backend/prisma/migrations/YYYYMMDDHHMMSS_add_team_resources/migration.sql`

```sql
-- Create ProjectTeamMember table
CREATE TABLE "project_team_members" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "roleId" TEXT,
  "allocationPercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "hourlyRate" DECIMAL(12,2) NOT NULL,
  "hourlyRateCurrency" TEXT NOT NULL DEFAULT 'IDR',
  "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "notesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,

  CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- Create LaborEntry table
CREATE TABLE "labor_entries" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "teamMemberId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "hoursWorked" DECIMAL(5,2) NOT NULL,
  "laborType" TEXT NOT NULL DEFAULT 'REGULAR',
  "laborTypeRate" DECIMAL(3,2) NOT NULL,
  "hourlyRate" DECIMAL(12,2) NOT NULL,
  "laborCost" DECIMAL(15,2) NOT NULL,
  "costType" TEXT NOT NULL DEFAULT 'LABOR',
  "isDirect" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "descriptionId" TEXT,
  "taskPerformed" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "journalEntryId" TEXT,
  "costAllocationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,

  CONSTRAINT "labor_entries_pkey" PRIMARY KEY ("id")
);

-- Create enums
CREATE TYPE "LaborType" AS ENUM ('REGULAR', 'OVERTIME', 'HOLIDAY', 'WEEKEND');
CREATE TYPE "LaborEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'BILLED');

-- Create unique constraints
CREATE UNIQUE INDEX "project_team_members_projectId_userId_assignedDate_key"
  ON "project_team_members"("projectId", "userId", "assignedDate");

CREATE UNIQUE INDEX "labor_entries_teamMemberId_workDate_key"
  ON "labor_entries"("teamMemberId", "workDate");

-- Create indexes
CREATE INDEX "project_team_members_projectId_idx" ON "project_team_members"("projectId");
CREATE INDEX "project_team_members_userId_idx" ON "project_team_members"("userId");
CREATE INDEX "project_team_members_isActive_idx" ON "project_team_members"("isActive");
CREATE INDEX "project_team_members_startDate_idx" ON "project_team_members"("startDate");
CREATE INDEX "project_team_members_endDate_idx" ON "project_team_members"("endDate");

CREATE INDEX "labor_entries_projectId_idx" ON "labor_entries"("projectId");
CREATE INDEX "labor_entries_userId_idx" ON "labor_entries"("userId");
CREATE INDEX "labor_entries_workDate_idx" ON "labor_entries"("workDate");
CREATE INDEX "labor_entries_status_idx" ON "labor_entries"("status");
CREATE INDEX "labor_entries_teamMemberId_idx" ON "labor_entries"("teamMemberId");

-- Add foreign keys
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_teamMemberId_fkey"
  FOREIGN KEY ("teamMemberId") REFERENCES "project_team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "labor_entries" ADD CONSTRAINT "labor_entries_costAllocationId_fkey"
  FOREIGN KEY ("costAllocationId") REFERENCES "project_cost_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Phase 2: Backend Services

#### **2.1 ProjectTeamService**

**File:** `backend/src/modules/projects/services/project-team.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from '../dto/team-member.dto';

@Injectable()
export class ProjectTeamService {
  constructor(private prisma: PrismaService) {}

  /**
   * Assign a user to a project as a team member
   */
  async assignTeamMember(projectId: string, dto: CreateTeamMemberDto, createdBy?: string) {
    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Check for overlapping assignments
    const overlapping = await this.prisma.projectTeamMember.findFirst({
      where: {
        projectId,
        userId: dto.userId,
        isActive: true,
        OR: [
          {
            // New assignment starts before existing ends
            AND: [
              { startDate: { lte: dto.startDate } },
              {
                OR: [
                  { endDate: { gte: dto.startDate } },
                  { endDate: null },
                ],
              },
            ],
          },
          {
            // New assignment ends after existing starts
            AND: [
              { startDate: { lte: dto.endDate || new Date() } },
              {
                OR: [
                  { endDate: { gte: dto.endDate || new Date() } },
                  { endDate: null },
                ],
              },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        `User is already assigned to this project for overlapping period`
      );
    }

    // Create team member assignment
    return this.prisma.projectTeamMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
        roleId: dto.roleId,
        allocationPercent: dto.allocationPercent || 100,
        hourlyRate: dto.hourlyRate,
        hourlyRateCurrency: dto.hourlyRateCurrency || 'IDR',
        startDate: dto.startDate,
        endDate: dto.endDate,
        notes: dto.notes,
        notesId: dto.notesId,
        createdBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get all team members for a project
   */
  async getProjectTeamMembers(
    projectId: string,
    options?: {
      includeInactive?: boolean;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = { projectId };

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    if (options?.startDate || options?.endDate) {
      where.AND = [];

      if (options.startDate) {
        where.AND.push({
          OR: [
            { endDate: { gte: options.startDate } },
            { endDate: null },
          ],
        });
      }

      if (options.endDate) {
        where.AND.push({
          startDate: { lte: options.endDate },
        });
      }
    }

    return this.prisma.projectTeamMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            laborEntries: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
    });
  }

  /**
   * Update team member assignment
   */
  async updateTeamMember(
    projectId: string,
    teamMemberId: string,
    dto: UpdateTeamMemberDto,
    updatedBy?: string
  ) {
    // Verify team member belongs to project
    const teamMember = await this.prisma.projectTeamMember.findFirst({
      where: {
        id: teamMemberId,
        projectId,
      },
    });

    if (!teamMember) {
      throw new NotFoundException(`Team member not found on this project`);
    }

    return this.prisma.projectTeamMember.update({
      where: { id: teamMemberId },
      data: {
        ...dto,
        updatedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Remove team member from project (soft delete)
   */
  async removeTeamMember(projectId: string, teamMemberId: string) {
    const teamMember = await this.prisma.projectTeamMember.findFirst({
      where: {
        id: teamMemberId,
        projectId,
      },
    });

    if (!teamMember) {
      throw new NotFoundException(`Team member not found on this project`);
    }

    return this.prisma.projectTeamMember.update({
      where: { id: teamMemberId },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    });
  }

  /**
   * Get team member details
   */
  async getTeamMemberById(projectId: string, teamMemberId: string) {
    const teamMember = await this.prisma.projectTeamMember.findFirst({
      where: {
        id: teamMemberId,
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        laborEntries: {
          orderBy: { workDate: 'desc' },
          take: 10, // Recent 10 entries
        },
      },
    });

    if (!teamMember) {
      throw new NotFoundException(`Team member not found on this project`);
    }

    return teamMember;
  }

  /**
   * Get team resource costs summary
   */
  async getTeamResourceCosts(projectId: string) {
    // Get all labor entries for project
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: {
        projectId,
        status: { in: ['APPROVED', 'BILLED'] },
      },
      select: {
        laborCost: true,
        laborType: true,
        hoursWorked: true,
      },
    });

    // Calculate totals
    const totalLaborCost = laborEntries.reduce(
      (sum, entry) => sum + this.toNumber(entry.laborCost),
      0
    );

    const totalHours = laborEntries.reduce(
      (sum, entry) => sum + this.toNumber(entry.hoursWorked),
      0
    );

    // Get expense allocations
    const expenseAllocations = await this.prisma.projectCostAllocation.findMany({
      where: {
        projectId,
        costType: { not: 'LABOR' },
      },
      select: {
        allocatedAmount: true,
        costType: true,
      },
    });

    const totalExpenseCost = expenseAllocations.reduce(
      (sum, alloc) => sum + this.toNumber(alloc.allocatedAmount),
      0
    );

    // Get equipment usage costs
    const equipmentUsage = await this.prisma.projectEquipmentUsage.findMany({
      where: { projectId },
      include: {
        asset: {
          select: {
            costPerDay: true,
          },
        },
      },
    });

    const totalEquipmentCost = equipmentUsage.reduce((sum, usage) => {
      const days = usage.returnDate
        ? Math.ceil(
            (usage.returnDate.getTime() - usage.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
      return sum + days * this.toNumber(usage.asset.costPerDay || 0);
    }, 0);

    return {
      labor: {
        totalCost: totalLaborCost,
        totalHours,
        averageRate: totalHours > 0 ? totalLaborCost / totalHours : 0,
      },
      expenses: {
        totalCost: totalExpenseCost,
      },
      equipment: {
        totalCost: totalEquipmentCost,
      },
      total: totalLaborCost + totalExpenseCost + totalEquipmentCost,
    };
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value.toString()) || 0;
  }
}
```

#### **2.2 LaborTrackingService**

**File:** `backend/src/modules/projects/services/labor-tracking.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateLaborEntryDto, UpdateLaborEntryDto } from '../dto/labor-entry.dto';

@Injectable()
export class LaborTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a labor entry
   */
  async createLaborEntry(dto: CreateLaborEntryDto, createdBy?: string) {
    // Verify team member exists and is active
    const teamMember = await this.prisma.projectTeamMember.findUnique({
      where: { id: dto.teamMemberId },
      include: {
        project: true,
        user: true,
      },
    });

    if (!teamMember) {
      throw new NotFoundException(`Team member not found`);
    }

    if (!teamMember.isActive) {
      throw new BadRequestException(`Team member is not active on this project`);
    }

    // Check if labor entry already exists for this date
    const existing = await this.prisma.laborEntry.findUnique({
      where: {
        teamMemberId_workDate: {
          teamMemberId: dto.teamMemberId,
          workDate: dto.workDate,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Labor entry already exists for this team member on ${dto.workDate.toISOString().split('T')[0]}`
      );
    }

    // Validate hours (0-24)
    if (dto.hoursWorked <= 0 || dto.hoursWorked > 24) {
      throw new BadRequestException(`Hours worked must be between 0 and 24`);
    }

    // Determine labor type rate multiplier
    const laborTypeRate = this.getLaborTypeRate(dto.laborType || 'REGULAR');

    // Calculate labor cost
    const hourlyRate = dto.hourlyRate || teamMember.hourlyRate;
    const laborCost = new Decimal(dto.hoursWorked)
      .times(hourlyRate)
      .times(laborTypeRate);

    // Create labor entry
    const laborEntry = await this.prisma.laborEntry.create({
      data: {
        projectId: teamMember.projectId,
        teamMemberId: dto.teamMemberId,
        userId: teamMember.userId,
        workDate: dto.workDate,
        hoursWorked: dto.hoursWorked,
        laborType: dto.laborType || 'REGULAR',
        laborTypeRate,
        hourlyRate,
        laborCost,
        description: dto.description,
        descriptionId: dto.descriptionId,
        taskPerformed: dto.taskPerformed,
        createdBy,
      },
      include: {
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return laborEntry;
  }

  /**
   * Get labor entries for a project
   */
  async getProjectLaborEntries(
    projectId: string,
    options?: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ) {
    const where: any = { projectId };

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.startDate || options?.endDate) {
      where.workDate = {};
      if (options.startDate) {
        where.workDate.gte = options.startDate;
      }
      if (options.endDate) {
        where.workDate.lte = options.endDate;
      }
    }

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.laborEntry.findMany({
      where,
      include: {
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { workDate: 'desc' },
    });
  }

  /**
   * Update labor entry
   */
  async updateLaborEntry(
    laborEntryId: string,
    dto: UpdateLaborEntryDto,
    updatedBy?: string
  ) {
    const laborEntry = await this.prisma.laborEntry.findUnique({
      where: { id: laborEntryId },
      include: {
        teamMember: true,
      },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry not found`);
    }

    // Can only update DRAFT entries
    if (laborEntry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot update labor entry with status ${laborEntry.status}`
      );
    }

    // Recalculate cost if hours or rate changed
    let laborCost = laborEntry.laborCost;
    if (dto.hoursWorked !== undefined || dto.hourlyRate !== undefined) {
      const hours = dto.hoursWorked || laborEntry.hoursWorked;
      const rate = dto.hourlyRate || laborEntry.hourlyRate;
      const typeRate = dto.laborType
        ? this.getLaborTypeRate(dto.laborType)
        : laborEntry.laborTypeRate;

      laborCost = new Decimal(hours).times(rate).times(typeRate);
    }

    return this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        ...dto,
        laborCost,
        laborTypeRate: dto.laborType
          ? this.getLaborTypeRate(dto.laborType)
          : undefined,
        updatedBy,
      },
      include: {
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Submit labor entry for approval
   */
  async submitLaborEntry(laborEntryId: string) {
    const laborEntry = await this.prisma.laborEntry.findUnique({
      where: { id: laborEntryId },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry not found`);
    }

    if (laborEntry.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot submit labor entry with status ${laborEntry.status}`
      );
    }

    return this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  /**
   * Approve labor entry
   * ⭐ CREATES EXPENSE RECORD for unified expense management
   */
  async approveLaborEntry(laborEntryId: string, approvedBy: string) {
    const laborEntry = await this.prisma.laborEntry.findUnique({
      where: { id: laborEntryId },
      include: {
        teamMember: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry not found`);
    }

    if (laborEntry.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot approve labor entry with status ${laborEntry.status}`
      );
    }

    // ⭐ STEP 1: Get "Labor Costs" expense category
    const laborCategory = await this.prisma.expenseCategory.findFirst({
      where: {
        OR: [
          { name: 'Labor Costs' },
          { name: 'Biaya Tenaga Kerja' },
          { code: 'LABOR' },
        ],
      },
    });

    if (!laborCategory) {
      throw new BadRequestException(
        'Labor Costs expense category not found. Please run database seeding.'
      );
    }

    // ⭐ STEP 2: Create Expense record from labor entry
    const expense = await this.prisma.expense.create({
      data: {
        // Generated numbers (use existing expense numbering logic)
        expenseNumber: await this.generateExpenseNumber(),
        buktiPengeluaranNumber: await this.generateBuktiNumber(),

        // Classification
        expenseClass: 'LABOR_COST', // ⭐ NEW enum value
        categoryId: laborCategory.id,

        // PSAK Account (use labor expense account)
        accountCode: '6-2010', // Example: Labor expense account
        accountName: 'Biaya Tenaga Kerja',
        accountNameEn: 'Labor Costs',

        // Description
        description: `Labor: ${laborEntry.teamMember.user.name} - ${laborEntry.hoursWorked}h on ${laborEntry.workDate.toISOString().split('T')[0]}`,
        descriptionId: `Biaya Tenaga Kerja: ${laborEntry.teamMember.user.name} - ${laborEntry.hoursWorked} jam`,
        descriptionEn: laborEntry.description || laborEntry.taskPerformed,

        // Amounts (labor costs are not subject to PPN)
        grossAmount: laborEntry.laborCost,
        netAmount: laborEntry.laborCost,
        totalAmount: laborEntry.laborCost,
        ppnAmount: new Decimal(0), // No VAT on labor
        ppnRate: new Decimal(0),
        ppnCategory: 'EXEMPT', // Labor costs are VAT-exempt

        // E-Faktur (not required for labor)
        eFakturStatus: 'NOT_REQUIRED',

        // Vendor info (employee)
        vendorName: laborEntry.teamMember.user.name,

        // Dates
        expenseDate: laborEntry.workDate,
        currency: 'IDR',

        // Relationships
        userId: laborEntry.userId,
        projectId: laborEntry.projectId,

        // Billable tracking
        isBillable: false, // Internal labor costs are not billable
        isTaxDeductible: true,

        // Approval (automatically approved since labor entry is approved)
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: approvedBy,
        submittedAt: new Date(),

        // Payment (mark as paid if internal labor)
        paymentStatus: 'PAID', // Internal labor considered paid
        paidAt: new Date(),

        tags: ['labor', 'timesheet', laborEntry.laborType.toLowerCase()],
      },
    });

    // ⭐ STEP 3: Create project cost allocation
    const costAllocation = await this.prisma.projectCostAllocation.create({
      data: {
        projectId: laborEntry.projectId,
        expenseId: expense.id, // ⭐ Link to created expense
        allocationDate: laborEntry.workDate,
        allocationMethod: 'DIRECT',
        allocatedAmount: laborEntry.laborCost,
        costType: 'LABOR',
        isDirect: laborEntry.isDirect,
        notes: `Labor: ${laborEntry.hoursWorked}h @ ${laborEntry.hourlyRate} IDR/h (${laborEntry.laborType})`,
        createdBy: approvedBy,
      },
    });

    // ⭐ STEP 4: Update labor entry with links to expense and cost allocation
    return this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        expenseId: expense.id, // ⭐ Link to expense
        costAllocationId: costAllocation.id,
      },
      include: {
        expense: true, // Include created expense in response
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Generate expense number (reuse existing logic or implement)
   */
  private async generateExpenseNumber(): Promise<string> {
    // TODO: Use existing expense numbering logic
    const year = new Date().getFullYear();
    const count = await this.prisma.expense.count();
    return `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Generate bukti pengeluaran number
   */
  private async generateBuktiNumber(): Promise<string> {
    // TODO: Use existing bukti numbering logic
    const year = new Date().getFullYear();
    const count = await this.prisma.expense.count();
    return `BKK-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Reject labor entry
   */
  async rejectLaborEntry(
    laborEntryId: string,
    approvedBy: string,
    reason: string
  ) {
    const laborEntry = await this.prisma.laborEntry.findUnique({
      where: { id: laborEntryId },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry not found`);
    }

    if (laborEntry.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot reject labor entry with status ${laborEntry.status}`
      );
    }

    return this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        status: 'REJECTED',
        approvedBy,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });
  }

  /**
   * Delete labor entry
   */
  async deleteLaborEntry(laborEntryId: string) {
    const laborEntry = await this.prisma.laborEntry.findUnique({
      where: { id: laborEntryId },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry not found`);
    }

    // Can only delete DRAFT or REJECTED entries
    if (!['DRAFT', 'REJECTED'].includes(laborEntry.status)) {
      throw new BadRequestException(
        `Cannot delete labor entry with status ${laborEntry.status}`
      );
    }

    return this.prisma.laborEntry.delete({
      where: { id: laborEntryId },
    });
  }

  /**
   * Get labor type rate multiplier
   */
  private getLaborTypeRate(laborType: string): number {
    const rates = {
      REGULAR: 1.0,
      OVERTIME: 1.5,
      HOLIDAY: 2.0,
      WEEKEND: 1.5,
    };

    return rates[laborType as keyof typeof rates] || 1.0;
  }
}
```

#### **2.3 DTOs**

**File:** `backend/src/modules/projects/dto/team-member.dto.ts`

```typescript
import { IsString, IsNumber, IsDate, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamMemberDto {
  @ApiProperty({ description: 'User ID to assign to project' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role on project (e.g., "Lead Designer")' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ description: 'Indonesian role name' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Allocation percentage (0-100)', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @ApiProperty({ description: 'Hourly rate in IDR' })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'IDR' })
  @IsOptional()
  @IsString()
  hourlyRateCurrency?: string;

  @ApiProperty({ description: 'Assignment start date' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional({ description: 'Assignment end date (null = ongoing)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Indonesian notes' })
  @IsOptional()
  @IsString()
  notesId?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ description: 'Role on project' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Indonesian role name' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Allocation percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercent?: number;

  @ApiPropertyOptional({ description: 'Hourly rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Assignment end date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Indonesian notes' })
  @IsOptional()
  @IsString()
  notesId?: string;
}
```

**File:** `backend/src/modules/projects/dto/labor-entry.dto.ts`

```typescript
import { IsString, IsNumber, IsDate, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LaborType {
  REGULAR = 'REGULAR',
  OVERTIME = 'OVERTIME',
  HOLIDAY = 'HOLIDAY',
  WEEKEND = 'WEEKEND',
}

export class CreateLaborEntryDto {
  @ApiProperty({ description: 'Team member ID' })
  @IsString()
  teamMemberId: string;

  @ApiProperty({ description: 'Work date' })
  @Type(() => Date)
  @IsDate()
  workDate: Date;

  @ApiProperty({ description: 'Hours worked (0-24)' })
  @IsNumber()
  @Min(0.1)
  @Max(24)
  hoursWorked: number;

  @ApiPropertyOptional({ description: 'Labor type', enum: LaborType, default: LaborType.REGULAR })
  @IsOptional()
  @IsEnum(LaborType)
  laborType?: LaborType;

  @ApiPropertyOptional({ description: 'Override hourly rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Work description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Indonesian description' })
  @IsOptional()
  @IsString()
  descriptionId?: string;

  @ApiPropertyOptional({ description: 'Task performed' })
  @IsOptional()
  @IsString()
  taskPerformed?: string;
}

export class UpdateLaborEntryDto {
  @ApiPropertyOptional({ description: 'Hours worked' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(24)
  hoursWorked?: number;

  @ApiPropertyOptional({ description: 'Labor type', enum: LaborType })
  @IsOptional()
  @IsEnum(LaborType)
  laborType?: LaborType;

  @ApiPropertyOptional({ description: 'Override hourly rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Work description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Indonesian description' })
  @IsOptional()
  @IsString()
  descriptionId?: string;

  @ApiPropertyOptional({ description: 'Task performed' })
  @IsOptional()
  @IsString()
  taskPerformed?: string;
}

export class RejectLaborEntryDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;
}
```

#### **2.4 Controllers**

**File:** `backend/src/modules/projects/controllers/project-team.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ProjectTeamService } from '../services/project-team.service';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from '../dto/team-member.dto';

@ApiTags('Project Team')
@Controller('projects/:projectId/team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectTeamController {
  constructor(private readonly projectTeamService: ProjectTeamService) {}

  @Post()
  @Roles('PROJECT_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign team member to project' })
  @ApiResponse({ status: 201, description: 'Team member assigned successfully' })
  async assignTeamMember(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTeamMemberDto,
    @Req() req: any
  ) {
    return this.projectTeamService.assignTeamMember(projectId, dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get project team members' })
  @ApiResponse({ status: 200, description: 'Team members retrieved successfully' })
  async getTeamMembers(
    @Param('projectId') projectId: string,
    @Query('includeInactive') includeInactive?: string
  ) {
    return this.projectTeamService.getProjectTeamMembers(projectId, {
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('costs')
  @ApiOperation({ summary: 'Get team resource costs summary' })
  @ApiResponse({ status: 200, description: 'Resource costs retrieved successfully' })
  async getResourceCosts(@Param('projectId') projectId: string) {
    return this.projectTeamService.getTeamResourceCosts(projectId);
  }

  @Get(':teamMemberId')
  @ApiOperation({ summary: 'Get team member details' })
  @ApiResponse({ status: 200, description: 'Team member retrieved successfully' })
  async getTeamMember(
    @Param('projectId') projectId: string,
    @Param('teamMemberId') teamMemberId: string
  ) {
    return this.projectTeamService.getTeamMemberById(projectId, teamMemberId);
  }

  @Put(':teamMemberId')
  @Roles('PROJECT_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update team member assignment' })
  @ApiResponse({ status: 200, description: 'Team member updated successfully' })
  async updateTeamMember(
    @Param('projectId') projectId: string,
    @Param('teamMemberId') teamMemberId: string,
    @Body() dto: UpdateTeamMemberDto,
    @Req() req: any
  ) {
    return this.projectTeamService.updateTeamMember(
      projectId,
      teamMemberId,
      dto,
      req.user.id
    );
  }

  @Delete(':teamMemberId')
  @Roles('PROJECT_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove team member from project' })
  @ApiResponse({ status: 200, description: 'Team member removed successfully' })
  async removeTeamMember(
    @Param('projectId') projectId: string,
    @Param('teamMemberId') teamMemberId: string
  ) {
    return this.projectTeamService.removeTeamMember(projectId, teamMemberId);
  }
}
```

**File:** `backend/src/modules/projects/controllers/labor-tracking.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LaborTrackingService } from '../services/labor-tracking.service';
import { CreateLaborEntryDto, UpdateLaborEntryDto, RejectLaborEntryDto } from '../dto/labor-entry.dto';

@ApiTags('Labor Tracking')
@Controller('projects/:projectId/labor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LaborTrackingController {
  constructor(private readonly laborTrackingService: LaborTrackingService) {}

  @Post()
  @ApiOperation({ summary: 'Create labor entry' })
  @ApiResponse({ status: 201, description: 'Labor entry created successfully' })
  async createLaborEntry(
    @Param('projectId') _projectId: string,
    @Body() dto: CreateLaborEntryDto,
    @Req() req: any
  ) {
    return this.laborTrackingService.createLaborEntry(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get project labor entries' })
  @ApiResponse({ status: 200, description: 'Labor entries retrieved successfully' })
  async getLaborEntries(
    @Param('projectId') projectId: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string
  ) {
    return this.laborTrackingService.getProjectLaborEntries(projectId, {
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });
  }

  @Put(':laborEntryId')
  @ApiOperation({ summary: 'Update labor entry' })
  @ApiResponse({ status: 200, description: 'Labor entry updated successfully' })
  async updateLaborEntry(
    @Param('projectId') _projectId: string,
    @Param('laborEntryId') laborEntryId: string,
    @Body() dto: UpdateLaborEntryDto,
    @Req() req: any
  ) {
    return this.laborTrackingService.updateLaborEntry(laborEntryId, dto, req.user.id);
  }

  @Post(':laborEntryId/submit')
  @ApiOperation({ summary: 'Submit labor entry for approval' })
  @ApiResponse({ status: 200, description: 'Labor entry submitted successfully' })
  async submitLaborEntry(
    @Param('projectId') _projectId: string,
    @Param('laborEntryId') laborEntryId: string
  ) {
    return this.laborTrackingService.submitLaborEntry(laborEntryId);
  }

  @Post(':laborEntryId/approve')
  @Roles('PROJECT_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve labor entry' })
  @ApiResponse({ status: 200, description: 'Labor entry approved successfully' })
  async approveLaborEntry(
    @Param('projectId') _projectId: string,
    @Param('laborEntryId') laborEntryId: string,
    @Req() req: any
  ) {
    return this.laborTrackingService.approveLaborEntry(laborEntryId, req.user.id);
  }

  @Post(':laborEntryId/reject')
  @Roles('PROJECT_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject labor entry' })
  @ApiResponse({ status: 200, description: 'Labor entry rejected successfully' })
  async rejectLaborEntry(
    @Param('projectId') _projectId: string,
    @Param('laborEntryId') laborEntryId: string,
    @Body() dto: RejectLaborEntryDto,
    @Req() req: any
  ) {
    return this.laborTrackingService.rejectLaborEntry(
      laborEntryId,
      req.user.id,
      dto.reason
    );
  }

  @Delete(':laborEntryId')
  @ApiOperation({ summary: 'Delete labor entry' })
  @ApiResponse({ status: 200, description: 'Labor entry deleted successfully' })
  async deleteLaborEntry(
    @Param('projectId') _projectId: string,
    @Param('laborEntryId') laborEntryId: string
  ) {
    return this.laborTrackingService.deleteLaborEntry(laborEntryId);
  }
}
```

#### **2.5 Module Registration**

**File:** `backend/src/modules/projects/projects.module.ts` (Update)

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProfitCalculationService } from './profit-calculation.service';
import { ProjectTeamController } from './controllers/project-team.controller';
import { LaborTrackingController } from './controllers/labor-tracking.controller';
import { ProjectTeamService } from './services/project-team.service';
import { LaborTrackingService } from './services/labor-tracking.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProjectsController,
    ProjectTeamController,
    LaborTrackingController,
  ],
  providers: [
    ProjectsService,
    ProfitCalculationService,
    ProjectTeamService,
    LaborTrackingService,
  ],
  exports: [
    ProjectsService,
    ProfitCalculationService,
    ProjectTeamService,
    LaborTrackingService,
  ],
})
export class ProjectsModule {}
```

---

## Frontend Implementation

### Expense System Integration (Critical)

#### **ExpensesPage Enhancement**

The existing `ExpensesPage` already supports filtering by project. We need to add:

1. **Labor Costs Filter** - Add category filter option for "Labor Costs"
2. **Visual Indicator** - Show icon/badge for labor-type expenses
3. **Enhanced Display** - Show labor-specific details (hours, rate, labor type)

**Implementation:**

```typescript
// frontend/src/pages/ExpensesPage.tsx (Update)

// Add labor type indicator in table columns
{
  title: 'Type',
  dataIndex: 'expenseClass',
  key: 'expenseClass',
  render: (expenseClass: string, record: Expense) => {
    if (expenseClass === 'LABOR_COST') {
      return (
        <Space>
          <Badge color="blue" />
          <ClockCircleOutlined />
          <Text>Labor</Text>
        </Space>
      );
    }
    return <Text>{expenseClass}</Text>;
  },
},

// Add quick filter button for labor costs
<Button
  icon={<ClockCircleOutlined />}
  onClick={() => setCategoryFilter(laborCategoryId)}
>
  Labor Costs
</Button>
```

#### **ExpenseDetailPage Enhancement**

Show linked labor entry details when viewing a labor expense:

```typescript
// frontend/src/pages/ExpenseDetailPage.tsx (Update)

{expense.expenseClass === 'LABOR_COST' && expense.laborEntries?.[0] && (
  <Card title="Labor Entry Details" size="small">
    <Descriptions column={2}>
      <Descriptions.Item label="Hours Worked">
        {expense.laborEntries[0].hoursWorked}h
      </Descriptions.Item>
      <Descriptions.Item label="Labor Type">
        {expense.laborEntries[0].laborType}
      </Descriptions.Item>
      <Descriptions.Item label="Hourly Rate">
        {formatIDR(expense.laborEntries[0].hourlyRate)}
      </Descriptions.Item>
      <Descriptions.Item label="Task Performed">
        {expense.laborEntries[0].taskPerformed}
      </Descriptions.Item>
    </Descriptions>
  </Card>
)}
```

### Phase 3: Frontend Components

#### **3.1 TypeScript Interfaces**

**File:** `frontend/src/types/project-team.ts`

```typescript
export interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  roleId?: string;
  allocationPercent: number;
  hourlyRate: number;
  hourlyRateCurrency: string;
  assignedDate: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  notesId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  _count?: {
    laborEntries: number;
  };
}

export interface LaborEntry {
  id: string;
  projectId: string;
  teamMemberId: string;
  userId: string;
  workDate: string;
  hoursWorked: number;
  laborType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'WEEKEND';
  laborTypeRate: number;
  hourlyRate: number;
  laborCost: number;
  costType: string;
  isDirect: boolean;
  description?: string;
  descriptionId?: string;
  taskPerformed?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'BILLED';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  teamMember: ProjectTeamMember;
}

export interface ResourceCostSummary {
  labor: {
    totalCost: number;
    totalHours: number;
    averageRate: number;
  };
  expenses: {
    totalCost: number;
  };
  equipment: {
    totalCost: number;
  };
  total: number;
}

export interface CreateTeamMemberDto {
  userId: string;
  role: string;
  roleId?: string;
  allocationPercent?: number;
  hourlyRate: number;
  hourlyRateCurrency?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  notesId?: string;
}

export interface CreateLaborEntryDto {
  teamMemberId: string;
  workDate: string;
  hoursWorked: number;
  laborType?: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'WEEKEND';
  hourlyRate?: number;
  description?: string;
  descriptionId?: string;
  taskPerformed?: string;
}
```

#### **3.2 API Service**

**File:** `frontend/src/services/project-team.ts`

```typescript
import { apiClient } from '../config/api';
import {
  ProjectTeamMember,
  LaborEntry,
  ResourceCostSummary,
  CreateTeamMemberDto,
  CreateLaborEntryDto,
} from '../types/project-team';

export const projectTeamService = {
  // Team Members
  async getTeamMembers(projectId: string, includeInactive = false): Promise<ProjectTeamMember[]> {
    const response = await apiClient.get(
      `/projects/${projectId}/team?includeInactive=${includeInactive}`
    );
    return response?.data?.data ?? [];
  },

  async assignTeamMember(projectId: string, data: CreateTeamMemberDto): Promise<ProjectTeamMember> {
    const response = await apiClient.post(`/projects/${projectId}/team`, data);
    return response?.data?.data;
  },

  async updateTeamMember(
    projectId: string,
    teamMemberId: string,
    data: Partial<CreateTeamMemberDto>
  ): Promise<ProjectTeamMember> {
    const response = await apiClient.put(`/projects/${projectId}/team/${teamMemberId}`, data);
    return response?.data?.data;
  },

  async removeTeamMember(projectId: string, teamMemberId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/team/${teamMemberId}`);
  },

  async getResourceCosts(projectId: string): Promise<ResourceCostSummary> {
    const response = await apiClient.get(`/projects/${projectId}/team/costs`);
    return response?.data?.data;
  },

  // Labor Entries
  async getLaborEntries(
    projectId: string,
    params?: {
      userId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<LaborEntry[]> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get(
      `/projects/${projectId}/labor?${queryParams.toString()}`
    );
    return response?.data?.data ?? [];
  },

  async createLaborEntry(projectId: string, data: CreateLaborEntryDto): Promise<LaborEntry> {
    const response = await apiClient.post(`/projects/${projectId}/labor`, data);
    return response?.data?.data;
  },

  async updateLaborEntry(
    projectId: string,
    laborEntryId: string,
    data: Partial<CreateLaborEntryDto>
  ): Promise<LaborEntry> {
    const response = await apiClient.put(`/projects/${projectId}/labor/${laborEntryId}`, data);
    return response?.data?.data;
  },

  async submitLaborEntry(projectId: string, laborEntryId: string): Promise<LaborEntry> {
    const response = await apiClient.post(`/projects/${projectId}/labor/${laborEntryId}/submit`);
    return response?.data?.data;
  },

  async approveLaborEntry(projectId: string, laborEntryId: string): Promise<LaborEntry> {
    const response = await apiClient.post(`/projects/${projectId}/labor/${laborEntryId}/approve`);
    return response?.data?.data;
  },

  async rejectLaborEntry(
    projectId: string,
    laborEntryId: string,
    reason: string
  ): Promise<LaborEntry> {
    const response = await apiClient.post(`/projects/${projectId}/labor/${laborEntryId}/reject`, {
      reason,
    });
    return response?.data?.data;
  },

  async deleteLaborEntry(projectId: string, laborEntryId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/labor/${laborEntryId}`);
  },
};
```

#### **3.3 Team Resources Tab Component**

**File:** `frontend/src/components/projects/TeamResourcesTab.tsx`

```typescript
import React, { useState } from 'react';
import { Card, Tabs, Space } from 'antd';
import { TeamOutlined, ClockCircleOutlined, DollarOutlined, ToolOutlined } from '@ant-design/icons';
import { TeamMembersTable } from './TeamMembersTable';
import { LaborEntriesTable } from './LaborEntriesTable';
import { ExpenseAllocationsTable } from './ExpenseAllocationsTable';
import { EquipmentUsageTable } from './EquipmentUsageTable';
import { ResourceCostSummary } from './ResourceCostSummary';
import { Project } from '../../services/projects';

interface TeamResourcesTabProps {
  project: Project;
}

export const TeamResourcesTab: React.FC<TeamResourcesTabProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState('team');

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Resource Cost Summary Cards */}
      <ResourceCostSummary projectId={project.id} />

      {/* Tabbed Content */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'team',
              label: (
                <span>
                  <TeamOutlined />
                  Team Members
                </span>
              ),
              children: <TeamMembersTable projectId={project.id} />,
            },
            {
              key: 'labor',
              label: (
                <span>
                  <ClockCircleOutlined />
                  Labor Entries
                </span>
              ),
              children: <LaborEntriesTable projectId={project.id} />,
            },
            {
              key: 'expenses',
              label: (
                <span>
                  <DollarOutlined />
                  Expense Allocations
                </span>
              ),
              children: <ExpenseAllocationsTable projectId={project.id} />,
            },
            {
              key: 'equipment',
              label: (
                <span>
                  <ToolOutlined />
                  Equipment Usage
                </span>
              ),
              children: <EquipmentUsageTable projectId={project.id} />,
            },
          ]}
        />
      </Card>
    </Space>
  );
};
```

*Note: Due to character limits, I'll provide the implementation plan structure for the remaining components. The full component implementations would include:*

- **TeamMembersTable.tsx** - Table with add/edit/remove team members
- **LaborEntriesTable.tsx** - Labor time tracking table with approval workflow
- **ExpenseAllocationsTable.tsx** - View expenses allocated to project
- **EquipmentUsageTable.tsx** - View equipment usage on project
- **ResourceCostSummary.tsx** - Summary cards for labor/expense/equipment costs
- **AddTeamMemberModal.tsx** - Modal form to assign team members
- **AddLaborEntryModal.tsx** - Modal form to add labor entries

---

## Integration Points

### 1. ⭐ Expense System Integration (PRIMARY)

**Critical Integration:** Labor entries create Expense records automatically on approval.

#### **Database Level:**
- `LaborEntry.expenseId` → Links to created `Expense.id`
- `Expense.expenseClass = LABOR_COST` → Identifies labor-type expenses
- `Expense.laborEntries` → Reverse relation for querying

#### **Service Level:**
```typescript
// LaborTrackingService.approveLaborEntry() creates:
// 1. Expense record (expenseClass = LABOR_COST)
// 2. ProjectCostAllocation (costType = LABOR)
// 3. Updates LaborEntry with expenseId link
```

#### **Frontend Integration:**
- **ExpensesPage** displays labor expenses with visual indicators
- Filter by category: "Labor Costs"
- Filter by expenseClass: "LABOR_COST"
- Labor expenses show hours, rate, labor type in detail view
- Project filter automatically includes labor costs

#### **Workflow:**
```
Labor Entry (DRAFT)
  → Submit (SUBMITTED)
  → Approve
    → Create Expense (APPROVED, PAID)
    → Create ProjectCostAllocation
    → Update LaborEntry (expenseId set)
  → Appears in ExpensesPage
  → Included in Project expenses list
  → Feeds into Profit Margin calculations
```

### 2. Profit Margin Integration

**Update:** `backend/src/modules/projects/profit-calculation.service.ts`

The labor costs will automatically be included in profit calculations via `ProjectCostAllocation`:

```typescript
// Existing method already includes labor costs
private async calculateDirectCosts(projectId: string) {
  const allocations = await this.prisma.projectCostAllocation.findMany({
    where: {
      projectId,
      isDirect: true,
      costType: { in: ['MATERIAL', 'LABOR'] }, // LABOR included
    },
    select: { allocatedAmount: true },
  });
  // ... rest of calculation
}
```

**No changes needed** - profit calculation service automatically picks up labor costs through ProjectCostAllocation.

### 3. Project Expenses Display

**Team & Resources Tab** shows:
- Regular expenses (materials, services)
- Labor expenses (from approved labor entries)
- Equipment usage costs
- **All unified in single expense view**

**ExpenseAllocationTable Component:**
```typescript
// Shows ALL expenses for project (including labor)
const { data: expenses } = useQuery({
  queryKey: ['expenses', { projectId }],
  queryFn: () => expenseService.getExpenses({ projectId }),
});

// Expenses include:
// - Regular expenses (categoryId = materials/services/etc)
// - Labor expenses (expenseClass = LABOR_COST)
```

### 4. Asset/Equipment Integration

Equipment usage costs can be calculated from `ProjectEquipmentUsage` table (already exists).

### 5. Database Seeding Integration

**Required seed data:**
```typescript
// backend/src/scripts/seed.ts (Update)

// Add Labor Costs expense category
await prisma.expenseCategory.create({
  data: {
    code: 'LABOR',
    name: 'Labor Costs',
    nameId: 'Biaya Tenaga Kerja',
    description: 'Labor and personnel costs',
    descriptionId: 'Biaya tenaga kerja dan personel',
    isActive: true,
  },
});
```

---

## Testing Strategy

### Unit Tests
- ✅ ProjectTeamService methods
- ✅ LaborTrackingService methods
- ✅ Labor cost calculations
- ✅ Validation logic

### Integration Tests
- ✅ Team member assignment workflow
- ✅ Labor entry approval workflow
- ✅ Cost allocation integration
- ✅ Profit margin calculation with labor costs

### E2E Tests
- ✅ Complete team assignment flow
- ✅ Labor entry submission and approval
- ✅ Resource cost reporting

---

## Rollout Plan

### Week 1: Database & Backend Foundation
**Database:**
- ✅ Update ExpenseClass enum (add LABOR_COST)
- ✅ Create ProjectTeamMember model migration
- ✅ Create LaborEntry model migration (with expenseId link)
- ✅ Add Expense.laborEntries relation
- ✅ Seed "Labor Costs" expense category

**Backend Services:**
- ✅ Implement ProjectTeamService
- ✅ Implement LaborTrackingService with expense creation logic
- ✅ Add expense numbering methods (generateExpenseNumber, generateBuktiNumber)
- ✅ Create DTOs and controllers
- ✅ Unit tests (including expense creation tests)

### Week 2: Expense Integration & Frontend Components
**Backend Integration:**
- ✅ Update ExpensesService to support labor expense filtering
- ✅ Add `expenseClass` filter to ExpensesController
- ✅ Test labor → expense conversion workflow

**Frontend TypeScript:**
- ✅ Update Expense type with laborEntries relation
- ✅ Create project-team TypeScript interfaces
- ✅ Implement project-team API service

**Frontend Components:**
- ✅ Update ExpensesPage with labor cost filter
- ✅ Add labor expense visual indicators (badge, icon)
- ✅ Update ExpenseDetailPage with labor entry details
- ✅ Create ResourceCostSummary component
- ✅ Create TeamMembersTable component
- ✅ Create LaborEntriesTable component

### Week 3: Team & Resources Tab + Integration
**Frontend Components:**
- ✅ Create ExpenseAllocationTable (shows ALL expenses including labor)
- ✅ Create EquipmentUsageTable
- ✅ Implement TeamResourcesTab (4 sub-tabs)
- ✅ Create AddTeamMemberModal
- ✅ Create AddLaborEntryModal
- ✅ Update ProjectDetailPage to use TeamResourcesTab

**Integration Testing:**
- ✅ Labor entry approval creates expense (verify)
- ✅ Expense appears in ExpensesPage with labor filter
- ✅ Expense shows in Team & Resources tab
- ✅ ProjectCostAllocation created correctly
- ✅ Profit margin calculations include labor costs
- ✅ Integration tests

### Week 4: Testing, Documentation & Deployment
**Testing:**
- ✅ E2E testing (full labor entry → expense workflow)
- ✅ Test expense filtering and display
- ✅ Test profit margin integration
- ✅ Performance testing
- ✅ Cross-browser testing

**Documentation:**
- ✅ API documentation (Swagger/OpenAPI)
- ✅ User guide for labor tracking
- ✅ Admin guide for expense management
- ✅ Technical documentation

**Deployment:**
- ✅ Database migration in production
- ✅ Seed labor expense category
- ✅ Production deployment
- ✅ Monitoring and verification

---

## Future Enhancements

### Phase 2 (Future)
1. **Resource Scheduling**: Visual calendar for team member allocation
2. **Timesheet Export**: Export labor entries to Excel/PDF
3. **Resource Utilization Analytics**: Team member utilization dashboards
4. **Budget Forecasting**: Predict resource costs based on historical data
5. **Mobile App**: Time tracking via mobile application
6. **Integration with Payroll**: Automatic payroll integration from labor entries

### Phase 3 (Future)
1. **AI Resource Optimization**: ML-based resource allocation recommendations
2. **Gantt Chart Integration**: Visual project timeline with resource allocation
3. **Skills Matrix**: Track team member skills and competencies
4. **Resource Conflicts**: Automatic detection of overallocation
5. **Multi-Project View**: View team member allocation across all projects

---

## Conclusion

This implementation plan provides a comprehensive roadmap for implementing the Team & Resources functionality in the ProjectDetailPage. The design:

✅ **Leverages existing infrastructure** (Expense, Asset, ProjectCostAllocation models)
✅ **Integrates seamlessly** with profit margin tracking
✅ **Follows Indonesian compliance** (PSAK 57 cost allocation)
✅ **Provides role-based access control** (RBAC)
✅ **Supports approval workflows** (labor entry approval)
✅ **Offers comprehensive cost tracking** (labor, expenses, equipment)
✅ **Enables data-driven decisions** (resource cost analytics)

**Next Steps:**
1. Review and approve this plan
2. Begin Week 1 implementation (database migration)
3. Iterative development with weekly reviews
4. Production deployment in 3-4 weeks

---

**Document Version:** 1.0
**Status:** Ready for Review
**Author:** Claude Code
**Date:** October 20, 2025
