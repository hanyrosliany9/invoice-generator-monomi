import React from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Project } from '../../services/projects';
import { formatIDR } from '../../utils/currency';
import { formatDate } from '../../utils/dateFormatters';
import { useTheme } from '../../theme';

const { Text } = Typography;

interface ProfitMarginCardProps {
  project: Project;
  onRecalculate?: () => void;
  loading?: boolean;
}

export const ProfitMarginCard: React.FC<ProfitMarginCardProps> = ({
  project,
  onRecalculate,
  loading = false,
}) => {
  const { theme } = useTheme();

  const grossMargin = parseFloat(project.grossMarginPercent ?? '0');
  const netMargin = parseFloat(project.netMarginPercent ?? '0');

  // Color coding based on margin thresholds (Indonesian industry standards)
  const getMarginColor = (margin: number): string => {
    if (margin >= 20) return theme.colors.status.success; // Excellent: > 20%
    if (margin >= 10) return theme.colors.status.info;    // Good: 10-20%
    if (margin >= 0) return theme.colors.status.warning;  // Break-even: 0-10%
    return theme.colors.status.error;                     // Loss: < 0%
  };

  const getMarginStatus = (margin: number): string => {
    if (margin >= 20) return 'Sangat Baik';
    if (margin >= 10) return 'Baik';
    if (margin >= 0) return 'Impas';
    return 'Rugi';
  };

  const totalRevenue = parseFloat(project.totalPaidAmount ?? '0');
  const totalCosts = parseFloat(project.totalAllocatedCosts ?? '0');
  const netProfit = parseFloat(project.netProfit ?? '0');
  const budgetVariance = parseFloat(project.budgetVariance ?? '0');
  const budgetVariancePercent = parseFloat(project.budgetVariancePercent ?? '0');

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>Analisis Margin Laba</span>
          {project.profitCalculatedAt && (
            <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
              Diperbarui: {formatDate(project.profitCalculatedAt)}
            </Text>
          )}
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={onRecalculate}
          size="small"
          loading={loading}
        >
          Hitung Ulang
        </Button>
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
              title="Margin Laba Kotor"
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
              style={{ marginTop: '8px' }}
            />
            <Tag
              color={getMarginColor(grossMargin)}
              style={{ marginTop: '8px' }}
            >
              {getMarginStatus(grossMargin)}
            </Tag>
          </div>
        </Col>

        {/* Net Margin */}
        <Col xs={24} md={12}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="Margin Laba Bersih"
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
              style={{ marginTop: '8px' }}
            />
            <Tag
              color={getMarginColor(netMargin)}
              style={{ marginTop: '8px' }}
            >
              {getMarginStatus(netMargin)}
            </Tag>
          </div>
        </Col>

        {/* Revenue vs Costs */}
        <Col xs={24}>
          <Divider>Rincian Keuangan</Divider>
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Total Pendapatan (Terbayar)"
            value={totalRevenue}
            formatter={(value) => formatIDR(Number(value))}
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Total Biaya"
            value={totalCosts}
            formatter={(value) => formatIDR(Number(value))}
            prefix={<DollarOutlined />}
            valueStyle={{ color: theme.colors.text.secondary }}
          />
        </Col>

        <Col xs={24} md={8}>
          <Statistic
            title="Laba Bersih"
            value={Math.abs(netProfit)}
            formatter={(value) => formatIDR(Number(value))}
            valueStyle={{
              color: netProfit >= 0
                ? theme.colors.status.success
                : theme.colors.status.error
            }}
            prefix={netProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          />
        </Col>

        {/* Cost Breakdown */}
        {project.costBreakdown && (
          <>
            <Col xs={24}>
              <Divider>Rincian Biaya</Divider>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Biaya Langsung">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Bahan:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.materials))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Tenaga Kerja:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.labor))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Beban:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.direct.expenses))}
                    </Text>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between">
                    <Text strong>Total Langsung:</Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatIDR(parseFloat(project.costBreakdown.direct.total))}
                    </Text>
                  </Row>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Biaya Tidak Langsung">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Overhead:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.overhead))}
                    </Text>
                  </Row>
                  <Row justify="space-between">
                    <Text>Alokasi:</Text>
                    <Text strong>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.allocated))}
                    </Text>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between">
                    <Text strong>Total Tidak Langsung:</Text>
                    <Text strong style={{ color: '#1890ff' }}>
                      {formatIDR(parseFloat(project.costBreakdown.indirect.total))}
                    </Text>
                  </Row>
                </Space>
              </Card>
            </Col>
          </>
        )}

        {/* Budget Variance */}
        {project.estimatedBudget && (
          <>
            <Col xs={24}>
              <Divider>Performa Anggaran</Divider>
            </Col>

            <Col xs={24} md={12}>
              <Statistic
                title="Varians Anggaran"
                value={Math.abs(budgetVariance)}
                formatter={(value) => formatIDR(Number(value))}
                prefix={
                  budgetVariance >= 0 ? (
                    <ExclamationCircleOutlined style={{ color: theme.colors.status.error }} />
                  ) : (
                    <CheckCircleOutlined style={{ color: theme.colors.status.success }} />
                  )
                }
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {budgetVariance >= 0
                  ? 'Melebihi anggaran'
                  : 'Di bawah anggaran'}
              </Text>
            </Col>

            <Col xs={24} md={12}>
              <Statistic
                title="Persentase Varians"
                value={Math.abs(budgetVariancePercent)}
                precision={2}
                suffix="%"
                valueStyle={{
                  color: Math.abs(budgetVariancePercent) > 10
                    ? theme.colors.status.error
                    : theme.colors.status.success
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {Math.abs(budgetVariancePercent) > 10
                  ? 'Perlu perhatian'
                  : 'Dalam batas wajar'}
              </Text>
            </Col>
          </>
        )}

        {/* Industry Benchmarks Info */}
        <Col xs={24}>
          <Divider />
          <Card size="small" style={{ background: 'rgba(0,0,0,0.02)' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Benchmark Industri Kreatif Indonesia:</strong><br />
              Sangat Baik: ≥ 20% | Baik: 10-20% | Impas: 0-10% | Rugi: {'<'} 0%
            </Text>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};
