import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus } from '@prisma/client';

export class ProfitabilityDataDto {
  @ApiProperty({ example: 'Down Payment (DP)' })
  milestone: string;

  @ApiProperty({ example: 15000000 })
  revenue: number;

  @ApiProperty({ example: 2000000 })
  cost: number;

  @ApiProperty({ example: 13000000 })
  profit: number;

  @ApiProperty({ example: 86.67 })
  profitMargin: number;
}

export class CashFlowDataDto {
  @ApiProperty({ example: '2025-11-01' })
  date: string;

  @ApiProperty({ example: 15000000 })
  expectedInflow: number;

  @ApiProperty({ example: 15000000 })
  actualInflow: number;

  @ApiProperty({ example: 15000000 })
  forecastedInflow: number;
}

export class MilestoneMetricDto {
  @ApiProperty({ example: 'cle1234567890abcdefgh' })
  id: string;

  @ApiProperty({ example: 1 })
  milestoneNumber: number;

  @ApiProperty({ example: 'Down Payment (DP)' })
  name: string;

  @ApiProperty({ example: 15000000 })
  amount: number;

  @ApiProperty({ example: '2025-11-01' })
  dueDate: string;

  @ApiProperty({ example: '2025-11-01', required: false })
  invoicedDate?: string;

  @ApiProperty({ example: '2025-11-05', required: false })
  paidDate?: string;

  @ApiProperty({ example: 4, required: false })
  daysToPayment?: number;

  @ApiProperty({ enum: MilestoneStatus, example: 'BILLED' })
  status: MilestoneStatus | 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE';

  @ApiProperty({ example: 15000000 })
  revenueRecognized: number;
}

export class MilestoneAnalyticsDto {
  @ApiProperty({ example: 28, description: 'Average days from invoice to payment' })
  averagePaymentCycle: number;

  @ApiProperty({ example: 85, description: 'Percentage of payments made on time' })
  onTimePaymentRate: number;

  @ApiProperty({ example: 92, description: 'Percentage of revenue recognized' })
  revenueRecognitionRate: number;

  @ApiProperty({ type: [ProfitabilityDataDto] })
  projectProfitabilityByPhase: ProfitabilityDataDto[];

  @ApiProperty({ type: [CashFlowDataDto] })
  cashFlowForecast: CashFlowDataDto[];

  @ApiProperty({ type: [MilestoneMetricDto] })
  milestoneMetrics: MilestoneMetricDto[];
}
