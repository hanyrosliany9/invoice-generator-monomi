import React from 'react'
import { Card, Layout, Typography } from 'antd'
import { useTheme } from '../../theme'

const { Content } = Layout
const { Title, Text } = Typography

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { theme } = useTheme()
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: theme.mode === 'dark'
          ? 'linear-gradient(135deg, #0a0e1a 0%, #121621 50%, #1a1f2e 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
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
            boxShadow: theme.mode === 'dark'
              ? '0 20px 60px rgba(0, 0, 0, 0.6)'
              : '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: `1px solid ${theme.colors.border.default}`,
            background: theme.colors.card.background,
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
                  'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
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
                color: theme.colors.text.primary,
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              Welcome Back
            </Title>
            <Text
              style={{
                color: theme.colors.text.secondary,
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
                color: theme.colors.text.tertiary,
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
