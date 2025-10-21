import React, { useMemo, useState } from 'react'
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  FloatButton,
  Progress,
  Result,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeNumber, safeString } from '../utils/currency'
import { EstimatedExpense, Project, projectService } from '../services/projects'
import { FileUpload } from '../components/documents/FileUpload'
import { ProfitMarginCard } from '../components/projects/ProfitMarginCard'
import { ProjectExpenseList } from '../components/projects/ProjectExpenseList'
import { AddExpenseModal } from '../components/projects/AddExpenseModal'
import { ExpenseBudgetSummary } from '../components/projects/ExpenseBudgetSummary'
import { getProjectStatusConfig } from '../utils/projectStatus'
import { getDaysRemaining } from '../utils/projectProgress'
import dayjs from 'dayjs'
import { useTheme } from '../theme'
import { jsPDF } from 'jspdf'

const { Title, Text, Paragraph } = Typography

interface ProjectDetailPageProps {}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()

  // State for expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  // Fetch project data
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  })

  // Documents query for FileUpload component
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['documents', 'project', id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/project/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!id,
  })

  const handleBack = () => {
    navigate('/projects')
  }

  // Using shared status configuration utility

  // Progress calculation
  const calculateProgress = (project: Project) => {
    const now = dayjs()
    const start = project.startDate ? dayjs(project.startDate) : dayjs()
    const end = project.endDate ? dayjs(project.endDate) : dayjs().add(1, 'month')

    if (now.isBefore(start)) return 0
    if (now.isAfter(end)) return 100

    const total = end.diff(start, 'day')
    const elapsed = now.diff(start, 'day')
    return Math.round((elapsed / total) * 100)
  }

  // Using shared days remaining utility

  // Parse estimated expenses and projected margins (must be before early returns)
  const { estimatedExpenses, projectedMargins } = useMemo(() => {
    let expenses: EstimatedExpense[] = []
    let directTotal = 0
    let indirectTotal = 0

    if (project?.estimatedExpenses) {
      try {
        const expensesData = typeof project.estimatedExpenses === 'string'
          ? JSON.parse(project.estimatedExpenses)
          : project.estimatedExpenses

        // Extract expenses from the nested structure
        if (expensesData.direct && expensesData.indirect) {
          expenses = [
            ...expensesData.direct.map((exp: any, idx: number) => ({
              ...exp,
              costType: 'direct' as const,
              _uniqueKey: `direct-${exp.categoryId}-${exp.amount}-${idx}`,
            })),
            ...expensesData.indirect.map((exp: any, idx: number) => ({
              ...exp,
              costType: 'indirect' as const,
              _uniqueKey: `indirect-${exp.categoryId}-${exp.amount}-${idx}`,
            })),
          ]
          directTotal = expensesData.totalDirect || 0
          indirectTotal = expensesData.totalIndirect || 0
        }
      } catch (error) {
        console.error('Failed to parse estimatedExpenses:', error)
      }
    }

    const projectedGrossMargin = project?.projectedGrossMargin
      ? parseFloat(project.projectedGrossMargin.toString())
      : null
    const projectedNetMargin = project?.projectedNetMargin
      ? parseFloat(project.projectedNetMargin.toString())
      : null
    const projectedProfit = project?.projectedProfit
      ? parseFloat(project.projectedProfit.toString())
      : null

    return {
      estimatedExpenses: expenses,
      projectedMargins: {
        grossMargin: projectedGrossMargin,
        netMargin: projectedNetMargin,
        profit: projectedProfit,
        directCosts: directTotal,
        indirectCosts: indirectTotal,
        totalCosts: directTotal + indirectTotal,
      },
    }
  }, [project])

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card loading style={{ height: '400px' }} />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Result
            status='404'
            title='Project Not Found'
            subTitle="The project you're looking for doesn't exist."
            extra={
              <Button type='primary' onClick={handleBack}>
                Back to Projects
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const statusConfig = getProjectStatusConfig(project.status)
  const progress = calculateProgress(project)
  const daysRemaining = getDaysRemaining(project.endDate)

  // Export project data as PDF
  const handleExportData = () => {
    if (!project) return

    // Parse priceBreakdown to get products
    let products: any[] = []
    if (project.priceBreakdown) {
      try {
        const priceBreakdownData = typeof project.priceBreakdown === 'string'
          ? JSON.parse(project.priceBreakdown)
          : project.priceBreakdown
        products = priceBreakdownData.products || []
      } catch (error) {
        console.error('Failed to parse priceBreakdown:', error)
      }
    }

    // Create PDF document
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 20

    // Helper function to add new page if needed
    const checkAddPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        pdf.addPage()
        yPosition = 20
        return true
      }
      return false
    }

    // Helper function to format currency
    const formatCurrency = (amount: number | null | undefined) => {
      if (!amount) return 'Rp 0'
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(amount)
    }

    // ===== HEADER =====
    pdf.setFillColor(33, 150, 243) // Blue header
    pdf.rect(0, 0, pageWidth, 40, 'F')

    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('LAPORAN PROYEK', pageWidth / 2, 20, { align: 'center' })

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(project.number || 'N/A', pageWidth / 2, 30, { align: 'center' })

    yPosition = 50

    // ===== PROJECT INFORMATION =====
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Informasi Proyek', 14, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const projectInfo = [
      ['Nomor Proyek', project.number],
      ['Status', project.status],
      ['Tipe Proyek', project.projectType?.name || 'N/A'],
      ['Deskripsi', project.description],
      ['Output', project.output || 'N/A'],
    ]

    projectInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label + ':', 14, yPosition)
      pdf.setFont('helvetica', 'normal')

      // Handle long text with text wrapping
      const maxWidth = pageWidth - 28
      const lines = pdf.splitTextToSize(String(value || 'N/A'), maxWidth - 60)
      pdf.text(lines, 70, yPosition)
      yPosition += Math.max(6, lines.length * 5)
    })

    yPosition += 5
    checkAddPage(30)

    // ===== CLIENT INFORMATION =====
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Informasi Klien', 14, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const clientInfo = [
      ['Nama Klien', project.client?.name],
      ['Perusahaan', project.client?.company],
      ['Email', project.client?.email],
      ['Telepon', project.client?.phone],
    ]

    clientInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label + ':', 14, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(value || 'N/A'), 70, yPosition)
      yPosition += 6
    })

    yPosition += 5
    checkAddPage(40)

    // ===== TIMELINE & PROGRESS =====
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Timeline & Progress', 14, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const timelineInfo = [
      ['Tanggal Mulai', project.startDate ? dayjs(project.startDate).format('DD MMMM YYYY') : 'N/A'],
      ['Tanggal Selesai', project.endDate ? dayjs(project.endDate).format('DD MMMM YYYY') : 'N/A'],
      ['Progress', `${progress}%`],
      ['Hari Tersisa', daysRemaining > 0 ? `${daysRemaining} hari` : 'Terlambat'],
    ]

    timelineInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label + ':', 14, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(value), 70, yPosition)
      yPosition += 6
    })

    yPosition += 5
    checkAddPage(60)

    // ===== PRODUCTS & SERVICES =====
    if (products.length > 0) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Produk & Layanan', 14, yPosition)
      yPosition += 8

      // Table header
      pdf.setFillColor(240, 240, 240)
      pdf.rect(14, yPosition - 5, pageWidth - 28, 7, 'F')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Nama', 16, yPosition)
      pdf.text('Qty', pageWidth - 60, yPosition)
      pdf.text('Harga', pageWidth - 40, yPosition)
      yPosition += 8

      pdf.setFont('helvetica', 'normal')
      let totalProducts = 0

      products.forEach((product) => {
        checkAddPage(15)

        const productName = pdf.splitTextToSize(product.name || 'N/A', 100)
        pdf.text(productName, 16, yPosition)
        pdf.text(String(product.quantity || 1), pageWidth - 60, yPosition)
        pdf.text(formatCurrency(product.price), pageWidth - 40, yPosition, { align: 'right' })

        const subtotal = (product.price || 0) * (product.quantity || 1)
        totalProducts += subtotal

        yPosition += Math.max(6, productName.length * 5)
      })

      yPosition += 2
      pdf.setDrawColor(200, 200, 200)
      pdf.line(14, yPosition, pageWidth - 14, yPosition)
      yPosition += 6

      pdf.setFont('helvetica', 'bold')
      pdf.text('Total', pageWidth - 80, yPosition)
      pdf.text(formatCurrency(totalProducts), pageWidth - 40, yPosition, { align: 'right' })
      yPosition += 10
    }

    checkAddPage(60)

    // ===== FINANCIAL SUMMARY =====
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Ringkasan Keuangan', 14, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const financialInfo = [
      ['Estimasi Budget', formatCurrency(safeNumber(project.estimatedBudget))],
      ['Harga Dasar', formatCurrency(safeNumber(project.basePrice))],
      ['Total Pendapatan', formatCurrency(safeNumber(project.totalRevenue))],
      ['Total Estimasi Biaya', formatCurrency(projectedMargins.totalCosts)],
    ]

    financialInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label + ':', 14, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(value), 110, yPosition, { align: 'right' })
      yPosition += 6
    })

    yPosition += 5
    checkAddPage(60)

    // ===== ESTIMATED EXPENSES =====
    if (estimatedExpenses.length > 0) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Estimasi Biaya', 14, yPosition)
      yPosition += 8

      // Direct costs
      const directExpenses = estimatedExpenses.filter(e => e.costType === 'direct')
      if (directExpenses.length > 0) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Biaya Langsung:', 14, yPosition)
        yPosition += 6

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        directExpenses.forEach((expense) => {
          checkAddPage(10)
          pdf.text('• ' + (expense.categoryNameId || expense.categoryName), 20, yPosition)
          pdf.text(formatCurrency(expense.amount), pageWidth - 20, yPosition, { align: 'right' })
          yPosition += 5
        })

        yPosition += 2
        pdf.setFont('helvetica', 'bold')
        pdf.text('Subtotal Biaya Langsung:', 20, yPosition)
        pdf.text(formatCurrency(projectedMargins.directCosts), pageWidth - 20, yPosition, { align: 'right' })
        yPosition += 8
      }

      checkAddPage(40)

      // Indirect costs
      const indirectExpenses = estimatedExpenses.filter(e => e.costType === 'indirect')
      if (indirectExpenses.length > 0) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Biaya Tidak Langsung:', 14, yPosition)
        yPosition += 6

        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        indirectExpenses.forEach((expense) => {
          checkAddPage(10)
          pdf.text('• ' + (expense.categoryNameId || expense.categoryName), 20, yPosition)
          pdf.text(formatCurrency(expense.amount), pageWidth - 20, yPosition, { align: 'right' })
          yPosition += 5
        })

        yPosition += 2
        pdf.setFont('helvetica', 'bold')
        pdf.text('Subtotal Biaya Tidak Langsung:', 20, yPosition)
        pdf.text(formatCurrency(projectedMargins.indirectCosts), pageWidth - 20, yPosition, { align: 'right' })
        yPosition += 8
      }

      // Total costs
      pdf.setFontSize(11)
      pdf.setFillColor(245, 245, 245)
      pdf.rect(14, yPosition - 5, pageWidth - 28, 8, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.text('TOTAL ESTIMASI BIAYA:', 20, yPosition)
      pdf.text(formatCurrency(projectedMargins.totalCosts), pageWidth - 20, yPosition, { align: 'right' })
      yPosition += 12
    }

    checkAddPage(40)

    // ===== PROFIT PROJECTIONS =====
    if (projectedMargins.grossMargin !== null) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Proyeksi Profit', 14, yPosition)
      yPosition += 8

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')

      const marginInfo = [
        ['Margin Bruto (Proyeksi)', `${projectedMargins.grossMargin?.toFixed(2) || 0}%`],
        ['Margin Netto (Proyeksi)', `${projectedMargins.netMargin?.toFixed(2) || 0}%`],
        ['Proyeksi Profit', formatCurrency(projectedMargins.profit)],
      ]

      marginInfo.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold')
        pdf.text(label + ':', 14, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(String(value), 110, yPosition, { align: 'right' })
        yPosition += 6
      })

      yPosition += 5
    }

    // ===== FOOTER =====
    const footerY = pageHeight - 15
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    pdf.setFont('helvetica', 'italic')
    pdf.text(
      `Dicetak pada: ${dayjs().format('DD MMMM YYYY HH:mm')}`,
      14,
      footerY
    )
    pdf.text(
      'Monomi Project Management System',
      pageWidth - 14,
      footerY,
      { align: 'right' }
    )

    // Save PDF
    const fileName = `Laporan-Proyek-${project.number}-${dayjs().format('YYYY-MM-DD')}.pdf`
    pdf.save(fileName)
  }

  return (
    <div
      style={{
        padding: '16px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          {
            title: (
              <Button type='text' icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Projects
              </Button>
            ),
          },
          {
            title: project.number,
          },
        ]}
      />

      {/* Header Section - Hero Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div>
                <Space align='center'>
                  <Avatar
                    size={64}
                    icon={<ProjectOutlined />}
                    style={{ backgroundColor: statusConfig.color }}
                  />
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {project.number}
                    </Title>
                    <Tag
                      color={statusConfig.color}
                      style={{ marginTop: '8px' }}
                    >
                      {statusConfig.text}
                    </Tag>
                  </div>
                </Space>
              </div>

              <Paragraph style={{ margin: '16px 0 0 0', fontSize: '16px' }}>
                {project.description}
              </Paragraph>

              {project.client && (
                <Space>
                  <UserOutlined />
                  <Text strong>{project.client.name}</Text>
                  <Text type='secondary'>({project.client.company})</Text>
                </Space>
              )}
            </Space>
          </Col>

          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <Button
                type='primary'
                icon={<EditOutlined />}
                size='large'
                block
                aria-label='Edit project details'
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                Edit Project
              </Button>
              <Button
                icon={<ExportOutlined />}
                size='large'
                block
                aria-label='Export project report as PDF'
                onClick={handleExportData}
              >
                Export PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Progress Section - Prominent Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={progress}
                size={120}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={percent => `${percent}%`}
              />
              <Title level={4} style={{ marginTop: '16px' }}>
                Project Progress
              </Title>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Start Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(project.startDate).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>End Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(project.endDate).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Days Remaining</Text>
                <div>
                  <Badge
                    count={daysRemaining > 0 ? daysRemaining : 'Overdue'}
                    style={{
                      backgroundColor:
                        daysRemaining > 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  />
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics Grid - 4-Column Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Quotations'
              value={safeNumber(project._count?.quotations)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Invoices'
              value={safeNumber(project._count?.invoices)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Budget Used'
              value={project.basePrice ? formatIDR(project.basePrice) : 'N/A'}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Revenue'
              value={
                project.totalRevenue ? formatIDR(project.totalRevenue) : 'N/A'
              }
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Profit Margin Analysis */}
      <ProfitMarginCard
        project={project}
        onRecalculate={async () => {
          try {
            await fetch(`/api/v1/projects/${id}/calculate-profit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            refetch(); // Re-fetch project data with updated metrics
          } catch (error) {
            console.error('Failed to recalculate profit:', error);
          }
        }}
      />

      {/* Estimated Expenses & Projected Margins */}
      {(estimatedExpenses.length > 0 || projectedMargins.grossMargin !== null) && (
        <Card
          style={{ marginTop: '24px' }}
          title={
            <Space>
              <CalculatorOutlined />
              <span>Estimasi Biaya & Proyeksi Profit</span>
            </Space>
          }
        >
          {/* Projected Margins Summary */}
          {projectedMargins.netMargin !== null && (
            <>
              <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Margin Bruto (Proyeksi)"
                    value={projectedMargins.grossMargin || 0}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color:
                        (projectedMargins.grossMargin || 0) >= 20
                          ? '#52c41a'
                          : (projectedMargins.grossMargin || 0) >= 10
                            ? '#1890ff'
                            : '#faad14',
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Margin Netto (Proyeksi)"
                    value={projectedMargins.netMargin || 0}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color:
                        (projectedMargins.netMargin || 0) >= 20
                          ? '#52c41a'
                          : (projectedMargins.netMargin || 0) >= 10
                            ? '#1890ff'
                            : (projectedMargins.netMargin || 0) >= 0
                              ? '#faad14'
                              : '#ff4d4f',
                    }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Proyeksi Profit"
                    value={projectedMargins.profit || 0}
                    precision={0}
                    prefix="Rp"
                    valueStyle={{
                      color:
                        (projectedMargins.profit || 0) >= 0
                          ? '#52c41a'
                          : '#ff4d4f',
                    }}
                    formatter={(value) =>
                      new Intl.NumberFormat('id-ID').format(Number(value))
                    }
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total Estimasi Biaya"
                    value={projectedMargins.totalCosts}
                    precision={0}
                    prefix="Rp"
                    valueStyle={{ color: '#ff4d4f' }}
                    formatter={(value) =>
                      new Intl.NumberFormat('id-ID').format(Number(value))
                    }
                  />
                </Col>
              </Row>
              <Divider />
            </>
          )}

          {/* Estimated Expenses Table */}
          {estimatedExpenses.length > 0 && (
            <>
              <Title level={5}>Rincian Estimasi Biaya</Title>
              <Table
                dataSource={estimatedExpenses}
                rowKey={(record: any) => record._uniqueKey || record.categoryId}
                pagination={false}
                size="small"
                bordered
                columns={[
                  {
                    title: 'Kategori',
                    dataIndex: 'categoryNameId',
                    key: 'categoryNameId',
                    render: (text, record) => (
                      <Space>
                        <Tag color={record.costType === 'direct' ? 'blue' : 'orange'}>
                          {record.costType === 'direct' ? 'Langsung' : 'Tidak Langsung'}
                        </Tag>
                        <span>{text || record.categoryName}</span>
                      </Space>
                    ),
                  },
                  {
                    title: 'Estimasi',
                    dataIndex: 'amount',
                    key: 'amount',
                    align: 'right' as const,
                    render: (amount) =>
                      new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(amount),
                  },
                  {
                    title: 'Catatan',
                    dataIndex: 'notes',
                    key: 'notes',
                    render: (notes) => notes || '-',
                  },
                ]}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <strong>Total Biaya Langsung</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#1890ff' }}>
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(projectedMargins.directCosts)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <strong>Total Biaya Tidak Langsung</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#fa8c16' }}>
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(projectedMargins.indirectCosts)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <strong>Total Estimasi</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#52c41a', fontSize: 16 }}>
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                          }).format(projectedMargins.totalCosts)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </>
          )}
        </Card>
      )}

      {/* Detailed Sections - Tabbed Interface */}
      <Card style={{ marginTop: '24px' }}>
        <Tabs
          defaultActiveKey='details'
          items={[
            {
              key: 'details',
              label: (
                <span>
                  <ProjectOutlined />
                  Project Details
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 24]}>
                    <Col xs={24} md={12}>
                      <Space
                        direction='vertical'
                        size='middle'
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Text strong>Project Number:</Text>
                          <div>{project.number}</div>
                        </div>

                        <div>
                          <Text strong>Type:</Text>
                          <div>{project.projectType?.name || project.projectType?.code?.replace('_', ' ') || 'Unknown'}</div>
                        </div>

                        <div>
                          <Text strong>Status:</Text>
                          <div>
                            <Tag
                              color={statusConfig.color}
                            >
                              {statusConfig.text}
                            </Tag>
                          </div>
                        </div>
                      </Space>
                    </Col>

                    <Col xs={24} md={12}>
                      <Space
                        direction='vertical'
                        size='middle'
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Text strong>Created:</Text>
                          <div>
                            {dayjs(project.createdAt).format(
                              'DD MMM YYYY HH:mm'
                            )}
                          </div>
                        </div>

                        <div>
                          <Text strong>Last Updated:</Text>
                          <div>
                            {dayjs(project.updatedAt).format(
                              'DD MMM YYYY HH:mm'
                            )}
                          </div>
                        </div>

                        {project.output && (
                          <div>
                            <Text strong>Output:</Text>
                            <div>{project.output}</div>
                          </div>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'team',
              label: (
                <span>
                  <TeamOutlined />
                  Team & Resources
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <TeamOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Title level={4} type='secondary'>
                    Team Management
                  </Title>
                  <Text type='secondary'>
                    Team management functionality is coming soon.
                  </Text>
                </div>
              ),
            },
            {
              key: 'financial',
              label: (
                <span>
                  <DollarOutlined />
                  Financial History
                </span>
              ),
              children: (
                <div style={{ padding: '24px' }}>
                  {/* Budget Summary */}
                  <ExpenseBudgetSummary project={project} />

                  {/* Expense List with Add button */}
                  <ProjectExpenseList
                    projectId={project.id}
                    onAddExpense={() => setExpenseModalOpen(true)}
                  />

                  {/* Add Expense Modal */}
                  <AddExpenseModal
                    projectId={project.id}
                    clientId={project.client?.id}
                    open={expenseModalOpen}
                    onClose={() => setExpenseModalOpen(false)}
                  />
                </div>
              ),
            },
            {
              key: 'documents',
              label: (
                <span>
                  <FileTextOutlined />
                  Related Documents
                </span>
              ),
              children: (
                <div style={{ padding: '24px' }}>
                  <FileUpload
                    projectId={id}
                    documents={documents}
                    onDocumentsChange={() => refetchDocuments()}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Floating Action Button */}
      <FloatButton.Group>
        <FloatButton
          icon={<EditOutlined />}
          tooltip='Edit Project'
          aria-label='Edit project details'
          onClick={() => navigate(`/projects/${id}/edit`)}
        />
        <FloatButton
          icon={<ExportOutlined />}
          tooltip='Export PDF'
          aria-label='Export project report as PDF'
          onClick={handleExportData}
        />
      </FloatButton.Group>
    </div>
  )
}
