# Role Management Implementation Plan
## Indonesian Invoice Generator System

**Version:** 1.0
**Date:** 2025-10-17
**Status:** Ready for Implementation
**Priority:** High (Critical for Business Compliance)

---

## 📋 Executive Summary

This document outlines a comprehensive plan to implement a robust Role-Based Access Control (RBAC) system with permission-based authorization for the Monomi Invoice Generator. The current system has basic role infrastructure but lacks enforcement across critical business operations, creating compliance risks and security vulnerabilities.

### Critical Issues Addressed
- ✅ **Segregation of Duties** - Prevent users from self-approving transactions
- ✅ **Indonesian Compliance** - Meet PSAK and financial regulation requirements
- ✅ **Access Control** - Protect sensitive financial and accounting operations
- ✅ **Audit Trail** - Track all role-protected operations
- ✅ **Multi-level Approvals** - Support complex approval hierarchies

### Business Impact
- **Risk Reduction:** Prevent fraud and unauthorized financial transactions
- **Compliance:** Meet Indonesian accounting standards (SAK/PSAK)
- **Efficiency:** Clear role definitions and automated workflows
- **Scalability:** Support organizational growth and team expansion

---

## 🎯 Current State Analysis

### Existing Infrastructure

**✅ What We Have:**
```typescript
// Database Model (Prisma)
enum UserRole {
  ADMIN
  USER
  VIEWER
}

// Guards & Decorators
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
```

**❌ Critical Gaps:**
1. **Minimal Role Enforcement** - Only 2 controllers use RolesGuard
2. **No Permission System** - Can't define granular permissions
3. **No Approval Workflows** - Users can self-approve quotations/invoices
4. **No Resource Ownership** - Users can access all data regardless of ownership
5. **Insufficient Roles** - 3 roles can't cover Indonesian business complexity

### Security Vulnerabilities

| Vulnerability | Impact | Current State |
|--------------|--------|---------------|
| Self-approval of quotations | High | ❌ Unprotected |
| Unauthorized invoice payment marking | Critical | ❌ Unprotected |
| Exposure of company settings (NPWP, bank) | High | ❌ Unprotected |
| Accounting data access | Critical | ❌ Unprotected |
| User management access | High | ❌ Unprotected |
| Expense approval bypass | High | ✅ Protected (ADMIN only) |

---

## 🏗️ Proposed Architecture

### Role Hierarchy Structure

```
SUPER_ADMIN (Owner/IT Admin)
    ├── Full system access
    ├── User management
    ├── System configuration
    └── All permissions

FINANCE_MANAGER (Financial Controller)
    ├── Approve/reject quotations & invoices
    ├── Approve/reject expenses
    ├── Mark payments as received
    ├── Access all financial reports
    ├── Manage accounting periods
    └── Post journal entries

ACCOUNTANT (Bookkeeper)
    ├── View all financial data
    ├── Create/manage journal entries
    ├── Calculate depreciation
    ├── Generate reports
    └── Cannot approve transactions

PROJECT_MANAGER (Operations)
    ├── Create/edit clients, projects, quotations
    ├── Submit invoices for approval
    ├── Submit expenses
    ├── Manage assets and reservations
    └── View own and assigned data

STAFF (Basic User)
    ├── Create draft quotations
    ├── Submit expenses for approval
    ├── Create asset reservations
    └── View own data only

VIEWER (Read-Only)
    ├── View quotations, invoices, projects
    ├── View limited reports
    └── No create/edit/delete permissions
```

### Permission Model

We'll implement a **hybrid RBAC + Permission system**:

```typescript
// Permission Categories
enum PermissionCategory {
  QUOTATIONS = 'quotations',
  INVOICES = 'invoices',
  EXPENSES = 'expenses',
  CLIENTS = 'clients',
  PROJECTS = 'projects',
  ACCOUNTING = 'accounting',
  ASSETS = 'assets',
  USERS = 'users',
  SETTINGS = 'settings',
  REPORTS = 'reports'
}

// Permission Actions
enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  SEND = 'send',
  MARK_PAID = 'mark_paid',
  EXPORT = 'export'
}

// Example Permissions
const permissions = [
  'quotations.create',
  'quotations.read',
  'quotations.approve',
  'invoices.create',
  'invoices.send',
  'invoices.mark_paid',
  'expenses.approve',
  'accounting.post_entries',
  'settings.manage',
  'users.manage'
]
```

---

## 📊 Database Schema Changes

### New Tables

