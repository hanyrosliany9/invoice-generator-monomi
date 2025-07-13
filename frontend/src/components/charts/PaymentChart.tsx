import React, { useState } from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Skeleton } from 'antd'
import { formatIDR, safeArray, safeNumber } from '../../utils/currency'

interface PaymentChartProps {
  data: Array<{
    status: string
    _count: { id: number }
    _sum: { totalAmount: number | null }
  }> | null
  loading?: boolean
  height?: number
}

const PaymentChart: React.FC<PaymentChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  // State for tracking hover/active segment
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  if (loading) {
    return (
      <Skeleton.Input active style={{ width: '100%', height: `${height}px` }} />
    )
  }

  // Color mapping for payment statuses
  const statusColors = {
    PAID: '#059669', // Green - Success
    SENT: '#1e40af', // Blue - Informational
    DRAFT: '#6b7280', // Gray - Neutral
    OVERDUE: '#dc2626', // Red - Danger
    CANCELLED: '#f59e0b', // Orange - Warning
  }

  // Status labels in Indonesian
  const statusLabels = {
    PAID: 'Lunas',
    SENT: 'Terkirim',
    DRAFT: 'Draft',
    OVERDUE: 'Jatuh Tempo',
    CANCELLED: 'Dibatalkan',
  }

  const chartData = safeArray(data)
    .map(item => ({
      name:
        statusLabels[item.status as keyof typeof statusLabels] || item.status,
      value: safeNumber(item._sum?.totalAmount),
      count: safeNumber(item._count?.id),
      status: item.status,
      color:
        statusColors[item.status as keyof typeof statusColors] || '#6b7280',
    }))
    .filter(item => item.value > 0)

  // Handle empty data state based on 2025 best practices
  if (chartData.length === 0) {
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
          color: '#8c8c8c',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💳</div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>
          Tidak Ada Data Pembayaran
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Data akan muncul setelah ada invoice
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload?.[0]?.payload
      if (!data) return null
      return (
        <div
          className='bg-white p-4 border border-gray-200 rounded-lg shadow-lg'
          style={{ border: '1px solid #e2e8f0' }}
        >
          <p className='text-gray-800 font-medium'>{`Status: ${data.name || 'Unknown'}`}</p>
          <p className='text-blue-600 font-semibold'>
            {`Nilai: ${formatIDR(data.value || 0)}`}
          </p>
          <p className='text-gray-600'>
            {`Jumlah: ${data.count || 0} invoice`}
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null // Don't show labels for very small slices

    return (
      <text
        x={x}
        y={y}
        fill='white'
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline='central'
        fontSize='12'
        fontWeight='bold'
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Hover event handlers to fix transparency issue
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(-1)
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={chartData}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={CustomLabel}
            outerRadius={80}
            fill='#8884d8'
            dataKey='value'
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            isAnimationActive={false}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  activeIndex === index
                    ? entry.color
                    : activeIndex === -1
                      ? entry.color
                      : '#e5e7eb'
                }
                stroke={activeIndex === index ? '#ffffff' : 'none'}
                strokeWidth={activeIndex === index ? 3 : 0}
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign='bottom'
            height={36}
            formatter={value => value}
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PaymentChart
