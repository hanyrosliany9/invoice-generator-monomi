import { apiClient } from '../config/api'

export interface UserSettings {
  user: {
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  preferences: {
    id: string
    userId: string
    timezone: string
    language: string
    emailNotifications: boolean
    pushNotifications: boolean
    theme: string
  }
}

export interface CompanySettings {
  id: string
  companyName: string
  address: string
  phone: string
  email: string
  website: string
  taxNumber: string
  currency: string
  bankBCA: string
  bankMandiri: string
  bankBNI: string
}

export interface SystemSettings {
  id: string
  defaultPaymentTerms: string
  materaiThreshold: number
  invoicePrefix: string
  quotationPrefix: string
  autoBackup: boolean
  backupFrequency: string
  backupTime: string
  autoMateraiReminder: boolean
  defaultCurrency: string
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
}

export interface UpdateUserSettingsDto {
  name?: string
  email?: string
  timezone?: string
  language?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  theme?: string
}

export interface UpdateCompanySettingsDto {
  companyName?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  taxNumber?: string
  currency?: string
  bankBCA?: string
  bankMandiri?: string
  bankBNI?: string
}

export interface UpdateSystemSettingsDto {
  defaultPaymentTerms?: string
  materaiThreshold?: number
  invoicePrefix?: string
  quotationPrefix?: string
  autoBackup?: boolean
  backupFrequency?: string
  backupTime?: string
  autoMateraiReminder?: boolean
  defaultCurrency?: string
}

export const settingsService = {
  // User settings
  getUserSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get('/settings/user')
    if (!response?.data?.data) {
      throw new Error('Failed to retrieve user settings')
    }
    return response.data.data
  },

  updateUserSettings: async (data: UpdateUserSettingsDto): Promise<any> => {
    const response = await apiClient.put('/settings/user', data)
    if (!response?.data?.data) {
      throw new Error('Failed to update user settings')
    }
    return response.data.data
  },

  // Company settings
  getCompanySettings: async (): Promise<CompanySettings> => {
    const response = await apiClient.get('/settings/company')
    if (!response?.data?.data) {
      throw new Error('Failed to retrieve company settings')
    }
    return response.data.data
  },

  updateCompanySettings: async (
    data: UpdateCompanySettingsDto
  ): Promise<CompanySettings> => {
    const response = await apiClient.put('/settings/company', data)
    if (!response?.data?.data) {
      throw new Error('Failed to update company settings')
    }
    return response.data.data
  },

  // System settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/settings/system')
    if (!response?.data?.data) {
      throw new Error('Failed to retrieve system settings')
    }
    return response.data.data
  },

  updateSystemSettings: async (
    data: UpdateSystemSettingsDto
  ): Promise<SystemSettings> => {
    const response = await apiClient.put('/settings/system', data)
    if (!response?.data?.data) {
      throw new Error('Failed to update system settings')
    }
    return response.data.data
  },

  // Notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/settings/notifications')
    if (!response?.data?.data) {
      throw new Error('Failed to retrieve notification settings')
    }
    return response.data.data
  },

  updateNotificationSettings: async (
    data: NotificationSettings
  ): Promise<NotificationSettings> => {
    const response = await apiClient.put('/settings/notifications', data)
    if (!response?.data?.data) {
      throw new Error('Failed to update notification settings')
    }
    return response.data.data
  },

  // Reset settings
  resetSettings: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/settings/reset')
    if (!response?.data?.data) {
      throw new Error('Failed to reset settings')
    }
    return response.data.data
  },

  // Download database backup
  downloadBackup: async (): Promise<void> => {
    const response = await apiClient.get('/settings/backup/download')
    if (!response?.data?.data) {
      throw new Error('Failed to create backup')
    }

    const { filename, content } = response.data.data

    // Convert base64 to blob
    const byteCharacters = atob(content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/sql' })

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