```prisma
// prisma/schema.prisma

// 1. Extend UserRole enum
enum UserRole {
  SUPER_ADMIN
  FINANCE_MANAGER
  ACCOUNTANT
  PROJECT_MANAGER
  STAFF
  VIEWER

  // Legacy (keep for backward compatibility)
  ADMIN        @map("SUPER_ADMIN")
  USER         @map("STAFF")
}

// 2. New Permission Model
model Permission {
  id          String   @id @default(cuid())
  name        String   @unique  // "quotations.approve"
  category    String   // "quotations"
  action      String   // "approve"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roles       RolePermission[]

  @@index([category, action])
  @@map("permissions")
}

// 3. Role-Permission Junction Table
model RolePermission {
  id           String   @id @default(cuid())
  role         UserRole
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())

  @@unique([role, permissionId])
  @@index([role])
  @@map("role_permissions")
}

// 4. Resource Ownership (for data isolation)
model ResourceOwnership {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  resourceType String   // "quotation", "invoice", "project"
  resourceId   String
  accessLevel  String   // "owner", "editor", "viewer"
  createdAt    DateTime @default(now())

  @@unique([userId, resourceType, resourceId])
  @@index([userId, resourceType])
  @@index([resourceType, resourceId])
  @@map("resource_ownerships")
}

// 5. Approval Workflow
model ApprovalWorkflow {
  id           String   @id @default(cuid())
  entityType   String   // "quotation", "invoice", "expense"
  entityId     String
  status       ApprovalStatus @default(PENDING)
  requestedBy  String
  requestedAt  DateTime @default(now())
  approvedBy   String?
  approvedAt   DateTime?
  rejectedBy   String?
  rejectedAt   DateTime?
  comments     String?

  requester    User     @relation("ApprovalRequester", fields: [requestedBy], references: [id])
  approver     User?    @relation("ApprovalApprover", fields: [approvedBy], references: [id])
  rejector     User?    @relation("ApprovalRejector", fields: [rejectedBy], references: [id])

  @@index([entityType, entityId])
  @@index([status])
  @@index([requestedBy])
  @@map("approval_workflows")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

// 6. Audit Log Enhancement (extend existing)
model AuditLog {
  // ... existing fields ...

  // Add permission tracking
  permissionUsed String?  // "quotations.approve"
  accessDenied   Boolean  @default(false)
  denyReason     String?
}
```

### Migration Strategy

```bash
# Create migration
npx prisma migrate dev --name add_rbac_permission_system

# Seed default permissions
npx prisma db seed
```

---

## 🛠️ Backend Implementation

### Phase 1: Permission System Foundation

#### Step 1.1: Create Permission Module

**File:** `backend/src/modules/permissions/permissions.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
```

#### Step 1.2: Create Permission Service

