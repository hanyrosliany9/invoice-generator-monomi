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
          backgroundColor: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: '8px',
          color: '#8c8c8c'
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📈</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Tidak Ada Data Kuartalan</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>Data akan muncul setelah ada transaksi kuartalan</div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload?.[0]?.value
      if (value === undefined || value === null) return null
      return (
        <div 
          className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <p className="text-gray-800 font-medium">{`Kuartal: ${label || 'Unknown'}`}</p>
          <p className="text-blue-600 font-semibold">
            {`Pendapatan: ${formatCompactCurrency(value)}`}
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