import React from 'react';
import { Card, Row, Col, Statistic, Progress, Alert } from 'antd';
import { DollarOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import { formatIDR } from '../../utils/currency';
import type { Project } from '../../services/projects';
import { ExpenseStatus } from '../../types/expense';

interface ExpenseBudgetSummaryProps {
  project: Project;
}

export const ExpenseBudgetSummary: React.FC<ExpenseBudgetSummaryProps> = ({
  project,
}) => {
  // Parse estimated expenses from project
  let estimatedBudget = 0;
  if (project.estimatedExpenses) {
    try {
      const expensesData =
        typeof project.estimatedExpenses === 'string'
          ? JSON.parse(project.estimatedExpenses)
          : project.estimatedExpenses;

      estimatedBudget =
        (expensesData.totalDirect || 0) + (expensesData.totalIndirect || 0);
    } catch (error) {
      console.error('Failed to parse estimatedExpenses:', error);
    }
  }

  // Fetch actual expenses for this project
  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ['project-expenses-summary', project.id],
    queryFn: () =>
      expenseService.getExpenses({
        projectId: project.id,
        status: ExpenseStatus.APPROVED,
      }),
  });

  const actualExpenses =
    expensesResponse?.data.reduce(
      (sum, exp) => sum + parseFloat(exp.totalAmount),
      0
    ) || 0;

  const remaining = estimatedBudget - actualExpenses;
  const percentUsed = estimatedBudget > 0 ? (actualExpenses / estimatedBudget) * 100 : 0;

  const isOverBudget = actualExpenses > estimatedBudget && estimatedBudget > 0;
  const isNearBudget = percentUsed > 80 && percentUsed <= 100;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined />
          <span>Ringkasan Anggaran vs Aktual</span>
        </div>
      }
      loading={isLoading}
      style={{ marginBottom: 24 }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Statistic
            title="Estimasi Anggaran"
            value={estimatedBudget}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Biaya Aktual (Disetujui)"
            value={actualExpenses}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
            valueStyle={{ color: isOverBudget ? '#ff4d4f' : '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Sisa Anggaran"
            value={remaining}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
            valueStyle={{ color: remaining < 0 ? '#ff4d4f' : '#1890ff' }}
          />
        </Col>
      </Row>

      {estimatedBudget > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Penggunaan Anggaran:</strong> {percentUsed.toFixed(1)}%
          </p>
          <Progress
            percent={Math.min(percentUsed, 100)}
            status={isOverBudget ? 'exception' : isNearBudget ? 'normal' : 'success'}
            strokeColor={
              isOverBudget ? '#ff4d4f' : isNearBudget ? '#faad14' : '#52c41a'
            }
          />
        </div>
      )}

      {isOverBudget && (
        <Alert
          message="Melebihi Anggaran!"
          description={`Proyek ini melebihi anggaran sebesar ${formatIDR(Math.abs(remaining))}`}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      {isNearBudget && !isOverBudget && (
        <Alert
          message="Mendekati Batas Anggaran"
          description={`Sisa anggaran: ${formatIDR(remaining)}. Harap perhatikan pengeluaran selanjutnya.`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      {!isOverBudget && !isNearBudget && estimatedBudget > 0 && actualExpenses > 0 && (
        <Alert
          message="Anggaran Terkendali"
          description={`Pengeluaran masih dalam batas anggaran. Sisa: ${formatIDR(remaining)} (${(100 - percentUsed).toFixed(1)}%)`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}

      {estimatedBudget === 0 && (
        <Alert
          message="Tidak Ada Estimasi Anggaran"
          description="Proyek ini belum memiliki estimasi anggaran. Silakan tambahkan estimasi biaya pada halaman edit proyek."
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
