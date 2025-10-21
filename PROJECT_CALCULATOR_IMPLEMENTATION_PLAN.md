# Project Calculator with Profit Margin - Implementation Plan

**Feature:** Pre-project Planning Calculator with Profit Margin Projections
**Location:** Create Project Page (`/projects/new`)
**Date:** 2025-10-20
**Status:** Planning Phase

---

## Executive Summary

Add a **Project Calculator** to the Create Project page that allows users to:
1. Enter **estimated expenses** by category (labor, materials, overhead, etc.)
2. View **estimated total costs**
3. Calculate **projected profit margins** (gross & net)
4. Make **go/no-go decisions** before committing to a project

**Business Value:**
- ✅ Pre-sales decision support
- ✅ Pricing validation
- ✅ Risk assessment
- ✅ Budget baseline for future variance tracking

---

## Current State Analysis

### ✅ What Exists

#### Database Schema (`Project` model)
```prisma
model Project {
  // Revenue tracking
  basePrice       Decimal? @db.Decimal(12, 2) // Project price/revenue
  priceBreakdown  Json?                       // Revenue item details

  // Budget tracking
  estimatedBudget Decimal? @db.Decimal(12, 2) // Total estimated costs

  // Actual tracking (calculated later)
  totalDirectCosts    Decimal? @default(0)
  totalIndirectCosts  Decimal? @default(0)
  totalAllocatedCosts Decimal? @default(0)

  // Profit metrics (calculated later)
  grossProfit        Decimal?
  netProfit          Decimal?
  grossMarginPercent Decimal?
  netMarginPercent   Decimal?

  // Variance tracking (calculated later)
  budgetVariance        Decimal?
  budgetVariancePercent Decimal?
}
```

#### ExpenseBudget Model
```prisma
model ExpenseBudget {
  id          String @id @default(cuid())
  name        String
  categoryId  String?
  category    ExpenseCategory?
  projectId   String?
  project     Project?

  amount      Decimal @db.Decimal(12, 2)  // Budget amount per category
  spent       Decimal @default(0)          // Actual spent (tracked later)
  remaining   Decimal                       // Remaining budget
}
```

#### Frontend (`ProjectCreatePage`)
```typescript
// Current form structure
interface ProjectFormData {
  description: string
  clientId: string
  projectTypeId: string
  startDate?: dayjs.Dayjs
  endDate?: dayjs.Dayjs
  products: ProductItem[]  // Revenue breakdown only!
}

// Current calculation
const calculatedValue = products.reduce((sum, p) =>
  sum + p.price * p.quantity, 0
) // Only calculates revenue, not costs!
```

#### Backend Services
- ✅ `ProfitCalculationService` - calculates actual profit (from real expenses/invoices)
- ✅ `ProjectsService` - CRUD operations
- ❌ No projection/estimation calculation service

---

## ❌ What's Missing

### 1. Database/Schema
- ❌ No storage for estimated expense breakdown
- ❌ No projected profit margin fields

### 2. Backend
- ❌ No DTO for estimated expenses
- ❌ No calculation endpoint for projections
- ❌ No validation for estimated budgets

### 3. Frontend
- ❌ No UI for entering estimated expenses
- ❌ No profit margin calculator display
- ❌ No real-time calculation updates

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### Option A: Use JSON Field (Recommended - Faster)
**Pros:** Quick implementation, flexible structure, no migration needed
**Cons:** Less queryable, no strict validation

```prisma
model Project {
  // ... existing fields ...

  // ⭐ NEW: Estimated expense breakdown (JSON)
  estimatedExpenses Json? // Stores array of estimated cost items

  // ⭐ NEW: Projected profit metrics
  projectedGrossMargin Decimal? @db.Decimal(5, 2)  // Estimated gross margin %
  projectedNetMargin   Decimal? @db.Decimal(5, 2)  // Estimated net margin %
  projectedProfit      Decimal? @db.Decimal(15, 2) // Estimated profit amount
}
```

**estimatedExpenses JSON structure:**
```json
{
  "direct": [
    {
      "categoryId": "labor-category-id",
      "categoryName": "Labor Costs",
      "categoryNameId": "Biaya Tenaga Kerja",
      "amount": 50000000,
      "notes": "2 developers × 1 month"
    },
    {
      "categoryId": "materials-category-id",
      "categoryName": "Materials",
      "categoryNameId": "Bahan Baku",
      "amount": 30000000,
      "notes": "Camera equipment rental"
    }
  ],
  "indirect": [
    {
      "categoryId": "overhead-category-id",
      "categoryName": "Overhead",
      "categoryNameId": "Overhead",
      "amount": 10000000,
      "notes": "Office rent allocation"
    }
  ],
  "totalDirect": 80000000,
  "totalIndirect": 10000000,
  "totalEstimated": 90000000,
  "calculatedAt": "2025-10-20T15:00:00Z"
}
```

#### Option B: Use ExpenseBudget Table (More Structured)
**Pros:** Queryable, relational, strict validation
**Cons:** More complex, requires budget records management

