# Profit Margin Calculation Implementation Plan

**Date:** 2025-01-20
**Status:** Planning Phase
**Target:** Add profit margin tracking to Project Management module

---

## Executive Summary

This document outlines the implementation plan for adding **profit margin calculation** functionality to the Indonesian Business Management System's Project module. The feature will track project profitability by comparing revenue (from invoices) against costs (from expenses and allocations), providing real-time visibility into project financial performance.

### Key Objectives
1. Calculate and display profit margins at the project level
2. Track actual costs vs. estimated budget
3. Provide gross and net profit margin metrics
4. Support Indonesian accounting standards (PSAK 57 cost allocation)
5. Enable profit tracking across project lifecycle

---

## Current State Analysis

### Existing Infrastructure

#### Database Schema (Prisma)
✅ **Already Available:**
- `Project.basePrice` (Decimal) - Base project revenue/price
- `Project.estimatedBudget` (Decimal) - Estimated costs
- `Project.priceBreakdown` (Json) - Detailed pricing items
- `Expense.projectId` - Links expenses to projects
- `ProjectCostAllocation` - Expense allocation to projects
- `WorkInProgress` - PSAK 57 WIP tracking with cost accumulation
- `Invoice.projectId` - Links revenue to projects

#### Backend Services
✅ **Current Capabilities:**
- `projects.service.ts` - CRUD operations for projects
- Calculates `basePrice` from product items
- Tracks quotations and invoices per project
- Basic project statistics endpoint (`getStats()`)

#### Frontend Components
✅ **Current Display:**
- Project detail page shows basic metrics
- Budget display (estimated)
- Progress tracking (time-based)
- Revenue display from `totalRevenue` field

### Gaps Identified

❌ **Missing Features:**
1. **No cost aggregation** - Expenses not summed per project
2. **No profit calculation** - No revenue minus cost logic
3. **No margin percentage** - No profitability ratio
4. **No real-time tracking** - Static budget vs actual comparison missing
5. **No cost breakdown** - Direct vs indirect costs not categorized
6. **No Indonesian compliance metrics** - PSAK 57 integration incomplete

---

## Profit Margin Formulas (Research-Based)

### Primary Metrics to Implement

#### 1. **Gross Profit Margin**
```
Gross Profit Margin (%) = ((Total Revenue - Direct Costs) / Total Revenue) × 100
```

**Components:**
- **Total Revenue**: Sum of all paid/partially-paid invoices for project
- **Direct Costs**:
  - Project-allocated expenses (from `ProjectCostAllocation` where `isDirect = true`)
  - Direct material costs from `WorkInProgress.directMaterialCost`
  - Direct labor costs from `WorkInProgress.directLaborCost`
  - Direct expenses from `WorkInProgress.directExpenses`

#### 2. **Net Profit Margin**
```
Net Profit Margin (%) = ((Total Revenue - Total Costs) / Total Revenue) × 100
```

**Components:**
- **Total Costs**: Direct costs + allocated overhead
  - All direct costs (above)
  - Allocated overhead from `WorkInProgress.allocatedOverhead`
  - Indirect expenses from `ProjectCostAllocation` where `isDirect = false`

#### 3. **Budget Variance**
```
Budget Variance (%) = ((Actual Costs - Estimated Budget) / Estimated Budget) × 100
```

**Components:**
- **Estimated Budget**: `Project.estimatedBudget`
- **Actual Costs**: Sum of all allocated expenses

#### 4. **Profit Amount (IDR)**
```
Gross Profit = Total Revenue - Direct Costs
Net Profit = Total Revenue - Total Costs
```

---

## Implementation Plan

### Phase 1: Database Layer Enhancement

#### 1.1 Schema Updates
**File:** `backend/prisma/schema.prisma`

**Add to Project model:**
```prisma
model Project {
  // ... existing fields ...

  // ===== PROFIT MARGIN TRACKING =====

  // Cost Tracking
  totalDirectCosts    Decimal? @default(0) @db.Decimal(15, 2)  // Auto-calculated
  totalIndirectCosts  Decimal? @default(0) @db.Decimal(15, 2)  // Auto-calculated
  totalAllocatedCosts Decimal? @default(0) @db.Decimal(15, 2)  // Direct + Indirect

  // Revenue Tracking
  totalInvoicedAmount Decimal? @default(0) @db.Decimal(15, 2)  // Sum of invoices
  totalPaidAmount     Decimal? @default(0) @db.Decimal(15, 2)  // Only paid invoices

  // Profit Calculations (auto-calculated fields)
  grossProfit         Decimal? @db.Decimal(15, 2)  // Revenue - Direct Costs
  netProfit           Decimal? @db.Decimal(15, 2)  // Revenue - Total Costs
  grossMarginPercent  Decimal? @db.Decimal(5, 2)   // Gross profit %
  netMarginPercent    Decimal? @db.Decimal(5, 2)   // Net profit %

  // Budget Tracking
  budgetVariance      Decimal? @db.Decimal(15, 2)  // Actual - Estimated
  budgetVariancePercent Decimal? @db.Decimal(5, 2) // Variance %

  // Calculation Metadata
  profitCalculatedAt  DateTime?  // Last calculation timestamp
  profitCalculatedBy  String?    // User who triggered calculation

  // ... existing relations ...
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_project_profit_margin_tracking
```