**File:** `backend/src/modules/permissions/permissions.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Auto-seed permissions on startup if needed
    await this.seedPermissions();
  }

  async seedPermissions() {
    const permissions = [
      // Quotations
      { name: 'quotations.create', category: 'quotations', action: 'create', description: 'Create quotations' },
      { name: 'quotations.read', category: 'quotations', action: 'read', description: 'View quotations' },
      { name: 'quotations.update', category: 'quotations', action: 'update', description: 'Edit quotations' },
      { name: 'quotations.delete', category: 'quotations', action: 'delete', description: 'Delete quotations' },
      { name: 'quotations.approve', category: 'quotations', action: 'approve', description: 'Approve quotations' },
      { name: 'quotations.reject', category: 'quotations', action: 'reject', description: 'Reject quotations' },
      { name: 'quotations.send', category: 'quotations', action: 'send', description: 'Send quotations to clients' },

      // Invoices
      { name: 'invoices.create', category: 'invoices', action: 'create', description: 'Create invoices' },
      { name: 'invoices.read', category: 'invoices', action: 'read', description: 'View invoices' },
      { name: 'invoices.update', category: 'invoices', action: 'update', description: 'Edit invoices' },
      { name: 'invoices.delete', category: 'invoices', action: 'delete', description: 'Delete invoices' },
      { name: 'invoices.send', category: 'invoices', action: 'send', description: 'Send invoices to clients' },
      { name: 'invoices.mark_paid', category: 'invoices', action: 'mark_paid', description: 'Mark invoices as paid' },

      // Expenses
      { name: 'expenses.create', category: 'expenses', action: 'create', description: 'Create expense submissions' },
      { name: 'expenses.read', category: 'expenses', action: 'read', description: 'View expenses' },
      { name: 'expenses.update', category: 'expenses', action: 'update', description: 'Edit expenses' },
      { name: 'expenses.delete', category: 'expenses', action: 'delete', description: 'Delete expenses' },
      { name: 'expenses.approve', category: 'expenses', action: 'approve', description: 'Approve expense claims' },
      { name: 'expenses.reject', category: 'expenses', action: 'reject', description: 'Reject expense claims' },
      { name: 'expenses.mark_paid', category: 'expenses', action: 'mark_paid', description: 'Mark expenses as paid' },

      // Accounting
      { name: 'accounting.post_entries', category: 'accounting', action: 'post_entries', description: 'Post journal entries' },
      { name: 'accounting.view_entries', category: 'accounting', action: 'view_entries', description: 'View journal entries' },
      { name: 'accounting.close_period', category: 'accounting', action: 'close_period', description: 'Close accounting periods' },
      { name: 'accounting.depreciation', category: 'accounting', action: 'depreciation', description: 'Calculate depreciation' },

      // Users
      { name: 'users.create', category: 'users', action: 'create', description: 'Create users' },
      { name: 'users.read', category: 'users', action: 'read', description: 'View users' },
      { name: 'users.update', category: 'users', action: 'update', description: 'Edit users' },
      { name: 'users.delete', category: 'users', action: 'delete', description: 'Delete users' },
      { name: 'users.manage_roles', category: 'users', action: 'manage_roles', description: 'Change user roles' },

      // Settings
      { name: 'settings.view', category: 'settings', action: 'view', description: 'View company settings' },
      { name: 'settings.manage', category: 'settings', action: 'manage', description: 'Manage company settings' },

      // Projects
      { name: 'projects.create', category: 'projects', action: 'create', description: 'Create projects' },
      { name: 'projects.read', category: 'projects', action: 'read', description: 'View projects' },
      { name: 'projects.update', category: 'projects', action: 'update', description: 'Edit projects' },
      { name: 'projects.delete', category: 'projects', action: 'delete', description: 'Delete projects' },

      // Clients
      { name: 'clients.create', category: 'clients', action: 'create', description: 'Create clients' },
      { name: 'clients.read', category: 'clients', action: 'read', description: 'View clients' },
      { name: 'clients.update', category: 'clients', action: 'update', description: 'Edit clients' },
      { name: 'clients.delete', category: 'clients', action: 'delete', description: 'Delete clients' },

      // Assets
      { name: 'assets.create', category: 'assets', action: 'create', description: 'Create assets' },
      { name: 'assets.read', category: 'assets', action: 'read', description: 'View assets' },
      { name: 'assets.update', category: 'assets', action: 'update', description: 'Edit assets' },
      { name: 'assets.delete', category: 'assets', action: 'delete', description: 'Delete assets' },
      { name: 'assets.approve_reservation', category: 'assets', action: 'approve_reservation', description: 'Approve asset reservations' },

      // Reports
      { name: 'reports.financial', category: 'reports', action: 'financial', description: 'View financial reports' },
      { name: 'reports.export', category: 'reports', action: 'export', description: 'Export reports' },
    ];

    for (const perm of permissions) {
      await this.prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
    }

    // Assign permissions to roles
    await this.assignRolePermissions();
  }

  async assignRolePermissions() {
    const rolePermissions: Record<UserRole, string[]> = {
      SUPER_ADMIN: ['*'], // All permissions

      FINANCE_MANAGER: [
        // Full quotation management
        'quotations.create', 'quotations.read', 'quotations.update', 'quotations.delete',
        'quotations.approve', 'quotations.reject', 'quotations.send',

        // Full invoice management
        'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
        'invoices.send', 'invoices.mark_paid',

        // Expense approval
        'expenses.read', 'expenses.approve', 'expenses.reject', 'expenses.mark_paid',

        // Accounting access
        'accounting.post_entries', 'accounting.view_entries', 'accounting.close_period',

        // View projects, clients, assets
        'projects.read', 'clients.read', 'assets.read',

        // All reports
        'reports.financial', 'reports.export',
      ],

      ACCOUNTANT: [
        // Read financial data
        'quotations.read', 'invoices.read', 'expenses.read',

        // Accounting operations
        'accounting.post_entries', 'accounting.view_entries', 'accounting.depreciation',

        // View projects, clients, assets
        'projects.read', 'clients.read', 'assets.read',

        // Financial reports
        'reports.financial', 'reports.export',
      ],

      PROJECT_MANAGER: [
        // Full CRUD on business entities
        'quotations.create', 'quotations.read', 'quotations.update', 'quotations.delete', 'quotations.send',
        'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send',
        'projects.create', 'projects.read', 'projects.update', 'projects.delete',
        'clients.create', 'clients.read', 'clients.update', 'clients.delete',
        'assets.create', 'assets.read', 'assets.update',

        // Submit expenses
        'expenses.create', 'expenses.read', 'expenses.update',

        // Basic reports
        'reports.financial',
      ],

      STAFF: [
        // Create drafts
        'quotations.create', 'quotations.read', 'quotations.update',
        'projects.read', 'clients.read',

        // Submit expenses
        'expenses.create', 'expenses.read',

        // Asset reservations
        'assets.read',
      ],

      VIEWER: [
        // Read-only access
        'quotations.read', 'invoices.read', 'projects.read',
        'clients.read', 'reports.financial',
      ],

      // Legacy roles (backward compatibility)
      ADMIN: ['*'],
      USER: ['quotations.create', 'quotations.read', 'projects.read', 'clients.read'],
    };

    for (const [role, permissions] of Object.entries(rolePermissions)) {
      if (permissions.includes('*')) {
        // SUPER_ADMIN gets all permissions
        const allPermissions = await this.prisma.permission.findMany();
        for (const perm of allPermissions) {
          await this.prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as UserRole,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              role: role as UserRole,
              permissionId: perm.id,
            },
          });
        }
      } else {
        for (const permName of permissions) {
          const permission = await this.prisma.permission.findUnique({
            where: { name: permName },
          });

          if (permission) {
            await this.prisma.rolePermission.upsert({
              where: {
                role_permissionId: {
                  role: role as UserRole,
                  permissionId: permission.id,
                },
              },
              update: {},
              create: {
                role: role as UserRole,
                permissionId: permission.id,
              },
            });
          }
        }
      }
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
      include: { permission: true },
    });

    return rolePermissions.map(rp => rp.permission.name);
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionName);
  }

  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionNames.some(p => permissions.includes(p));
  }

  async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissionNames.every(p => permissions.includes(p));
  }
}
```

