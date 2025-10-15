import React from 'react'
import { Card, Layout, Typography } from 'antd'

const { Content } = Layout
const { Title, Text } = Typography

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Finance theme pattern overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle, rgba(34, 197, 94, 0.12) 1px, transparent 1px), radial-gradient(circle, rgba(59, 130, 246, 0.08) 1px, transparent 1px)',
          backgroundSize: '30px 30px, 40px 40px',
          backgroundPosition: '0 0, 20px 20px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: '460px',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid #475569',
            background: '#1e293b',
            backdropFilter: 'blur(20px)',
          }}
          styles={{
            body: { padding: '40px' },
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                background:
                  'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.5)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Finance icon pattern */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
                  pointerEvents: 'none',
                }}
              />
              <Title
                level={2}
                style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 800,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                MF
              </Title>
            </div>
            <Title
              level={3}
              style={{
                marginBottom: '8px',
                color: '#f1f5f9',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              Welcome Back
            </Title>
            <Text
              style={{
                color: '#cbd5e1',
                fontSize: '16px',
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              Monomi Finance
            </Text>
            <Text
              style={{
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              Sign in to access your financial dashboard
            </Text>
          </div>
          {children}
        </Card>
      </Content>
    </Layout>
  )
}
