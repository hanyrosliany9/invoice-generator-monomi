import React from 'react'
import { Card, Col, Row, Skeleton, Space } from 'antd'

// Invoice Table Row Skeleton - matches actual table structure
export const InvoiceTableRowSkeleton: React.FC<{ rows?: number }> = ({
  rows = 5,
}) => (
  <div className='space-y-3'>
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className='flex items-center space-x-4 p-4 border rounded-lg'
      >
        {/* Checkbox */}
        <Skeleton.Button
          active
          size='small'
          shape='square'
          style={{ width: 16, height: 16 }}
        />

        {/* Invoice Context */}
        <div className='flex-1 space-y-1'>
          <Skeleton.Input active size='small' style={{ width: 120 }} />
          <div className='flex space-x-2'>
            <Skeleton.Button
              active
              size='small'
              style={{ width: 80, height: 16 }}
            />
            <Skeleton.Button
              active
              size='small'
              style={{ width: 60, height: 16 }}
            />
          </div>
        </div>

        {/* Client */}
        <div className='w-32'>
          <Skeleton.Input active size='small' style={{ width: '100%' }} />
        </div>

        {/* Project */}
        <div className='w-36'>
          <Skeleton.Input active size='small' style={{ width: '100%' }} />
        </div>

        {/* Amount */}
        <div className='w-32 space-y-1'>
          <Skeleton.Input active size='small' style={{ width: '100%' }} />
          <Skeleton.Button
            active
            size='small'
            style={{ width: 80, height: 14 }}
          />
        </div>

        {/* Status */}
        <div className='w-24'>
          <Skeleton.Button
            active
            size='small'
            style={{ width: '100%', height: 24 }}
          />
        </div>

        {/* Due Date */}
        <div className='w-28 space-y-1'>
          <Skeleton.Input active size='small' style={{ width: '100%' }} />
          <Skeleton.Input active size='small' style={{ width: 80 }} />
        </div>

        {/* Actions */}
        <Skeleton.Button active size='small' shape='circle' />
      </div>
    ))}
  </div>
)

// Statistics Card Skeleton - matches actual statistic cards
export const StatisticsCardSkeleton: React.FC = () => (
  <Card
    style={{
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
    }}
    className='h-32'
  >
    <div className='flex items-center space-x-4'>
      <Skeleton.Avatar active size={48} shape='square' />
      <div className='flex-1 space-y-2'>
        <Skeleton.Input active size='small' style={{ width: 80 }} />
        <Skeleton.Input active size='large' style={{ width: 60 }} />
      </div>
    </div>
  </Card>
)

// Revenue Card Skeleton - matches actual revenue cards with gradient
export const RevenueCardSkeleton: React.FC = () => (
  <Card
    style={{
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
    }}
    className='h-40'
  >
    <div className='flex items-center space-x-4 mb-4'>
      <Skeleton.Avatar
        active
        size={56}
        shape='square'
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
      />
      <div className='flex-1 space-y-2'>
        <Skeleton.Input
          active
          size='small'
          style={{ width: 100, backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        />
        <Skeleton.Input
          active
          size='large'
          style={{ width: 120, backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        />
      </div>
    </div>
    <Skeleton.Button
      active
      style={{
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
      }}
    />
  </Card>
)

// Form Field Skeleton - matches form inputs
export const FormFieldSkeleton: React.FC<{ rows?: number }> = ({
  rows = 6,
}) => (
  <div className='space-y-6'>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className='space-y-2'>
        <Skeleton.Input active size='small' style={{ width: 120 }} />
        <Skeleton.Input
          active
          size='large'
          style={{ width: '100%', height: 32 }}
        />
      </div>
    ))}
  </div>
)

// Batch Operations Skeleton
export const BatchOperationsSkeleton: React.FC = () => (
  <Card size='small' className='mb-4'>
    <div className='flex justify-between items-center'>
      <Skeleton.Input active size='small' style={{ width: 150 }} />
      <Space>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton.Button
            key={index}
            active
            size='small'
            style={{ width: 80 }}
          />
        ))}
      </Space>
    </div>
  </Card>
)

