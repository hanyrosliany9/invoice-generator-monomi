import React, { useState } from 'react'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  TimePicker,
  Typography,
  Upload,
} from 'antd'
import {
  BellOutlined,
  CameraOutlined,
  CloudDownloadOutlined,
  DollarOutlined,
  GlobalOutlined,
  SaveOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  ShopOutlined,
  UndoOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { settingsService } from '../services/settings'
import { authService } from '../services/auth'
import { ProjectTypeManagement } from '../components/ProjectTypeManagement'
import { useTheme } from '../theme'
import { mobileTheme } from '../theme/mobileTheme'
import { useIsMobile } from '../hooks/useMediaQuery'
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
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  const [profileForm] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [companyForm] = Form.useForm()
  const [notificationsForm] = Form.useForm()
  const [invoiceSettingsForm] = Form.useForm()
  const [backupSettingsForm] = Form.useForm()

  // Fetch user settings from backend
  const { data: userSettings, isLoading: isLoadingUser } = useQuery({
    queryKey: ['settings-user'],
    queryFn: () => settingsService.getUserSettings(),
    refetchOnMount: true,
  })

  // Fetch company settings from backend
  const { data: companySettings, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => settingsService.getCompanySettings(),
    refetchOnMount: true,
  })

  // Fetch system settings from backend
  const { data: systemSettings, isLoading: isLoadingSystem } = useQuery({
    queryKey: ['settings-system'],
    queryFn: () => settingsService.getSystemSettings(),
    refetchOnMount: true,
  })

  // Profile and company forms use initialValues prop in Form components, no need to setFieldsValue

  // System forms use initialValues prop in the Form components, no need to setFieldsValue

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: settingsService.updateUserSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] })

      // Update Zustand auth store with new user data
      if (data?.user) {
        useAuthStore.getState().updateUser(data.user)
      }

      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    },
  })

  const updateCompanyMutation = useMutation({
    mutationFn: settingsService.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company'] })
      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    },
  })

  const updateSystemMutation = useMutation({
    mutationFn: settingsService.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-system'] })
      message.success(t('messages.success.saved'))
    },
    onError: () => {
      message.error(t('messages.error.general'))
    },
  })

  const resetMutation = useMutation({
    mutationFn: settingsService.resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] })
      message.success('Settings reset to default')
    },
    onError: () => {
      message.error(t('messages.error.general'))
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      message.success('Password berhasil diubah')
      securityForm.resetFields()
    },
    onError: (error) => {
      message.error(`Gagal mengubah password: ${error.message}`)
    },
  })

  const downloadBackupMutation = useMutation({
    mutationFn: settingsService.downloadBackup,
    onSuccess: () => {
      message.success('Backup berhasil diunduh')
    },
    onError: (error) => {
      message.error(`Gagal membuat backup: ${error.message}`)
    },
  })

  const handleSaveProfile = async (values: ProfileFormValues) => {
    // Filter out phone and role - they are not accepted by the backend DTO
    const { phone, role, ...settingsData } = values
    updateUserMutation.mutate(settingsData)
  }

  const handleChangePassword = async (values: PasswordFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
  }

  const handleSaveCompany = async (values: CompanyFormValues) => {
    updateCompanyMutation.mutate(values)
  }

  const handleSaveSystem = async (values: SystemFormValues) => {
    // Filter out notification fields - they are not accepted by the system settings DTO
    const {
      emailNotifications,
      invoiceReminders,
      paymentNotifications,
      overdueAlerts,
      systemUpdates,
      marketingEmails,
      paymentTerms, // Extract to map to backend field name
      ...systemSettingsData
    } = values

    // Map frontend field names to backend DTO field names
    const payload: any = {
      ...systemSettingsData,
      defaultPaymentTerms: paymentTerms, // Backend expects 'defaultPaymentTerms'
    }

    // Convert backupTime from dayjs to string format if present
    if (payload.backupTime && typeof payload.backupTime !== 'string') {
      payload.backupTime = (payload.backupTime as any).format('HH:mm')
    }

    updateSystemMutation.mutate(payload)
  }

  const ProfileSettings = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <UserOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
          {t('settings.profile')}
        </div>
      }
      style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
    >
      <Form
        form={profileForm}
        layout='vertical'
        onFinish={handleSaveProfile}
        id='profile-form'
        name='profile'
        initialValues={{
          name: userSettings?.user?.name || user?.name,
          email: userSettings?.user?.email || user?.email,
          role: userSettings?.user?.role || user?.role,
          phone: '',
          timezone: userSettings?.preferences?.timezone || 'Asia/Jakarta',
          language: userSettings?.preferences?.language || 'id',
        }}
      >
        <Row gutter={24}>
          <Col span={24} style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Avatar
              size={100}
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#dc2626',
                marginBottom: '16px',
              }}
            />
            <br />
            <Upload showUploadList={false}>
              <Button icon={<CameraOutlined />} type='dashed'>
                Change Avatar
              </Button>
            </Upload>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Name'
              name='name'
              rules={[{ required: true, message: 'Please input your name!' }]}
            >
              <Input size='large' placeholder='Full Name' autoComplete='name' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label='Email'
              name='email'
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input size='large' placeholder='email@company.com' autoComplete='email' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label='Phone' name='phone'>
              <Input size='large' placeholder='+62 812 3456 7890' autoComplete='tel' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='Role' name='role'>
              <Input size='large' disabled autoComplete='organization-title' />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item label={t('settings.timezone')} name='timezone'>
              <Select size='large'>
                <Option value='Asia/Jakarta'>Asia/Jakarta (WIB)</Option>
                <Option value='Asia/Makassar'>Asia/Makassar (WITA)</Option>
                <Option value='Asia/Jayapura'>Asia/Jayapura (WIT)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={t('settings.language')} name='language'>
              <Select size='large'>
                <Option value='id'>Bahasa Indonesia</Option>
                <Option value='en'>English</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            data-testid='save-profile-button'
            type='primary'
            htmlType='submit'
            loading={updateUserMutation.isPending}
            icon={<SaveOutlined />}
            size='large'
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '44px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
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
          <SecurityScanOutlined
            style={{ marginRight: '8px', color: '#dc2626' }}
          />
          {t('settings.security')}
        </div>
      }
      style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
    >
      <Alert
        message='Security Tip'
        description='Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.'
        type='info'
        showIcon
        style={{ marginBottom: '24px', borderRadius: '8px' }}
      />

      <Form
        form={securityForm}
        layout='vertical'
        onFinish={handleChangePassword}
        id='security-form'
        name='security'
      >
        <Form.Item
          label={t('settings.currentPassword')}
          name='currentPassword'
          rules={[
            { required: true, message: 'Please input your current password!' },
          ]}
        >
          <Input.Password size='large' placeholder='Enter current password' autoComplete='current-password' />
        </Form.Item>

        <Form.Item
          label={t('settings.newPassword')}
          name='newPassword'
          rules={[
            { required: true, message: 'Please input your new password!' },
            { min: 8, message: 'Password must be at least 8 characters!' },
          ]}
        >
          <Input.Password size='large' placeholder='Enter new password' autoComplete='new-password' />
        </Form.Item>

        <Form.Item
          label={t('settings.confirmPassword')}
          name='confirmPassword'
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(
                  new Error('The two passwords do not match!')
                )
              },
            }),
          ]}
        >
          <Input.Password size='large' placeholder='Confirm new password' autoComplete='new-password' />
        </Form.Item>

        <Form.Item>
          <Button
            data-testid='change-password-button'
            type='primary'
            htmlType='submit'
            loading={changePasswordMutation.isPending}
            icon={<SaveOutlined />}
            size='large'
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '44px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
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
          <ShopOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
          {t('settings.companyInfo')}
        </div>
      }
      style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
    >
      <Form
        form={companyForm}
        layout='vertical'
        onFinish={handleSaveCompany}
        id='company-form'
        name='company'
        initialValues={{
          companyName: companySettings?.companyName || 'PT Teknologi Indonesia',
          address: companySettings?.address || 'Jl. Sudirman No. 123, Jakarta Pusat',
          phone: companySettings?.phone || '021-1234567',
          email: companySettings?.email || 'info@teknologi.co.id',
          website: companySettings?.website || 'https://teknologi.co.id',
          taxNumber: companySettings?.taxNumber || '01.234.567.8-901.000',
          currency: companySettings?.currency || 'IDR',
          bankBCA: companySettings?.bankBCA || '',
          bankMandiri: companySettings?.bankMandiri || '',
          bankBNI: companySettings?.bankBNI || '',
        }}
      >
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Company Name'
              name='companyName'
              rules={[
                { required: true, message: 'Please input company name!' },
              ]}
            >
              <Input size='large' placeholder='PT Technology Indonesia' autoComplete='organization' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label='Tax Number (NPWP)'
              name='taxNumber'
              rules={[{ required: true, message: 'Please input tax number!' }]}
            >
              <Input size='large' placeholder='01.234.567.8-901.000' autoComplete='off' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label='Address'
          name='address'
          rules={[{ required: true, message: 'Please input company address!' }]}
        >
          <TextArea rows={3} placeholder='Complete company address' autoComplete='street-address' />
        </Form.Item>

        <Row gutter={24}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              label='Phone'
              name='phone'
              rules={[
                { required: true, message: 'Please input phone number!' },
              ]}
            >
              <Input size='large' placeholder='021-1234567' autoComplete='tel' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              label='Email'
              name='email'
              rules={[
                { required: true, message: 'Please input email!' },
                { type: 'email', message: 'Please enter a valid email!' },
              ]}
            >
              <Input size='large' placeholder='info@company.com' autoComplete='email' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label='Website' name='website'>
              <Input size='large' placeholder='https://company.com' autoComplete='url' />
            </Form.Item>
          </Col>
        </Row>

        <Divider>{t('settings.bankAccounts')}</Divider>

        <Row gutter={24}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label='Bank BCA' name='bankBCA'>
              <Input size='large' placeholder='1234567890' autoComplete='off' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label='Bank Mandiri' name='bankMandiri'>
              <Input size='large' placeholder='0987654321' autoComplete='off' />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label='Bank BNI' name='bankBNI'>
              <Input size='large' placeholder='1122334455' autoComplete='off' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            data-testid='save-company-button'
            type='primary'
            htmlType='submit'
            loading={updateCompanyMutation.isPending}
            icon={<SaveOutlined />}
            size='large'
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '44px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            {t('settings.saveSettings')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )

  const SystemSettings = () => (
    <Space direction='vertical' size='large' style={{ width: '100%' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
            {t('settings.notifications')}
          </div>
        }
        style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
      >
        <Form
          form={notificationsForm}
          layout='vertical'
          onFinish={handleSaveSystem}
          id='notifications-form'
          name='notifications'
          initialValues={{
            emailNotifications: true,
            invoiceReminders: true,
            paymentNotifications: true,
            overdueAlerts: true,
            systemUpdates: false,
            marketingEmails: false,
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label={t('settings.emailNotifications')}
                name='emailNotifications'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label='Invoice Reminders'
                name='invoiceReminders'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label='Payment Notifications'
                name='paymentNotifications'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Overdue Alerts'
                name='overdueAlerts'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label='System Updates'
                name='systemUpdates'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label='Marketing Emails'
                name='marketingEmails'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DollarOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
            {t('settings.invoiceSettings')}
          </div>
        }
        style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
      >
        <Form
          form={invoiceSettingsForm}
          layout='vertical'
          onFinish={handleSaveSystem}
          id='invoice-settings-form'
          name='invoiceSettings'
          initialValues={{
            paymentTerms: systemSettings?.defaultPaymentTerms || 'NET 30',
            materaiThreshold: systemSettings?.materaiThreshold || 5000000,
            invoicePrefix: systemSettings?.invoicePrefix || 'INV-',
            quotationPrefix: systemSettings?.quotationPrefix || 'QT-',
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label='Default Payment Terms' name='paymentTerms'>
                <Select size='large'>
                  <Option value='NET 7'>NET 7 Days</Option>
                  <Option value='NET 14'>NET 14 Days</Option>
                  <Option value='NET 30'>NET 30 Days</Option>
                  <Option value='NET 60'>NET 60 Days</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label='Auto Materai Threshold' name='materaiThreshold'>
                <InputNumber
                  size='large'
                  style={{ width: '100%' }}
                  formatter={value =>
                    `Rp ${value || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={value =>
                    Number((value || '').replace(/Rp\s?|(,*)/g, '')) as any
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label='Invoice Prefix' name='invoicePrefix'>
                <Input size='large' placeholder='INV-' autoComplete='off' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label='Quotation Prefix' name='quotationPrefix'>
                <Input size='large' placeholder='QT-' autoComplete='off' />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <GlobalOutlined style={{ marginRight: '8px', color: '#dc2626' }} />
            {t('settings.autoBackup')}
          </div>
        }
        style={{
        borderRadius: '12px',
        border: theme.colors.glass.border,
        boxShadow: theme.colors.glass.shadow,
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
      }}
      >
        <Form
          form={backupSettingsForm}
          layout='vertical'
          onFinish={handleSaveSystem}
          id='backup-settings-form'
          name='backupSettings'
          initialValues={{
            autoBackup: systemSettings?.autoBackup ?? true,
            backupFrequency: systemSettings?.backupFrequency || 'daily',
            backupTime: systemSettings?.backupTime ? dayjs(systemSettings.backupTime, 'HH:mm') : dayjs('02:00', 'HH:mm'),
          }}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={t('settings.autoBackup')}
                name='autoBackup'
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label={t('settings.backupFrequency')}
                name='backupFrequency'
              >
                <Select size='large'>
                  <Option value='daily'>Daily</Option>
                  <Option value='weekly'>Weekly</Option>
                  <Option value='monthly'>Monthly</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item label='Backup Time' name='backupTime'>
                <TimePicker
                  size='large'
                  format='HH:mm'
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Manual Backup</Divider>

          <Alert
            message='Database Backup'
            description='Download a complete backup of your database. This backup can be restored later using database tools.'
            type='info'
            showIcon
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          />

          <Button
            type='primary'
            icon={<CloudDownloadOutlined />}
            size='large'
            loading={downloadBackupMutation.isPending}
            onClick={() => downloadBackupMutation.mutate()}
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '44px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            Download Backup Now
          </Button>
        </Form>
      </Card>

      <ProjectTypeManagement />

      <div style={{ textAlign: 'center' }}>
        <Space size='middle'>
          <Button
            data-testid='reset-settings-button'
            loading={resetMutation.isPending}
            icon={<UndoOutlined />}
            size='large'
            style={{
              borderRadius: '18px',
              height: '40px',
              minWidth: '150px',
              padding: '0 20px',
              fontSize: '14px',
            }}
            onClick={() => resetMutation.mutate()}
          >
            Reset to Default
          </Button>
          <Button
            data-testid='save-system-button'
            type='primary'
            loading={updateSystemMutation.isPending}
            icon={<SaveOutlined />}
            size='large'
            style={{
              background: theme.colors.accent.primary,
              border: 'none',
              borderRadius: '20px',
              height: '44px',
              minWidth: '180px',
              padding: '0 24px',
              fontSize: '15px',
              fontWeight: 500,
            }}
            onClick={async () => {
              try {
                const notificationsValues = await notificationsForm.validateFields()
                const invoiceValues = await invoiceSettingsForm.validateFields()
                const backupValues = await backupSettingsForm.validateFields()

                // Combine all form values
                const allValues = {
                  ...notificationsValues,
                  ...invoiceValues,
                  ...backupValues,
                }

                handleSaveSystem(allValues)
              } catch (error) {
                message.error('Please fill in all required fields')
              }
            }}
          >
            {t('settings.saveSettings')}
          </Button>
        </Space>
      </div>
    </Space>
  )

  return (
    <div style={{ padding: '24px', background: 'transparent' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
          <SettingOutlined style={{ marginRight: '12px', color: '#dc2626' }} />
          {t('settings.title')}
        </Title>
        <Text type='secondary' style={{ fontSize: '16px' }}>
          Manage your account and system preferences
        </Text>
      </div>

      <Card
        style={{
          borderRadius: '12px',
          border: theme.colors.glass.border,
          boxShadow: theme.colors.glass.shadow,
          background: theme.colors.glass.background,
          backdropFilter: theme.colors.glass.backdropFilter,
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size={isMobile ? 'large' : 'middle'}
          tabPosition={isMobile ? 'top' : 'left'}
          items={[
          {
            key: 'profile',
            label: (
              <span data-testid='profile-tab'>
                <UserOutlined />
                {t('settings.profile')}
              </span>
            ),
            children: <ProfileSettings />,
          },
          {
            key: 'security',
            label: (
              <span data-testid='security-tab'>
                <SecurityScanOutlined />
                {t('settings.security')}
              </span>
            ),
            children: <SecuritySettings />,
          },
          {
            key: 'company',
            label: (
              <span data-testid='company-tab'>
                <ShopOutlined />
                Company
              </span>
            ),
            children: <CompanySettings />,
          },
          {
            key: 'system',
            label: (
              <span data-testid='system-tab'>
                <SettingOutlined />
                System
              </span>
            ),
            children: <SystemSettings />,
          },
        ]}
      />
      </Card>
    </div>
  )
}
