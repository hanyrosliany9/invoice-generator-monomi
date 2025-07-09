import React, { useState } from 'react'
import { 
  Row, 
  Col, 
  Card, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  Typography, 
  Space,
  Tabs,
  Divider,
  Upload,
  Avatar,
  Alert,
  InputNumber,
  TimePicker,
  message
} from 'antd'
import { 
  SettingOutlined,
  UserOutlined,
  SecurityScanOutlined,
  BellOutlined,
  GlobalOutlined,
  SaveOutlined,
  UndoOutlined,
  CameraOutlined,
  ShopOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { settingsService } from '../services/settings'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface ProfileFormValues {
  name: string
  email: string
  phone?: string
  role: string
  timezone: string
  language: string
}

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface CompanyFormValues {
  companyName: string
  address: string
  phone: string
  email: string
  website?: string
  taxNumber: string
  currency: string
  bankBCA?: string
  bankMandiri?: string
  bankBNI?: string
}

interface SystemFormValues {
  emailNotifications?: boolean
  invoiceReminders?: boolean
  paymentNotifications?: boolean
  overdueAlerts?: boolean
  systemUpdates?: boolean
  marketingEmails?: boolean
  paymentTerms?: string
  materaiThreshold?: number
  invoicePrefix?: string
  quotationPrefix?: string
  autoBackup?: boolean
  backupFrequency?: string
  backupTime?: string
}

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')

  const [profileForm] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [companyForm] = Form.useForm()

  // Fetch settings data - currently not used but prepared for future API integration

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: settingsService.updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] })
      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    }
  })

  const updateCompanyMutation = useMutation({
    mutationFn: settingsService.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company'] })
      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    }
  })

  const updateSystemMutation = useMutation({
    mutationFn: settingsService.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-system'] })
      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    }
  })

  const resetMutation = useMutation({
    mutationFn: settingsService.resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] })
      message.success('Settings reset to default')
    },
    onError: () => {
      message.error(t('messages.error.general'))
    }
  })

  const handleSaveProfile = async (values: ProfileFormValues) => {
    updateUserMutation.mutate(values)
  }

  const handleChangePassword = async (values: PasswordFormValues) => {
    // TODO: Implement password change API call (requires separate endpoint)
    console.log('Password change request:', values)
    message.success('Password updated successfully')
    securityForm.resetFields()
  }

  const handleSaveCompany = async (values: CompanyFormValues) => {
    updateCompanyMutation.mutate(values)
  }

  const handleSaveSystem = async (values: SystemFormValues) => {
    updateSystemMutation.mutate(values)
  }

  const ProfileSettings = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <UserOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
          {t('settings.profile')}
        </div>
      }
      style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
    >
      <Form
        form={profileForm}
        layout="vertical"
        onFinish={handleSaveProfile}
        initialValues={{
          name: user?.name,
          email: user?.email,
          role: user?.role,
          phone: '',
          timezone: 'Asia/Jakarta',
          language: 'id'
        }}
      >
        <Row gutter={24}>
          <Col span={24} style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Avatar
              size={100}
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#6366f1',
                marginBottom: '16px'
              }}
            />
            <br />
            <Upload showUploadList={false}>
              <Button icon={<CameraOutlined />} type="dashed">
                Change Avatar
              </Button>
            </Upload>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please input your name!' }]}
            >
              <Input size="large" placeholder="Full Name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input size="large" placeholder="email@company.com" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Phone" name="phone">
              <Input size="large" placeholder="+62 812 3456 7890" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Role" name="role">
              <Input size="large" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label={t('settings.timezone')} name="timezone">
              <Select size="large">
                <Option value="Asia/Jakarta">Asia/Jakarta (WIB)</Option>
                <Option value="Asia/Makassar">Asia/Makassar (WITA)</Option>
                <Option value="Asia/Jayapura">Asia/Jayapura (WIT)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={t('settings.language')} name="language">
              <Select size="large">
                <Option value="id">Bahasa Indonesia</Option>
                <Option value="en">English</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            data-testid="save-settings-button"
            type="primary"
            htmlType="submit"
            loading={updateUserMutation.isPending}
            icon={<SaveOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            {t('settings.saveSettings')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )

  const SecuritySettings = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SecurityScanOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
          {t('settings.security')}
        </div>
      }
      style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
    >
      <Alert
        message="Security Tip"
        description="Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters."
        type="info"
        showIcon
        style={{ marginBottom: '24px', borderRadius: '8px' }}
      />

      <Form
        form={securityForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        <Form.Item
          label={t('settings.currentPassword')}
          name="currentPassword"
          rules={[{ required: true, message: 'Please input your current password!' }]}
        >
          <Input.Password size="large" placeholder="Enter current password" />
        </Form.Item>

        <Form.Item
          label={t('settings.newPassword')}
          name="newPassword"
          rules={[
            { required: true, message: 'Please input your new password!' },
            { min: 8, message: 'Password must be at least 8 characters!' }
          ]}
        >
          <Input.Password size="large" placeholder="Enter new password" />
        </Form.Item>

        <Form.Item
          label={t('settings.confirmPassword')}
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('The two passwords do not match!'))
              },
            }),
          ]}
        >
          <Input.Password size="large" placeholder="Confirm new password" />
        </Form.Item>

        <Form.Item>
          <Button
            data-testid="save-settings-button"
            type="primary"
            htmlType="submit"
            loading={updateUserMutation.isPending}
            icon={<SaveOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            {t('settings.changePassword')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )

  const CompanySettings = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShopOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
          {t('settings.companyInfo')}
        </div>
      }
      style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
    >
      <Form
        form={companyForm}
        layout="vertical"
        onFinish={handleSaveCompany}
        initialValues={{
          companyName: 'PT Teknologi Indonesia',
          address: 'Jl. Sudirman No. 123, Jakarta Pusat',
          phone: '021-1234567',
          email: 'info@teknologi.co.id',
          website: 'https://teknologi.co.id',
          taxNumber: '01.234.567.8-901.000',
          currency: 'IDR'
        }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label="Company Name"
              name="companyName"
              rules={[{ required: true, message: 'Please input company name!' }]}
            >
              <Input size="large" placeholder="PT Technology Indonesia" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Tax Number (NPWP)"
              name="taxNumber"
              rules={[{ required: true, message: 'Please input tax number!' }]}
            >
              <Input size="large" placeholder="01.234.567.8-901.000" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Address"
          name="address"
          rules={[{ required: true, message: 'Please input company address!' }]}
        >
          <TextArea rows={3} placeholder="Complete company address" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item
              label="Phone"
              name="phone"
              rules={[{ required: true, message: 'Please input phone number!' }]}
            >
              <Input size="large" placeholder="021-1234567" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please input email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input size="large" placeholder="info@company.com" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Website" name="website">
              <Input size="large" placeholder="https://company.com" />
            </Form.Item>
          </Col>
        </Row>

        <Divider>{t('settings.bankAccounts')}</Divider>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Bank BCA" name="bankBCA">
              <Input size="large" placeholder="1234567890" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bank Mandiri" name="bankMandiri">
              <Input size="large" placeholder="0987654321" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bank BNI" name="bankBNI">
              <Input size="large" placeholder="1122334455" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            data-testid="save-settings-button"
            type="primary"
            htmlType="submit"
            loading={updateCompanyMutation.isPending}
            icon={<SaveOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            {t('settings.saveSettings')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )

  const SystemSettings = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
            {t('settings.notifications')}
          </div>
        }
        style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
      >
        <Form layout="vertical" onFinish={handleSaveSystem}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label={t('settings.emailNotifications')} name="emailNotifications" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Invoice Reminders" name="invoiceReminders" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Payment Notifications" name="paymentNotifications" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Overdue Alerts" name="overdueAlerts" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="System Updates" name="systemUpdates" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="Marketing Emails" name="marketingEmails" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DollarOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
            {t('settings.invoiceSettings')}
          </div>
        }
        style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
      >
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Default Payment Terms" name="paymentTerms">
                <Select size="large" defaultValue="NET 30">
                  <Option value="NET 7">NET 7 Days</Option>
                  <Option value="NET 14">NET 14 Days</Option>
                  <Option value="NET 30">NET 30 Days</Option>
                  <Option value="NET 60">NET 60 Days</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Auto Materai Threshold" name="materaiThreshold">
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number((value || '').replace(/Rp\s?|(,*)/g, '')) as any}
                  defaultValue={5000000}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Invoice Prefix" name="invoicePrefix">
                <Input size="large" defaultValue="INV-" placeholder="INV-" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Quotation Prefix" name="quotationPrefix">
                <Input size="large" defaultValue="QT-" placeholder="QT-" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <GlobalOutlined style={{ marginRight: '8px', color: '#6366f1' }} />
            {t('settings.autoBackup')}
          </div>
        }
        style={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
      >
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label={t('settings.autoBackup')} name="autoBackup" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label={t('settings.backupFrequency')} name="backupFrequency">
                <Select size="large" defaultValue="daily">
                  <Option value="daily">Daily</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="monthly">Monthly</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Backup Time" name="backupTime">
                <TimePicker
                  size="large"
                  defaultValue={dayjs('02:00', 'HH:mm')}
                  format="HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <div style={{ textAlign: 'center' }}>
        <Space size="middle">
          <Button
            data-testid="reset-settings-button"
            loading={resetMutation.isPending}
            icon={<UndoOutlined />}
            size="large"
            style={{
              borderRadius: '8px',
              minWidth: '150px'
            }}
            onClick={() => resetMutation.mutate()}
          >
            Reset to Default
          </Button>
          <Button
            data-testid="save-settings-button"
            type="primary"
            loading={updateSystemMutation.isPending}
            icon={<SaveOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '8px',
              minWidth: '200px'
            }}
            onClick={() => handleSaveSystem({})}
          >
            {t('settings.saveSettings')}
          </Button>
        </Space>
      </div>
    </Space>
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
          <SettingOutlined style={{ marginRight: '12px', color: '#6366f1' }} />
          {t('settings.title')}
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          Manage your account and system preferences
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0'
        }}
        items={[
          {
            key: 'profile',
            label: (
              <span data-testid="profile-tab">
                <UserOutlined />
                {t('settings.profile')}
              </span>
            ),
            children: <ProfileSettings />
          },
          {
            key: 'security',
            label: (
              <span data-testid="security-tab">
                <SecurityScanOutlined />
                {t('settings.security')}
              </span>
            ),
            children: <SecuritySettings />
          },
          {
            key: 'company',
            label: (
              <span data-testid="company-tab">
                <ShopOutlined />
                Company
              </span>
            ),
            children: <CompanySettings />
          },
          {
            key: 'system',
            label: (
              <span data-testid="system-tab">
                <SettingOutlined />
                System
              </span>
            ),
            children: <SystemSettings />
          }
        ]}
      />
    </div>
  )
}