#### 1.2 Add Indexes for Performance
```prisma
@@index([grossMarginPercent])
@@index([netMarginPercent])
@@index([totalAllocatedCosts])
@@index([profitCalculatedAt])
```

---

### Phase 2: Backend Service Layer

#### 2.1 Create Profit Calculation Service
**New File:** `backend/src/modules/projects/profit-calculation.service.ts`

**Key Methods:**

```typescript
@Injectable()
export class ProfitCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate comprehensive profit metrics for a project
   * Integrates with PSAK 57 WIP tracking
   */
  async calculateProjectProfitMargin(projectId: string) {
    // 1. Get total revenue
    const revenue = await this.calculateTotalRevenue(projectId);

    // 2. Get direct costs
    const directCosts = await this.calculateDirectCosts(projectId);

    // 3. Get indirect costs (allocated overhead)
    const indirectCosts = await this.calculateIndirectCosts(projectId);

    // 4. Calculate margins
    const grossProfit = revenue.paid - directCosts.total;
    const netProfit = revenue.paid - (directCosts.total + indirectCosts.total);

    const grossMargin = revenue.paid > 0
      ? (grossProfit / revenue.paid) * 100
      : 0;
    const netMargin = revenue.paid > 0
      ? (netProfit / revenue.paid) * 100
      : 0;

    // 5. Calculate budget variance
    const budgetVariance = await this.calculateBudgetVariance(projectId);

    // 6. Update project record
    return this.updateProjectProfitMetrics(projectId, {
      totalDirectCosts: directCosts.total,
      totalIndirectCosts: indirectCosts.total,
      totalAllocatedCosts: directCosts.total + indirectCosts.total,
      totalInvoicedAmount: revenue.invoiced,
      totalPaidAmount: revenue.paid,
      grossProfit,
      netProfit,
      grossMarginPercent: grossMargin,
      netMarginPercent: netMargin,
      budgetVariance: budgetVariance.amount,
      budgetVariancePercent: budgetVariance.percent,
      profitCalculatedAt: new Date(),
    });
  }

  /**
   * Calculate total revenue from invoices
   * Indonesian compliance: Only count PAID and PARTIALLY_PAID invoices
   */
  private async calculateTotalRevenue(projectId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { projectId },
      select: {
        totalAmount: true,
        status: true,
        paymentStatus: true,
      },
    });

    const invoiced = invoices.reduce((sum, inv) =>
      sum + Number(inv.totalAmount), 0);

    const paid = invoices
      .filter(inv => ['PAID_OFF', 'PARTIALLY_PAID'].includes(inv.status))
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    return { invoiced, paid };
  }

  /**
   * Calculate direct costs from:
   * 1. ProjectCostAllocation (isDirect = true)
   * 2. WorkInProgress direct cost fields (PSAK 57)
   */
  private async calculateDirectCosts(projectId: string) {
    // Direct allocated expenses
    const allocations = await this.prisma.projectCostAllocation.findMany({
      where: {
        projectId,
        isDirect: true,
        costType: { in: ['MATERIAL', 'LABOR'] }
      },
      select: { allocatedAmount: true },
    });

    const allocatedDirect = allocations.reduce((sum, alloc) =>
      sum + Number(alloc.allocatedAmount), 0);

    // WIP direct costs (PSAK 57 compliant)
    const wip = await this.prisma.workInProgress.findMany({
      where: { projectId, isCompleted: false },
      select: {
        directMaterialCost: true,
        directLaborCost: true,
        directExpenses: true,
      },
    });

    const wipDirect = wip.reduce((sum, w) =>
      sum + Number(w.directMaterialCost)
          + Number(w.directLaborCost)
          + Number(w.directExpenses), 0);

    return {
      allocated: allocatedDirect,
      wip: wipDirect,
      total: allocatedDirect + wipDirect,
    };
  }

  /**
   * Calculate indirect costs (overhead allocation)
   */
  private async calculateIndirectCosts(projectId: string) {
    const allocations = await this.prisma.projectCostAllocation.findMany({
      where: {
        projectId,
        isDirect: false,
        costType: 'OVERHEAD'
      },
      select: { allocatedAmount: true },
    });

    const allocated = allocations.reduce((sum, alloc) =>
      sum + Number(alloc.allocatedAmount), 0);

    // WIP allocated overhead (PSAK 57)
    const wip = await this.prisma.workInProgress.findMany({
      where: { projectId, isCompleted: false },
      select: { allocatedOverhead: true },
    });

    const wipOverhead = wip.reduce((sum, w) =>
      sum + Number(w.allocatedOverhead), 0);

    return {
      allocated,
      wip: wipOverhead,
      total: allocated + wipOverhead,
    };
  }

  /**
   * Calculate budget variance
   */
  private async calculateBudgetVariance(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        estimatedBudget: true,
        totalAllocatedCosts: true
      },
    });

    const estimated = Number(project.estimatedBudget || 0);
    const actual = Number(project.totalAllocatedCosts || 0);
    const variance = actual - estimated;
    const percent = estimated > 0 ? (variance / estimated) * 100 : 0;

    return { amount: variance, percent };
  }

  /**
   * Recalculate profit margins for all active projects
   * Scheduled job: Daily at midnight
   */
  async recalculateAllProjects() {
    const projects = await this.prisma.project.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'PLANNING'] }
      },
      select: { id: true },
    });

    for (const project of projects) {
      await this.calculateProjectProfitMargin(project.id);
    }

    return { processed: projects.length };
  }
}
```

