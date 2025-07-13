import React from 'react'
import { Alert, Button, Card, Collapse, Space, Steps, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Text, Paragraph } = Typography
const { Panel } = Collapse

interface ActionableErrorProps {
  error: string | Error
  context?: 'invoice' | 'client' | 'project' | 'quotation' | 'general'
  onRetry?: () => void
  onContactSupport?: () => void
  className?: string
}

interface ErrorAction {
  label: string
  icon: React.ReactNode
  type?: 'primary' | 'default' | 'dashed'
  onClick: () => void
  loading?: boolean
}

interface ErrorSolution {
  title: string
  description: string
  steps: string[]
  priority: 'high' | 'medium' | 'low'
}

// Error classification and solutions mapping
const getErrorClassification = (
  errorMessage: string,
  context: string = 'general'
) => {
  const message = errorMessage.toLowerCase()

  // Network and connectivity errors
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return {
      type: 'network',
      severity: 'high',
      category: 'Masalah Koneksi',
      icon: <ExclamationCircleOutlined />,
      solutions: [
        {
          title: 'Periksa Koneksi Internet',
          description: 'Pastikan perangkat Anda terhubung ke internet',
          steps: [
            'Cek koneksi WiFi atau data seluler',
            'Buka halaman web lain untuk memastikan koneksi stabil',
            'Restart router WiFi jika diperlukan',
          ],
          priority: 'high' as const,
        },
        {
          title: 'Coba Lagi Dalam Beberapa Menit',
          description: 'Server mungkin sedang mengalami gangguan sementara',
          steps: [
            'Tunggu 2-3 menit',
            'Klik tombol "Coba Lagi" di bawah',
            'Atau refresh halaman ini',
          ],
          priority: 'medium' as const,
        },
      ],
    }
  }

  // Authentication errors
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('login')
  ) {
    return {
      type: 'auth',
      severity: 'high',
      category: 'Masalah Akses',
      icon: <ExclamationCircleOutlined />,
      solutions: [
        {
          title: 'Login Ulang',
          description: 'Sesi Anda mungkin telah berakhir',
          steps: [
            'Klik tombol "Logout" di menu',
            'Login kembali dengan kredensial Anda',
            'Coba aksi yang sama sekali lagi',
          ],
          priority: 'high' as const,
        },
      ],
    }
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('invalid')
  ) {
    return {
      type: 'validation',
      severity: 'medium',
      category: 'Data Tidak Valid',
      icon: <InfoCircleOutlined />,
      solutions: [
        {
          title: 'Periksa Data yang Dimasukkan',
          description: 'Pastikan semua field diisi dengan benar',
          steps: [
            'Cek field yang berwarna merah atau memiliki pesan error',
            'Pastikan format data sesuai (email, nomor, tanggal)',
            'Field bertanda (*) wajib diisi',
          ],
          priority: 'high' as const,
        },
      ],
    }
  }

  // Business logic errors (Indonesian context)
  if (
    message.includes('materai') ||
    message.includes('npwp') ||
    message.includes('pajak')
  ) {
    return {
      type: 'business',
      severity: 'medium',
      category: 'Aturan Bisnis Indonesia',
      icon: <InfoCircleOutlined />,
      solutions: [
        {
          title: 'Periksa Ketentuan Bisnis Indonesia',
          description: 'Ada aturan khusus yang perlu dipatuhi',
          steps: [
            'Invoice > 5 juta rupiah memerlukan materai',
            'NPWP harus dalam format yang benar (15 digit)',
            'Periksa kembali perhitungan pajak (PPN 11%)',
          ],
          priority: 'medium' as const,
        },
      ],
    }
  }

  // Permission errors
  if (
    message.includes('permission') ||
    message.includes('forbidden') ||
    message.includes('access denied')
  ) {
    return {
      type: 'permission',
      severity: 'high',
      category: 'Akses Ditolak',
      icon: <ExclamationCircleOutlined />,
      solutions: [
        {
          title: 'Hubungi Administrator',
          description: 'Anda mungkin tidak memiliki izin untuk aksi ini',
          steps: [
            'Hubungi admin sistem atau supervisor',
            'Jelaskan aksi yang ingin Anda lakukan',
            'Minta penambahan izin yang diperlukan',
          ],
          priority: 'high' as const,
        },
      ],
    }
  }

  // Context-specific errors
  if (context === 'invoice' && message.includes('quotation')) {
    return {
      type: 'business',
      severity: 'medium',
      category: 'Masalah Invoice',
      icon: <InfoCircleOutlined />,
      solutions: [
        {
          title: 'Periksa Status Quotation',
          description:
            'Invoice hanya bisa dibuat dari quotation yang disetujui',
          steps: [
            'Buka halaman Quotations',
            'Pastikan quotation sudah berstatus "Approved"',
            'Jika belum, setujui quotation terlebih dahulu',
          ],
          priority: 'high' as const,
        },
      ],
    }
  }

  // Generic server error
  if (
    message.includes('server') ||
    message.includes('internal') ||
    message.includes('500')
  ) {
    return {
      type: 'server',
      severity: 'high',
      category: 'Kesalahan Server',
      icon: <ExclamationCircleOutlined />,
      solutions: [
        {
          title: 'Coba Lagi Nanti',
          description: 'Server sedang mengalami masalah teknis',
          steps: [
            'Tunggu beberapa menit',
            'Refresh halaman',
            'Coba aksi yang sama',
          ],
          priority: 'medium' as const,
        },
        {
          title: 'Hubungi Tim Teknis',
          description: 'Jika masalah berlanjut, hubungi support',
          steps: [
            'Catat pesan error yang muncul',
            'Screenshot halaman ini',
            'Kirim laporan ke tim teknis',
          ],
          priority: 'low' as const,
        },
      ],
    }
  }

  // Default classification
  return {
    type: 'unknown',
    severity: 'medium',
    category: 'Kesalahan Tidak Dikenal',
    icon: <QuestionCircleOutlined />,
    solutions: [
      {
        title: 'Langkah Umum Penyelesaian',
        description: 'Coba beberapa solusi umum',
        steps: [
          'Refresh halaman dan coba lagi',
          'Logout dan login kembali',
          'Pastikan koneksi internet stabil',
        ],
        priority: 'medium' as const,
      },
    ],
  }
}