```typescript
// When creating project, also create ExpenseBudget records
await Promise.all([
  prisma.project.create({ data: projectData }),
  ...estimatedExpenses.map(expense =>
    prisma.expenseBudget.create({
      data: {
        projectId,
        categoryId: expense.categoryId,
        name: expense.categoryName,
        amount: expense.amount,
        spent: 0,
        remaining: expense.amount,
        period: 'CUSTOM',
        startDate: projectStartDate,
        endDate: projectEndDate,
      }
    })
  )
])
```

**✅ RECOMMENDED: Option A (JSON)** for faster implementation with Option B as future enhancement.

---

### Phase 2: Backend Implementation

#### 1. Update DTOs

**File:** `backend/src/modules/projects/dto/create-project.dto.ts`

```typescript
// ⭐ NEW: Estimated expense item
export class EstimatedExpenseDto {
  @ApiProperty({
    description: 'ID kategori biaya',
    example: 'cuid_expense_category_id',
  })
  @IsString()
  categoryId: string;

  @ApiProperty({
    description: 'Nama kategori (auto-filled dari ExpenseCategory)',
    example: 'Labor Costs',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({
    description: 'Nama kategori Indonesia',
    example: 'Biaya Tenaga Kerja',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryNameId?: string;

  @ApiProperty({
    description: 'Estimasi biaya',
    example: 50000000,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsPositive({ message: 'Estimasi biaya harus lebih dari 0' })
  amount: number;

  @ApiProperty({
    description: 'Catatan estimasi',
    example: '2 developers × 1 month',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Tipe biaya (direct/indirect)',
    enum: ['direct', 'indirect'],
    example: 'direct',
  })
  @IsEnum(['direct', 'indirect'])
  costType: 'direct' | 'indirect';
}

// Update CreateProjectDto
export class CreateProjectDto {
  // ... existing fields ...

  @ApiProperty({
    description: 'Daftar estimasi biaya proyek',
    type: [EstimatedExpenseDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Estimated expenses harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => EstimatedExpenseDto)
  estimatedExpenses?: EstimatedExpenseDto[];
}
```

#### 2. Create Projection Service

**File:** `backend/src/modules/projects/project-projection.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectionResult {
  // Revenue
  estimatedRevenue: number;
  revenueBreakdown: Array<{
    name: string;
    description: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;

  // Costs
  estimatedDirectCosts: number;
  estimatedIndirectCosts: number;
  estimatedTotalCosts: number;
  costBreakdown: {
    direct: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }>;
    indirect: Array<{
      categoryId: string;
      categoryName: string;
      categoryNameId: string;
      amount: number;
      notes?: string;
    }>;
  };

  // Profit Projections
  projectedGrossProfit: number;
  projectedNetProfit: number;
  projectedGrossMargin: number;  // Percentage
  projectedNetMargin: number;    // Percentage

  // Metadata
  calculatedAt: Date;
  isProfitable: boolean;
  profitabilityRating: 'excellent' | 'good' | 'breakeven' | 'loss';
}

@Injectable()
export class ProjectProjectionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate project profit projections BEFORE creation
   * Used in Create Project form for decision making
   */
  async calculateProjection(
    products: Array<{ name: string; description: string; price: number; quantity: number }>,
    estimatedExpenses: Array<{ categoryId: string; amount: number; notes?: string; costType: 'direct' | 'indirect' }>,
  ): Promise<ProjectionResult> {
    // 1. Calculate estimated revenue
    const revenueBreakdown = products.map(p => ({
      name: p.name,
      description: p.description,
      price: p.price,
      quantity: p.quantity || 1,
      subtotal: p.price * (p.quantity || 1),
    }));

    const estimatedRevenue = revenueBreakdown.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    // 2. Get expense category names
    const categoryIds = estimatedExpenses.map(e => e.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, nameId: true },
    });

    const categoryMap = new Map(
      categories.map(c => [c.id, { name: c.name, nameId: c.nameId }])
    );

    // 3. Build cost breakdown
    const directCosts = estimatedExpenses
      .filter(e => e.costType === 'direct')
      .map(e => ({
        categoryId: e.categoryId,
        categoryName: categoryMap.get(e.categoryId)?.name || 'Unknown',
        categoryNameId: categoryMap.get(e.categoryId)?.nameId || 'Tidak Diketahui',
        amount: e.amount,
        notes: e.notes,
      }));

    const indirectCosts = estimatedExpenses
      .filter(e => e.costType === 'indirect')
      .map(e => ({
        categoryId: e.categoryId,
        categoryName: categoryMap.get(e.categoryId)?.name || 'Unknown',
        categoryNameId: categoryMap.get(e.categoryId)?.nameId || 'Tidak Diketahui',
        amount: e.amount,
        notes: e.notes,
      }));

    const estimatedDirectCosts = directCosts.reduce((sum, c) => sum + c.amount, 0);
    const estimatedIndirectCosts = indirectCosts.reduce((sum, c) => sum + c.amount, 0);
    const estimatedTotalCosts = estimatedDirectCosts + estimatedIndirectCosts;

    // 4. Calculate profit projections
    const projectedGrossProfit = estimatedRevenue - estimatedDirectCosts;
    const projectedNetProfit = estimatedRevenue - estimatedTotalCosts;

    const projectedGrossMargin = estimatedRevenue > 0
      ? (projectedGrossProfit / estimatedRevenue) * 100
      : 0;

    const projectedNetMargin = estimatedRevenue > 0
      ? (projectedNetProfit / estimatedRevenue) * 100
      : 0;

    // 5. Determine profitability rating (Indonesian standards)
    let profitabilityRating: 'excellent' | 'good' | 'breakeven' | 'loss';
    if (projectedNetMargin >= 20) profitabilityRating = 'excellent';
    else if (projectedNetMargin >= 10) profitabilityRating = 'good';
    else if (projectedNetMargin >= 0) profitabilityRating = 'breakeven';
    else profitabilityRating = 'loss';

    return {
      // Revenue
      estimatedRevenue,
      revenueBreakdown,

      // Costs
      estimatedDirectCosts,
      estimatedIndirectCosts,
      estimatedTotalCosts,
      costBreakdown: {
        direct: directCosts,
        indirect: indirectCosts,
      },

      // Profit Projections
      projectedGrossProfit,
      projectedNetProfit,
      projectedGrossMargin,
      projectedNetMargin,

      // Metadata
      calculatedAt: new Date(),
      isProfitable: projectedNetProfit >= 0,
      profitabilityRating,
    };
  }
}
```

