import React from 'react'
import { App, Button, Card, Col, FloatButton, Row, Space, Table, Tag, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  CameraOutlined,
  EditOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assetService } from '../services/assets'
import { formatIDR } from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { useTheme } from '../theme'
import { mobileTheme } from '../theme/mobileTheme'
import { EntityHeroCard } from '../components/forms/EntityHeroCard'
import { useIsMobile } from '../hooks/useMediaQuery'

const { Title, Text } = Typography

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const isMobile = useIsMobile()

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id!),
    enabled: !!id,
  })

  const checkOutMutation = useMutation({
    mutationFn: ({ userId, projectId }: any) =>
      assetService.checkOutAsset(id!, userId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      message.success('Asset berhasil di-checkout')
    },
  })

  const checkInMutation = useMutation({
    mutationFn: ({ condition, notes }: any) =>
      assetService.checkInAsset(id!, condition, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      message.success('Asset berhasil di-checkin')
    },
  })

  if (isLoading || !asset) {
    return <div>Loading...</div>
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, { type: 'success' | 'warning' | 'error' | 'info'; message: string }> = {
      AVAILABLE: { type: 'success', message: 'Tersedia' },
      RESERVED: { type: 'warning', message: 'Direservasi' },
      CHECKED_OUT: { type: 'info', message: 'Dipinjam' },
      IN_MAINTENANCE: { type: 'warning', message: 'Dalam Maintenance' },
      BROKEN: { type: 'error', message: 'Rusak' },
      RETIRED: { type: 'error', message: 'Tidak Aktif' },
    }
    return statusColors[status] || statusColors.AVAILABLE
  }

  const handleEdit = () => {
    navigate(`/assets/${id}/edit`)
  }

  const handleCheckOut = () => {
    // In a real app, you'd show a modal to get userId and projectId
    const userId = 'current-user-id' // Get from auth context
    checkOutMutation.mutate({ userId, projectId: null })
  }

  const handleCheckIn = () => {
    // In a real app, you'd show a modal to get condition and notes
    checkInMutation.mutate({ condition: 'GOOD', notes: '' })
  }

  const reservationColumns = [
    {
      title: 'Periode',
      key: 'period',
      render: (_: unknown, reservation: any) => (
        <div>
          <div>{formatDate(reservation.startDate)}</div>
          <div className='text-xs text-gray-500'>s/d {formatDate(reservation.endDate)}</div>
        </div>
      ),
    },
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, reservation: any) => (
        <Text>{reservation.user?.name || '-'}</Text>
      ),
    },
    {
      title: 'Tujuan',
      key: 'purpose',
      render: (_: unknown, reservation: any) => (
        <Text>{reservation.purpose}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, reservation: any) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'blue', text: 'Menunggu' },
          CONFIRMED: { color: 'green', text: 'Dikonfirmasi' },
          CANCELLED: { color: 'red', text: 'Dibatalkan' },
          COMPLETED: { color: 'default', text: 'Selesai' },
        }
        const status = statusMap[reservation.status] || statusMap.PENDING
        return <Tag color={status.color}>{status.text}</Tag>
      },
    },
  ]

  const maintenanceColumns = [
    {
      title: 'Tanggal',
      key: 'date',
      render: (_: unknown, record: any) => formatDate(record.performedDate),
    },
    {
      title: 'Tipe',
      key: 'type',
      render: (_: unknown, record: any) => <Text>{record.maintenanceType}</Text>,
    },
    {
      title: 'Deskripsi',
      key: 'description',
      render: (_: unknown, record: any) => <Text>{record.description}</Text>,
    },
    {
      title: 'Biaya',
      key: 'cost',
      render: (_: unknown, record: any) => (
        <Text>{record.cost ? formatIDR(record.cost) : '-'}</Text>
      ),
    },
    {
      title: 'Teknisi',
      key: 'performedBy',
      render: (_: unknown, record: any) => <Text>{record.performedBy || '-'}</Text>,
    },
  ]

  return (
    <div>
      <EntityHeroCard
        title={asset.name}
        subtitle={asset.category}
        icon={<CameraOutlined />}
        breadcrumb={['Aset', asset.category, asset.name]}
        metadata={[
          { label: 'Kode Aset', value: asset.assetCode },
          { label: 'Status', value: getStatusColor(asset.status).message },
          { label: 'Tanggal Pembelian', value: asset.purchaseDate, format: 'date' },
          { label: 'Nilai', value: asset.purchasePrice, format: 'currency' },
        ]}
        actions={isMobile ? undefined : [
          {
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: handleEdit,
          },
          {
            label: 'Check Out',
            onClick: handleCheckOut,
            disabled: asset.status !== 'AVAILABLE',
            loading: checkOutMutation.isPending,
          },
          {
            label: 'Check In',
            onClick: handleCheckIn,
            disabled: asset.status !== 'CHECKED_OUT',
            loading: checkInMutation.isPending,
          },
        ]}
        status={getStatusColor(asset.status)}
      />

      <Row gutter={[16, 16]}>
        {/* Asset Details */}
        <Col xs={24} lg={12}>
          <Card title='Detail Aset' style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <Text type='secondary'>Kategori</Text>
                <div><Text strong>{asset.category}</Text></div>
              </div>
              {asset.subcategory && (
                <div>
                  <Text type='secondary'>Subkategori</Text>
                  <div><Text strong>{asset.subcategory}</Text></div>
                </div>
              )}
              {asset.manufacturer && (
                <div>
                  <Text type='secondary'>Manufaktur</Text>
                  <div><Text strong>{asset.manufacturer}</Text></div>
                </div>
              )}
              {asset.model && (
                <div>
                  <Text type='secondary'>Model</Text>
                  <div><Text strong>{asset.model}</Text></div>
                </div>
              )}
              {asset.serialNumber && (
                <div>
                  <Text type='secondary'>Serial Number</Text>
                  <div><Text strong>{asset.serialNumber}</Text></div>
                </div>
              )}
              {asset.location && (
                <div>
                  <Text type='secondary'>Lokasi</Text>
                  <div><Text strong>{asset.location}</Text></div>
                </div>
              )}
              <div>
                <Text type='secondary'>Kondisi</Text>
                <div>
                  <Tag color={asset.condition === 'EXCELLENT' ? 'green' : asset.condition === 'GOOD' ? 'blue' : 'orange'}>
                    {asset.condition}
                  </Tag>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* QR Code */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <QrcodeOutlined />
                <span>QR Code</span>
              </Space>
            }
            style={{ marginBottom: '16px', textAlign: 'center' }}
          >
            {asset.qrCode ? (
              <img 
                src={asset.qrCode} 
                alt='Asset QR Code' 
                style={{ maxWidth: '300px', width: '100%' }}
              />
            ) : (
              <Text type='secondary'>QR Code tidak tersedia</Text>
            )}
            <div style={{ marginTop: '16px' }}>
              <Text strong>{asset.assetCode}</Text>
            </div>
          </Card>
        </Col>

        {/* Purchase Information */}
        <Col xs={24}>
          <Card title='Informasi Pembelian' style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Text type='secondary'>Tanggal Pembelian</Text>
                <div><Text strong>{formatDate(asset.purchaseDate)}</Text></div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Text type='secondary'>Harga Pembelian</Text>
                <div><Text strong>{formatIDR(asset.purchasePrice)}</Text></div>
              </Col>
              {asset.supplier && (
                <Col xs={24} sm={12} md={6}>
                  <Text type='secondary'>Supplier</Text>
                  <div><Text strong>{asset.supplier}</Text></div>
                </Col>
              )}
              {asset.warrantyExpiration && (
                <Col xs={24} sm={12} md={6}>
                  <Text type='secondary'>Garansi Hingga</Text>
                  <div><Text strong>{formatDate(asset.warrantyExpiration)}</Text></div>
                </Col>
              )}
              {asset.usefulLifeYears && (
                <Col xs={24} sm={12} md={6}>
                  <Text type='secondary'>Umur Ekonomis</Text>
                  <div><Text strong>{asset.usefulLifeYears} Tahun</Text></div>
                </Col>
              )}
              {asset.residualValue !== undefined && asset.residualValue !== null && (
                <Col xs={24} sm={12} md={6}>
                  <Text type='secondary'>Nilai Sisa</Text>
                  <div><Text strong>{formatIDR(asset.residualValue)}</Text></div>
                </Col>
              )}
            </Row>
          </Card>
        </Col>

        {/* Reservation History */}
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <HistoryOutlined />
                <span>Riwayat Reservasi</span>
              </Space>
            }
            style={{ marginBottom: '16px' }}
          >
            <Table
              columns={reservationColumns}
              dataSource={asset.reservations || []}
              rowKey='id'
              pagination={{ pageSize: 5 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        {/* Maintenance History */}
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <ToolOutlined />
                <span>Riwayat Maintenance</span>
              </Space>
            }
          >
            <Table
              columns={maintenanceColumns}
              dataSource={asset.maintenanceRecords || []}
              rowKey='id'
              pagination={{ pageSize: 5 }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Mobile-only FloatButton.Group */}
      {isMobile && (
        <FloatButton.Group
          shape="circle"
          style={{
            right: mobileTheme.floatButton.right,
            bottom: mobileTheme.floatButton.bottom
          }}
        >
          <FloatButton
            icon={<EditOutlined />}
            tooltip="Edit Asset"
            onClick={handleEdit}
            type="primary"
            aria-label="Edit asset"
          />
          {asset.status === 'AVAILABLE' && (
            <FloatButton
              icon={<CameraOutlined />}
              tooltip="Check Out"
              onClick={handleCheckOut}
              aria-label="Check out asset"
            />
          )}
          {asset.status === 'CHECKED_OUT' && (
            <FloatButton
              icon={<CameraOutlined />}
              tooltip="Check In"
              onClick={handleCheckIn}
              aria-label="Check in asset"
            />
          )}
        </FloatButton.Group>
      )}
    </div>
  )
}
