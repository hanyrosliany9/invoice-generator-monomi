import React from 'react'
import { Progress, Tooltip } from 'antd'
import { Client } from '../../services/clients'

interface HealthScoreProps {
  client: Client
  size?: 'small' | 'large'
  className?: string
}

interface HealthScoreBreakdown {
  score: number
  breakdown: {
    activeProjects: number
    recentTransactions: number
    paymentEfficiency: number
    growthTrend: number
  }
}

// Calculate business health score (0-100)
const calculateHealthScore = (client: Client): HealthScoreBreakdown => {
  let score = 0
  const breakdown = {
    activeProjects: 0,
    recentTransactions: 0,
    paymentEfficiency: 0,
    growthTrend: 0,
  }

  // Active projects (0-20 points)
  const projectCount = client.totalProjects || 0
  if (projectCount > 0) {
    breakdown.activeProjects = Math.min(20, projectCount * 5) // 5 points per project, max 20
    score += breakdown.activeProjects
  }

  // Recent transactions (0-30 points)
  const totalTransactions =
    (client.totalQuotations || 0) + (client.totalInvoices || 0)
  if (totalTransactions > 0) {
    breakdown.recentTransactions = Math.min(30, totalTransactions * 3) // 3 points per transaction, max 30
    score += breakdown.recentTransactions
  }

  // Payment efficiency (0-25 points)
  const totalRevenue = (client.totalPaid || 0) + (client.totalPending || 0)
  if (totalRevenue > 0) {
    const paymentRate = (client.totalPaid || 0) / totalRevenue
    breakdown.paymentEfficiency = Math.round(paymentRate * 25) // Payment rate * 25 points
    score += breakdown.paymentEfficiency
  }

  // Growth trend (0-25 points) - simplified based on overdue vs total invoices
  const totalInvoices = client.totalInvoices || 0
  const overdueInvoices = client.overdueInvoices || 0
  if (totalInvoices > 0) {
    const healthyRate = Math.max(
      0,
      (totalInvoices - overdueInvoices) / totalInvoices
    )
    breakdown.growthTrend = Math.round(healthyRate * 25) // Healthy invoice rate * 25 points
    score += breakdown.growthTrend
  } else if (totalTransactions > 0) {
    breakdown.growthTrend = 15 // Default positive score for new clients with activity
    score += breakdown.growthTrend
  }

  return { score: Math.min(100, score), breakdown }
}

const getHealthColor = (score: number): string => {
  if (score >= 80) return '#52c41a' // Green
  if (score >= 60) return '#faad14' // Yellow/Orange
  if (score >= 40) return '#fa8c16' // Orange
  return '#ff4d4f' // Red
}

const getHealthStatus = (score: number): string => {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Attention'
}

const HealthScore: React.FC<HealthScoreProps> = ({
  client,
  size = 'small',
  className = '',
}) => {
  const { score, breakdown } = calculateHealthScore(client)
  const color = getHealthColor(score)
  const status = getHealthStatus(score)

  const progressSize = size === 'large' ? 80 : 48
  const strokeWidth = size === 'large' ? 8 : 6

  const tooltipContent = (
    <div className='space-y-1'>
      <div className='font-medium'>Business Health Score: {score}/100</div>
      <div className='text-xs space-y-1'>
        <div>• Active Projects: {breakdown.activeProjects}/20</div>
        <div>• Recent Activity: {breakdown.recentTransactions}/30</div>
        <div>• Payment Efficiency: {breakdown.paymentEfficiency}/25</div>
        <div>• Business Health: {breakdown.growthTrend}/25</div>
      </div>
      <div className='text-xs font-medium mt-2'>Status: {status}</div>
    </div>
  )

  return (
    <div className={`flex items-center ${className}`}>
      <Tooltip title={tooltipContent}>
        <div className='relative'>
          <Progress
            type='circle'
            percent={score}
            size={progressSize}
            strokeColor={color}
            strokeWidth={strokeWidth}
            format={() => (
              <div className='text-center'>
                <div
                  className={`font-bold ${size === 'large' ? 'text-lg' : 'text-xs'}`}
                >
                  {score}
                </div>
                {size === 'large' && (
                  <div className='text-xs text-gray-500'>Score</div>
                )}
              </div>
            )}
          />
        </div>
      </Tooltip>
      {size === 'large' && (
        <div className='ml-3'>
          <div className='text-sm font-medium' style={{ color }}>
            {status}
          </div>
          <div className='text-xs text-gray-500'>Health Score</div>
        </div>
      )}
    </div>
  )
}

export default HealthScore
export { calculateHealthScore, getHealthColor, getHealthStatus }