#### 2.2 Update Projects Service
**File:** `backend/src/modules/projects/projects.service.ts`

**Add methods:**
```typescript
import { ProfitCalculationService } from './profit-calculation.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private profitCalc: ProfitCalculationService, // Inject new service
  ) {}

  // Enhanced findOne to include profit metrics
  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        projectType: true,
        quotations: {
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            quotations: true,
            invoices: true,
            expenses: true, // NEW
            costAllocations: true, // NEW
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyek tidak ditemukan');
    }

    // Trigger profit calculation if not calculated recently
    const needsRecalc = !project.profitCalculatedAt ||
      daysSince(project.profitCalculatedAt) > 1;

    if (needsRecalc) {
      await this.profitCalc.calculateProjectProfitMargin(id);
      // Re-fetch with updated metrics
      return this.prisma.project.findUnique({
        where: { id },
        include: { /* same as above */ }
      });
    }

    return project;
  }

  // New endpoint for manual recalculation
  async recalculateProfit(id: string) {
    return this.profitCalc.calculateProjectProfitMargin(id);
  }

  // Enhanced stats with profitability overview
  async getProjectStats() {
    const [total, planning, inProgress, completed, cancelled] =
      await Promise.all([
        this.prisma.project.count(),
        this.prisma.project.count({ where: { status: 'PLANNING' } }),
        this.prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.project.count({ where: { status: 'COMPLETED' } }),
        this.prisma.project.count({ where: { status: 'CANCELLED' } }),
      ]);

    // NEW: Profitability stats
    const profitableProjects = await this.prisma.project.count({
      where: { netMarginPercent: { gte: 0 } }
    });

    const avgGrossMargin = await this.prisma.project.aggregate({
      _avg: { grossMarginPercent: true },
      where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } }
    });

    const avgNetMargin = await this.prisma.project.aggregate({
      _avg: { netMarginPercent: true },
      where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } }
    });

    return {
      total,
      byStatus: { planning, inProgress, completed, cancelled },
      profitability: {
        profitable: profitableProjects,
        avgGrossMargin: avgGrossMargin._avg.grossMarginPercent || 0,
        avgNetMargin: avgNetMargin._avg.netMarginPercent || 0,
      },
    };
  }
}
```

#### 2.3 Update Projects Controller
**File:** `backend/src/modules/projects/projects.controller.ts`

**Add endpoints:**
```typescript
@Controller('projects')
export class ProjectsController {
  // ... existing methods ...

  @Post(':id/calculate-profit')
  @ApiOperation({ summary: 'Recalculate profit margins for project' })
  async recalculateProfit(@Param('id') id: string) {
    return this.projectsService.recalculateProfit(id);
  }

  @Get('profit-overview')
  @ApiOperation({ summary: 'Get profitability overview for all projects' })
  async getProfitOverview(
    @Query('status') status?: string,
    @Query('minMargin') minMargin?: number,
  ) {
    return this.projectsService.getProfitabilityReport({
      status,
      minMargin,
    });
  }
}
```

