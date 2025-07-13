import React, { useState } from 'react'
import { Badge, Button, Dropdown, Space, Tag, Typography } from 'antd'
import {
  DollarOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOutlined,
  LinkOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

interface RelatedEntity {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice'
  number?: string
  name: string
  status?: string
  amount?: number
  date?: string
  count?: number
}

interface RelatedEntitiesPanelProps {
  entityType: 'client' | 'project' | 'quotation' | 'invoice'
  entityData: any
  className?: string
}

const RelatedEntitiesPanel: React.FC<RelatedEntitiesPanelProps> = ({
  entityType,
  entityData,
  className = '',
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const getRelatedEntities = (type: string, data: any): RelatedEntity[] => {
    const entities: RelatedEntity[] = []

    switch (type) {
      case 'client':
        // Client → Projects → Quotations → Invoices
        if (data.projects) {
          entities.push({
            id: 'projects',
            type: 'project',
            name: `${data.projects.length} Project${data.projects.length > 1 ? 's' : ''}`,
            count: data.projects.length,
          })
        }
        if (data.quotations) {
          entities.push({
            id: 'quotations',
            type: 'quotation',
            name: `${data.quotations.length} Quotation${data.quotations.length > 1 ? 's' : ''}`,
            count: data.quotations.length,
          })
        }
        if (data.invoices) {
          entities.push({
            id: 'invoices',
            type: 'invoice',
            name: `${data.invoices.length} Invoice${data.invoices.length > 1 ? 's' : ''}`,
            count: data.invoices.length,
          })
        }
        break

      case 'project':
        // Project → Client + Quotations + Invoices
        if (data.client) {
          entities.push({
            id: data.client.id,
            type: 'client',
            name: data.client.name,
            number: data.client.company,
          })
        }
        if (data.quotations) {
          data.quotations.forEach((quotation: any) => {
            entities.push({
              id: quotation.id,
              type: 'quotation',
              name: quotation.quotationNumber,
              status: quotation.status,
              amount: quotation.totalAmount,
              date: quotation.createdAt,
            })
          })
        }
        if (data.invoices) {
          data.invoices.forEach((invoice: any) => {
            entities.push({
              id: invoice.id,
              type: 'invoice',
              name: invoice.invoiceNumber,
              status: invoice.status,
              amount: invoice.totalAmount,
              date: invoice.createdAt,
            })
          })
        }
        break

      case 'quotation':
        // Quotation → Project → Client + Invoice
        if (data.project) {
          entities.push({
            id: data.project.id,
            type: 'project',
            name: data.project.number,
            number: data.project.description,
            status: data.project.status,
          })
          if (data.project.client) {
            entities.push({
              id: data.project.client.id,
              type: 'client',
              name: data.project.client.name,
              number: data.project.client.company,
            })
          }
        }
        if (data.invoice) {
          entities.push({
            id: data.invoice.id,
            type: 'invoice',
            name: data.invoice.invoiceNumber,
            status: data.invoice.status,
            amount: data.invoice.totalAmount,
            date: data.invoice.createdAt,
          })
        }
        break

      case 'invoice':
        // Invoice → Quotation → Project → Client
        if (data.quotation) {
          entities.push({
            id: data.quotation.id,
            type: 'quotation',
            name: data.quotation.quotationNumber,
            status: data.quotation.status,
            amount: data.quotation.totalAmount,
            date: data.quotation.createdAt,
          })
          if (data.quotation.project) {
            entities.push({
              id: data.quotation.project.id,
              type: 'project',
              name: data.quotation.project.number,
              number: data.quotation.project.description,
              status: data.quotation.project.status,
            })
            if (data.quotation.project.client) {
              entities.push({
                id: data.quotation.project.client.id,
                type: 'client',
                name: data.quotation.project.client.name,
                number: data.quotation.project.client.company,
              })
            }
          }
        }
        if (data.payments) {
          entities.push({
            id: 'payments',
            type: 'invoice',
            name: `${data.payments.length} Payment${data.payments.length > 1 ? 's' : ''}`,
            count: data.payments.length,
          })
        }
        break
    }

    return entities
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <UserOutlined />
      case 'project':
        return <FolderOutlined />
      case 'quotation':
        return <FileTextOutlined />
      case 'invoice':
        return <DollarOutlined />
      default:
        return <LinkOutlined />
    }
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'default'

    switch (status.toLowerCase()) {
      case 'draft':
        return 'orange'
      case 'sent':
        return 'blue'
      case 'approved':
        return 'green'
      case 'declined':
        return 'red'
      case 'paid':
        return 'green'
      case 'overdue':
        return 'red'
      case 'cancelled':
        return 'red'
      case 'active':
        return 'green'
      case 'planning':
        return 'blue'
      case 'in_progress':
        return 'orange'
      case 'completed':
        return 'green'
      default:
        return 'default'
    }
  }

  const handleEntityClick = (entity: RelatedEntity) => {
    if (entity.count) {
      // Navigate to filtered list view
      navigate(`/${entity.type}s`)
    } else {
      // Navigate to specific entity view
      navigate(`/${entity.type}s`)
    }
    setDropdownVisible(false)
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return ''
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount)
  }

  const formatDate = (date?: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('id-ID')
  }

  const relatedEntities = getRelatedEntities(entityType, entityData)

  const dropdownItems = relatedEntities.map(entity => ({
    key: entity.id,
    label: (
      <div className='flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer'>
        <Space>
          {getEntityIcon(entity.type)}
          <div>
            <Text strong>{entity.name}</Text>
            {entity.number && (
              <div>
                <Text type='secondary' className='text-sm'>
                  {entity.number}
                </Text>
              </div>
            )}
            {entity.amount && (
              <div>
                <Text type='secondary' className='text-sm'>
                  {formatCurrency(entity.amount)}
                </Text>
              </div>
            )}
            {entity.date && (
              <div>
                <Text type='secondary' className='text-sm'>
                  {formatDate(entity.date)}
                </Text>
              </div>
            )}
          </div>
        </Space>
        <Space>
          {entity.count && <Badge count={entity.count} showZero />}
          {entity.status && (
            <Tag color={getStatusColor(entity.status)}>
              {t(`status.${entity.status.toLowerCase()}`, entity.status)}
            </Tag>
          )}
        </Space>
      </div>
    ),
    onClick: () => handleEntityClick(entity),
  }))

  if (relatedEntities.length === 0) {
    return null
  }

  return (
    <div
      className={`related-entities-panel responsive-related-panel ${className}`}
    >
      <Dropdown
        menu={{ items: dropdownItems }}
        trigger={['click']}
        placement='bottomRight'
        open={dropdownVisible}
        onOpenChange={setDropdownVisible}
        overlayClassName='related-entities-dropdown'
        overlayStyle={{
          minWidth: 300,
          maxWidth: '90vw', // Responsive width for mobile
          marginTop: '8px',
        }}
        getPopupContainer={triggerNode =>
          triggerNode.parentElement || document.body
        }
      >
        <Button
          type='default'
          icon={<LinkOutlined />}
          className='flex items-center'
          size='small'
          aria-label={t('breadcrumb.viewRelated', 'View Related Entities')}
          title={t('breadcrumb.viewRelated', 'View Related Entities')}
        >
          <Space>
            {/* Hide text on very small screens */}
            <span className='hidden sm:inline'>
              {t('breadcrumb.viewRelated', 'View Related')}
            </span>
            <span className='inline sm:hidden'>
              {t('breadcrumb.viewRelated', 'Related')}
            </span>
            <Badge count={relatedEntities.length} size='small' />
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
    </div>
  )
}

export default RelatedEntitiesPanel
