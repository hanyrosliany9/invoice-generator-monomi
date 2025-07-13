// Indonesian Business Communication Component - Indonesian Business Management System
// Cultural communication patterns and WhatsApp integration for Indonesian business context

import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  HistoryOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  SendOutlined,
  SettingOutlined,
  TranslationOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useIndonesianCulturalUX } from '../../contexts/IndonesianCulturalUXContext'
import { formatIndonesianDate } from '../../utils/currency'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { TextArea } = Input
const { Option } = Select

// Communication interfaces
export interface BusinessContact {
  id: string
  name: string
  title?: string
  company: string
  phone: string
  email?: string
  whatsapp?: string
  gender?: 'male' | 'female'
  preferredCommunication: 'whatsapp' | 'email' | 'phone'
  timezone: string
  lastContact?: Date
  tags: string[]
}

export interface CommunicationTemplate {
  id: string
  name: string
  type:
    | 'quotation'
    | 'invoice'
    | 'reminder'
    | 'follow-up'
    | 'greeting'
    | 'closing'
  channel: 'whatsapp' | 'email' | 'sms'
  template: string
  variables: string[]
  indonesianEtiquette: boolean
  usageCount: number
  lastUsed?: Date
}

export interface CommunicationHistory {
  id: string
  contactId: string
  type: string
  channel: 'whatsapp' | 'email' | 'phone' | 'meeting'
  subject: string
  content: string
  timestamp: Date
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed'
  culturalScore: number
  attachments?: string[]
}

export interface IndonesianBusinessCommunicationProps {
  contacts?: BusinessContact[]
  onSendMessage?: (
    contactId: string,
    message: string,
    channel: string
  ) => Promise<void>
  onUpdateContact?: (contact: BusinessContact) => Promise<void>
  onCreateTemplate?: (template: CommunicationTemplate) => Promise<void>
}

const IndonesianBusinessCommunication: React.FC<
  IndonesianBusinessCommunicationProps