#### 3. Add Controller Endpoint

**File:** `backend/src/modules/projects/projects.controller.ts`

```typescript
@Post('calculate-projection')
@ApiOperation({ summary: 'Calculate project profit projections' })
@ApiResponse({
  status: 200,
  description: 'Projection calculated successfully',
})
async calculateProjection(
  @Body() dto: CalculateProjectionDto,
): Promise<ProjectionResult> {
  return this.projectionService.calculateProjection(
    dto.products || [],
    dto.estimatedExpenses || []
  );
}
```

**DTO:** `calculate-projection.dto.ts`

```typescript
export class CalculateProjectionDto {
  @ApiProperty({
    description: 'Daftar produk (revenue items)',
    type: [ProjectItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectItemDto)
  products?: ProjectItemDto[];

  @ApiProperty({
    description: 'Daftar estimasi biaya',
    type: [EstimatedExpenseDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimatedExpenseDto)
  estimatedExpenses?: EstimatedExpenseDto[];
}
```

#### 4. Update ProjectsService.create()

```typescript
async create(createProjectDto: CreateProjectDto) {
  // ... existing code for projectType, projectNumber ...

  // Calculate basePrice from products
  let basePrice = null;
  let priceBreakdown = null;

  if (createProjectDto.products && createProjectDto.products.length > 0) {
    basePrice = createProjectDto.products.reduce((total, product) => {
      const quantity = product.quantity || 1;
      return total + product.price * quantity;
    }, 0);

    priceBreakdown = {
      products: createProjectDto.products.map((product) => ({
        name: product.name,
        description: product.description,
        price: product.price,
        quantity: product.quantity || 1,
        subtotal: product.price * (product.quantity || 1),
      })),
      total: basePrice,
      calculatedAt: new Date().toISOString(),
    };
  }

  // ⭐ NEW: Process estimated expenses
  let estimatedBudget = createProjectDto.estimatedBudget || null;
  let estimatedExpenses = null;
  let projectedGrossMargin = null;
  let projectedNetMargin = null;
  let projectedProfit = null;

  if (createProjectDto.estimatedExpenses && createProjectDto.estimatedExpenses.length > 0) {
    // Get category details
    const categoryIds = createProjectDto.estimatedExpenses.map(e => e.categoryId);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, nameId: true },
    });

    const categoryMap = new Map(
      categories.map(c => [c.id, { name: c.name, nameId: c.nameId }])
    );

    // Build expense breakdown
    const direct = [];
    const indirect = [];
    let totalDirect = 0;
    let totalIndirect = 0;

    for (const expense of createProjectDto.estimatedExpenses) {
      const category = categoryMap.get(expense.categoryId);
      const item = {
        categoryId: expense.categoryId,
        categoryName: category?.name || 'Unknown',
        categoryNameId: category?.nameId || 'Tidak Diketahui',
        amount: expense.amount,
        notes: expense.notes,
      };

      if (expense.costType === 'direct') {
        direct.push(item);
        totalDirect += expense.amount;
      } else {
        indirect.push(item);
        totalIndirect += expense.amount;
      }
    }

    const totalEstimated = totalDirect + totalIndirect;
    estimatedBudget = totalEstimated;

    estimatedExpenses = {
      direct,
      indirect,
      totalDirect,
      totalIndirect,
      totalEstimated,
      calculatedAt: new Date().toISOString(),
    };

    // Calculate projected margins if we have revenue
    if (basePrice && basePrice > 0) {
      const grossProfit = basePrice - totalDirect;
      const netProfit = basePrice - totalEstimated;

      projectedGrossMargin = (grossProfit / basePrice) * 100;
      projectedNetMargin = (netProfit / basePrice) * 100;
      projectedProfit = netProfit;
    }
  }

  const { products: _products, estimatedExpenses: _expenses, ...projectData } = createProjectDto;

  return this.prisma.project.create({
    data: {
      ...projectData,
      number: projectNumber,
      basePrice,
      priceBreakdown,
      estimatedBudget,
      estimatedExpenses,        // ⭐ NEW: Store estimated expenses
      projectedGrossMargin,     // ⭐ NEW: Store projected margins
      projectedNetMargin,
      projectedProfit,
      output: projectData.output || '',
      client: { connect: { id: clientId } },
      projectType: { connect: { id: projectTypeId } },
    },
    include: {
      client: true,
      projectType: true,
    },
  });
}
```

