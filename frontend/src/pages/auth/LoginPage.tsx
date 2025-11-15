import React from 'react'
import { Alert, Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { authService } from '../../services/auth'
import { useIsMobile } from '../../hooks/useMediaQuery'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { login } = useAuthStore()
  const [form] = Form.useForm()

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: data => {
      login(data.user, data.access_token)
      navigate('/dashboard')
    },
  })

  const handleSubmit = (values: LoginForm) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
    })
  }

  return (
    <>
      {loginMutation.error && (
        <Alert
          message={loginMutation.error?.message || t('auth.invalidCredentials')}
          type='error'
          showIcon
          style={{
            marginBottom: '24px',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
          }}
        />
      )}

      <Form
        form={form}
        name='login'
        onFinish={handleSubmit}
        layout='vertical'
        size='large'
        style={{ marginTop: '8px' }}
        data-testid='login-form'
      >
        <Form.Item
          name='email'
          label={
            <span style={{ color: '#374151', fontWeight: 600 }}>
              {t('auth.email')}
            </span>
          }
          rules={[
            {
              required: true,
              message: t('validation.required', { field: 'Email' }),
            },
            { type: 'email', message: t('validation.email') },
          ]}
          style={{ marginBottom: '24px' }}
        >
          <Input
            id='email'
            prefix={<UserOutlined style={{ color: '#6b7280' }} />}
            placeholder='nama@email.com'
            style={{
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              padding: '12px 16px',
              fontSize: '16px',
              height: '52px',
            }}
            data-testid='email-input'
          />
        </Form.Item>

        <Form.Item
          name='password'
          label={
            <span style={{ color: '#374151', fontWeight: 600 }}>
              {t('auth.password')}
            </span>
          }
          rules={[
            {
              required: true,
              message: t('validation.required', { field: 'Password' }),
            },
          ]}
          style={{ marginBottom: '24px' }}
        >
          <Input.Password
            id='password'
            prefix={<LockOutlined style={{ color: '#6b7280' }} />}
            placeholder='Masukkan password'
            style={{
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              padding: '12px 16px',
              fontSize: '16px',
              height: '52px',
            }}
            data-testid='password-input'
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Form.Item name='remember' valuePropName='checked' noStyle>
              <Checkbox id='remember' style={{ color: '#6b7280' }}>
                {t('auth.rememberMe')}
              </Checkbox>
            </Form.Item>
            <a
              href='#'
              style={{
                color: '#6366f1',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {t('auth.forgotPassword')}
            </a>
          </div>
        </Form.Item>

        <Form.Item>
          <Button
            type='primary'
            htmlType='submit'
            loading={loginMutation.isPending}
            block
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: '22px',
              height: '44px',
              fontSize: '15px',
              fontWeight: 500,
              padding: '0 24px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s ease',
            }}
            data-testid='login-button'
          >
            {t('auth.login')}
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}
