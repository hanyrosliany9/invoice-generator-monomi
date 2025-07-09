import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Skeleton } from 'antd'
import { formatCompactCurrency, safeArray, safeNumber } from '../../utils/currency'

interface QuarterlyChartProps {
  data: Array<{ period: string; amount: number }> | null
  loading?: boolean
  height?: number
}

const QuarterlyChart: React.FC<QuarterlyChartProps> = ({ 
  data, 
  loading = false, 
  height = 300 
}) => {
  if (loading) {
    return <Skeleton.Input active style={{ width: '100%', height: `${height}px` }} />
  }

  const chartData = safeArray(data).map(item => ({
    quarter: item.period,
    revenue: safeNumber(item.amount),
    formattedRevenue: formatCompactCurrency(item.amount)
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <p className="text-gray-800 font-medium">{`Kuartal: ${label}`}</p>
          <p className="text-blue-600 font-semibold">
            {`Pendapatan: ${formatCompactCurrency(payload[0].value)}`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="quarter" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
          />
          <Bar
            dataKey="revenue"
            fill="#1e40af"
            name="Pendapatan Kuartal"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default QuarterlyChart