#### 5. Register Services in Module

**File:** `backend/src/modules/projects/projects.module.ts`

```typescript
import { ProjectProjectionService } from './project-projection.service';

@Module({
  // ...
  providers: [
    ProjectsService,
    ProfitCalculationService,
    ProjectProjectionService,  // ⭐ NEW
  ],
  exports: [
    ProjectsService,
    ProjectProjectionService,  // ⭐ NEW
  ],
})
export class ProjectsModule {}
```

---

### Phase 3: Frontend Implementation

#### 1. Create Expense Estimation Component

**File:** `frontend/src/components/projects/ExpenseEstimator.tsx`

```typescript
import React from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { formatIDR } from '../../utils/currency';
import { expenseCategoriesApi } from '../../services/expense-categories';
import { useTheme } from '../../theme';

const { Text } = Typography;

export interface EstimatedExpense {
  categoryId: string;
  categoryName?: string;
  categoryNameId?: string;
  amount: number;
  notes?: string;
  costType: 'direct' | 'indirect';
}

interface ExpenseEstimatorProps {
  value?: EstimatedExpense[];
  onChange?: (expenses: EstimatedExpense[]) => void;
}

export const ExpenseEstimator: React.FC<ExpenseEstimatorProps> = ({
  value = [],
  onChange,
}) => {
  const { theme } = useTheme();

  // Fetch expense categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseCategoriesApi.getAll,
  });

  const handleAdd = () => {
    const newExpense: EstimatedExpense = {
      categoryId: '',
      amount: 0,
      costType: 'direct',
    };
    onChange?.([...value, newExpense]);
  };

  const handleUpdate = (index: number, field: keyof EstimatedExpense, fieldValue: any) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: fieldValue };

    // Auto-fill category names
    if (field === 'categoryId') {
      const category = categories.find(c => c.id === fieldValue);
      if (category) {
        updated[index].categoryName = category.name;
        updated[index].categoryNameId = category.nameId;
      }
    }

    onChange?.(updated);
  };

  const handleDelete = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const columns = [
    {
      title: 'Kategori',
      key: 'category',
      width: '30%',
      render: (_: any, record: EstimatedExpense, index: number) => (
        <Select
          placeholder="Pilih kategori"
          value={record.categoryId || undefined}
          onChange={v => handleUpdate(index, 'categoryId', v)}
          style={{ width: '100%' }}
          loading={isLoading}
          showSearch
          optionFilterProp="label"
        >
          {categories.map(cat => (
            <Select.Option key={cat.id} value={cat.id} label={cat.name}>
              <Space>
                <Text>{cat.name}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ({cat.nameId})
                </Text>
              </Space>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Tipe Biaya',
      key: 'costType',
      width: '15%',
      render: (_: any, record: EstimatedExpense, index: number) => (
        <Select
          value={record.costType}
          onChange={v => handleUpdate(index, 'costType', v)}
          style={{ width: '100%' }}
        >
          <Select.Option value="direct">
            <Tag color="blue">Langsung</Tag>
          </Select.Option>
          <Select.Option value="indirect">
            <Tag color="orange">Tidak Langsung</Tag>
          </Select.Option>
        </Select>
      ),
    },
    {
      title: 'Estimasi Biaya',
      key: 'amount',
      width: '20%',
      render: (_: any, record: EstimatedExpense, index: number) => (
        <InputNumber
          placeholder="0"
          value={record.amount}
          onChange={v => handleUpdate(index, 'amount', v || 0)}
          style={{ width: '100%' }}
          formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value!.replace(/Rp\s?|(,*)/g, '')}
          min={0}
        />
      ),
    },
    {
      title: 'Catatan',
      key: 'notes',
      width: '25%',
      render: (_: any, record: EstimatedExpense, index: number) => (
        <Input
          placeholder="Catatan estimasi"
          value={record.notes}
          onChange={e => handleUpdate(index, 'notes', e.target.value)}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      render: (_: any, __: EstimatedExpense, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(index)}
        />
      ),
    },
  ];

  // Calculate totals
  const directTotal = value
    .filter(e => e.costType === 'direct')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const indirectTotal = value
    .filter(e => e.costType === 'indirect')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const total = directTotal + indirectTotal;

  return (
    <Card
      title="Estimasi Biaya Proyek"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Tambah Biaya
        </Button>
      }
      style={{
        background: theme.colors.card.background,
        borderColor: theme.colors.border.default,
      }}
    >
      <Table
        dataSource={value}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(_, index) => `expense-${index}`}
        locale={{ emptyText: 'Belum ada estimasi biaya' }}
      />

      <Card
        size="small"
        style={{
          marginTop: 16,
          background: theme.colors.background.secondary,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text>Biaya Langsung:</Text>
            <Text strong style={{ color: theme.colors.accent.primary }}>
              {formatIDR(directTotal)}
            </Text>
          </Space>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text>Biaya Tidak Langsung:</Text>
            <Text strong style={{ color: theme.colors.accent.secondary }}>
              {formatIDR(indirectTotal)}
            </Text>
          </Space>
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              borderTop: `1px solid ${theme.colors.border.default}`,
              paddingTop: 8,
            }}
          >
            <Text strong style={{ fontSize: 16 }}>
              Total Estimasi Biaya:
            </Text>
            <Text
              strong
              style={{ fontSize: 16, color: theme.colors.status.error }}
            >
              {formatIDR(total)}
            </Text>
          </Space>
        </Space>
      </Card>
    </Card>
  );
};
```

