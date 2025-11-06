import React, { useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useTheme } from '../theme'
import {
  BarChartOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reportsService } from '../services/reports'
import {
  formatIDR,
  safeArray,
  safeDivision,
  safeGet,
  safeNumber,
} from '../utils/currency'
import {
  PaymentChart,
  QuarterlyChart,
  RevenueChart,
} from '../components/charts'
import ChartErrorBoundary from '../components/ChartErrorBoundary'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { message } = App.useApp()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  )
  const [reportType, setReportType] = useState('monthly')

  // Fetch reports data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports-revenue', reportType, dateRange],
    queryFn: () =>
      reportsService.getRevenueAnalytics({
        period: reportType,
        ...(dateRange?.[0] && { startDate: dateRange[0].format('YYYY-MM-DD') }),
        ...(dateRange?.[1] && { endDate: dateRange[1].format('YYYY-MM-DD') }),
      }),
  })

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['reports-clients'],
    queryFn: () => reportsService.getClientAnalytics(5),
  })

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['reports-projects'],
    queryFn: () => reportsService.getProjectAnalytics(5),
  })

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['reports-payments'],
    queryFn: reportsService.getPaymentAnalytics,
  })

  // Use paymentData for payment analytics display
  const paymentStats = paymentData || {}
  if (process.env.NODE_ENV === 'development') {
    console.log('Payment analytics:', paymentStats)
  }

  const isLoading =
    revenueLoading || clientLoading || projectLoading || paymentLoading

  const formatCurrency = (amount: number | string) => {
    return formatIDR(amount)
  }

  const generateTopClientsData = () => {
    if (!clientData?.topClients) return []

    return safeArray(clientData.topClients).map((item, index) => ({
      key: safeGet(item, 'client')?.id || `client-${index}`,
      rank: index + 1,
      name: safeGet(item, 'client')?.name || 'N/A',
      company: safeGet(item, 'client')?.company || 'N/A',
      revenue: safeNumber(item?.revenue),
      invoices: safeNumber(item?.invoiceCount),
      percentage: (
        safeDivision(
          safeNumber(item?.revenue),
          safeNumber(revenueData?.totalRevenue)
        ) * 100
      ).toFixed(1),
    }))
  }

  const generateProjectAnalysis = () => {
    if (!projectData?.topProjects) return []

    return safeArray(projectData.topProjects).map((item, index) => ({
      key: safeGet(item, 'project')?.id || `project-${index}`,
      rank: index + 1,
      name: safeGet(item, 'project')?.description || 'N/A',
      number: safeGet(item, 'project')?.number || 'N/A',
      type: safeGet(item, 'project')?.type || 'N/A',
      client: safeGet(safeGet(item, 'project'), 'client')?.name || 'N/A',
      revenue: safeNumber(item?.revenue),
      invoices: safeNumber(item?.invoiceCount),
      percentage: (
        safeDivision(
          safeNumber(item?.revenue),
          safeNumber(revenueData?.totalRevenue)
        ) * 100
      ).toFixed(1),
    }))
  }

  const topClientsColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
    },
    {
      title: t('reports.topClients'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Invoices',
      dataIndex: 'invoices',
      key: 'invoices',
    },
    {
      title: 'Share',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Progress
            percent={safeNumber(value)}
            size='small'
            style={{ width: '60px' }}
          />
          <Text>{value}%</Text>
        </div>
      ),
    },
  ]

  const projectAnalysisColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
    },
    {
      title: t('reports.topProjects'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'PRODUCTION' ? 'blue' : 'green'}>
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Share',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Progress
            percent={safeNumber(value)}
            size='small'
            style={{ width: '60px' }}
          />
          <Text>{value}%</Text>
        </div>
      ),
    },
  ]

  // Export mutations
  const pdfExportMutation = useMutation({
    mutationFn: (params: {
      reportType: string
      dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
    }) => {
      return reportsService.exportToPDF(params.reportType, {
        period: reportType,
        startDate: params.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: params.dateRange?.[1]?.format('YYYY-MM-DD'),
      })
    },
    onSuccess: blob => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `laporan-${reportType}-${dayjs().format('YYYY-MM-DD')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Laporan PDF berhasil diunduh')
    },
    onError: (error) => {
      message.error(`Gagal mengunduh laporan PDF: ${error.message}`)
    },
  })

  const excelExportMutation = useMutation({
    mutationFn: (params: {
      reportType: string
      dateRange?: [dayjs.Dayjs, dayjs.Dayjs] | null
    }) => {
      return reportsService.exportToExcel(params.reportType, {
        period: reportType,
        startDate: params.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: params.dateRange?.[1]?.format('YYYY-MM-DD'),
      })
    },
    onSuccess: blob => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `laporan-${reportType}-${dayjs().format('YYYY-MM-DD')}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      message.success('Laporan Excel berhasil diunduh')
    },
    onError: (error) => {
      message.error(`Gagal mengunduh laporan Excel: ${error.message}`)
    },
  })

  const handleExportPdf = () => {
    pdfExportMutation.mutate({ reportType: 'business-overview', dateRange })
  }

  const handleExportExcel = () => {
    excelExportMutation.mutate({ reportType: 'business-overview', dateRange })
  }

  return (
    <div style={{ padding: '16px 24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: window.innerWidth < 768 ? '16px' : '0',
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
            <BarChartOutlined
              style={{ marginRight: '12px', color: '#1e40af' }}
            />
            Laporan Keuangan
          </Title>
          <Text type='secondary' style={{ fontSize: '16px' }}>
            Analisis Finansial & Performa Bisnis
          </Text>
        </div>

        <Space size='middle' wrap>
          <Select
            data-testid='report-filter-button'
            value={reportType}
            onChange={setReportType}
            style={{ width: 140 }}
            size='large'
          >
            <Option value='monthly'>{t('reports.monthlyRevenue')}</Option>
            <Option value='quarterly'>{t('reports.quarterlyReport')}</Option>
            <Option value='yearly'>{t('reports.yearlyReport')}</Option>
          </Select>

          <RangePicker
            data-testid='report-date-range-picker'
            size='large'
            value={dateRange}
            onChange={dates =>
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
            }
            style={{ width: 280 }}
          />

          <Button
            data-testid='export-report-button'
            type='primary'
            icon={<DownloadOutlined />}
            onClick={handleExportPdf}
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {t('reports.exportPdf')}
          </Button>

          <Button
            data-testid='generate-report-button'
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            style={{
              borderRadius: '18px',
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
            }}
          >
            {t('reports.exportExcel')}
          </Button>

          <Button
            data-testid='schedule-report-button'
            icon={<ClockCircleOutlined />}
            style={{
              borderRadius: '18px',
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
            }}
          >
            Schedule Report
          </Button>
        </Space>
      </div>

      {/* Key Metrics Overview - Compact Design */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<DollarOutlined />}
            iconColor='#3b82f6'
            iconBg='rgba(59, 130, 246, 0.15)'
            label={t('reports.totalRevenue')}
            value={formatCurrency(revenueData?.totalRevenue || 0)}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<FileTextOutlined />}
            iconColor='#10b981'
            iconBg='rgba(16, 185, 129, 0.15)'
            label={t('reports.paidInvoices')}
            value={revenueData?.invoiceCount || 0}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<UserOutlined />}
            iconColor='#f59e0b'
            iconBg='rgba(245, 158, 11, 0.15)'
            label={t('dashboard.totalClients')}
            value={clientData?.totalClients || 0}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <CompactMetricCard
            icon={<ProjectOutlined />}
            iconColor='#ef4444'
            iconBg='rgba(239, 68, 68, 0.15)'
            label={t('dashboard.totalProjects')}
            value={projectData?.totalProjects || 0}
          />
        </Col>
      </Row>

      {/* Revenue Analysis Charts */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <LineChartOutlined
                  style={{ marginRight: '8px', color: '#1e40af' }}
                />
                <span style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                  Analisis Pendapatan
                </span>
              </div>
            }
            extra={
              <Select
                value={reportType}
                onChange={setReportType}
                style={{ width: 120 }}
                size='small'
              >
                <Option value='monthly'>Bulanan</Option>
                <Option value='quarterly'>Kuartal</Option>
              </Select>
            }
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            {reportType === 'quarterly' ? (
              <ChartErrorBoundary chartType='Kuartalan'>
                <QuarterlyChart
                  data={revenueData?.revenueByPeriod || []}
                  loading={revenueLoading}
                  height={350}
                />
              </ChartErrorBoundary>
            ) : (
              <ChartErrorBoundary chartType='Pendapatan'>
                <RevenueChart
                  data={revenueData?.revenueByPeriod || []}
                  loading={revenueLoading}
                  height={350}
                />
              </ChartErrorBoundary>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PieChartOutlined
                  style={{ marginRight: '8px', color: '#1e40af' }}
                />
                <span style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                  Analisis Pembayaran
                </span>
              </div>
            }
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <ChartErrorBoundary chartType='Pembayaran'>
              <PaymentChart
                data={paymentData?.invoicesByStatus || []}
                loading={paymentLoading}
                height={350}
              />
            </ChartErrorBoundary>
          </Card>
        </Col>
      </Row>

      {/* Payment Trends Chart */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col span={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <BarChartOutlined
                  style={{ marginRight: '8px', color: '#1e40af' }}
                />
                <span style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                  Tren Pembayaran Bulanan
                </span>
              </div>
            }
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <ChartErrorBoundary chartType='Tren Pembayaran'>
              <RevenueChart
                data={paymentData?.paymentTrends || []}
                loading={paymentLoading}
                height={250}
              />
            </ChartErrorBoundary>
          </Card>
        </Col>
      </Row>

      {/* Top Clients and Projects Analysis */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <UserOutlined
                  style={{ marginRight: '8px', color: '#1e40af' }}
                />
                <span style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                  Analisis Klien Teratas
                </span>
              </div>
            }
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              columns={topClientsColumns}
              dataSource={generateTopClientsData()}
              pagination={false}
              loading={isLoading}
              size='small'
              style={{ marginTop: '16px' }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ProjectOutlined
                  style={{ marginRight: '8px', color: '#1e40af' }}
                />
                <span style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                  Analisis Proyek Teratas
                </span>
              </div>
            }
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <Table
              columns={projectAnalysisColumns}
              dataSource={generateProjectAnalysis()}
              pagination={false}
              loading={isLoading}
              size='small'
              style={{ marginTop: '16px' }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
