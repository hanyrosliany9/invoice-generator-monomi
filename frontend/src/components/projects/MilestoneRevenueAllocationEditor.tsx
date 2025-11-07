import React, { useMemo } from 'react'
import {
  Table,
  Tag,
  Tooltip,
  Alert,
  Typography,
  InputNumber,
  App,
} from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useProjectMilestones, useUpdateMilestone } from '../../hooks/useMilestones'
import { ProjectMilestone } from '../../services/milestones'
import { formatIDR } from '../../utils/currency'

const { Title, Text } = Typography

interface MilestoneRevenueAllocationEditorProps {
  projectId: string
  projectBudget: number
  onUpdate?: () => void
}

/**
 * MilestoneRevenueAllocationEditor Component
 *
 * Manage milestone revenue allocation for PSAK 72 compliance.
 * This component focuses on REVENUE allocation only (not costs).
 *
 * Features:
 * - Editable table showing all milestones
 * - Inline editing for plannedRevenue
 * - Shows recognizedRevenue (read-only, auto-calculated by backend)
 * - Shows estimatedCost (READ-ONLY, display only - managed at project level)
 * - Shows completionPercentage (read-only)
 * - Validation: total revenue vs project budget (with warning)
 * - Summary row showing totals
 * - PSAK 72 compliance indicators
 * - Cross-reference note to "Estimasi Biaya & Proyeksi Profit" section
 */