#### 2. Create Profit Projection Display Component

**File:** `frontend/src/components/projects/ProfitProjection.tsx`

```typescript
import React from 'react';
import { Card, Col, Divider, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { formatIDR } from '../../utils/currency';
import { useTheme } from '../../theme';

const { Text, Title } = Typography;

export interface ProjectionData {
  estimatedRevenue: number;
  estimatedDirectCosts: number;
  estimatedIndirectCosts: number;
  estimatedTotalCosts: number;
  projectedGrossProfit: number;
  projectedNetProfit: number;
  projectedGrossMargin: number;
  projectedNetMargin: number;
  isProfitable: boolean;
  profitabilityRating: 'excellent' | 'good' | 'breakeven' | 'loss';
}

interface ProfitProjectionProps {
  projection: ProjectionData;
}

export const ProfitProjection: React.FC<ProfitProjectionProps> = ({
  projection,
}) => {
  const { theme } = useTheme();

  const getMarginColor = (margin: number): string => {
    if (margin >= 20) return theme.colors.status.success;
    if (margin >= 10) return theme.colors.status.info;
    if (margin >= 0) return theme.colors.status.warning;
    return theme.colors.status.error;
  };

  const getRatingLabel = (rating: string): string => {
    switch (rating) {
      case 'excellent': return 'Sangat Baik';
      case 'good': return 'Baik';
      case 'breakeven': return 'Impas';
      case 'loss': return 'Rugi';
      default: return 'Tidak Diketahui';
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'excellent': return theme.colors.status.success;
      case 'good': return theme.colors.status.info;
      case 'breakeven': return theme.colors.status.warning;
      case 'loss': return theme.colors.status.error;
      default: return theme.colors.text.secondary;
    }
  };

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>Proyeksi Margin Laba</span>
        </Space>
      }
      extra={
        <Tag color={getRatingColor(projection.profitabilityRating)} style={{ fontSize: 14 }}>
          {getRatingLabel(projection.profitabilityRating)}
        </Tag>
      }
      style={{
        background: theme.colors.card.background,
        borderColor: theme.colors.border.default,
      }}
    >
      <Row gutter={[16, 16]}>
        {/* Gross Margin */}
        <Col xs={24} md={12}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="Proyeksi Margin Laba Kotor"
              value={projection.projectedGrossMargin}
              precision={2}
              suffix="%"
              valueStyle={{ color: getMarginColor(projection.projectedGrossMargin) }}
              prefix={
                projection.projectedGrossMargin >= 0 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
            <Progress
              percent={Math.min(Math.max(projection.projectedGrossMargin, 0), 100)}
              strokeColor={getMarginColor(projection.projectedGrossMargin)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatIDR(projection.projectedGrossProfit)}
            </Text>
          </div>
        </Col>

        {/* Net Margin */}
        <Col xs={24} md={12}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="Proyeksi Margin Laba Bersih"
              value={projection.projectedNetMargin}
              precision={2}
              suffix="%"
              valueStyle={{ color: getMarginColor(projection.projectedNetMargin) }}
              prefix={
                projection.projectedNetMargin >= 0 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
            <Progress
              percent={Math.min(Math.max(projection.projectedNetMargin, 0), 100)}
              strokeColor={getMarginColor(projection.projectedNetMargin)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatIDR(projection.projectedNetProfit)}
            </Text>
          </div>
        </Col>

        {/* Financial Breakdown */}
        <Col xs={24}>
          <Divider>Rincian Keuangan</Divider>
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Estimasi Pendapatan"
            value={projection.estimatedRevenue}
            formatter={value => formatIDR(Number(value))}
            prefix={<DollarOutlined />}
            valueStyle={{ color: theme.colors.status.info }}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Estimasi Total Biaya"
            value={projection.estimatedTotalCosts}
            formatter={value => formatIDR(Number(value))}
            prefix={<DollarOutlined />}
            valueStyle={{ color: theme.colors.status.error }}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Proyeksi Laba Bersih"
            value={Math.abs(projection.projectedNetProfit)}
            formatter={value => formatIDR(Number(value))}
            valueStyle={{
              color:
                projection.projectedNetProfit >= 0
                  ? theme.colors.status.success
                  : theme.colors.status.error,
            }}
            prefix={
              projection.projectedNetProfit >= 0 ? (
                <ArrowUpOutlined />
              ) : (
                <ArrowDownOutlined />
              )
            }
          />
        </Col>

        {/* Cost Breakdown */}
        <Col xs={24}>
          <Card size="small" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <Row gutter={16}>
              <Col xs={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">Biaya Langsung</Text>
                  <Text strong>{formatIDR(projection.estimatedDirectCosts)}</Text>
                </Space>
              </Col>
              <Col xs={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text type="secondary">Biaya Tidak Langsung</Text>
                  <Text strong>{formatIDR(projection.estimatedIndirectCosts)}</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Indonesian Industry Benchmarks */}
        <Col xs={24}>
          <Divider />
          <Card size="small" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>Benchmark Industri Kreatif Indonesia:</strong>
              <br />
              Sangat Baik: ≥ 20% | Baik: 10-20% | Impas: 0-10% | Rugi: {'<'} 0%
            </Text>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};
```