> = ({ contacts = [], onSendMessage, onUpdateContact, onCreateTemplate }) => {
  const { t } = useTranslation()
  const { message, modal } = App.useApp()
  const {
    preferences,
    formatCurrency,
    formatDateTime,
    getGreeting,
    getHonorific,
    getBusinessPhrase,
    formatWhatsAppMessage,
    getWhatsAppBusinessTemplate,
    validateBusinessEtiquette,
    getCulturalRecommendations,
  } = useIndonesianCulturalUX()

  // State management
  const [selectedContact, setSelectedContact] =
    useState<BusinessContact | null>(null)
  const [messageComposer, setMessageComposer] = useState({
    visible: false,
    contact: null as BusinessContact | null,
    type: 'custom' as
      | 'quotation'
      | 'invoice'
      | 'reminder'
      | 'follow-up'
      | 'custom'
      | 'greeting'
      | 'closing',
    channel: 'whatsapp' as 'whatsapp' | 'email' | 'sms',
    content: '',
    scheduledTime: null as dayjs.Dayjs | null,
  })
  const [templateEditor, setTemplateEditor] = useState({
    visible: false,
    template: null as CommunicationTemplate | null,
  })
  const [communicationHistory, setCommunicationHistory] = useState<
    CommunicationHistory[]
  >([])
  const [culturalSettings, setCulturalSettings] = useState({
    visible: false,
  })

  const [form] = Form.useForm()
  const composerRef = useRef<HTMLTextAreaElement>(null)

  // Debug unused variables (development only)
  console.debug('Component state:', {
    onUpdateContact,
    onCreateTemplate,
    selectedContact,
    setSelectedContact,
    templateEditor,
    form,
    getGreeting,
    getBusinessPhrase,
    t,
    formatIndonesianDate,
  })

  // Mock communication templates
  const predefinedTemplates: CommunicationTemplate[] = useMemo(
    () => [
      {
        id: 'quotation-send',
        name: 'Pengiriman Quotation',
        type: 'quotation',
        channel: 'whatsapp',
        template: getWhatsAppBusinessTemplate('quotation'),
        variables: [
          'clientName',
          'projectTitle',
          'quotationNumber',
          'quotationDate',
          'amount',
          'validUntil',
        ],
        indonesianEtiquette: true,
        usageCount: 0,
      },
      {
        id: 'invoice-send',
        name: 'Pengiriman Invoice',
        type: 'invoice',
        channel: 'whatsapp',
        template: getWhatsAppBusinessTemplate('invoice'),
        variables: [
          'clientName',
          'projectTitle',
          'invoiceNumber',
          'invoiceDate',
          'dueDate',
          'amount',
          'materaiRequired',
          'materaiAmount',
          'paymentMethods',
        ],
        indonesianEtiquette: true,
        usageCount: 0,
      },
      {
        id: 'payment-reminder',
        name: 'Pengingat Pembayaran',
        type: 'reminder',
        channel: 'whatsapp',
        template: getWhatsAppBusinessTemplate('reminder'),
        variables: [
          'clientName',
          'invoiceNumber',
          'dueDate',
          'amount',
          'overdueDays',
          'isOverdue',
        ],
        indonesianEtiquette: true,
        usageCount: 0,
      },
      {
        id: 'follow-up',
        name: 'Tindak Lanjut',
        type: 'follow-up',
        channel: 'whatsapp',
        template: getWhatsAppBusinessTemplate('follow-up'),
        variables: ['clientName', 'subject', 'followUpMessage', 'timeGreeting'],
        indonesianEtiquette: true,
        usageCount: 0,
      },
    ],
    [getWhatsAppBusinessTemplate]
  )

  // Get time-appropriate greeting
  const getTimeGreeting = useCallback(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'pagi'
    if (hour < 15) return 'siang'
    if (hour < 18) return 'sore'
    return 'malam'
  }, [])

  // Format message with cultural context
  const formatMessageWithCulture = useCallback(
    (template: string, contact: BusinessContact, data: any = {}) => {
      const contextData = {
        clientName: contact.name,
        timeGreeting: getTimeGreeting(),
        gender: contact.gender,
        senderName: 'Tim Kami',
        ...data,
      }

      return formatWhatsAppMessage(template, contextData)
    },
    [formatWhatsAppMessage, getTimeGreeting]
  )

  // Send message with cultural validation
  const sendCulturalMessage = useCallback(
    async (
      contact: BusinessContact,
      content: string,
      channel: string,
      scheduledTime?: dayjs.Dayjs
    ) => {
      // Validate business etiquette
      const etiquetteCheck = validateBusinessEtiquette('send_message', {
        message: content,
        contact,
        scheduledTime: scheduledTime?.toDate(),
      })

      if (!etiquetteCheck.valid) {
        modal.confirm({
          title: 'Perhatian Etika Bisnis',
          content: (
            <div>
              <p>Terdapat beberapa saran untuk komunikasi yang lebih baik:</p>
              <ul>
                {etiquetteCheck.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
              <p>Apakah Anda tetap ingin mengirim pesan ini?</p>
            </div>
          ),
          onOk: () => {
            onSendMessage?.(contact.id, content, channel)
            recordCommunicationHistory(contact, content, channel)
          },
        })
        return
      }

      // Send message
      try {
        await onSendMessage?.(contact.id, content, channel)
        recordCommunicationHistory(contact, content, channel)
        message.success('Pesan berhasil dikirim dengan etika bisnis Indonesia')
      } catch (error) {
        message.error('Gagal mengirim pesan')
      }
    },
    [validateBusinessEtiquette, onSendMessage]
  )

  // Record communication in history
  const recordCommunicationHistory = useCallback(
    (contact: BusinessContact, content: string, channel: string) => {
      // Calculate cultural score based on Indonesian business etiquette
      const culturalScore = calculateCulturalScore(content, contact)

      const historyEntry: CommunicationHistory = {
        id: `comm_${Date.now()}`,
        contactId: contact.id,
        type: messageComposer.type,
        channel: channel as any,
        subject: getSubjectFromContent(content),
        content,
        timestamp: new Date(),
        status: 'sent',
        culturalScore,
      }

      setCommunicationHistory(prev => [historyEntry, ...prev.slice(0, 99)]) // Keep last 100
    },
    [messageComposer.type]
  )

  // Calculate cultural appropriateness score
  const calculateCulturalScore = useCallback(
    (content: string, contact: BusinessContact): number => {
      let score = 50 // Base score

      // Check for formal greeting
      if (
        content.includes('Selamat') ||
        content.includes('Bapak') ||
        content.includes('Ibu')
      ) {
        score += 20
      }

      // Check for honorifics
      if (content.includes(getHonorific(contact.gender, 'business'))) {
        score += 15
      }

      // Check for polite closing
      if (
        content.includes('Terima kasih') ||
        content.includes('Salam hormat')
      ) {
        score += 15
      }

      // Check for business context appropriateness
      if (content.includes('Yang Terhormat') || content.includes('Izin')) {
        score += 10
      }

      // Deduct for informal language
      if (
        content.includes('Hi') ||
        content.includes('Hey') ||
        content.includes('Halo aja')
      ) {
        score -= 20
      }

      return Math.max(0, Math.min(100, score))
    },
    [getHonorific]
  )

  // Get subject from content
  const getSubjectFromContent = (content: string): string => {
    const lines = content.split('\n')
    const firstLine = lines[0] || ''
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...'
    }
    return firstLine
  }

  // Open message composer
  const openMessageComposer = useCallback(
    (
      contact: BusinessContact,
      type: typeof messageComposer.type = 'custom',
      templateContent: string = ''
    ) => {
      setMessageComposer({
        visible: true,
        contact,
        type,
        channel:
          contact.preferredCommunication === 'phone'
            ? 'sms'
            : (contact.preferredCommunication as 'whatsapp' | 'email' | 'sms'),
        content: templateContent,
        scheduledTime: null,
      })
    },
    []
  )

  // Apply template to composer
  const applyTemplate = useCallback(
    (template: CommunicationTemplate, contact: BusinessContact) => {
      if (!messageComposer.contact) return

      const formattedContent = formatMessageWithCulture(
        template.template,
        contact,
        {
          quotationNumber: 'QT-2025-001',
          invoiceNumber: 'INV-2025-001',
          quotationDate: formatDateTime(new Date()),
          amount: formatCurrency(5000000),
          validUntil: formatDateTime(dayjs().add(30, 'days').toDate()),
          dueDate: formatDateTime(dayjs().add(14, 'days').toDate()),
          overdueDays: 0,
          isOverdue: false,
          paymentMethods: 'Transfer Bank BCA/Mandiri',
        }
      )

      setMessageComposer(prev => ({
        ...prev,
        content: formattedContent,
        type: template.type,
      }))
    },
    [
      messageComposer.contact,
      formatMessageWithCulture,
      formatDateTime,
      formatCurrency,
    ]
  )

  // Contact status indicator
  const getContactStatusColor = (contact: BusinessContact): string => {
    if (!contact.lastContact) return '#d9d9d9'

    const daysSinceContact = Math.floor(
      (Date.now() - contact.lastContact.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceContact <= 7) return '#52c41a'
    if (daysSinceContact <= 30) return '#faad14'
    return '#f5222d'
  }

  // Cultural recommendations for the current contact
  const getContactCulturalTips = useCallback(
    (contact: BusinessContact): string[] => {
      const tips: string[] = []

      if (contact.preferredCommunication === 'whatsapp') {
        tips.push(
          'WhatsApp adalah pilihan komunikasi yang tepat untuk bisnis Indonesia'
        )
      }

      if (contact.gender) {
        tips.push(
          `Gunakan sapaan "${getHonorific(contact.gender, 'business')}" untuk kesopanan`
        )
      }

      const hour = new Date().getHours()
      if (hour >= 11 && hour <= 13 && new Date().getDay() === 5) {
        tips.push(
          'Hindari mengirim pesan saat waktu sholat Jumat (11:30-13:00)'
        )
      }

      if (hour < 8 || hour > 17) {
        tips.push(
          'Pertimbangkan mengirim pesan dalam jam kerja (08:00-17:00 WIB)'
        )
      }

      return tips
    },
    [getHonorific]
  )

  return (
    <div>
      {/* Header */}
      <Row justify='space-between' align='middle' style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <WhatsAppOutlined style={{ fontSize: '24px', color: '#25D366' }} />
            <Title level={3} style={{ margin: 0 }}>
              Indonesian Business Communication
            </Title>
            <Tag color='green'>Bahasa Indonesia Patterns</Tag>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<TranslationOutlined />}
              onClick={() => setCulturalSettings({ visible: true })}
            >
              Cultural Settings
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() =>
                setTemplateEditor({ visible: true, template: null })
              }
            >
              Templates
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Cultural Recommendations */}
      {getCulturalRecommendations().length > 0 && (
        <Alert
          message='Rekomendasi Budaya Indonesia'
          description={
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              {getCulturalRecommendations().map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          }
          type='info'
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Content */}
      <Tabs defaultActiveKey='contacts'>
        <TabPane
          tab={
            <Space>
              <UserOutlined />
              Contacts
              <Badge count={contacts.length} />
            </Space>
          }
          key='contacts'
        >
          <Row gutter={16}>
            <Col span={16}>
              <Card title='Business Contacts'>
                <List
                  dataSource={contacts}
                  renderItem={contact => (
                    <List.Item
                      actions={[
                        <Tooltip
                          title={`Preferred: ${contact.preferredCommunication}`}
                        >
                          {contact.preferredCommunication === 'whatsapp' ? (
                            <WhatsAppOutlined style={{ color: '#25D366' }} />
                          ) : contact.preferredCommunication === 'email' ? (
                            <MailOutlined style={{ color: '#1890ff' }} />
                          ) : (
                            <PhoneOutlined style={{ color: '#fa8c16' }} />
                          )}
                        </Tooltip>,
                        <Button
                          size='small'
                          type='primary'
                          icon={<MessageOutlined />}
                          onClick={() => openMessageComposer(contact)}
                        >
                          Message
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge color={getContactStatusColor(contact)} dot>
                            <Avatar icon={<UserOutlined />} />
                          </Badge>
                        }
                        title={
                          <Space>
                            {contact.name}
                            {contact.title && <Tag>{contact.title}</Tag>}
                            {contact.gender && (
                              <Text type='secondary'>
                                ({getHonorific(contact.gender, 'business')})
                              </Text>
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <div>{contact.company}</div>
                            <Space size='small'>
                              <Text type='secondary'>{contact.phone}</Text>
                              {contact.lastContact && (
                                <Text type='secondary'>
                                  Last contact:{' '}
                                  {formatDateTime(contact.lastContact)}
                                </Text>
                              )}
                            </Space>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title='Cultural Tips'>
                {selectedContact ? (
                  <Space direction='vertical' style={{ width: '100%' }}>
                    <Title level={5}>{selectedContact.name}</Title>
                    {getContactCulturalTips(selectedContact).map(
                      (tip, index) => (
                        <Alert
                          key={index}
                          message={tip}
                          type='info'
                          showIcon={false}
                        />
                      )
                    )}
                  </Space>
                ) : (
                  <Empty
                    description='Pilih kontak untuk melihat tips budaya'
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <MessageOutlined />
              Templates
            </Space>
          }
          key='templates'
        >
          <Row gutter={16}>
            {predefinedTemplates.map(template => (
              <Col span={8} key={template.id} style={{ marginBottom: 16 }}>
                <Card
                  size='small'
                  title={
                    <Space>
                      {template.channel === 'whatsapp' ? (
                        <WhatsAppOutlined style={{ color: '#25D366' }} />
                      ) : (
                        <MailOutlined />
                      )}
                      {template.name}
                    </Space>
                  }
                  extra={
                    template.indonesianEtiquette && (
                      <Tag color='green'>Indonesian</Tag>
                    )
                  }
                  actions={[
                    <Button
                      size='small'
                      onClick={() =>
                        setTemplateEditor({ visible: true, template })
                      }
                    >
                      Edit
                    </Button>,
                    <Button
                      size='small'
                      type='primary'
                      disabled={!messageComposer.contact}
                      onClick={() =>
                        messageComposer.contact &&
                        applyTemplate(template, messageComposer.contact)
                      }
                    >
                      Use
                    </Button>,
                  ]}
                >
                  <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{ fontSize: '12px', marginBottom: 8 }}
                  >
                    {template.template.substring(0, 100)}...
                  </Paragraph>
                  <Space size='small'>
                    <Tag>{template.type}</Tag>
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      Used {template.usageCount} times
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <HistoryOutlined />
              History
              <Badge count={communicationHistory.length} />
            </Space>
          }
          key='history'
        >
          <Card>
            <List
              dataSource={communicationHistory}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      item.channel === 'whatsapp' ? (
                        <WhatsAppOutlined
                          style={{ color: '#25D366', fontSize: '20px' }}
                        />
                      ) : item.channel === 'email' ? (
                        <MailOutlined
                          style={{ color: '#1890ff', fontSize: '20px' }}
                        />
                      ) : (
                        <PhoneOutlined
                          style={{ color: '#fa8c16', fontSize: '20px' }}
                        />
                      )
                    }
                    title={
                      <Space>
                        {item.subject}
                        <Tag
                          color={
                            item.culturalScore >= 80
                              ? 'green'
                              : item.culturalScore >= 60
                                ? 'orange'
                                : 'red'
                          }
                        >
                          Cultural Score: {item.culturalScore}%
                        </Tag>
                        {item.status === 'delivered' && (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Text>{formatDateTime(item.timestamp)}</Text>
                        <br />
                        <Text type='secondary' ellipsis>
                          {item.content.substring(0, 100)}...
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Message Composer Modal */}
      <Modal
        title={`Send Message - ${messageComposer.contact?.name}`}
        open={messageComposer.visible}
        onCancel={() =>
          setMessageComposer(prev => ({ ...prev, visible: false }))
        }
        width={800}
        footer={[
          <Button
            key='cancel'
            onClick={() =>
              setMessageComposer(prev => ({ ...prev, visible: false }))
            }
          >
            Cancel
          </Button>,
          <Button
            key='send'
            type='primary'
            icon={<SendOutlined />}
            onClick={() => {
              if (messageComposer.contact && messageComposer.content) {
                sendCulturalMessage(
                  messageComposer.contact,
                  messageComposer.content,
                  messageComposer.channel,
                  messageComposer.scheduledTime || undefined
                )
                setMessageComposer(prev => ({ ...prev, visible: false }))
              }
            }}
          >
            Send Message
          </Button>,
        ]}
      >
        {messageComposer.contact && (
          <Space direction='vertical' style={{ width: '100%' }} size='large'>
            {/* Cultural Tips for Current Contact */}
            <Alert
              message='Cultural Communication Tips'
              description={
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {getContactCulturalTips(messageComposer.contact).map(
                    (tip, index) => (
                      <li key={index}>{tip}</li>
                    )
                  )}
                </ul>
              }
              type='info'
              showIcon
            />

            {/* Message Options */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label='Message Type'>
                  <Select
                    value={messageComposer.type}
                    onChange={value =>
                      setMessageComposer(prev => ({ ...prev, type: value }))
                    }
                  >
                    <Option value='quotation'>Quotation</Option>
                    <Option value='invoice'>Invoice</Option>
                    <Option value='reminder'>Payment Reminder</Option>
                    <Option value='follow-up'>Follow Up</Option>
                    <Option value='custom'>Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='Channel'>
                  <Select
                    value={messageComposer.channel}
                    onChange={value =>
                      setMessageComposer(prev => ({ ...prev, channel: value }))
                    }
                  >
                    <Option value='whatsapp'>
                      <WhatsAppOutlined /> WhatsApp
                    </Option>
                    <Option value='email'>
                      <MailOutlined /> Email
                    </Option>
                    <Option value='sms'>
                      <MessageOutlined /> SMS
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='Schedule'>
                  <DatePicker
                    showTime
                    value={messageComposer.scheduledTime || undefined}
                    onChange={value =>
                      setMessageComposer(prev => ({
                        ...prev,
                        scheduledTime: value || null,
                      }))
                    }
                    placeholder='Send now'
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Template Quick Actions */}
            <Row gutter={8}>
              {predefinedTemplates
                .filter(t => t.channel === messageComposer.channel)
                .map(template => (
                  <Col key={template.id}>
                    <Button
                      size='small'
                      onClick={() =>
                        applyTemplate(template, messageComposer.contact!)
                      }
                    >
                      {template.name}
                    </Button>
                  </Col>
                ))}
            </Row>

            {/* Message Content */}
            <Form.Item label='Message Content'>
              <TextArea
                ref={composerRef}
                value={messageComposer.content}
                onChange={e =>
                  setMessageComposer(prev => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                rows={12}
                placeholder='Type your message here...'
              />
            </Form.Item>

            {/* Cultural Score Preview */}
            {messageComposer.content && (
              <Alert
                message={`Cultural Appropriateness Score: ${calculateCulturalScore(messageComposer.content, messageComposer.contact)}%`}
                type={
                  calculateCulturalScore(
                    messageComposer.content,
                    messageComposer.contact
                  ) >= 70
                    ? 'success'
                    : 'warning'
                }
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>

      {/* Cultural Settings Modal */}
      <Modal
        title='Indonesian Cultural Settings'
        open={culturalSettings.visible}
        onCancel={() => setCulturalSettings({ visible: false })}
        width={600}
        footer={[
          <Button
            key='close'
            onClick={() => setCulturalSettings({ visible: false })}
          >
            Close
          </Button>,
        ]}
      >
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          <Alert
            message='Cultural Preferences'
            description='Configure Indonesian business communication patterns and cultural adaptations'
            type='info'
            showIcon
          />

          <Form layout='vertical'>
            <Form.Item label='Language Formality'>
              <Select defaultValue={preferences.languageFormality}>
                <Option value='formal'>
                  Formal (Recommended for business)
                </Option>
                <Option value='informal'>Informal</Option>
                <Option value='mixed'>Mixed</Option>
              </Select>
            </Form.Item>

            <Form.Item label='Communication Style'>
              <Select defaultValue={preferences.communicationStyle}>
                <Option value='hierarchical'>
                  Hierarchical (Indonesian traditional)
                </Option>
                <Option value='direct'>Direct</Option>
                <Option value='indirect'>Indirect</Option>
              </Select>
            </Form.Item>

            <Form.Item label='WhatsApp Integration Level'>
              <Select defaultValue={preferences.whatsappIntegrationLevel}>
                <Option value='full'>Full (Recommended for Indonesia)</Option>
                <Option value='enhanced'>Enhanced</Option>
                <Option value='basic'>Basic</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Switch defaultChecked={preferences.useHonorificTitles} />
                <Text>Use Indonesian honorific titles (Bapak/Ibu)</Text>
              </Space>
            </Form.Item>

            <Form.Item>
              <Space>
                <Switch
                  defaultChecked={preferences.bahasaIndonesiaCompliance}
                />
                <Text>Enforce Bahasa Indonesia compliance</Text>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </div>
  )
}

export default IndonesianBusinessCommunication