#### 2.4 Update DTOs
**File:** `backend/src/modules/projects/dto/project-response.dto.ts`

**Add profit fields:**
```typescript
export class ProjectResponseDto {
  // ... existing fields ...

  @ApiProperty({ description: 'Total direct costs (IDR)' })
  totalDirectCosts?: string;

  @ApiProperty({ description: 'Total indirect costs (IDR)' })
  totalIndirectCosts?: string;

  @ApiProperty({ description: 'Total allocated costs (IDR)' })
  totalAllocatedCosts?: string;

  @ApiProperty({ description: 'Total invoiced amount (IDR)' })
  totalInvoicedAmount?: string;

  @ApiProperty({ description: 'Total paid amount (IDR)' })
  totalPaidAmount?: string;

  @ApiProperty({ description: 'Gross profit (IDR)' })
  grossProfit?: string;

  @ApiProperty({ description: 'Net profit (IDR)' })
  netProfit?: string;

  @ApiProperty({ description: 'Gross margin percentage' })
  grossMarginPercent?: string;

  @ApiProperty({ description: 'Net margin percentage' })
  netMarginPercent?: string;

  @ApiProperty({ description: 'Budget variance (IDR)' })
  budgetVariance?: string;

  @ApiProperty({ description: 'Budget variance percentage' })
  budgetVariancePercent?: string;

  @ApiProperty({ description: 'Last profit calculation timestamp' })
  profitCalculatedAt?: string;

  // Cost breakdown
  costBreakdown?: {
    direct: {
      materials: string;
      labor: string;
      expenses: string;
      total: string;
    };
    indirect: {
      overhead: string;
      allocated: string;
      total: string;
    };
    total: string;
  };
}
```

---

### Phase 3: Frontend Integration

#### 3.1 Update Project Type Definition
**File:** `frontend/src/services/projects.ts`

**Update interface:**
```typescript
export interface Project {
  // ... existing fields ...

  // Profit margin fields
  totalDirectCosts?: string;
  totalIndirectCosts?: string;
  totalAllocatedCosts?: string;
  totalInvoicedAmount?: string;
  totalPaidAmount?: string;
  grossProfit?: string;
  netProfit?: string;
  grossMarginPercent?: string;
  netMarginPercent?: string;
  budgetVariance?: string;
  budgetVariancePercent?: string;
  profitCalculatedAt?: string;

  costBreakdown?: {
    direct: {
      materials: string;
      labor: string;
      expenses: string;
      total: string;
    };
    indirect: {
      overhead: string;
      allocated: string;
      total: string;
    };
    total: string;
  };
}
```

#### 3.2 Create Profit Margin Component
**New File:** `frontend/src/components/projects/ProfitMarginCard.tsx`