#### 3. Update ProjectCreatePage

**File:** `frontend/src/pages/ProjectCreatePage.tsx`

```typescript
import { ExpenseEstimator, EstimatedExpense } from '../components/projects/ExpenseEstimator';
import { ProfitProjection, ProjectionData } from '../components/projects/ProfitProjection';
import { projectCalculatorApi } from '../services/project-calculator';

interface ProjectFormData {
  description: string
  scopeOfWork?: string
  output?: string
  projectTypeId: string
  clientId: string
  startDate?: dayjs.Dayjs
  endDate?: dayjs.Dayjs
  products: ProductItem[]
  estimatedExpenses?: EstimatedExpense[]  // ⭐ NEW
}

export const ProjectCreatePage: React.FC = () => {
  const [form] = Form.useForm<ProjectFormData>();
  // ... existing state ...

  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [calculatingProjection, setCalculatingProjection] = useState(false);

  // Watch form values for real-time calculation
  const products = Form.useWatch('products', form);
  const estimatedExpenses = Form.useWatch('estimatedExpenses', form);

  // Recalculate projection when products or expenses change
  useEffect(() => {
    const calculateProjection = async () => {
      if (!products || products.length === 0) {
        setProjection(null);
        return;
      }

      if (!estimatedExpenses || estimatedExpenses.length === 0) {
        setProjection(null);
        return;
      }

      setCalculatingProjection(true);
      try {
        const result = await projectCalculatorApi.calculate({
          products,
          estimatedExpenses,
        });
        setProjection(result);
      } catch (error) {
        console.error('Failed to calculate projection:', error);
      } finally {
        setCalculatingProjection(false);
      }
    };

    // Debounce calculation
    const timeout = setTimeout(calculateProjection, 500);
    return () => clearTimeout(timeout);
  }, [products, estimatedExpenses]);

  const handleSubmit = async (values: ProjectFormData) => {
    const projectData: CreateProjectRequest = {
      description: values.description,
      scopeOfWork: values.scopeOfWork,
      output: values.output,
      projectTypeId: values.projectTypeId,
      clientId: values.clientId,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      products: values.products || [],
      estimatedExpenses: values.estimatedExpenses || [],  // ⭐ NEW
    };

    createProjectMutation.mutate(projectData);
  };

  return (
    <EntityFormLayout
      hero={heroCard}
      sidebar={
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Existing statistics */}
          <FormStatistics {...} />

          {/* ⭐ NEW: Profit Projection */}
          {projection && (
            <ProfitProjection projection={projection} />
          )}
        </Space>
      }
    >
      <Form form={form} onFinish={handleSubmit}>
        {/* Existing form sections ... */}

        {/* ⭐ NEW: Expense Estimator Section */}
        <ProgressiveSection
          title="Estimasi Biaya"
          subtitle="Perkirakan biaya untuk menghitung proyeksi margin laba"
          icon={<DollarOutlined />}
          dependencies={['products']}
        >
          <Form.Item name="estimatedExpenses">
            <ExpenseEstimator />
          </Form.Item>
        </ProgressiveSection>

        {/* Form actions */}
      </Form>
    </EntityFormLayout>
  );
};
```

#### 4. Create API Service

**File:** `frontend/src/services/project-calculator.ts`

