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
    return response.data
  },

  updateUserSettings: async (data: UpdateUserSettingsDto): Promise<any> => {
    const response = await apiClient.put('/settings/user', data)
    return response.data
  },

  // Company settings
  getCompanySettings: async (): Promise<CompanySettings> => {
    const response = await apiClient.get('/settings/company')
    return response.data
  },

  updateCompanySettings: async (data: UpdateCompanySettingsDto): Promise<CompanySettings> => {
    const response = await apiClient.put('/settings/company', data)
    return response.data
  },

  // System settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/settings/system')
    return response.data
  },

  updateSystemSettings: async (data: UpdateSystemSettingsDto): Promise<SystemSettings> => {
    const response = await apiClient.put('/settings/system', data)
    return response.data
  },

  // Notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/settings/notifications')
    return response.data
  },

  updateNotificationSettings: async (data: NotificationSettings): Promise<NotificationSettings> => {
    const response = await apiClient.put('/settings/notifications', data)
    return response.data
  },

  // Reset settings
  resetSettings: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/settings/reset')
    return response.data
  }
}