**Component structure:**
```typescript
interface ProfitMarginCardProps {
  project: Project;
  onRecalculate?: () => void;
}

export const ProfitMarginCard: React.FC<ProfitMarginCardProps> = ({
  project,
  onRecalculate,
}) => {
  const { theme } = useTheme();

  const grossMargin = parseFloat(project.grossMarginPercent || '0');
  const netMargin = parseFloat(project.netMarginPercent || '0');

  // Color coding based on margin thresholds
  const getMarginColor = (margin: number) => {
    if (margin >= 20) return theme.colors.status.success; // Excellent
    if (margin >= 10) return theme.colors.status.info;    // Good
    if (margin >= 0) return theme.colors.status.warning;  // Break-even
    return theme.colors.status.error;                      // Loss
  };

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>Profit Margin Analysis</span>
          {project.profitCalculatedAt && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Updated: {formatDate(project.profitCalculatedAt)}
            </Text>
          )}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={onRecalculate}
          size="small"
        >
          Recalculate
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        {/* Gross Margin */}
        <Col xs={24} md={12}>
          <Statistic
            title="Gross Profit Margin"
            value={grossMargin}
            precision={2}
            suffix="%"
            valueStyle={{ color: getMarginColor(grossMargin) }}
            prefix={
              grossMargin >= 0 ? (
                <ArrowUpOutlined />
              ) : (
                <ArrowDownOutlined />
              )
            }
          />
          <Progress
            percent={Math.min(Math.max(grossMargin, 0), 100)}
            strokeColor={getMarginColor(grossMargin)}
            showInfo={false}
          />
        </Col>

        {/* Net Margin */}
        <Col xs={24} md={12}>
          <Statistic
            title="Net Profit Margin"
            value={netMargin}
            precision={2}
            suffix="%"
            valueStyle={{ color: getMarginColor(netMargin) }}
            prefix={
              netMargin >= 0 ? (
                <ArrowUpOutlined />
              ) : (
                <ArrowDownOutlined />
              )
            }
          />
          <Progress
            percent={Math.min(Math.max(netMargin, 0), 100)}
            strokeColor={getMarginColor(netMargin)}
            showInfo={false}
          />
        </Col>

        {/* Revenue vs Costs */}
        <Col xs={24}>
          <Divider>Financial Breakdown</Divider>
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Total Revenue (Paid)"
            value={formatIDR(parseFloat(project.totalPaidAmount || '0'))}
            prefix={<DollarOutlined />}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Total Costs"
            value={formatIDR(parseFloat(project.totalAllocatedCosts || '0'))}
            prefix={<DollarOutlined />}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Net Profit"
            value={formatIDR(parseFloat(project.netProfit || '0'))}
            valueStyle={{
              color: parseFloat(project.netProfit || '0') >= 0
                ? theme.colors.status.success
                : theme.colors.status.error
            }}
            prefix={<DollarOutlined />}
          />
        </Col>

        {/* Cost Breakdown */}
        {project.costBreakdown && (
          <>
            <Col xs={24}>
              <Divider>Cost Breakdown</Divider>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Direct Costs">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Materials:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.materials))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Labor:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.labor))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Expenses:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.expenses))}
                    </Text>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between">
                    <Text strong>Total Direct:</Text>
                    <Text strong style={{ color: theme.colors.primary }}>
                      {formatIDR(parseFloat(project.costBreakdown.direct.total))}
                    </Text>
                  </Row>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Indirect Costs">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Overhead:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.overhead))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Allocated:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.allocated))}
                    </Text>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between">
                    <Text strong>Total Indirect:</Text>
                    <Text strong style={{ color: theme.colors.primary }}>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.total))}
                    </Text>
                  </Row>
                </Space>
              </Card>
            </Col>
          </>
        )}

        {/* Budget Variance */}
        <Col xs={24}>
          <Divider>Budget Performance</Divider>
        </Col>

        <Col xs={24} md={12}>
          <Statistic
            title="Budget Variance"
            value={formatIDR(Math.abs(parseFloat(project.budgetVariance || '0')))}
            prefix={
              parseFloat(project.budgetVariance || '0') >= 0 ? (
                <ExclamationCircleOutlined style={{ color: theme.colors.status.error }} />
              ) : (
                <CheckCircleOutlined style={{ color: theme.colors.status.success }} />
              )
            }
          />
          <Text type="secondary">
            {parseFloat(project.budgetVariance || '0') >= 0
              ? 'Over budget'
              : 'Under budget'}
          </Text>
        </Col>

        <Col xs={24} md={12}>
          <Statistic
            title="Variance Percentage"
            value={Math.abs(parseFloat(project.budgetVariancePercent || '0'))}
            precision={2}
            suffix="%"
            valueStyle={{
              color: Math.abs(parseFloat(project.budgetVariancePercent || '0')) > 10
                ? theme.colors.status.error
                : theme.colors.status.success
            }}
          />
        </Col>
      </Row>
    </Card>
  );
};
```

#### 3.3 Update Project Detail Page
**File:** `frontend/src/pages/ProjectDetailPage.tsx`

**Add profit margin card:**
```typescript
import { ProfitMarginCard } from '../components/projects/ProfitMarginCard';

// Inside render, after progress section:
<ProfitMarginCard
  project={project}
  onRecalculate={async () => {
    await fetch(`/api/v1/projects/${id}/calculate-profit`, {
      method: 'POST'
    });
    refetch(); // Re-fetch project data
  }}
/>
```

#### 3.4 Update Projects List Page
**File:** `frontend/src/pages/ProjectsPage.tsx`

**Add margin column to table:**
```typescript
const columns = [
  // ... existing columns ...
  {
    title: 'Net Margin',
    dataIndex: 'netMarginPercent',
    key: 'netMarginPercent',
    width: 120,
    render: (margin: string) => {
      const value = parseFloat(margin || '0');
      const color = value >= 10 ? 'green' : value >= 0 ? 'orange' : 'red';
      return (
        <Tag color={color}>
          {value >= 0 ? '+' : ''}{value.toFixed(2)}%
        </Tag>
      );
    },
    sorter: (a, b) =>
      parseFloat(a.netMarginPercent || '0') - parseFloat(b.netMarginPercent || '0'),
  },
  {
    title: 'Profit',
    dataIndex: 'netProfit',
    key: 'netProfit',
    width: 150,
    render: (profit: string) => {
      const value = parseFloat(profit || '0');
      return (
        <Text style={{
          color: value >= 0 ? theme.colors.status.success : theme.colors.status.error
        }}>
          {formatIDR(value)}
        </Text>
      );
    },
    sorter: (a, b) =>
      parseFloat(a.netProfit || '0') - parseFloat(b.netProfit || '0'),
  },
];
```

