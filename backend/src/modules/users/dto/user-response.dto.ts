import { UserRole } from '@prisma/client'

export class UserResponseDto {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  
  // Relations - summary counts only
  _count?: {
    quotations: number
    invoices: number
    auditLogs: number
  }
  
  // User preferences
  preferences?: {
    timezone: string
    language: string
    emailNotifications: boolean
    pushNotifications: boolean
    theme: string
  }
}