#### Step 1.3: Create Permission Guard

**File:** `backend/src/modules/auth/guards/permissions.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';

export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if user has any of the required permissions
    return await this.permissionsService.hasAnyPermission(
      user.id,
      requiredPermissions,
    );
  }
}
```

#### Step 1.4: Create Permission Decorator

**File:** `backend/src/modules/auth/decorators/require-permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### Phase 2: Apply Guards to Controllers

#### Step 2.1: Update Quotations Controller

**File:** `backend/src/modules/quotations/quotations.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('quotations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationsController {

  @Get()
  @RequirePermissions('quotations.read')
  async findAll(@GetUser() user) {
    // Implementation
  }

  @Post()
  @RequirePermissions('quotations.create')
  async create(@Body() dto, @GetUser() user) {
    // Implementation
  }

  @Patch(':id')
  @RequirePermissions('quotations.update')
  async update(@Param('id') id: string, @Body() dto, @GetUser() user) {
    // Implementation
  }

  @Delete(':id')
  @RequirePermissions('quotations.delete')
  async delete(@Param('id') id: string, @GetUser() user) {
    // Implementation
  }

  @Post(':id/approve')
  @RequirePermissions('quotations.approve')
  async approve(@Param('id') id: string, @GetUser() user) {
    // CRITICAL: Ensure user cannot approve their own quotation
    const quotation = await this.quotationsService.findOne(id);
    if (quotation.createdBy === user.id) {
      throw new ForbiddenException('You cannot approve your own quotation (segregation of duties)');
    }
    return this.quotationsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('quotations.reject')
  async reject(@Param('id') id: string, @GetUser() user) {
    return this.quotationsService.reject(id, user.id);
  }

  @Post(':id/send')
  @RequirePermissions('quotations.send')
  async send(@Param('id') id: string, @GetUser() user) {
    // Implementation
  }
}
```

#### Step 2.2: Update Invoices Controller

**File:** `backend/src/modules/invoices/invoices.controller.ts`

```typescript
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {

  @Get()
  @RequirePermissions('invoices.read')
  async findAll(@GetUser() user) { }

  @Post()
  @RequirePermissions('invoices.create')
  async create(@Body() dto, @GetUser() user) { }

  @Patch(':id')
  @RequirePermissions('invoices.update')
  async update(@Param('id') id: string, @Body() dto) { }

  @Delete(':id')
  @RequirePermissions('invoices.delete')
  async delete(@Param('id') id: string) { }

  @Post(':id/send')
  @RequirePermissions('invoices.send')
  async send(@Param('id') id: string, @GetUser() user) { }

  @Post(':id/mark-paid')
  @RequirePermissions('invoices.mark_paid')
  async markPaid(@Param('id') id: string, @GetUser() user) {
    // CRITICAL: Financial operation - requires approval authority
    const invoice = await this.invoicesService.findOne(id);
    if (invoice.createdBy === user.id) {
      throw new ForbiddenException('You cannot mark your own invoice as paid (segregation of duties)');
    }
    return this.invoicesService.markAsPaid(id, user.id);
  }
}
```

#### Step 2.3: Secure All Controllers

Apply the same pattern to:
- ✅ `ExpensesController` - Already has some guards, enhance
- ✅ `UsersController` - Protect user management
- ✅ `SettingsController` - Protect company settings
- ✅ `AccountingController` - Protect all accounting operations
- ✅ `AssetsController` - Protect asset reservations
- ✅ `ReportsController` - Control report access

---

## 🎨 Frontend Implementation

### Phase 3: Role-Based UI

#### Step 3.1: Create Permission Hook

**File:** `frontend/src/hooks/usePermissions.ts`

```typescript
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(p => user.permissions?.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(p => user.permissions?.includes(p));
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const isAdmin = (): boolean => {
    return hasRole('SUPER_ADMIN') || hasRole('ADMIN');
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
  };
};
```

#### Step 3.2: Create Permission Component

**File:** `frontend/src/components/auth/PermissionGuard.tsx`

```typescript
import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // Default: false (requires any)
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermissions();

  // Check roles
  if (roles.length > 0) {
    const hasRequiredRole = roles.some(role => hasRole(role));
    if (!hasRequiredRole) return <>{fallback}</>;
  }

  // Check permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

#### Step 3.3: Update Pages with Permission Guards

**Example:** `frontend/src/pages/QuotationsPage.tsx`

```typescript
import { PermissionGuard } from '../components/auth/PermissionGuard';
import { usePermissions } from '../hooks/usePermissions';

export const QuotationsPage: React.FC = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <PageHeader
        title="Quotations"
        extra={
          <PermissionGuard permissions={['quotations.create']}>
            <Button type="primary" onClick={handleCreate}>
              Create Quotation
            </Button>
          </PermissionGuard>
        }
      />

      <Table
        columns={[
          // ... columns
          {
            title: 'Actions',
            render: (_, record) => (
              <Space>
                <PermissionGuard permissions={['quotations.update']}>
                  <Button onClick={() => handleEdit(record)}>Edit</Button>
                </PermissionGuard>

                <PermissionGuard permissions={['quotations.approve']}>
                  {record.status === 'SENT' && (
                    <Button type="primary" onClick={() => handleApprove(record)}>
                      Approve
                    </Button>
                  )}
                </PermissionGuard>

                <PermissionGuard permissions={['quotations.delete']}>
                  <Button danger onClick={() => handleDelete(record)}>
                    Delete
                  </Button>
                </PermissionGuard>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};
```

---

## 🔒 Security Considerations

### Segregation of Duties Enforcement

```typescript
// Backend: Prevent self-approval
async approve(quotationId: string, userId: string) {
  const quotation = await this.findOne(quotationId);

  // CRITICAL: Check creator
  if (quotation.createdBy === userId) {
    throw new ForbiddenException(
      'You cannot approve your own quotation. ' +
      'This violates segregation of duties policy.'
    );
  }

  // Log the approval
  await this.auditLogService.log({
    userId,
    action: 'APPROVE_QUOTATION',
    resourceType: 'quotation',
    resourceId: quotationId,
    permissionUsed: 'quotations.approve',
  });

  return this.prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });
}
```

### Resource-Based Authorization

```typescript
// Check if user owns or has access to resource
async canAccessQuotation(userId: string, quotationId: string): Promise<boolean> {
  const user = await this.usersService.findOne(userId);

  // SUPER_ADMIN and FINANCE_MANAGER can access all
  if (['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT'].includes(user.role)) {
    return true;
  }

  // Others can only access their own or assigned
  const ownership = await this.prisma.resourceOwnership.findFirst({
    where: {
      userId,
      resourceType: 'quotation',
      resourceId: quotationId,
    },
  });

  return !!ownership;
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// permissions.service.spec.ts
describe('PermissionsService', () => {
  it('should grant quotations.approve to FINANCE_MANAGER', async () => {
    const user = await createUser({ role: 'FINANCE_MANAGER' });
    const hasPermission = await service.hasPermission(user.id, 'quotations.approve');
    expect(hasPermission).toBe(true);
  });

  it('should deny quotations.approve to STAFF', async () => {
    const user = await createUser({ role: 'STAFF' });
    const hasPermission = await service.hasPermission(user.id, 'quotations.approve');
    expect(hasPermission).toBe(false);
  });

  it('should prevent self-approval', async () => {
    const user = await createUser({ role: 'FINANCE_MANAGER' });
    const quotation = await createQuotation({ createdBy: user.id });

    await expect(
      service.approveQuotation(quotation.id, user.id)
    ).rejects.toThrow('cannot approve your own');
  });
});
```

### Integration Tests

```typescript
// quotations.e2e.spec.ts
describe('Quotations (e2e)', () => {
  it('should allow FINANCE_MANAGER to approve quotation', async () => {
    const manager = await createUser({ role: 'FINANCE_MANAGER' });
    const staff = await createUser({ role: 'STAFF' });
    const quotation = await createQuotation({ createdBy: staff.id });

    return request(app.getHttpServer())
      .post(`/quotations/${quotation.id}/approve`)
      .auth(manager.token, { type: 'bearer' })
      .expect(200);
  });

  it('should prevent STAFF from approving quotation', async () => {
    const staff = await createUser({ role: 'STAFF' });
    const quotation = await createQuotation({ createdBy: staff.id });

    return request(app.getHttpServer())
      .post(`/quotations/${quotation.id}/approve`)
      .auth(staff.token, { type: 'bearer' })
      .expect(403);
  });
});
```

---

## 📅 Implementation Timeline

### Week 1: Database & Backend Foundation
- **Day 1-2:** Database schema changes, migrations
- **Day 3-4:** Permission module, service, guards
- **Day 5:** Seed permissions and role assignments

### Week 2: Controller Security
- **Day 1:** Quotations & Invoices controllers
- **Day 2:** Expenses & Accounting controllers
- **Day 3:** Users, Settings, Assets controllers
- **Day 4:** Testing & bug fixes
- **Day 5:** Backend integration testing

### Week 3: Frontend Implementation
- **Day 1-2:** Permission hooks and components
- **Day 3-4:** Update all pages with permission guards
- **Day 5:** Frontend testing & UI polish

### Week 4: Testing & Deployment
- **Day 1-2:** End-to-end testing
- **Day 3:** Security audit
- **Day 4:** Staging deployment & UAT
- **Day 5:** Production deployment

---

## 🚀 Rollout Plan

### Phase 1: Soft Launch (Week 1)
- Deploy to staging
- Test with admin accounts only
- Verify all permissions work correctly

### Phase 2: Pilot (Week 2)
- Add 2-3 users per role
- Monitor for issues
- Gather feedback

### Phase 3: Full Rollout (Week 3)
- Migrate all existing users to new roles
- Send training materials
- Provide support

### Phase 4: Optimization (Week 4)
- Fine-tune permissions based on usage
- Add missing permissions if needed
- Performance optimization

---

## 📚 Documentation Requirements

### User Documentation
- **Role Descriptions** - What each role can do
- **Permission Matrix** - Detailed permission table
- **Approval Workflows** - Step-by-step guides
- **FAQ** - Common questions

### Technical Documentation
- **API Documentation** - Permission-protected endpoints
- **Developer Guide** - How to add new permissions
- **Troubleshooting** - Common issues and solutions

---

## ✅ Success Criteria

- [ ] All 50+ endpoints have appropriate permission guards
- [ ] Segregation of duties enforced (no self-approval)
- [ ] 5 roles implemented with correct permissions
- [ ] Frontend hides/shows based on permissions
- [ ] Audit logs track all permission-protected operations
- [ ] Zero security vulnerabilities in security audit
- [ ] All tests passing (unit, integration, e2e)
- [ ] User acceptance testing completed
- [ ] Documentation complete

---

## 📞 Support & Maintenance

### Monitoring
- Track failed permission checks
- Monitor role distribution
- Audit unusual access patterns

### Maintenance
- Regular permission audits
- Role assignment reviews
- Security updates

---

**End of Implementation Plan**

This plan provides a complete roadmap for implementing a production-grade role management system that meets Indonesian business compliance requirements while maintaining security and usability.
