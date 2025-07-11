import React, { useState } from 'react'
import { Breadcrumb, Button, Space, Typography, Drawer, Dropdown, Badge } from 'antd'
import { HomeOutlined, RightOutlined, MenuOutlined, EllipsisOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

export interface BreadcrumbItem {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice'
  name: string
  path: string
  status?: string
}

interface EntityBreadcrumbProps {
  entityType: 'client' | 'project' | 'quotation' | 'invoice'
  entityData: any
  className?: string
}

const EntityBreadcrumb: React.FC<EntityBreadcrumbProps> = ({
  entityType,
  entityData,
  className = ''
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const buildBreadcrumbPath = (type: string, data: any): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []

    switch (type) {
      case 'invoice':
        // Invoice → Quotation → Project → Client
        if (data.quotation?.project?.client) {
          items.push({
            id: data.quotation.project.client.id,
            type: 'client',
            name: data.quotation.project.client.name,
            path: `/clients`
          })
        }
        if (data.quotation?.project) {
          items.push({
            id: data.quotation.project.id,
            type: 'project',
            name: data.quotation.project.number,
            path: `/projects`
          })
        }
        if (data.quotation) {
          items.push({
            id: data.quotation.id,
            type: 'quotation',
            name: data.quotation.quotationNumber,
            path: `/quotations`
          })
        }
        items.push({
          id: data.id,
          type: 'invoice',
          name: data.invoiceNumber,
          path: `/invoices`,
          status: data.status
        })
        break

      case 'quotation':
        // Quotation → Project → Client
        if (data.project?.client) {
          items.push({
            id: data.project.client.id,
            type: 'client',
            name: data.project.client.name,
            path: `/clients`
          })
        }
        if (data.project) {
          items.push({
            id: data.project.id,
            type: 'project',
            name: data.project.number,
            path: `/projects`
          })
        }
        items.push({
          id: data.id,
          type: 'quotation',
          name: data.quotationNumber,
          path: `/quotations`,
          status: data.status
        })
        break

      case 'project':
        // Project → Client
        if (data.client) {
          items.push({
            id: data.client.id,
            type: 'client',
            name: data.client.name,
            path: `/clients`
          })
        }
        items.push({
          id: data.id,
          type: 'project',
          name: data.number,
          path: `/projects`,
          status: data.status
        })
        break

      case 'client':
        // Client only
        items.push({
          id: data.id,
          type: 'client',
          name: data.name,
          path: `/clients`
        })
        break
    }

    return items
  }

  const handleNavigate = (item: BreadcrumbItem) => {
    // Navigate to the entity list page with a filter or view
    navigate(item.path)
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'client':
        return '🏢'
      case 'project':
        return '📊'
      case 'quotation':
        return '📋'
      case 'invoice':
        return '💰'
      default:
        return '📄'
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
      default:
        return 'default'
    }
  }

  const breadcrumbItems = buildBreadcrumbPath(entityType, entityData)

  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  
  // Mobile-first responsive breadcrumb
  const renderMobileBreadcrumb = () => {
    const lastItem = breadcrumbItems[breadcrumbItems.length - 1]
    const hasParents = breadcrumbItems.length > 1
    
    return (
      <div className="flex items-center justify-between mb-4 md:hidden">
        {/* Mobile breadcrumb with overflow menu */}
        <div className="flex items-center space-x-2 flex-1 overflow-hidden">
          <Button
            type="link"
            size="small"
            onClick={() => navigate('/')}
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
            aria-label={t('breadcrumb.goToHome', 'Go to Dashboard')}
            title={t('breadcrumb.goToHome', 'Go to Dashboard')}
            data-testid="home-button"
          >
            <HomeOutlined />
          </Button>
          
          {hasParents && (
            <>
              <RightOutlined className="text-gray-400 text-xs" />
              <Dropdown
                menu={{
                  items: breadcrumbItems.slice(0, -1).map((item) => ({
                    key: item.id,
                    label: (
                      <Space>
                        <span>{getEntityIcon(item.type)}</span>
                        <span>{item.name}</span>
                        {item.status && (
                          <Badge 
                            color={getStatusColor(item.status)} 
                            text={t(`status.${item.status.toLowerCase()}`, item.status)}
                          />
                        )}
                      </Space>
                    ),
                    onClick: () => handleNavigate(item)
                  }))
                }}
                trigger={['click']}
              >
                <Button
                  type="link"
                  size="small"
                  className="p-0 h-auto text-blue-600 hover:text-blue-800"
                  aria-label={t('breadcrumb.viewParentEntities', 'View parent entities')}
                  title={t('breadcrumb.viewParentEntities', 'View parent entities')}
                >
                  <EllipsisOutlined />
                </Button>
              </Dropdown>
              <RightOutlined className="text-gray-400 text-xs" />
            </>
          )}
          
          {/* Current item */}
          <div className="flex items-center space-x-2 flex-1 overflow-hidden">
            <span>{getEntityIcon(lastItem?.type || '')}</span>
            <Text strong className="truncate">{lastItem?.name}</Text>
            {lastItem?.status && (
              <Badge 
                color={getStatusColor(lastItem.status)} 
                text={t(`status.${lastItem.status.toLowerCase()}`, lastItem.status)}
              />
            )}
          </div>
        </div>
        
        {/* Mobile menu button */}
        <Button
          type="text"
          size="small"
          onClick={() => setMobileMenuVisible(true)}
          className="ml-2"
          aria-label={t('breadcrumb.openNavigationMenu', 'Open navigation menu')}
          title={t('breadcrumb.openNavigationMenu', 'Open navigation menu')}
        >
          <MenuOutlined />
        </Button>
      </div>
    )
  }
  
  // Desktop breadcrumb with full path
  const renderDesktopBreadcrumb = () => (
    <div className="hidden md:block mb-4">
      <Breadcrumb
        separator={<RightOutlined />}
        className="overflow-hidden"
        items={[
          {
            key: 'home',
            href: '/',
            title: (
              <Space>
                <HomeOutlined />
                <span className="hidden lg:inline">{t('breadcrumb.home', 'Dashboard')}</span>
              </Space>
            )
          },
          ...breadcrumbItems.map((item, index) => ({
            key: item.id,
            title: (
              <Space className="max-w-xs">
                <span>{getEntityIcon(item.type)}</span>
                {index < breadcrumbItems.length - 1 ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleNavigate(item)}
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 truncate max-w-24 lg:max-w-none"
                  >
                    {item.name}
                  </Button>
                ) : (
                  <Text strong className="truncate max-w-32 lg:max-w-none">{item.name}</Text>
                )}
                {item.status && (
                  <span 
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      getStatusColor(item.status) === 'green' ? 'bg-green-100 text-green-800' :
                      getStatusColor(item.status) === 'blue' ? 'bg-blue-100 text-blue-800' :
                      getStatusColor(item.status) === 'orange' ? 'bg-orange-100 text-orange-800' :
                      getStatusColor(item.status) === 'red' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {t(`status.${item.status.toLowerCase()}`, item.status)}
                  </span>
                )}
              </Space>
            )
          }))
        ]}
      />
    </div>
  )
  
  // Mobile navigation drawer
  const renderMobileDrawer = () => (
    <Drawer
      title={t('breadcrumb.navigation', 'Navigation')}
      placement="right"
      onClose={() => setMobileMenuVisible(false)}
      open={mobileMenuVisible}
      width={280}
      className="mobile-breadcrumb-drawer"
    >
      <div className="space-y-4">
        {/* Home */}
        <div className="border-b pb-2">
          <Button
            type="link"
            size="large"
            onClick={() => {
              navigate('/')
              setMobileMenuVisible(false)
            }}
            className="p-0 h-auto text-left w-full justify-start"
          >
            <Space>
              <HomeOutlined className="text-lg" />
              <span className="text-base">{t('breadcrumb.home', 'Dashboard')}</span>
            </Space>
          </Button>
        </div>
        
        {/* Breadcrumb items */}
        {breadcrumbItems.map((item, index) => (
          <div key={item.id} className="pl-4">
            <Button
              type={index === breadcrumbItems.length - 1 ? 'primary' : 'link'}
              size="large"
              onClick={() => {
                if (index < breadcrumbItems.length - 1) {
                  handleNavigate(item)
                }
                setMobileMenuVisible(false)
              }}
              className="p-0 h-auto text-left w-full justify-start"
              disabled={index === breadcrumbItems.length - 1}
            >
              <Space>
                <span className="text-lg">{getEntityIcon(item.type)}</span>
                <div className="flex-1">
                  <div className="text-base font-medium">{item.name}</div>
                  {item.status && (
                    <Badge 
                      color={getStatusColor(item.status)} 
                      text={t(`status.${item.status.toLowerCase()}`, item.status)}
                    />
                  )}
                </div>
              </Space>
            </Button>
          </div>
        ))}
      </div>
    </Drawer>
  )
  
  return (
    <nav 
      className={`entity-breadcrumb responsive-breadcrumb ${className}`}
      role="navigation"
      aria-label={t('breadcrumb.navigation', 'Entity breadcrumb navigation')}
    >
      {renderMobileBreadcrumb()}
      {renderDesktopBreadcrumb()}
      {renderMobileDrawer()}
    </nav>
  )
}

export default EntityBreadcrumb