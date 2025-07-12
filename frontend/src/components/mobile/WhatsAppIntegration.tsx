// WhatsAppIntegration Component - Indonesian Business Management System
// WhatsApp Business integration optimized for Indonesian business communication patterns

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Modal, 
  Card, 
  Space, 
  Typography, 
  Button, 
  Input, 
  Select, 
  List, 
  Avatar, 
  Tag, 
  Divider,
  Alert,
  Row,
  Col,
  message,
  Tabs,
  Form,
  Radio,
  Switch
} from 'antd'
import {
  WhatsAppOutlined,
  MessageOutlined,
  SendOutlined,
  PhoneOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CopyOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIDR, formatDateIndonesian } from '../../utils/currency'

const { Text, Paragraph, Title } = Typography
const { TextArea } = Input
const { Option } = Select
const { TabPane } = Tabs

export interface WhatsAppContact {
  id: string
  name: string
  phone: string
  company?: string
  lastMessageDate?: Date
  messageCount?: number
  isBlocked?: boolean
  tags?: string[]
  preferredLanguage?: 'id' | 'en'
}

export interface WhatsAppTemplate {
  id: string
  name: string
  category: 'quotation' | 'invoice' | 'reminder' | 'thank_you' | 'follow_up' | 'materai' | 'payment'
  title: string
  message: string
  variables?: string[]
  indonesianBusinessContext: boolean
  useBusinessEtiquette: boolean
}

export interface WhatsAppMessage {
  id: string
  contactId: string
  message: string
  timestamp: Date
  direction: 'outbound' | 'inbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  templateId?: string
  businessContext?: {
    entityType: 'quotation' | 'invoice' | 'project'
    entityId: string
    amount?: number
  }
}

export interface WhatsAppIntegrationProps {
  visible: boolean
  onClose: () => void
  
  // Contact management
  contacts: WhatsAppContact[]
  selectedContact?: WhatsAppContact
  onContactSelect?: (contact: WhatsAppContact) => void
  
  // Business context
  businessEntity?: {
    type: 'quotation' | 'invoice' | 'project'
    id: string
    title: string
    amount?: number
    client?: {
      name: string
      phone?: string
    }
  }
  
  // Templates and messages
  templates?: WhatsAppTemplate[]
  recentMessages?: WhatsAppMessage[]
  
  // Configuration
  businessNumber?: string
  enableBusinessEtiquette?: boolean
  autoDetectLanguage?: boolean
  enableMateraiReminders?: boolean
  
  // Event handlers
  onSendMessage?: (contact: WhatsAppContact, message: string, template?: WhatsAppTemplate) => void
  onSaveTemplate?: (template: Omit<WhatsAppTemplate, 'id'>) => void
  onContactUpdate?: (contact: WhatsAppContact) => void
}