#### 3.5 Add Profit Margin Statistics
**New File:** `frontend/src/components/projects/ProfitStatistics.tsx`

**Dashboard-level statistics:**
```typescript
export const ProfitStatistics: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: () => projectService.getStats(),
  });

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <CompactMetricCard
          title="Avg Gross Margin"
          value={`${stats?.profitability.avgGrossMargin.toFixed(2)}%`}
          icon={<BarChartOutlined />}
          color={theme.colors.status.info}
        />
      </Col>
      <Col xs={24} md={8}>
        <CompactMetricCard
          title="Avg Net Margin"
          value={`${stats?.profitability.avgNetMargin.toFixed(2)}%`}
          icon={<DollarOutlined />}
          color={theme.colors.status.success}
        />
      </Col>
      <Col xs={24} md={8}>
        <CompactMetricCard
          title="Profitable Projects"
          value={`${stats?.profitability.profitable} / ${stats?.total}`}
          icon={<CheckCircleOutlined />}
          color={theme.colors.primary}
        />
      </Col>
    </Row>
  );
};
```

---

### Phase 4: Indonesian Compliance & PSAK Integration

#### 4.1 PSAK 57 Integration
**Reference:** Work in Progress & Cost Allocation standards

**Enhancements:**
```typescript
// Ensure cost allocations follow PSAK 57 guidelines
enum CostType {
  MATERIAL = 'MATERIAL',       // Biaya Bahan
  LABOR = 'LABOR',             // Biaya Tenaga Kerja
  OVERHEAD = 'OVERHEAD',       // Biaya Overhead
  SUBCONTRACTOR = 'SUBCONTRACTOR', // Biaya Subkontraktor
}

// Allocation methods per PSAK 57
enum AllocationMethod {
  PERCENTAGE = 'PERCENTAGE',   // Persentase
  HOURS = 'HOURS',             // Jam Kerja
  DIRECT = 'DIRECT',           // Langsung
  SQUARE_METER = 'SQUARE_METER', // Luas Area
  HEADCOUNT = 'HEADCOUNT',     // Jumlah SDM
}
```

#### 4.2 Indonesian Currency Formatting
**All monetary values:**
- Format: `Rp 85.000.000` (Indonesian standard)
- Use thousand separators (dots)
- Decimal separator: comma (,)

#### 4.3 Bilingual Support
**Add Indonesian labels:**
```typescript
const labels = {
  en: {
    grossMargin: 'Gross Profit Margin',
    netMargin: 'Net Profit Margin',
    directCosts: 'Direct Costs',
    indirectCosts: 'Indirect Costs',
  },
  id: {
    grossMargin: 'Margin Laba Kotor',
    netMargin: 'Margin Laba Bersih',
    directCosts: 'Biaya Langsung',
    indirectCosts: 'Biaya Tidak Langsung',
  },
};
```

---

### Phase 5: Automation & Triggers

#### 5.1 Automatic Recalculation Triggers

**Trigger profit recalculation when:**

1. **New invoice paid** → Update revenue
   ```typescript
   // In invoices.service.ts
   async markAsPaid(id: string) {
     const invoice = await this.updateStatus(id, 'PAID_OFF');

     // Trigger project profit recalculation
     if (invoice.projectId) {
       await this.profitCalc.calculateProjectProfitMargin(invoice.projectId);
     }
   }
   ```

2. **New expense allocated** → Update costs
   ```typescript
   // In expenses.service.ts
   async allocateToProject(expenseId: string, projectId: string, amount: number) {
     await this.prisma.projectCostAllocation.create({
       data: { expenseId, projectId, allocatedAmount: amount, /* ... */ }
     });

     // Trigger recalculation
     await this.profitCalc.calculateProjectProfitMargin(projectId);
   }
   ```

3. **Project status changes** → Recalculate
   ```typescript
   // In projects.service.ts
   async updateStatus(id: string, status: ProjectStatus) {
     await this.update(id, { status });
     await this.profitCalc.calculateProjectProfitMargin(id);
   }
   ```