export const MilestoneRevenueAllocationEditor: React.FC<MilestoneRevenueAllocationEditorProps> = ({
  projectId,
  projectBudget,
  onUpdate,
}) => {
  const { message } = App.useApp()
  const { data: milestones = [] } = useProjectMilestones(projectId)
  const updateMutation = useUpdateMilestone()

  // Handle revenue change (inline editing)
  const handleRevenueChange = async (id: string, value: number | null) => {
    if (value === null || value < 0) {
      message.error('Revenue must be a positive number')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: { plannedRevenue: value },
      })
      message.success('Revenue updated successfully')
      onUpdate?.()
    } catch (error: any) {
      console.error('Failed to update revenue:', error)
      if (error?.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('Failed to update revenue')
      }
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const totalPlannedRevenue = milestones.reduce((sum, m) => sum + (m.plannedRevenue || 0), 0)
    const totalRecognizedRevenue = milestones.reduce((sum, m) => sum + (m.recognizedRevenue || 0), 0)
    const totalEstimatedCost = milestones.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)

    return {
      totalPlannedRevenue,
      totalRecognizedRevenue,
      totalEstimatedCost,
      exceedsBudget: totalPlannedRevenue > projectBudget,
    }
  }, [milestones, projectBudget])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'processing'
      case 'PENDING':
        return 'warning'
      case 'ACCEPTED':
        return 'cyan'
      case 'BILLED':
        return 'purple'
      default:
        return 'default'
    }
  }

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'PENDING':
        return 'Pending'
      case 'ACCEPTED':
        return 'Accepted'
      case 'BILLED':
        return 'Billed'
      default:
        return status
    }
  }

  // Table columns
  const columns = [
    {
      title: '#',
      dataIndex: 'milestoneNumber',
      key: 'milestoneNumber',
      width: 60,
      sorter: (a: ProjectMilestone, b: ProjectMilestone) => a.milestoneNumber - b.milestoneNumber,
    },
    {
      title: 'Milestone',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (text: string, record: ProjectMilestone) => (
        <Tooltip title={record.description || text}>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            {record.description && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {record.description.length > 50
                  ? `${record.description.substring(0, 50)}...`
                  : record.description}
              </div>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>
      ),
    },
    {
      title: (
        <Tooltip title="Percentage of milestone completion">
          <span>Completion %</span>
        </Tooltip>
      ),
      dataIndex: 'completionPercentage',
      key: 'completionPercentage',
      width: 100,
      align: 'center' as const,
      render: (pct: number) => `${pct || 0}%`,
    },
    {
      title: (
        <Tooltip title="Click to edit planned revenue allocation">
          <span>Planned Revenue (Editable) ✏️</span>
        </Tooltip>
      ),
      dataIndex: 'plannedRevenue',
      key: 'plannedRevenue',
      width: 200,
      render: (value: number, record: ProjectMilestone) => (
        <InputNumber
          value={value || 0}
          onChange={(v) => handleRevenueChange(record.id, v)}
          formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => Number(value?.replace(/Rp\s?|(,*)/g, '') || 0)}
          style={{ width: '100%' }}
          min={0}
          precision={0}
          disabled={updateMutation.isPending}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Revenue recognized based on completion percentage (auto-calculated per PSAK 72)">
          <span>Recognized Revenue (Auto) 🤖</span>
        </Tooltip>
      ),
      dataIndex: 'recognizedRevenue',
      key: 'recognizedRevenue',
      width: 180,
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          {formatIDR(value || 0)}
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Estimated cost (managed at project level in 'Estimasi Biaya & Proyeksi Profit' section)">
          <span>Estimated Cost (Ref. Only) ℹ️</span>
        </Tooltip>
      ),
      dataIndex: 'estimatedCost',
      key: 'estimatedCost',
      width: 180,
      align: 'right' as const,
      render: (value: number) => (
        <Tooltip title="Biaya dikelola di bagian 'Estimasi Biaya & Proyeksi Profit'">
          <span style={{ color: '#8c8c8c' }}>
            {formatIDR(value || 0)}
          </span>
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <Title level={4}>
        Alokasi Revenue per Milestone (PSAK 72)
        <Tooltip title="Pengakuan pendapatan berdasarkan metode persentase penyelesaian sesuai PSAK 72">
          <InfoCircleOutlined style={{ marginLeft: 8, fontSize: 16, color: '#1890ff' }} />
        </Tooltip>
      </Title>

      {/* Cross-reference note */}
      <Alert
        type="info"
        message="Catatan Penting"
        description={
          <div>
            <p style={{ marginBottom: '8px' }}>
              Bagian ini mengelola <strong>alokasi revenue per milestone</strong> untuk kepatuhan PSAK 72
              (pengakuan pendapatan berbasis persentase penyelesaian).
            </p>
            <p style={{ marginBottom: 0 }}>
              Untuk melihat <strong>estimasi biaya per kategori</strong> (labor, materials, overhead, dll),
              lihat bagian <strong>"Estimasi Biaya & Proyeksi Profit"</strong> di atas tabs.
            </p>
          </div>
        }
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      {/* Budget warning */}
      {totals.exceedsBudget && (
        <Alert
          message="⚠️ Peringatan: Total Revenue Milestone Melebihi Anggaran Proyek"
          description={
            <div>
              <p style={{ marginBottom: '8px' }}>
                <strong>Total milestone:</strong> {formatIDR(totals.totalPlannedRevenue)} |
                <strong> Anggaran proyek:</strong> {formatIDR(projectBudget)}
              </p>
              <p style={{ marginBottom: 0 }}>
                Selisih: <span style={{ color: '#cf1322', fontWeight: 600 }}>
                  {formatIDR(totals.totalPlannedRevenue - projectBudget)}
                </span>
              </p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Table with inline editing */}
      <Table
        dataSource={milestones}
        columns={columns}
        rowKey="id"
        pagination={false}
        bordered
        size="middle"
        scroll={{ x: 1200 }}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
              <Table.Summary.Cell index={0} colSpan={4}>
                <strong style={{ fontSize: '14px' }}>TOTAL</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '14px' }}>
                    {formatIDR(totals.totalPlannedRevenue)}
                  </strong>
                  {totals.exceedsBudget && (
                    <Tag color="red" style={{ marginTop: 4 }}>
                      Exceeds Budget
                    </Tag>
                  )}
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">
                <strong style={{ fontSize: '14px', color: '#52c41a' }}>
                  {formatIDR(totals.totalRecognizedRevenue)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong style={{ fontSize: '14px', color: '#8c8c8c' }}>
                  {formatIDR(totals.totalEstimatedCost)}
                </strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {/* PSAK 72 Information */}
      <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>📊 PSAK 72 - Pengakuan Pendapatan:</strong> Revenue diakui berdasarkan persentase penyelesaian
          (percentage of completion method).
          <br />
          <strong>Formula:</strong> <code>Recognized Revenue = Planned Revenue × Completion %</code>
          <br />
          <strong>Catatan:</strong> Perubahan alokasi revenue akan mempengaruhi perhitungan pengakuan pendapatan
          pada laporan keuangan. Pastikan total revenue milestone sesuai dengan anggaran proyek.
        </Text>
      </div>

      {/* Deferred Revenue Summary */}
      <div style={{ marginTop: 16, display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
        <div style={{ padding: '12px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>Deferred Revenue (Belum Diakui)</Text>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1890ff', marginTop: '4px' }}>
            {formatIDR(totals.totalPlannedRevenue - totals.totalRecognizedRevenue)}
          </div>
        </div>
      </div>
    </div>
  )
}