```typescript
import { apiClient } from './api-client';

export interface CalculateProjectionRequest {
  products: Array<{
    name: string;
    description: string;
    price: number;
    quantity: number;
  }>;
  estimatedExpenses: Array<{
    categoryId: string;
    amount: number;
    notes?: string;
    costType: 'direct' | 'indirect';
  }>;
}

export interface ProjectionResult {
  estimatedRevenue: number;
  estimatedDirectCosts: number;
  estimatedIndirectCosts: number;
  estimatedTotalCosts: number;
  projectedGrossProfit: number;
  projectedNetProfit: number;
  projectedGrossMargin: number;
  projectedNetMargin: number;
  isProfitable: boolean;
  profitabilityRating: 'excellent' | 'good' | 'breakeven' | 'loss';
}

export const projectCalculatorApi = {
  calculate: async (data: CalculateProjectionRequest): Promise<ProjectionResult> => {
    const response = await apiClient.post('/projects/calculate-projection', data);
    return response.data;
  },
};
```

---

## Phase 4: Database Migration

### Migration Script

**File:** `backend/prisma/migrations/YYYYMMDDHHMMSS_add_project_projections/migration.sql`

```sql
-- AlterTable Project - Add projection fields
ALTER TABLE "projects"
ADD COLUMN "estimatedExpenses" JSONB,
ADD COLUMN "projectedGrossMargin" DECIMAL(5,2),
ADD COLUMN "projectedNetMargin" DECIMAL(5,2),
ADD COLUMN "projectedProfit" DECIMAL(15,2);

-- Create index for projection queries
CREATE INDEX "projects_projectedNetMargin_idx" ON "projects"("projectedNetMargin");
CREATE INDEX "projects_profitabilityRating_idx" ON "projects"(("estimatedExpenses"->>'profitabilityRating'));
```

### Update Schema

**File:** `backend/prisma/schema.prisma`

```prisma
model Project {
  // ... existing fields ...

  // ⭐ NEW: Estimated expense breakdown
  estimatedExpenses Json? // JSON storage for estimated costs

  // ⭐ NEW: Projected profit metrics
  projectedGrossMargin Decimal? @db.Decimal(5, 2)  // Estimated gross margin %
  projectedNetMargin   Decimal? @db.Decimal(5, 2)  // Estimated net margin %
  projectedProfit      Decimal? @db.Decimal(15, 2) // Estimated profit amount

  // Existing indexes
  @@index([projectedNetMargin])  // ⭐ NEW: Index for projection queries
}
```

---

## Implementation Checklist

### ✅ Phase 1: Database (1-2 hours)
- [ ] Add fields to Project model (estimatedExpenses, projectedGrossMargin, projectedNetMargin, projectedProfit)
- [ ] Create migration script
- [ ] Run migration: `npx prisma migrate dev --name add_project_projections`
- [ ] Generate Prisma Client: `npx prisma generate`
- [ ] Test database changes

### ✅ Phase 2: Backend (3-4 hours)
- [ ] Create `EstimatedExpenseDto` class
- [ ] Update `CreateProjectDto` with estimatedExpenses field
- [ ] Create `ProjectProjectionService` with calculateProjection()
- [ ] Add `/projects/calculate-projection` endpoint
- [ ] Update `ProjectsService.create()` to store projections
- [ ] Register services in ProjectsModule
- [ ] Test API endpoints with Postman/Thunder Client

### ✅ Phase 3: Frontend (4-5 hours)
- [ ] Create `ExpenseEstimator` component
- [ ] Create `ProfitProjection` component
- [ ] Update `ProjectCreatePage` with new sections
- [ ] Create `project-calculator` API service
- [ ] Add real-time calculation with debouncing
- [ ] Update form submission to include estimatedExpenses
- [ ] Test UI flow end-to-end

### ✅ Phase 4: Testing & Polish (2-3 hours)
- [ ] Test calculator with various scenarios
- [ ] Test negative margins (loss scenarios)
- [ ] Test zero expenses (only revenue)
- [ ] Test zero revenue (only costs)
- [ ] Validate Indonesian number formatting
- [ ] Check mobile responsiveness
- [ ] Add loading states
- [ ] Add error handling

---

## Integration Points

### 1. With Existing Profit Calculation
- **Estimated** (planning): `projectedNetMargin` from calculator
- **Actual** (execution): `netMarginPercent` from ProfitCalculationService
- **Variance** (analysis): Compare estimated vs actual

### 2. With ExpenseBudget (Future Enhancement)
- Create ExpenseBudget records from estimatedExpenses
- Track spent vs budgeted amounts
- Alert when exceeding budget

### 3. With Team & Resources
- Labor costs from Team & Resources → contribute to actual costs
- Compare estimated labor vs actual labor entries
- Track labor efficiency

### 4. With Invoices & Payments
- Actual revenue from invoices
- Compare estimated revenue vs actual revenue
- Revenue variance analysis

---

## Business Logic Rules

### 1. Profitability Rating (Indonesian Standards)
```typescript
if (netMargin >= 20%) → 'excellent' (Sangat Baik)
if (netMargin >= 10%) → 'good' (Baik)
if (netMargin >= 0%)  → 'breakeven' (Impas)
if (netMargin < 0%)   → 'loss' (Rugi)
```