// Navigation Breadcrumb Skeleton
export const BreadcrumbSkeleton: React.FC = () => (
  <div className='flex items-center space-x-2 mb-4'>
    <Skeleton.Button active size='small' style={{ width: 60 }} />
    <span className='text-gray-300'>/</span>
    <Skeleton.Button active size='small' style={{ width: 80 }} />
    <span className='text-gray-300'>/</span>
    <Skeleton.Button active size='small' style={{ width: 100 }} />
  </div>
)

// Search and Filter Controls Skeleton
export const SearchFilterSkeleton: React.FC = () => (
  <div className='flex justify-between items-center mb-4'>
    <Space>
      <Skeleton.Input active size='default' style={{ width: 300 }} />
      <Skeleton.Button active size='default' style={{ width: 150 }} />
      <Skeleton.Button active size='default' style={{ width: 150 }} />
    </Space>

    <Space>
      <Skeleton.Button active size='default' style={{ width: 80 }} />
      <Skeleton.Button active size='default' style={{ width: 120 }} />
    </Space>
  </div>
)

// Complete Invoice Page Skeleton - matches entire page structure
export const InvoicePageSkeleton: React.FC = () => (
  <div>
    {/* Page Header */}
    <div className='mb-6'>
      <Skeleton.Input
        active
        size='large'
        style={{ width: 200, height: 40 }}
        className='mb-6'
      />

      {/* Workflow Indicator Skeleton */}
      <div className='mb-4'>
        <Skeleton.Button active style={{ width: '100%', height: 40 }} />
      </div>

      {/* Statistics Grid */}
      <Row gutter={[24, 24]} className='mb-6'>
        {Array.from({ length: 4 }).map((_, index) => (
          <Col key={index} xs={24} sm={12} lg={6}>
            <StatisticsCardSkeleton />
          </Col>
        ))}
      </Row>

      {/* Revenue Statistics */}
      <Row gutter={[24, 24]} className='mb-6'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Col key={index} xs={24} lg={8}>
            <RevenueCardSkeleton />
          </Col>
        ))}
      </Row>

      {/* Materai Statistics */}
      <Row gutter={[24, 24]} className='mb-6'>
        {Array.from({ length: 2 }).map((_, index) => (
          <Col key={index} xs={24} lg={12}>
            <StatisticsCardSkeleton />
          </Col>
        ))}
      </Row>

      {/* Search and Filter Controls */}
      <SearchFilterSkeleton />
    </div>

    {/* Main Table */}
    <Card>
      <InvoiceTableRowSkeleton rows={10} />
    </Card>
  </div>
)

// Modal Content Skeleton
export const ModalContentSkeleton: React.FC<{ type?: 'form' | 'detail' }> = ({
  type = 'form',
}) => {
  if (type === 'detail') {
    return (
      <div className='space-y-6'>
        <BreadcrumbSkeleton />
        <Row gutter={16} className='mb-4'>
          <Col span={12}>
            <div className='space-y-2'>
              <Skeleton.Input active size='small' style={{ width: 60 }} />
              <Skeleton.Input active size='default' style={{ width: 150 }} />
            </div>
          </Col>
          <Col span={12}>
            <div className='space-y-2'>
              <Skeleton.Input active size='small' style={{ width: 80 }} />
              <Skeleton.Input active size='default' style={{ width: 180 }} />
            </div>
          </Col>
        </Row>
        <Row gutter={16} className='mb-4'>
          <Col span={12}>
            <div className='space-y-2'>
              <Skeleton.Input active size='small' style={{ width: 70 }} />
              <Skeleton.Input active size='large' style={{ width: 120 }} />
            </div>
          </Col>
          <Col span={12}>
            <div className='space-y-2'>
              <Skeleton.Input active size='small' style={{ width: 50 }} />
              <Skeleton.Button active style={{ width: 80, height: 24 }} />
            </div>
          </Col>
        </Row>
        <Skeleton.Input active style={{ width: '100%', height: 80 }} />
      </div>
    )
  }

  return <FormFieldSkeleton rows={6} />
}
