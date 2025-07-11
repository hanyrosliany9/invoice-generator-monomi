import React from 'react'
import { Tooltip } from 'antd'
import { formatIDR } from '../../utils/currency'

interface RevenueIndicatorProps {
  paid: number
  pending: number
  compact?: boolean
  className?: string
}

const RevenueIndicator: React.FC<RevenueIndicatorProps> = ({
  paid,
  pending,
  compact = false,
  className = ''
}) => {
  const total = paid + pending
  const paidPercentage = total > 0 ? (paid / total) * 100 : 0

  if (compact) {
    return (
      <div className={`text-right ${className}`}>
        <div className="text-sm font-medium text-green-600">
          {formatIDR(paid)}
        </div>
        {pending > 0 && (
          <div className="text-xs text-orange-500">
            +{formatIDR(pending)} pending
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Revenue Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Revenue</span>
          <span className="text-xs font-medium">{formatIDR(total)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <Tooltip title={`Paid: ${formatIDR(paid)} (${paidPercentage.toFixed(1)}%)`}>
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${paidPercentage}%` }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="flex justify-between text-xs">
        <span className="text-green-600 font-medium">
          ✓ {formatIDR(paid)}
        </span>
        {pending > 0 && (
          <span className="text-orange-500 font-medium">
            ⏳ {formatIDR(pending)}
          </span>
        )}
      </div>
    </div>
  )
}

export default RevenueIndicator