### 2. Margin Calculations
```typescript
Revenue = Σ (product.price × product.quantity)
Direct Costs = Σ (expense.amount where costType = 'direct')
Indirect Costs = Σ (expense.amount where costType = 'indirect')
Total Costs = Direct Costs + Indirect Costs

Gross Profit = Revenue - Direct Costs
Net Profit = Revenue - Total Costs

Gross Margin % = (Gross Profit / Revenue) × 100
Net Margin % = (Net Profit / Revenue) × 100
```

### 3. Validation Rules
- Revenue must be > 0 to calculate margins
- At least one expense required for projection
- Category must exist in ExpenseCategory table
- Amount must be positive number

---

## UI/UX Considerations

### 1. Progressive Disclosure
- Show calculator only after products are added (revenue defined)
- Enable expense section after revenue section completed
- Show projection card in sidebar when both revenue + expenses exist

### 2. Real-Time Feedback
- Debounce calculation (500ms) to avoid excessive API calls
- Show loading indicator during calculation
- Update projection immediately on form changes

### 3. Visual Indicators
- Color-coded margins (green = good, yellow = breakeven, red = loss)
- Progress bars for margin visualization
- Icons for profit/loss indicators (arrows)

### 4. Indonesian Localization
- All labels in Bahasa Indonesia
- IDR currency formatting
- Indonesian industry benchmarks displayed
- Bilingual category names

---

## Testing Scenarios

### Scenario 1: Profitable Project
```
Revenue: 100,000,000 IDR
Direct Costs: 60,000,000 IDR
Indirect Costs: 10,000,000 IDR

Expected:
- Gross Margin: 40%
- Net Margin: 30%
- Rating: 'excellent'
- Color: Green
```

### Scenario 2: Breakeven Project
```
Revenue: 100,000,000 IDR
Direct Costs: 85,000,000 IDR
Indirect Costs: 10,000,000 IDR

Expected:
- Gross Margin: 15%
- Net Margin: 5%
- Rating: 'breakeven'
- Color: Yellow
```

### Scenario 3: Loss Project
```
Revenue: 100,000,000 IDR
Direct Costs: 90,000,000 IDR
Indirect Costs: 20,000,000 IDR

Expected:
- Gross Margin: 10%
- Net Margin: -10%
- Rating: 'loss'
- Color: Red
- Warning message displayed
```

---

## Future Enhancements

### 1. Scenario Planning (v2)
- Save multiple projection scenarios
- Compare best-case vs worst-case
- Sensitivity analysis (what-if calculations)

### 2. Template System (v2)
- Save expense templates by project type
- Quick apply common expense patterns
- Historical data analysis for better estimates

### 3. AI-Powered Estimates (v3)
- Suggest estimates based on similar past projects
- Predict costs using machine learning
- Anomaly detection for unrealistic estimates

### 4. Budget Allocation (v2)
- Auto-create ExpenseBudget records
- Budget vs actual tracking dashboard
- Alert system for budget overruns

---

## Success Metrics

### Business Metrics
- **Adoption Rate:** % of projects created with projections
- **Accuracy:** Average variance between projected vs actual margins
- **Decision Support:** % of projects rejected due to low projected margins

### Technical Metrics
- **Performance:** Projection calculation < 500ms
- **Reliability:** 99.9% uptime for calculator API
- **User Experience:** < 5 seconds to complete expense estimation

---

## Risk Mitigation

### Risk 1: Complex UI
**Mitigation:** Progressive disclosure, tooltips, examples

### Risk 2: Calculation Errors
**Mitigation:** Unit tests, validation rules, edge case handling

### Risk 3: Performance with Many Expenses
**Mitigation:** Debouncing, client-side calculation fallback, pagination

### Risk 4: User Confusion
**Mitigation:** Inline help text, video tutorial, sample data

---

## Documentation Requirements

### 1. Developer Documentation
- API endpoint documentation (Swagger)
- Database schema documentation
- Service method documentation
- Component props documentation

### 2. User Documentation
- Feature overview guide
- Video tutorial (Bahasa Indonesia)
- Example scenarios with screenshots
- FAQ section

### 3. Admin Documentation
- Configuration guide
- Troubleshooting guide
- Performance tuning guide

---

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Database schema updates | 1-2 hours |
| **Phase 2** | Backend services & API | 3-4 hours |
| **Phase 3** | Frontend components | 4-5 hours |
| **Phase 4** | Testing & polish | 2-3 hours |
| **Total** |  | **10-14 hours** |

---

## Conclusion

This implementation plan provides a **comprehensive calculator** that helps users make informed decisions during project creation by:

1. **Estimating costs** by category (direct/indirect)
2. **Calculating profit margins** in real-time
3. **Providing visual feedback** with Indonesian standards
4. **Storing projections** for future variance analysis

The solution integrates seamlessly with existing systems (profit calculation, expense management, team & resources) and sets the foundation for advanced features like budget tracking and scenario planning.

**Status:** Ready for implementation approval ✅
