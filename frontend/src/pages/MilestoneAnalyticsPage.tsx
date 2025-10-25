import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Button, Spin, message, Table, Space, Badge } from 'antd';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ArrowUpOutlined, ArrowDownOutlined, CalendarOutlined, FilePdfOutlined } from '@ant-design/icons';

// Types for analytics data
interface MilestoneAnalytics {
  averagePaymentCycle: number;
  onTimePaymentRate: number;
  revenueRecognitionRate: number;
  projectProfitabilityByPhase: ProfitabilityData[];
  cashFlowForecast: CashFlowData[];
  milestoneMetrics: MilestoneMetric[];
}

interface ProfitabilityData {
  milestone: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

interface CashFlowData {
  date: string;
  expectedInflow: number;
  actualInflow: number;
  forecastedInflow: number;
}

interface MilestoneMetric {
  id: string;
  milestoneNumber: number;
  name: string;
  amount: number;
  dueDate: string;
  invoicedDate?: string;
  paidDate?: string;
  daysToPayment?: number;
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE';
  revenueRecognized: number;
}

interface AnalyticsFilter {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  projectId?: string;
  timeRange: '30days' | '90days' | '1year' | 'custom';
}

const MilestoneAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<MilestoneAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AnalyticsFilter>({
    startDate: dayjs().subtract(90, 'days'),
    endDate: dayjs(),
    timeRange: '90days'
  });

  const COLORS = ['#1890ff', '#52c41a', '#f5222d', '#faad14', '#13c2c2', '#eb2f96'];

  // Mock data - replace with actual API calls
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData: MilestoneAnalytics = {
        averagePaymentCycle: 28,
        onTimePaymentRate: 85,
        revenueRecognitionRate: 92,
        projectProfitabilityByPhase: [
          { milestone: 'DP (Uang Muka)', revenue: 15000000, cost: 2000000, profit: 13000000, profitMargin: 86.67 },
          { milestone: 'Tahap 1', revenue: 20000000, cost: 8000000, profit: 12000000, profitMargin: 60 },
          { milestone: 'Pelunasan', revenue: 15000000, cost: 3000000, profit: 12000000, profitMargin: 80 }
        ],
        cashFlowForecast: [
          { date: '2025-11-01', expectedInflow: 15000000, actualInflow: 15000000, forecastedInflow: 15000000 },
          { date: '2025-12-01', expectedInflow: 20000000, actualInflow: 0, forecastedInflow: 20000000 },
          { date: '2026-01-01', expectedInflow: 15000000, actualInflow: 0, forecastedInflow: 15000000 },
          { date: '2026-02-01', expectedInflow: 20000000, actualInflow: 0, forecastedInflow: 18000000 }
        ],
        milestoneMetrics: [
          {
            id: '1',
            milestoneNumber: 1,
            name: 'Down Payment (DP)',
            amount: 15000000,
            dueDate: '2025-11-01',
            invoicedDate: '2025-11-01',
            paidDate: '2025-11-05',
            daysToPayment: 4,
            status: 'PAID',
            revenueRecognized: 15000000
          },
          {
            id: '2',
            milestoneNumber: 2,
            name: 'Phase 1 Completion',
            amount: 20000000,
            dueDate: '2025-12-01',
            invoicedDate: '2025-12-01',
            paidDate: undefined,
            daysToPayment: undefined,
            status: 'INVOICED',
            revenueRecognized: 0
          },
          {
            id: '3',
            milestoneNumber: 3,
            name: 'Final Payment',
            amount: 15000000,
            dueDate: '2026-01-01',
            invoicedDate: undefined,
            paidDate: undefined,
            daysToPayment: undefined,
            status: 'PENDING',
            revenueRecognized: 0
          }
        ]
      };

