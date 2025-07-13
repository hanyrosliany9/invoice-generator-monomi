import React from 'react'
import {
  Badge,
  Card,
  Col,
  Divider,
  Modal,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  CompassOutlined,
  EditOutlined,
  KeyOutlined,
  RocketOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { getShortcutDisplay } from '../../hooks/useKeyboardShortcuts'

const { Title, Text, Paragraph } = Typography

interface KeyboardShortcut {
  key: string
  description: string
  category: 'navigation' | 'actions' | 'editing' | 'general'
  context?: string
}

interface KeyboardShortcutsHelpProps {
  visible: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
  currentPage?: string
}

interface ShortcutItemProps {
  shortcut: KeyboardShortcut
  highlight?: boolean
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({
  shortcut,
  highlight = false,
}) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg ${
      highlight ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
    }`}
  >
    <div className='flex-1'>
      <Text strong={highlight}>{shortcut.description}</Text>
      {shortcut.context && (
        <div>
          <Text type='secondary' className='text-xs'>
            Context: {shortcut.context}
          </Text>
        </div>
      )}
    </div>
    <Tag
      color={highlight ? 'blue' : 'default'}
      className='font-mono text-sm'
      style={{
        padding: '4px 8px',
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    >
      {getShortcutDisplay(shortcut.key)}
    </Tag>
  </div>
)

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'navigation':
      return <CompassOutlined />
    case 'actions':
      return <ThunderboltOutlined />
    case 'editing':
      return <EditOutlined />
    case 'general':
      return <SettingOutlined />
    default:
      return <KeyOutlined />
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'navigation':
      return '#1890ff'
    case 'actions':
      return '#52c41a'
    case 'editing':
      return '#fa8c16'
    case 'general':
      return '#722ed1'
    default:
      return '#666'
  }
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  visible,
  onClose,
  shortcuts,
  currentPage,
}) => {
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>
  )

  const contextShortcuts = shortcuts.filter(s => s.context === currentPage)
  const globalShortcuts = shortcuts.filter(s => !s.context)

  const quickTips = [
    {
      icon: '💡',
      title: 'Pro Tip',
      description: 'Gunakan Ctrl+K untuk mencari apapun dengan cepat',
    },
    {
      icon: '⚡',
      title: 'Speed Boost',
      description: 'Kombinasi Alt+1,2,3,4 untuk navigasi cepat antar halaman',
    },
    {
      icon: '🚀',
      title: 'Workflow',
      description: 'Ctrl+N untuk membuat item baru di halaman manapun',
    },
    {
      icon: '📋',
      title: 'Indonesian Business',
      description: 'Alt+M untuk toggle status materai pada invoice',
    },
  ]

  const categoryTabs = [
    {
      key: 'all',
      label: (
        <Space>
          <KeyOutlined />
          All Shortcuts
          <Badge
            count={shortcuts.length}
            style={{ backgroundColor: '#f0f0f0', color: '#666' }}
          />
        </Space>
      ),
      children: (
        <div className='space-y-6'>
          {currentPage && contextShortcuts.length > 0 && (
            <div>
              <Title level={5} className='flex items-center space-x-2'>
                <span>🎯</span>
                <span>Current Page: {currentPage}</span>
              </Title>
              <div className='space-y-2'>
                {contextShortcuts.map((shortcut, index) => (
                  <ShortcutItem
                    key={index}
                    shortcut={shortcut}
                    highlight={true}
                  />
                ))}
              </div>
              <Divider />
            </div>
          )}

          {Object.entries(groupedShortcuts).map(
            ([category, categoryShortcuts]) => (
              <div key={category}>
                <Title level={5} className='flex items-center space-x-2'>
                  <span style={{ color: getCategoryColor(category) }}>
                    {getCategoryIcon(category)}
                  </span>
                  <span className='capitalize'>{category}</span>
                  <Badge
                    count={categoryShortcuts.length}
                    style={{ backgroundColor: getCategoryColor(category) }}
                  />
                </Title>
                <div className='space-y-2'>
                  {categoryShortcuts.map((shortcut, index) => (
                    <ShortcutItem
                      key={index}
                      shortcut={shortcut}
                      highlight={shortcut.context === currentPage}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ),
    },
    {
      key: 'navigation',
      label: (
        <Space>
          <CompassOutlined />
          Navigation
          <Badge
            count={groupedShortcuts.navigation?.length || 0}
            style={{ backgroundColor: '#1890ff' }}
          />
        </Space>
      ),
      children: (
        <div className='space-y-2'>
          {groupedShortcuts.navigation?.map((shortcut, index) => (
            <ShortcutItem key={index} shortcut={shortcut} />
          )) || <Text type='secondary'>No navigation shortcuts available</Text>}
        </div>
      ),
    },
    {
      key: 'actions',
      label: (
        <Space>
          <ThunderboltOutlined />
          Actions
          <Badge
            count={groupedShortcuts.actions?.length || 0}
            style={{ backgroundColor: '#52c41a' }}
          />
        </Space>
      ),
      children: (
        <div className='space-y-2'>
          {groupedShortcuts.actions?.map((shortcut, index) => (
            <ShortcutItem key={index} shortcut={shortcut} />
          )) || <Text type='secondary'>No action shortcuts available</Text>}
        </div>
      ),
    },
    {
      key: 'tips',
      label: (
        <Space>
          <RocketOutlined />
          Pro Tips
        </Space>
      ),
      children: (
        <div className='space-y-4'>
          <div>
            <Title level={5}>⚡ Workflow Tips</Title>
            <Row gutter={[16, 16]}>
              {quickTips.map((tip, index) => (
                <Col key={index} xs={24} md={12}>
                  <Card size='small' className='h-full'>
                    <div className='flex items-start space-x-3'>
                      <span className='text-2xl'>{tip.icon}</span>
                      <div>
                        <Text strong>{tip.title}</Text>
                        <Paragraph className='text-sm mb-0'>
                          {tip.description}
                        </Paragraph>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          <div>
            <Title level={5}>🇮🇩 Indonesian Business Features</Title>
            <div className='space-y-3'>
              <Card size='small'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Text strong>Quick Materai Toggle</Text>
                    <div>
                      <Text type='secondary' className='text-sm'>
                        Toggle materai status on invoices
                      </Text>
                    </div>
                  </div>
                  <Tag color='orange' className='font-mono'>
                    Alt + M
                  </Tag>
                </div>
              </Card>
              <Card size='small'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Text strong>PPN Calculator</Text>
                    <div>
                      <Text type='secondary' className='text-sm'>
                        Calculate 11% PPN automatically
                      </Text>
                    </div>
                  </div>
                  <Tag color='orange' className='font-mono'>
                    Alt + P
                  </Tag>
                </div>
              </Card>
              <Card size='small'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Text strong>Bulk Operations</Text>
                    <div>
                      <Text type='secondary' className='text-sm'>
                        Show bulk action panel
                      </Text>
                    </div>
                  </div>
                  <Tag color='orange' className='font-mono'>
                    Ctrl + Shift + B
                  </Tag>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <Title level={5}>🎯 Efficiency Metrics</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size='small' className='text-center'>
                  <div className='text-2xl font-bold text-green-600'>15%</div>
                  <Text type='secondary'>Faster Workflows</Text>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size='small' className='text-center'>
                  <div className='text-2xl font-bold text-blue-600'>2min</div>
                  <Text type='secondary'>Saved per Invoice</Text>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size='small' className='text-center'>
                  <div className='text-2xl font-bold text-purple-600'>50%</div>
                  <Text type='secondary'>Less Clicking</Text>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      ),
    },
  ]

  return (
    <Modal
      title={
        <div className='flex items-center space-x-3'>
          <KeyOutlined className='text-xl' />
          <span>Keyboard Shortcuts</span>
          <Badge count='F1' style={{ backgroundColor: '#1890ff' }} />
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className='keyboard-shortcuts-modal'
    >
      <div className='mb-4'>
        <Paragraph className='text-sm text-gray-600'>
          Master these shortcuts to boost your productivity by{' '}
          <strong>15%</strong> and save <strong>2 minutes per invoice</strong>.
          Press <Tag className='font-mono mx-1'>F1</Tag> anytime to open this
          help.
        </Paragraph>
      </div>

      <Tabs
        defaultActiveKey='all'
        items={categoryTabs}
        size='small'
        className='keyboard-shortcuts-tabs'
      />

      <Divider />

      <div className='text-center'>
        <Text type='secondary' className='text-xs'>
          💡 Tip: These shortcuts work globally across the application unless
          you're typing in a form field
        </Text>
      </div>
    </Modal>
  )
}

export default KeyboardShortcutsHelp
