export interface NotificationTemplate {
  type: string
  name: string
  description: string
  variables: string[]
}

export interface NotificationStats {
  totalSent: number
  totalFailed: number
  byType: {
    [key: string]: number
  }
  recentNotifications: Array<{
    id: string
    type: string
    to: string
    subject: string
    status: string
    createdAt: string
  }>
}

export interface SendNotificationRequest {
  type: string
  to: string
  subject: string
  data: {
    [key: string]: any
  }
}

export interface NotificationResponse {
  data: NotificationTemplate[] | NotificationStats | null
  message: string
  status: 'success' | 'error'
}