      setAnalytics(mockData);
    } catch (error) {
      message.error(t('error.failedToLoadAnalytics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filter]);

  const handleTimeRangeChange = (value: string) => {
    const timeRange = value as '30days' | '90days' | '1year' | 'custom';
    const now = dayjs();
    let startDate = now.subtract(90, 'days');

    switch (timeRange) {
      case '30days':
        startDate = now.subtract(30, 'days');
        break;
      case '1year':
        startDate = now.subtract(1, 'year');
        break;
      case 'custom':
        break;
    }

    setFilter({ ...filter, timeRange, startDate, endDate: now });
  };

  const handleDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (dates) {
      setFilter({ ...filter, startDate: dates[0], endDate: dates[1] });
    }
  };

  const exportAnalytics = () => {
    try {
      const dataStr = JSON.stringify(analytics, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `milestone-analytics-${dayjs().format('YYYY-MM-DD')}.json`;
      link.click();
      message.success(t('success.analyticsExported'));
    } catch (error) {
      message.error(t('error.exportFailed'));
    }
  };

  const milestoneTableColumns = [
    {
      title: t('labels.milestone'),
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: MilestoneMetric) => (
        <span>
          {record.milestoneNumber}. {record.name}
        </span>
      )
    },
    {
      title: t('labels.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="font-semibold">
          Rp {amount.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      title: t('labels.dueDate'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: t('labels.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let label = status;

        switch (status) {
          case 'PAID':
            color = 'green';
            label = t('status.paid');
            break;
          case 'INVOICED':
            color = 'blue';
            label = t('status.invoiced');
            break;
          case 'PENDING':
            color = 'orange';
            label = t('status.pending');
            break;
          case 'OVERDUE':
            color = 'red';
            label = t('status.overdue');
            break;
        }

        return <Badge color={color} text={label} />;
      }
    },
    {
      title: t('labels.daysToPayment'),
      dataIndex: 'daysToPayment',
      key: 'daysToPayment',
      render: (days?: number) => (days ? `${days} days` : '-')
    },
    {
      title: t('labels.revenueRecognized'),
      dataIndex: 'revenueRecognized',
      key: 'revenueRecognized',
      render: (amount: number) => (
        <span className="text-green-600">
          Rp {amount.toLocaleString('id-ID')}
        </span>
      )
    }
  ];

  if (loading && !analytics) {
    return <Spin size="large" className="flex justify-center items-center h-screen" />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('pages.milestoneAnalytics')}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('descriptions.milestoneAnalyticsDescription')}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 shadow-sm">
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <label className="block text-sm font-medium mb-2">
              {t('labels.timeRange')}
            </label>
            <Select
              value={filter.timeRange}
              onChange={handleTimeRangeChange}
              options={[
                { label: t('labels.last30Days'), value: '30days' },
                { label: t('labels.last90Days'), value: '90days' },
                { label: t('labels.lastYear'), value: '1year' },
                { label: t('labels.custom'), value: 'custom' }
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={18} className="flex justify-end">
            <Space>
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={exportAnalytics}
                loading={loading}
              >
                {t('actions.export')}
              </Button>
              <Button
                onClick={() => fetchAnalytics()}
                loading={loading}
              >
                {t('actions.refresh')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      {analytics && (
        <>
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm">
                <Statistic
                  title={t('metrics.averagePaymentCycle')}
                  value={analytics.averagePaymentCycle}
                  suffix="days"
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('descriptions.averageTimeToPayment')}
                </p>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm">
                <Statistic
                  title={t('metrics.onTimePaymentRate')}
                  value={analytics.onTimePaymentRate}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: analytics.onTimePaymentRate >= 80 ? '#52c41a' : '#f5222d' }}
                  prefix={
                    analytics.onTimePaymentRate >= 80 ? (
                      <ArrowUpOutlined />
                    ) : (
                      <ArrowDownOutlined />
                    )
                  }
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('descriptions.percentagePaidOnTime')}
                </p>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm">
                <Statistic
                  title={t('metrics.revenueRecognitionRate')}
                  value={analytics.revenueRecognitionRate}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: '#52c41a' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('descriptions.percentageRevenueRecognized')}
                </p>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm">
                <Statistic
                  title={t('metrics.totalMilestones')}
                  value={analytics.milestoneMetrics.length}
                  valueStyle={{ color: '#faad14' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t('descriptions.activeMilestones')}
                </p>
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row gutter={16} className="mb-6">
            {/* Profitability by Phase */}
            <Col xs={24} lg={12}>
              <Card title={t('charts.profitabilityByPhase')} className="shadow-sm">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.projectProfitabilityByPhase}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="milestone"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      label={{ value: 'Rp', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value) => `Rp ${(value as number).toLocaleString('id-ID')}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#1890ff" name={t('labels.revenue')} />
                    <Bar dataKey="cost" fill="#f5222d" name={t('labels.cost')} />
                    <Bar dataKey="profit" fill="#52c41a" name={t('labels.profit')} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Cash Flow Forecast */}
            <Col xs={24} lg={12}>
              <Card title={t('charts.cashFlowForecast')} className="shadow-sm">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.cashFlowForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => dayjs(date).format('MMM YY')}
                    />
                    <YAxis
                      label={{ value: 'Rp', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value) => `Rp ${(value as number).toLocaleString('id-ID')}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expectedInflow"
                      stroke="#1890ff"
                      name={t('labels.expected')}
                    />
                    <Line
                      type="monotone"
                      dataKey="actualInflow"
                      stroke="#52c41a"
                      name={t('labels.actual')}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecastedInflow"
                      stroke="#faad14"
                      strokeDasharray="5 5"
                      name={t('labels.forecast')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Profit Margin Distribution */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} lg={12}>
              <Card title={t('charts.profitMarginDistribution')} className="shadow-sm">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.projectProfitabilityByPhase}
                      dataKey="profitMargin"
                      nameKey="milestone"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics.projectProfitabilityByPhase.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${(value as number).toFixed(2)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Summary Stats */}
            <Col xs={24} lg={12}>
              <Card title={t('labels.profitabilitySummary')} className="shadow-sm">
                <div className="space-y-4">
                  {analytics.projectProfitabilityByPhase.map((item, idx) => (
                    <div key={idx} className="pb-4 border-b last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{item.milestone}</p>
                          <p className="text-sm text-gray-500">
                            Rp {item.revenue.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${item.profitMargin >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                            {item.profitMargin.toFixed(2)}%
                          </p>
                          <p className="text-sm text-gray-500">
                            Profit: Rp {item.profit.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Milestone Metrics Table */}
          <Row gutter={16}>
            <Col xs={24}>
              <Card title={t('labels.milestoneDetails')} className="shadow-sm">
                <Table
                  columns={milestoneTableColumns}
                  dataSource={analytics.milestoneMetrics}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: true }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default MilestoneAnalyticsPage;
