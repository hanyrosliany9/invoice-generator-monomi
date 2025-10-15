import React from 'react'
import { Button, Tooltip } from 'antd'
import { BulbOutlined, BulbFilled } from '@ant-design/icons'
import { useTheme } from '../theme/ThemeContext'

interface ThemeToggleProps {
  className?: string
  size?: 'small' | 'middle' | 'large'
  type?: 'text' | 'default' | 'primary' | 'link'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  size = 'middle',
  type = 'text',
}) => {
  const { mode, toggleTheme } = useTheme()

  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
      <Button
        className={className}
        type={type}
        size={size}
        icon={isDark ? <BulbOutlined /> : <BulbFilled />}
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          color: isDark ? '#fbbf24' : '#f59e0b',
          transition: 'all 0.3s ease',
        }}
      />
    </Tooltip>
  )
}