export const ActionableError: React.FC<ActionableErrorProps> = ({
  error,
  context = 'general',
  onRetry,
  onContactSupport,
  className,
}) => {
  const errorMessage = error instanceof Error ? error.message : error
  const classification = getErrorClassification(errorMessage, context)

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport()
    } else {
      // Default support action
      window.open(
        'mailto:support@monomi.id?subject=Error Report&body=' +
          encodeURIComponent(
            `Error: ${errorMessage}\nContext: ${context}\nTime: ${new Date().toISOString()}`
          )
      )
    }
  }

  const getPrimaryActions = (): ErrorAction[] => {
    const actions: ErrorAction[] = []

    if (onRetry) {
      actions.push({
        label: 'Coba Lagi',
        icon: <ReloadOutlined />,
        type: 'primary',
        onClick: onRetry,
      })
    }

    if (classification.type === 'auth') {
      actions.push({
        label: 'Login Ulang',
        icon: <SettingOutlined />,
        onClick: () => (window.location.href = '/login'),
      })
    }

    if (classification.severity === 'high') {
      actions.push({
        label: 'Hubungi Support',
        icon: <PhoneOutlined />,
        onClick: handleContactSupport,
      })
    }

    return actions
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'info'
      default:
        return 'warning'
    }
  }

  const primaryActions = getPrimaryActions()

  return (
    <div className={className}>
      <Alert
        message={classification.category}
        description={
          <div className='space-y-4'>
            <Paragraph>
              <Text strong>Pesan Error:</Text> {errorMessage}
            </Paragraph>

            {/* Primary Actions */}
            {primaryActions.length > 0 && (
              <Space wrap>
                {primaryActions.map((action, index) => (
                  <Button
                    key={index}
                    type={action.type || 'default'}
                    icon={action.icon}
                    onClick={action.onClick}
                    loading={action.loading}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            )}
          </div>
        }
        type={getSeverityColor(classification.severity) as any}
        showIcon
        icon={classification.icon}
      />

      {/* Detailed Solutions */}
      <Card className='mt-4' size='small'>
        <Collapse
          defaultActiveKey={['0']}
          ghost
          size='small'
          items={classification.solutions.map((solution, index) => ({
            key: index.toString(),
            label: (
              <div className='flex items-center space-x-2'>
                <CheckCircleOutlined
                  className={
                    solution.priority === 'high'
                      ? 'text-red-500'
                      : solution.priority === 'medium'
                        ? 'text-orange-500'
                        : 'text-blue-500'
                  }
                />
                <Text strong>{solution.title}</Text>
                <Text type='secondary' className='text-xs'>
                  (
                  {solution.priority === 'high'
                    ? 'Prioritas Tinggi'
                    : solution.priority === 'medium'
                      ? 'Prioritas Sedang'
                      : 'Prioritas Rendah'}
                  )
                </Text>
              </div>
            ),
            children: (
              <div className='space-y-3'>
                <Paragraph>{solution.description}</Paragraph>
                <Steps
                  direction='vertical'
                  size='small'
                  current={-1}
                  items={solution.steps.map((step, stepIndex) => ({
                    title: step,
                    status: 'wait' as const,
                  }))}
                />
              </div>
            ),
          }))}
        />
      </Card>

      {/* Quick Help Tips */}
      <Card className='mt-4' size='small'>
        <div className='space-y-2'>
          <Text strong className='text-sm'>
            💡 Tips Cepat:
          </Text>
          <ul className='text-sm space-y-1 ml-4'>
            <li>Pastikan browser Anda sudah diperbarui ke versi terbaru</li>
            <li>Hapus cache dan cookies jika masalah berlanjut</li>
            <li>Coba gunakan browser lain (Chrome, Firefox, Safari)</li>
            {context === 'invoice' && (
              <li>
                Untuk invoice, pastikan klien dan proyek sudah dipilih dengan
                benar
              </li>
            )}
            {context === 'quotation' && (
              <li>
                Quotation harus disetujui sebelum bisa dibuat menjadi invoice
              </li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  )
}

// Quick Error Toast for simple errors
export const QuickErrorToast = {
  network: () => '⚠️ Masalah koneksi. Periksa internet Anda dan coba lagi.',
  auth: () => '🔒 Sesi berakhir. Silakan login kembali.',
  validation: () =>
    '📝 Periksa data yang dimasukkan. Pastikan semua field terisi dengan benar.',
  permission: () =>
    '🚫 Akses ditolak. Hubungi administrator untuk mendapatkan izin.',
  business: () =>
    '📋 Periksa aturan bisnis. Pastikan data sesuai ketentuan Indonesia.',
  server: () => '🔧 Server bermasalah. Coba lagi dalam beberapa menit.',
  unknown: () => '❓ Terjadi kesalahan. Refresh halaman atau hubungi support.',
}

export default ActionableError