const WhatsAppIntegration: React.FC<WhatsAppIntegrationProps> = ({
  visible,
  onClose,
  contacts = [],
  selectedContact,
  onContactSelect,
  businessEntity,
  templates = [],
  recentMessages = [],
  businessNumber = '+62812345678',
  enableBusinessEtiquette = true,
  autoDetectLanguage = true,
  enableMateraiReminders = true,
  onSendMessage,
  onSaveTemplate,
  onContactUpdate
}) => {
  const { t } = useTranslation()
  
  // State management
  const [activeTab, setActiveTab] = useState('send')
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [newTemplateVisible, setNewTemplateVisible] = useState(false)
  const [businessEtiquetteEnabled, setBusinessEtiquetteEnabled] = useState(enableBusinessEtiquette)
  
  // Form instance for new template
  const [form] = Form.useForm()
  
  // Default Indonesian business templates
  const defaultIndonesianTemplates: WhatsAppTemplate[] = useMemo(() => [
    {
      id: 'quotation_send',
      name: 'Kirim Quotation',
      category: 'quotation',
      title: 'Quotation Baru',
      message: `Selamat ${new Date().getHours() < 12 ? 'pagi' : new Date().getHours() < 15 ? 'siang' : new Date().getHours() < 18 ? 'sore' : 'malam'} Bapak/Ibu {{client_name}},\n\nKami telah menyiapkan quotation untuk {{project_title}} dengan nilai {{amount}}.\n\nMohon untuk direview dan kami tunggu konfirmasinya.\n\nTerima kasih atas kepercayaannya.\n\nHormat kami,\n{{company_name}}`,
      variables: ['client_name', 'project_title', 'amount', 'company_name'],
      indonesianBusinessContext: true,
      useBusinessEtiquette: true
    },
    {
      id: 'invoice_send',
      name: 'Kirim Invoice',
      category: 'invoice',
      title: 'Invoice Pembayaran',
      message: `Yth. Bapak/Ibu {{client_name}},\n\nTerlampir invoice untuk {{project_title}} dengan rincian:\n- Nilai: {{amount}}\n- Jatuh tempo: {{due_date}}\n{{materai_info}}\n\nMohon untuk proses pembayaran sesuai tanggal jatuh tempo.\n\nTerima kasih.\n\nHormat kami,\n{{company_name}}`,
      variables: ['client_name', 'project_title', 'amount', 'due_date', 'materai_info', 'company_name'],
      indonesianBusinessContext: true,
      useBusinessEtiquette: true
    },
    {
      id: 'payment_reminder',
      name: 'Reminder Pembayaran',
      category: 'reminder',
      title: 'Reminder Pembayaran',
      message: `Yth. Bapak/Ibu {{client_name}},\n\nMohon maaf mengingatkan untuk pembayaran invoice {{invoice_number}} dengan nilai {{amount}} yang jatuh tempo pada {{due_date}}.\n\nKami tunggu konfirmasi pembayarannya.\n\nTerima kasih atas perhatiannya.\n\nHormat kami,\n{{company_name}}`,
      variables: ['client_name', 'invoice_number', 'amount', 'due_date', 'company_name'],
      indonesianBusinessContext: true,
      useBusinessEtiquette: true
    },
    {
      id: 'materai_reminder',
      name: 'Reminder Materai',
      category: 'materai',
      title: 'Informasi Materai',
      message: `Yth. Bapak/Ibu {{client_name}},\n\nUntuk transaksi dengan nilai {{amount}}, diperlukan materai sebesar {{materai_amount}} sesuai ketentuan yang berlaku.\n\nMohon untuk diperhatikan saat penandatanganan dokumen.\n\nTerima kasih.\n\n{{company_name}}`,
      variables: ['client_name', 'amount', 'materai_amount', 'company_name'],
      indonesianBusinessContext: true,
      useBusinessEtiquette: true
    },
    {
      id: 'thank_you',
      name: 'Terima Kasih',
      category: 'thank_you',
      title: 'Terima Kasih',
      message: `Terima kasih Bapak/Ibu {{client_name}} atas pembayaran invoice {{invoice_number}}.\n\nPembayaran telah kami terima dengan baik.\n\nKami senang dapat bekerja sama dengan Bapak/Ibu.\n\nSalam,\n{{company_name}}`,
      variables: ['client_name', 'invoice_number', 'company_name'],
      indonesianBusinessContext: true,
      useBusinessEtiquette: true
    }
  ], [])
  
  const allTemplates = [...defaultIndonesianTemplates, ...templates]
  
  // Process template variables
  const processTemplate = useCallback((template: WhatsAppTemplate, contact: WhatsAppContact) => {
    let processedMessage = template.message
    
    // Replace common variables
    processedMessage = processedMessage.replace(/\{\{client_name\}\}/g, contact.name)
    processedMessage = processedMessage.replace(/\{\{company_name\}\}/g, contact.company || contact.name)
    
    // Replace business entity specific variables
    if (businessEntity) {
      processedMessage = processedMessage.replace(/\{\{project_title\}\}/g, businessEntity.title)
      processedMessage = processedMessage.replace(/\{\{invoice_number\}\}/g, businessEntity.id)
      
      if (businessEntity.amount) {
        processedMessage = processedMessage.replace(/\{\{amount\}\}/g, formatIDR(businessEntity.amount))
        
        // Materai calculation
        if (businessEntity.amount >= 5000000) {
          const materaiAmount = businessEntity.amount >= 1000000000 ? 20000 : 10000
          processedMessage = processedMessage.replace(/\{\{materai_amount\}\}/g, formatIDR(materaiAmount))
          processedMessage = processedMessage.replace(/\{\{materai_info\}\}/g, 
            `- Materai: ${formatIDR(materaiAmount)} (wajib untuk transaksi ≥ Rp 5 juta)`)
        } else {
          processedMessage = processedMessage.replace(/\{\{materai_info\}\}/g, '')
        }
      }
      
      // Date formatting
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30) // 30 days from now
      processedMessage = processedMessage.replace(/\{\{due_date\}\}/g, formatDateIndonesian(dueDate))
    }
    
    return processedMessage
  }, [businessEntity])
  
  // Send WhatsApp message
  const handleSendMessage = useCallback((message: string, template?: WhatsAppTemplate) => {
    if (!selectedContact) {
      message.error('Pilih kontak terlebih dahulu')
      return
    }
    
    // Format phone number for WhatsApp
    let phoneNumber = selectedContact.phone.replace(/[^\d]/g, '')
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '62' + phoneNumber.substring(1)
    } else if (!phoneNumber.startsWith('62')) {
      phoneNumber = '62' + phoneNumber
    }
    
    // Add business etiquette if enabled
    let finalMessage = message
    if (businessEtiquetteEnabled && template?.useBusinessEtiquette) {
      const greeting = getIndonesianTimeGreeting()
      if (!finalMessage.toLowerCase().includes('selamat')) {
        finalMessage = `${greeting} Bapak/Ibu ${selectedContact.name},\n\n${finalMessage}`
      }
    }
    
    // Send message via WhatsApp Web
    const encodedMessage = encodeURIComponent(finalMessage)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
    
    // Call callback
    onSendMessage?.(selectedContact, finalMessage, template)
    
    // Show success message
    message.success(`Pesan berhasil dikirim ke ${selectedContact.name}`)
    
    // Clear custom message
    setCustomMessage('')
  }, [selectedContact, businessEtiquetteEnabled, onSendMessage])
  
  // Get Indonesian time-appropriate greeting
  const getIndonesianTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat pagi'
    if (hour < 15) return 'Selamat siang'
    if (hour < 18) return 'Selamat sore'
    return 'Selamat malam'
  }
  
  // Copy message to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Pesan disalin ke clipboard')
    })
  }
  
  // Create new template
  const handleCreateTemplate = (values: any) => {
    const newTemplate: Omit<WhatsAppTemplate, 'id'> = {
      name: values.name,
      category: values.category,
      title: values.title,
      message: values.message,
      variables: [],
      indonesianBusinessContext: values.indonesianBusinessContext,
      useBusinessEtiquette: values.useBusinessEtiquette
    }
    
    onSaveTemplate?.(newTemplate)
    setNewTemplateVisible(false)
    form.resetFields()
    message.success('Template berhasil disimpan')
  }
  
  return (
    <Modal
      title={
        <Space>
          <WhatsAppOutlined style={{ color: '#25d366' }} />
          <Text strong>WhatsApp Business - Indonesia</Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      bodyStyle={{ padding: 0 }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ height: '600px' }}>
        {/* Send Message Tab */}
        <TabPane 
          tab={
            <Space>
              <SendOutlined />
              Kirim Pesan
            </Space>
          } 
          key="send"
        >
          <div style={{ padding: '20px' }}>
            <Row gutter={24}>
              {/* Contact Selection */}
              <Col span={12}>
                <Card size="small" title="Pilih Kontak">
                  <List
                    size="small"
                    dataSource={contacts}
                    renderItem={(contact) => (
                      <List.Item
                        onClick={() => onContactSelect?.(contact)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedContact?.id === contact.id ? '#e6f7ff' : 'transparent',
                          borderRadius: '4px',
                          padding: '8px',
                          margin: '4px 0'
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={
                            <Space>
                              {contact.name}
                              {contact.preferredLanguage === 'id' && (
                                <Tag size="small" color="blue">ID</Tag>
                              )}
                            </Space>
                          }
                          description={
                            <div>
                              <Text type="secondary">{contact.phone}</Text>
                              {contact.company && (
                                <>
                                  <br />
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {contact.company}
                                  </Text>
                                </>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              
              {/* Message Composition */}
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {/* Business Context */}
                  {businessEntity && (
                    <Alert
                      message="Konteks Bisnis"
                      description={
                        <div>
                          <Text strong>{businessEntity.title}</Text>
                          <br />
                          <Text type="secondary">{businessEntity.type} • {businessEntity.id}</Text>
                          {businessEntity.amount && (
                            <>
                              <br />
                              <Text>Nilai: {formatIDR(businessEntity.amount)}</Text>
                            </>
                          )}
                        </div>
                      }
                      type="info"
                      showIcon
                    />
                  )}
                  
                  {/* Template Selection */}
                  <Card size="small" title="Template Pesan">
                    <Select
                      placeholder="Pilih template atau tulis custom"
                      style={{ width: '100%' }}
                      allowClear
                      value={selectedTemplate?.id}
                      onChange={(value) => {
                        const template = allTemplates.find(t => t.id === value)
                        setSelectedTemplate(template || null)
                        if (template && selectedContact) {
                          setCustomMessage(processTemplate(template, selectedContact))
                        }
                      }}
                    >
                      {allTemplates.map(template => (
                        <Option key={template.id} value={template.id}>
                          <Space>
                            {template.category === 'quotation' && <FileTextOutlined />}
                            {template.category === 'invoice' && <DollarOutlined />}
                            {template.category === 'reminder' && <ClockCircleOutlined />}
                            {template.category === 'thank_you' && <CheckCircleOutlined />}
                            {template.category === 'materai' && <FileTextOutlined />}
                            {template.name}
                            {template.indonesianBusinessContext && (
                              <Tag size="small" color="green">ID Bisnis</Tag>
                            )}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Card>
                  
                  {/* Message Composition */}
                  <Card size="small" title="Pesan">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <TextArea
                        rows={8}
                        placeholder="Tulis pesan WhatsApp..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                      />
                      
                      <Row justify="space-between">
                        <Col>
                          <Space>
                            <Switch
                              checked={businessEtiquetteEnabled}
                              onChange={setBusinessEtiquetteEnabled}
                              size="small"
                            />
                            <Text style={{ fontSize: '12px' }}>Etika Bisnis Indonesia</Text>
                          </Space>
                        </Col>
                        <Col>
                          <Space>
                            <Button
                              icon={<CopyOutlined />}
                              onClick={() => copyToClipboard(customMessage)}
                              disabled={!customMessage}
                            >
                              Copy
                            </Button>
                            <Button
                              type="primary"
                              icon={<WhatsAppOutlined />}
                              onClick={() => handleSendMessage(customMessage, selectedTemplate || undefined)}
                              disabled={!selectedContact || !customMessage}
                              style={{ backgroundColor: '#25d366', borderColor: '#25d366' }}
                            >
                              Kirim WhatsApp
                            </Button>
                          </Space>
                        </Col>
                      </Row>
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>
          </div>
        </TabPane>
        
        {/* Templates Tab */}
        <TabPane 
          tab={
            <Space>
              <MessageOutlined />
              Template
            </Space>
          } 
          key="templates"
        >
          <div style={{ padding: '20px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row justify="space-between">
                <Col>
                  <Title level={5}>Template Pesan Bisnis Indonesia</Title>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    onClick={() => setNewTemplateVisible(true)}
                  >
                    Buat Template Baru
                  </Button>
                </Col>
              </Row>
              
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 2 }}
                dataSource={allTemplates}
                renderItem={(template) => (
                  <List.Item>
                    <Card
                      size="small"
                      title={
                        <Space>
                          {template.category === 'quotation' && <FileTextOutlined />}
                          {template.category === 'invoice' && <DollarOutlined />}
                          {template.category === 'reminder' && <ClockCircleOutlined />}
                          {template.category === 'thank_you' && <CheckCircleOutlined />}
                          {template.category === 'materai' && <FileTextOutlined />}
                          {template.name}
                        </Space>
                      }
                      extra={
                        <Space>
                          {template.indonesianBusinessContext && (
                            <Tag size="small" color="green">ID Bisnis</Tag>
                          )}
                          {template.useBusinessEtiquette && (
                            <Tag size="small" color="blue">Etika</Tag>
                          )}
                        </Space>
                      }
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setActiveTab('send')
                            if (selectedContact) {
                              setCustomMessage(processTemplate(template, selectedContact))
                            }
                          }}
                        >
                          Gunakan
                        </Button>
                      ]}
                    >
                      <Paragraph
                        ellipsis={{ rows: 3, expandable: true }}
                        style={{ fontSize: '12px' }}
                      >
                        {template.message}
                      </Paragraph>
                    </Card>
                  </List.Item>
                )}
              />
            </Space>
          </div>
        </TabPane>
        
        {/* Recent Messages Tab */}
        <TabPane 
          tab={
            <Space>
              <ClockCircleOutlined />
              Riwayat
            </Space>
          } 
          key="history"
        >
          <div style={{ padding: '20px' }}>
            <Title level={5}>Pesan Terakhir</Title>
            <List
              dataSource={recentMessages}
              renderItem={(msg) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={msg.direction === 'outbound' ? <SendOutlined /> : <MessageOutlined />}
                        style={{ 
                          backgroundColor: msg.direction === 'outbound' ? '#1890ff' : '#52c41a' 
                        }}
                      />
                    }
                    title={
                      <Space>
                        {contacts.find(c => c.id === msg.contactId)?.name || 'Unknown'}
                        <Tag color={msg.status === 'read' ? 'green' : msg.status === 'sent' ? 'blue' : 'orange'}>
                          {msg.status}
                        </Tag>
                        {msg.businessContext && (
                          <Tag color="purple">
                            {msg.businessContext.entityType} {msg.businessContext.entityId}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                          {msg.message}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {formatDateIndonesian(msg.timestamp)}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </TabPane>
      </Tabs>
      
      {/* New Template Modal */}
      <Modal
        title="Buat Template Baru"
        open={newTemplateVisible}
        onCancel={() => setNewTemplateVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTemplate}
        >
          <Form.Item
            name="name"
            label="Nama Template"
            rules={[{ required: true, message: 'Nama template harus diisi' }]}
          >
            <Input placeholder="Contoh: Reminder Pembayaran Ramah" />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="Kategori"
            rules={[{ required: true, message: 'Kategori harus dipilih' }]}
          >
            <Select placeholder="Pilih kategori">
              <Option value="quotation">Quotation</Option>
              <Option value="invoice">Invoice</Option>
              <Option value="reminder">Reminder</Option>
              <Option value="thank_you">Terima Kasih</Option>
              <Option value="follow_up">Follow Up</Option>
              <Option value="materai">Materai</Option>
              <Option value="payment">Pembayaran</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="title"
            label="Judul Template"
            rules={[{ required: true, message: 'Judul harus diisi' }]}
          >
            <Input placeholder="Judul yang akan ditampilkan" />
          </Form.Item>
          
          <Form.Item
            name="message"
            label="Isi Pesan"
            rules={[{ required: true, message: 'Isi pesan harus diisi' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Gunakan {{client_name}}, {{amount}}, {{company_name}} untuk variabel"
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="indonesianBusinessContext"
                label="Konteks Bisnis Indonesia"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="useBusinessEtiquette"
                label="Gunakan Etika Bisnis"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Modal>
  )
}

export default WhatsAppIntegration