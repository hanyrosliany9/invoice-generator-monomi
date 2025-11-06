import React from 'react'
import { Col, Row, Spin } from 'antd'

interface EntityFormLayoutProps {
  children: React.ReactNode
  hero: React.ReactNode
  sidebar?: React.ReactNode
  loading?: boolean
  className?: string
  'data-testid'?: string
}

export const EntityFormLayout: React.FC<EntityFormLayoutProps> = ({
  children,
  hero,
  sidebar,
  loading = false,
  className,
  'data-testid': dataTestId,
}) => {
  return (
    <div
      className={className}
      data-testid={dataTestId}
      style={{
        padding: '16px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <Spin spinning={loading} tip='Loading...'>
        {/* Hero Section */}
        <div style={{ marginBottom: '24px' }}>{hero}</div>

        {/* Main Content Area */}
        <Row gutter={[24, 24]}>
          {/* Main Form Content */}
          <Col
            xs={24}
            md={sidebar ? 16 : 24}
            lg={sidebar ? 18 : 24}
          >
            <div>{children}</div>
          </Col>

          {/* Sidebar */}
          {sidebar && (
            <Col
              xs={24}
              md={8}
              lg={6}
              style={{
                order: 1,
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: '24px',
                  maxHeight: 'calc(100vh - 48px)',
                  overflowY: 'auto',
                }}
              >
                {sidebar}
              </div>
            </Col>
          )}
        </Row>
      </Spin>
    </div>
  )
}
