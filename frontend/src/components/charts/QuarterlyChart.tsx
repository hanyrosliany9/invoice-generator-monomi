import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from 'antd'
import {
  formatCompactCurrency,
  safeArray,
  safeNumber,
} from '../../utils/currency'
import { useTheme } from '../../theme'

interface QuarterlyChartProps {
  data: Array<{ period: string; amount: number }> | null
  loading?: boolean
  height?: number
}

const QuarterlyChart: React.FC<QuarterlyChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  const { theme } = useTheme()
  if (loading) {
    return (
      <Skeleton.Input active style={{ width: '100%', height: `${height}px` }} />
    )
  }

  const chartData = safeArray(data).map(item => ({
    quarter: item.period,
    revenue: safeNumber(item.amount),
    formattedRevenue: formatCompactCurrency(item.amount),
  }))

  // Handle empty data state based on 2025 best practices
  if (chartData.length === 0 || chartData.every(item => item.revenue === 0)) {
    return (
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent',
          border: '1px dashed rgba(100, 116, 139, 0.3)',
          borderRadius: '8px',
          color: '#94a3b8',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Tidak Ada Data Kuartalan
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Data akan muncul setelah ada transaksi kuartalan
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const value = payload?.[0]?.value
      if (value === undefined || value === null) return null
      return (
        <div
          className='bg-white p-4 border border-gray-200 rounded-lg shadow-lg'
          style={{ border: theme.colors.border.default }}
        >
          <p className='text-gray-800 font-medium'>{`Kuartal: ${label || 'Unknown'}`}</p>
          <p className='text-blue-600 font-semibold'>
            {`Pendapatan: ${formatCompactCurrency(value)}`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px`, position: 'relative' }}>
      <ResponsiveContainer width='100%' height='100%' minHeight={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray='3 3' stroke={theme.colors.border.light} />
          <XAxis
            dataKey='quarter'
            tick={{ fontSize: 12, fill: theme.colors.text.secondary }}
            axisLine={{ stroke: theme.colors.border.light }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: theme.colors.text.secondary }}
            axisLine={{ stroke: theme.colors.border.light }}
            tickFormatter={value => formatCompactCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          <Bar
            dataKey='revenue'
            fill='#1e40af'
            name='Pendapatan Kuartal'
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default QuarterlyChart
