import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  DownloadOutlined,
  EyeOutlined,
  FullscreenOutlined,
  PrinterOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import { formatIDR } from '../../utils/currency'

const { Title, Text } = Typography

interface PreviewPanelProps {
  mode: 'live' | 'static'
  data: any
  template: 'quotation' | 'invoice' | 'project'
  showPdf?: boolean
  allowDownload?: boolean
  onDownload?: () => void
  onPrint?: () => void
  className?: string
  'data-testid'?: string
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  mode,
  data,
  template,
  showPdf = false,
  allowDownload = false,
  onDownload,
  onPrint,
  className,
  'data-testid': dataTestId,
}) => {
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate preview URL when data changes (live mode)
  useEffect(() => {
    if (mode === 'live' && data && showPdf) {
      generatePreview()
    }
  }, [data, mode, showPdf])

  const generatePreview = async () => {
    setLoading(true)
    setError(null)
    try {
      // This would call the actual PDF preview service
      // For now, we'll simulate the preview generation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In real implementation, this would be the actual PDF blob URL
      setPdfUrl('/api/preview/sample.pdf')
    } catch (err) {
      setError('Failed to generate preview')
    } finally {
      setLoading(false)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleRefresh = () => {
    if (mode === 'live') {
      generatePreview()
    }
  }

  const renderDocumentPreview = () => {
    if (!data) {
      return (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '2px dashed #d9d9d9',
          }}
        >
          <EyeOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
          <div style={{ marginTop: '16px' }}>
            <Text type='secondary'>
              {template === 'quotation'
                ? 'Quotation preview will appear here'
                : template === 'invoice'
                  ? 'Invoice preview will appear here'
                  : 'Project preview will appear here'}
            </Text>
          </div>
        </div>
      )
    }

    return (
      <div
        style={{
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          backgroundColor: '#fff',
          padding: '24px',
          minHeight: '600px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          overflow: 'auto',
        }}
      >
        {/* Document Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={3} style={{ color: '#1890ff' }}>
            {template === 'quotation'
              ? 'QUOTATION'
              : template === 'invoice'
                ? 'INVOICE'
                : 'PROJECT OVERVIEW'}
          </Title>
          <Text type='secondary'>{data.number || 'DRAFT'}</Text>
        </div>

        {/* Client Information */}
        <Row gutter={[24, 16]} style={{ marginBottom: '32px' }}>
          <Col span={12}>
            <div>
              <Text strong>Bill To:</Text>
              <div style={{ marginTop: '8px' }}>
                <div>
                  <Text strong>{data.client?.name || 'Client Name'}</Text>
                </div>
                <div>
                  <Text>{data.client?.company || 'Company Name'}</Text>
                </div>
                <div>
                  <Text type='secondary'>
                    {data.client?.email || 'client@email.com'}
                  </Text>
                </div>
                <div>
                  <Text type='secondary'>
                    {data.client?.address || 'Client Address'}
                  </Text>
                </div>
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div>
              <Text strong>Document Details:</Text>
              <div style={{ marginTop: '8px' }}>
                <div>
                  <Text type='secondary'>Date: </Text>
                  <Text>{new Date().toLocaleDateString('id-ID')}</Text>
                </div>
                {template === 'quotation' && (
                  <div>
                    <Text type='secondary'>Valid Until: </Text>
                    <Text>
                      {data.validUntil
                        ? new Date(data.validUntil).toLocaleDateString('id-ID')
                        : 'TBD'}
                    </Text>
                  </div>
                )}
                <div>
                  <Text type='secondary'>Status: </Text>
                  <Tag color='blue'>{data.status || 'DRAFT'}</Tag>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Items/Products */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={4}>Items</Title>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  Unit Price
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                data.products ||
                data.items || [
                  {
                    name: 'Sample Item',
                    description: 'Sample description',
                    quantity: 1,
                    price: 1000000,
                  },
                ]
              ).map((item: any, index: number) => (
                <tr key={index}>
                  <td style={{ padding: '12px', border: '1px solid #e8e8e8' }}>
                    <div>
                      <Text strong>{item.name || item.description}</Text>
                    </div>
                    {item.description && item.name && (
                      <div>
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          {item.description}
                        </Text>
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    {item.quantity || 1}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    {formatIDR(item.price || 0)}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      border: '1px solid #e8e8e8',
                    }}
                  >
                    {formatIDR((item.price || 0) * (item.quantity || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ textAlign: 'right', marginBottom: '32px' }}>
          <div style={{ display: 'inline-block', minWidth: '300px' }}>
            <Row justify='space-between' style={{ marginBottom: '8px' }}>
              <Col>
                <Text>Subtotal:</Text>
              </Col>
              <Col>
                <Text>
                  {formatIDR(data.totalAmount || data.basePrice || 0)}
                </Text>
              </Col>
            </Row>
            <Row justify='space-between' style={{ marginBottom: '8px' }}>
              <Col>
                <Text>Tax (PPN 11%):</Text>
              </Col>
              <Col>
                <Text>
                  {formatIDR((data.totalAmount || data.basePrice || 0) * 0.11)}
                </Text>
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0' }} />
            <Row justify='space-between'>
              <Col>
                <Text strong style={{ fontSize: '16px' }}>
                  Total:
                </Text>
              </Col>
              <Col>
                <Text strong style={{ fontSize: '16px' }}>
                  {formatIDR((data.totalAmount || data.basePrice || 0) * 1.11)}
                </Text>
              </Col>
            </Row>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div>
          <Title level={5}>Terms and Conditions</Title>
          <Text style={{ fontSize: '12px', lineHeight: '1.6' }}>
            {data.terms ||
              `
              1. Payment terms: Net 30 days from invoice date
              2. All prices are in Indonesian Rupiah (IDR)
              3. This ${template} is valid for 30 days from the date of issue
              4. Changes to scope may affect pricing and timeline
              5. Indonesian stamp duty (materai) may apply for amounts over IDR 5,000,000
            `}
          </Text>
        </div>

        {/* Materai Notice */}
        {(data.totalAmount || data.basePrice || 0) > 5000000 && (
          <Alert
            style={{ marginTop: '24px' }}
            message='Materai Required'
            description='This document requires a 10,000 IDR stamp duty (materai) as per Indonesian law for amounts over 5 million IDR.'
            type='warning'
            showIcon
          />
        )}
      </div>
    )
  }

  return (
    <Card
      className={className}
      data-testid={dataTestId}
      title={
        <Space>
          <EyeOutlined />
          <span>Live Preview</span>
          {mode === 'live' && <Tag color='green'>Live</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title='Zoom Out'>
            <Button
              type='text'
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            />
          </Tooltip>
          <Text
            style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}
          >
            {zoom}%
          </Text>
          <Tooltip title='Zoom In'>
            <Button
              type='text'
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            />
          </Tooltip>
          <Tooltip title='Refresh Preview'>
            <Button
              type='text'
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            />
          </Tooltip>
          <Tooltip title='Fullscreen'>
            <Button
              type='text'
              icon={<FullscreenOutlined />}
              onClick={handleFullscreen}
            />
          </Tooltip>
        </Space>
      }
      size='small'
      style={{
        height: isFullscreen ? '100vh' : 'auto',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          margin: 0,
        }),
      }}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size='large' tip='Generating preview...' />
        </div>
      )}

      {error && (
        <Alert
          message='Preview Error'
          description={error}
          type='error'
          showIcon
          action={
            <Button size='small' onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && (
        <div
          style={{
            overflow: 'auto',
            maxHeight: isFullscreen ? '90vh' : '600px',
          }}
        >
          {renderDocumentPreview()}
        </div>
      )}

      {/* Action Buttons */}
      {allowDownload && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Space>
            {onPrint && (
              <Button icon={<PrinterOutlined />} onClick={onPrint}>
                Print
              </Button>
            )}
            {onDownload && (
              <Button
                type='primary'
                icon={<DownloadOutlined />}
                onClick={onDownload}
              >
                Download PDF
              </Button>
            )}
          </Space>
        </div>
      )}
    </Card>
  )
}