#### 5.2 Scheduled Jobs
**New File:** `backend/src/modules/projects/profit-calculation.scheduler.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProfitCalculationService } from './profit-calculation.service';

@Injectable()
export class ProfitCalculationScheduler {
  constructor(private profitCalc: ProfitCalculationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async recalculateAllProjects() {
    console.log('Running daily profit recalculation...');
    const result = await this.profitCalc.recalculateAllProjects();
    console.log(`Recalculated ${result.processed} projects`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async recalculateActiveProjects() {
    // Recalculate only IN_PROGRESS projects every hour
    const projects = await this.prisma.project.findMany({
      where: { status: 'IN_PROGRESS' },
      select: { id: true },
    });

    for (const project of projects) {
      await this.profitCalc.calculateProjectProfitMargin(project.id);
    }
  }
}
```

---

### Phase 6: Testing & Validation

#### 6.1 Unit Tests
**New File:** `backend/src/modules/projects/profit-calculation.service.spec.ts`

**Test cases:**
```typescript
describe('ProfitCalculationService', () => {
  it('should calculate gross margin correctly', async () => {
    // Revenue: 100,000,000 IDR
    // Direct costs: 60,000,000 IDR
    // Expected gross margin: 40%
  });

  it('should calculate net margin with overhead', async () => {
    // Revenue: 100,000,000 IDR
    // Direct costs: 60,000,000 IDR
    // Indirect costs: 20,000,000 IDR
    // Expected net margin: 20%
  });

  it('should handle zero revenue gracefully', async () => {
    // Revenue: 0
    // Costs: 50,000,000 IDR
    // Expected margins: 0% (avoid division by zero)
  });

  it('should calculate budget variance', async () => {
    // Estimated: 80,000,000 IDR
    // Actual: 90,000,000 IDR
    // Expected variance: +10,000,000 IDR (+12.5%)
  });

  it('should integrate WIP costs from PSAK 57', async () => {
    // Verify WorkInProgress direct costs are included
  });
});
```

#### 6.2 Integration Tests
**Test scenarios:**
1. Create project → Add expenses → Check profit updates
2. Create invoice → Mark as paid → Verify revenue updates
3. Allocate overhead → Verify indirect cost updates
4. Complete project → Verify final profit calculations

#### 6.3 Manual Testing Checklist
- [ ] Create new project with products
- [ ] Add direct expenses (materials, labor)
- [ ] Allocate overhead costs
- [ ] Create and pay invoice
- [ ] Verify profit margins display correctly
- [ ] Test recalculation button
- [ ] Verify Indonesian number formatting
- [ ] Test budget variance calculations
- [ ] Verify PSAK 57 WIP integration
- [ ] Test with zero/negative margins

---

## Industry Benchmarks & Alerts

### Margin Thresholds (Indonesian Creative Industry)

Based on research (2025 data):

| Category | Gross Margin | Net Margin | Status |
|----------|--------------|------------|--------|
| **Excellent** | > 30% | > 20% | 🟢 Green |
| **Good** | 20-30% | 10-20% | 🔵 Blue |
| **Average** | 10-20% | 5-10% | 🟡 Yellow |
| **Poor** | 5-10% | 0-5% | 🟠 Orange |
| **Loss** | < 5% | < 0% | 🔴 Red |

### Automated Alerts

**Trigger notifications when:**
1. **Net margin < 0%** → Project losing money
2. **Budget variance > +15%** → Significantly over budget
3. **Gross margin < 10%** → Low profitability warning
4. **Actual costs > 90% of budget** → Budget almost exceeded

---

## Migration Strategy

### Step 1: Database Migration
```bash
# 1. Backup production database
docker compose exec db pg_dump monomi > backup_$(date +%Y%m%d).sql

# 2. Run migration
npx prisma migrate deploy

# 3. Verify migration
npx prisma studio  # Check new fields exist
```

### Step 2: Initial Data Population
```typescript
// Run one-time script to calculate existing project margins
async function seedProfitMargins() {
  const projects = await prisma.project.findMany();

  for (const project of projects) {
    await profitCalc.calculateProjectProfitMargin(project.id);
  }
}
```

### Step 3: Gradual Rollout
1. **Week 1:** Backend deployment (calculations only, no UI)
2. **Week 2:** Frontend deployment (display metrics)
3. **Week 3:** Enable automated triggers
4. **Week 4:** Enable scheduled jobs

---

## Performance Considerations

### Optimization Strategies

1. **Caching:**
   - Cache profit calculations for 1 hour (configurable)
   - Invalidate cache on expense/invoice updates
   - Use Redis for distributed caching

2. **Batch Processing:**
   - Process multiple projects in parallel during scheduled jobs
   - Use database transactions for atomic updates
   - Implement job queue (Bull/BullMQ) for async processing

