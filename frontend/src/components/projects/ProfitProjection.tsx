import React from 'react';
import { Card, Statistic, Row, Col, Alert, Progress, Divider, Tag, Space } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ProjectionResult } from '../../services/projects';

interface ProfitProjectionProps {
  projection: ProjectionResult | null;
  loading?: boolean;
}

/**
 * ProfitProjection Component
 *
 * Visual display of profit margin projections.
 * Features:
 * - Revenue and cost breakdown
 * - Gross and net profit margins
 * - Profitability rating with Indonesian standards
 * - Color-coded alerts
 * - Decision support indicators
 */
export const ProfitProjection: React.FC<ProfitProjectionProps> = ({
  projection,
  loading = false,
}) => {
  if (!projection) {
    return (
      <Card>
        <Alert
          message="Belum ada proyeksi"
          description="Tambahkan produk/layanan dan estimasi biaya untuk melihat proyeksi profit margin."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  const {
    estimatedRevenue,
    estimatedDirectCosts,
    estimatedIndirectCosts,
    estimatedTotalCosts,
    projectedGrossProfit,
    projectedNetProfit,
    projectedGrossMargin,
    projectedNetMargin,
    isProfitable,
    profitabilityRating,
  } = projection;

  // Profitability colors and messages
  const getProfitabilityConfig = (
    rating: 'excellent' | 'good' | 'breakeven' | 'loss'
  ) => {
    switch (rating) {
      case 'excellent':
        return {
          color: '#52c41a',
          icon: <CheckCircleOutlined />,
          label: 'Sangat Baik',
          message: 'Profit margin sangat sehat (≥20%). Proyek sangat menguntungkan!',
          type: 'success' as const,
        };
      case 'good':
        return {
          color: '#1890ff',
          icon: <RiseOutlined />,
          label: 'Baik',
          message: 'Profit margin sehat (10-20%). Proyek menguntungkan.',
          type: 'info' as const,
        };
      case 'breakeven':
        return {
          color: '#faad14',
          icon: <WarningOutlined />,
          label: 'Impas',
          message: 'Profit margin tipis (0-10%). Pertimbangkan negosiasi ulang.',
          type: 'warning' as const,
        };
      case 'loss':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleOutlined />,
          label: 'Rugi',
          message: 'Proyek akan merugi. TIDAK DISARANKAN untuk dilanjutkan!',
          type: 'error' as const,
        };
      default:
        // Fallback for unexpected values
        return {
          color: '#8c8c8c',
          icon: <WarningOutlined />,
          label: 'Tidak Diketahui',
          message: 'Status profitabilitas tidak dapat ditentukan.',
          type: 'warning' as const,
        };
    }
  };

  const profitConfig = getProfitabilityConfig(profitabilityRating);

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          Proyeksi Profit Margin
        </Space>
      }
      loading={loading}
    >
      {/* Profitability Alert */}
      <Alert
        message={
          <Space>
            {profitConfig.icon}
            <strong>Penilaian: {profitConfig.label}</strong>
          </Space>
        }
        description={profitConfig.message}
        type={profitConfig.type}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Revenue & Costs Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="Estimasi Pendapatan"
            value={estimatedRevenue}
            precision={0}
            valueStyle={{ color: '#52c41a' }}
            prefix="Rp"
            formatter={(value) =>
              new Intl.NumberFormat('id-ID').format(Number(value))
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="Biaya Langsung"
            value={estimatedDirectCosts}
            precision={0}
            valueStyle={{ color: '#1890ff' }}
            prefix="Rp"
            formatter={(value) =>
              new Intl.NumberFormat('id-ID').format(Number(value))
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="Biaya Tidak Langsung"
            value={estimatedIndirectCosts}
            precision={0}
            valueStyle={{ color: '#fa8c16' }}
            prefix="Rp"
            formatter={(value) =>
              new Intl.NumberFormat('id-ID').format(Number(value))
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Statistic
            title="Total Biaya"
            value={estimatedTotalCosts}
            precision={0}
            valueStyle={{ color: '#ff4d4f' }}
            prefix="Rp"
            formatter={(value) =>
              new Intl.NumberFormat('id-ID').format(Number(value))
            }
          />
        </Col>
      </Row>

      <Divider />

      {/* Profit Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card type="inner" title="Gross Profit">
            <Statistic
              title="Margin Bruto"
              value={projectedGrossMargin}
              precision={2}
              suffix="%"
              valueStyle={{
                color: projectedGrossProfit >= 0 ? '#52c41a' : '#ff4d4f',
              }}
              prefix={projectedGrossProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <small style={{ color: '#8c8c8c' }}>
                {formatCurrency(projectedGrossProfit)}
              </small>
              <Progress
                percent={Math.min(Math.max(projectedGrossMargin, 0), 100)}
                strokeColor={{
                  '0%': projectedGrossMargin >= 20 ? '#52c41a' : '#faad14',
                  '100%': projectedGrossMargin >= 20 ? '#73d13d' : '#ffc53d',
                }}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card type="inner" title="Net Profit">
            <Statistic
              title="Margin Netto"
              value={projectedNetMargin}
              precision={2}
              suffix="%"
              valueStyle={{
                color: profitConfig.color,
                fontWeight: 'bold',
              }}
              prefix={isProfitable ? <RiseOutlined /> : <FallOutlined />}
            />
            <div style={{ marginTop: 16 }}>
              <small style={{ color: '#8c8c8c' }}>
                {formatCurrency(projectedNetProfit)}
              </small>
              <Progress
                percent={Math.min(Math.max(projectedNetMargin, 0), 100)}
                strokeColor={profitConfig.color}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Cost Breakdown Details */}
      <div>
        <h4 style={{ marginBottom: 16 }}>Rincian Biaya</h4>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card type="inner" size="small" title="Biaya Langsung">
              {projection.costBreakdown?.direct && projection.costBreakdown.direct.length > 0 ? (
                <div>
                  {projection.costBreakdown.direct.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <span>
                        <Tag color="blue" style={{ marginRight: 8 }}>
                          {item.categoryNameId}
                        </Tag>
                      </span>
                      <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <small style={{ color: '#8c8c8c' }}>
                  Belum ada biaya langsung
                </small>
              )}
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card type="inner" size="small" title="Biaya Tidak Langsung">
              {projection.costBreakdown?.indirect && projection.costBreakdown.indirect.length > 0 ? (
                <div>
                  {projection.costBreakdown.indirect.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <span>
                        <Tag color="orange" style={{ marginRight: 8 }}>
                          {item.categoryNameId}
                        </Tag>
                      </span>
                      <strong>{formatCurrency(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <small style={{ color: '#8c8c8c' }}>
                  Belum ada biaya tidak langsung
                </small>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Revenue Breakdown */}
      {projection.revenueBreakdown && projection.revenueBreakdown.length > 0 && (
        <>
          <Divider />
          <div>
            <h4 style={{ marginBottom: 16 }}>Rincian Pendapatan</h4>
            <Card type="inner" size="small">
              {projection.revenueBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <br />
                    <small style={{ color: '#8c8c8c' }}>
                      {item.quantity} × {formatCurrency(item.price)}
                    </small>
                  </span>
                  <strong>{formatCurrency(item.subtotal)}</strong>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}
    </Card>
  );
};