3. **Database Indexes:**
   - Index on `projectId` in Expense, Invoice, ProjectCostAllocation
   - Composite index on `[projectId, status]` for invoice queries
   - Index on `profitCalculatedAt` for finding stale data

4. **Query Optimization:**
   - Use aggregation queries instead of fetching all records
   - Implement pagination for cost allocation lists
   - Use `select` to fetch only needed fields

---

## Documentation Requirements

### For Developers
1. **API Documentation:**
   - Swagger/OpenAPI specs for new endpoints
   - Calculation formula documentation
   - Integration guide for expense allocation

2. **Code Documentation:**
   - JSDoc comments for all service methods
   - Inline comments for complex calculations
   - Architecture decision records (ADR)

### For Users
1. **User Guide (Indonesian):**
   - How to interpret profit margins
   - Understanding cost breakdowns
   - Budget variance explanations
   - Industry benchmark comparisons

2. **Video Tutorials:**
   - Creating projects with cost tracking
   - Allocating expenses to projects
   - Interpreting profit reports

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation with large datasets | High | Medium | Implement caching, indexing, pagination |
| Calculation errors due to floating-point math | Medium | Low | Use Decimal type, add validation tests |
| Race conditions during concurrent updates | Medium | Medium | Use database transactions, row-level locking |
| PSAK compliance gaps | High | Low | Consult accounting expert, document standards |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users misinterpret profit metrics | Medium | Medium | Provide clear documentation, tooltips |
| Inaccurate cost allocation | High | Medium | Implement validation rules, audit trail |
| Missing expense data | Medium | High | Require expense tracking, add alerts |

---

## Success Metrics

### Technical Metrics
- [ ] Profit calculation accuracy: 100% (validated against manual calculations)
- [ ] API response time: < 500ms for profit calculations
- [ ] Database query performance: < 200ms for aggregations
- [ ] Test coverage: > 80% for profit calculation logic

### Business Metrics
- [ ] User adoption: 80% of projects have profit tracking enabled
- [ ] Cost allocation accuracy: 90% of expenses properly allocated
- [ ] Budget adherence: Average variance < 10%
- [ ] Profitability improvement: Track month-over-month trends

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| **Phase 1:** Database Layer | 2 days | None |
| **Phase 2:** Backend Services | 5 days | Phase 1 complete |
| **Phase 3:** Frontend Components | 4 days | Phase 2 complete |
| **Phase 4:** PSAK Compliance | 2 days | Phase 2 complete |
| **Phase 5:** Automation | 2 days | Phase 2 complete |
| **Phase 6:** Testing & QA | 3 days | All phases complete |
| **Documentation** | 2 days | Parallel with development |
| **Total** | **~3 weeks** | |

---

## Appendix

### A. References
1. **PSAK 57:** Work in Progress & Cost Allocation Standards (Indonesia)
2. **PSAK 72:** Revenue Recognition Standards
3. **Industry Research:** Creative Agency Profitability Benchmarks (2025)
4. **Accounting Standards:** Indonesian Financial Accounting Standards

### B. Related Documents
- `COMPREHENSIVE_ACCOUNTING_INTEGRATION_PLAN.md`
- `EXPENSE_MANAGEMENT_IMPLEMENTATION_PLAN.md`
- `RBAC_IMPLEMENTATION_COMPLETE.md`

### C. Glossary (Indonesian-English)

| Indonesian | English | Description |
|------------|---------|-------------|
| Margin Laba Kotor | Gross Profit Margin | Revenue minus direct costs |
| Margin Laba Bersih | Net Profit Margin | Revenue minus all costs |
| Biaya Langsung | Direct Costs | Costs directly attributable to project |
| Biaya Tidak Langsung | Indirect Costs | Overhead allocated to project |
| Varians Anggaran | Budget Variance | Difference between actual and estimated |
| Pekerjaan Dalam Proses | Work in Progress | Ongoing project costs (PSAK 57) |

---

## Next Steps

1. **Review & Approval:**
   - Review this plan with team
   - Get approval from stakeholders
   - Consult accounting expert for PSAK compliance

2. **Prepare Development Environment:**
   - Set up test database with sample data
   - Configure Docker development environment
   - Install required dependencies

3. **Start Implementation:**
   - Begin with Phase 1 (Database Layer)
   - Create feature branch: `feature/profit-margin-tracking`
   - Follow test-driven development (TDD) approach

---

**End of Implementation Plan**

**Author:** Claude Code
**Date:** 2025-01-20
**Version:** 1.0
