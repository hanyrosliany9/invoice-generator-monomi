import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Steps,
  Radio,
  Space,
  Typography,
  Button,
  Form,
  DatePicker,
  InputNumber,
  Input,
  Alert,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../theme';
import AccountSelector from '../../components/accounting/AccountSelector';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type TemplateType = 'PREPAID_EXPENSE' | 'UNEARNED_REVENUE' | 'ACCRUED_REVENUE' | 'ACCRUED_EXPENSE';

interface TemplateConfig {
  type: TemplateType;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  color: string;
  defaultAccounts: {
    account1Code: string;
    account1Type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    account2Code: string;
    account2Type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  };
  journalEntryLogic: {
    account1Label: string;
    account1DebitCredit: 'DEBIT' | 'CREDIT';
    account2Label: string;
    account2DebitCredit: 'DEBIT' | 'CREDIT';
  };
}

const templates: TemplateConfig[] = [
  {
    type: 'PREPAID_EXPENSE',
    title: 'Beban Dibayar Dimuka',
    description: 'Mengakui beban dari pembayaran yang telah dilakukan sebelumnya',
    example: 'Contoh: Asuransi 12 bulan dibayar di muka, sekarang mengakui 1 bulan beban',
    icon: <CalendarOutlined style={{ fontSize: '32px' }} />,
    color: '#1890ff',
    defaultAccounts: {
      account1Code: '1-1510',
      account1Type: 'ASSET',
      account2Code: '',
      account2Type: 'EXPENSE',
    },
    journalEntryLogic: {
      account1Label: 'Beban Dibayar Dimuka (Asset)',
      account1DebitCredit: 'CREDIT',
      account2Label: 'Akun Beban',
      account2DebitCredit: 'DEBIT',
    },
  },
  {
    type: 'UNEARNED_REVENUE',
    title: 'Pendapatan Diterima Dimuka',
    description: 'Mengakui pendapatan dari pembayaran yang telah diterima sebelumnya',
    example: 'Contoh: Langganan tahunan diterima di muka, sekarang mengakui 1 bulan pendapatan',
    icon: <GiftOutlined style={{ fontSize: '32px' }} />,
    color: '#52c41a',
    defaultAccounts: {
      account1Code: '2-2015',
      account1Type: 'LIABILITY',
      account2Code: '',
      account2Type: 'REVENUE',
    },
    journalEntryLogic: {
      account1Label: 'Pendapatan Diterima Dimuka (Liability)',
      account1DebitCredit: 'DEBIT',
      account2Label: 'Akun Pendapatan',
      account2DebitCredit: 'CREDIT',
    },
  },
  {
    type: 'ACCRUED_REVENUE',
    title: 'Pendapatan yang Masih Harus Diterima',
    description: 'Mengakui pendapatan untuk jasa yang telah diberikan tetapi belum ditagih',
    example: 'Contoh: Jasa konsultasi selesai tetapi invoice belum diterbitkan',
    icon: <ClockCircleOutlined style={{ fontSize: '32px' }} />,
    color: '#faad14',
    defaultAccounts: {
      account1Code: '1-2020',
      account1Type: 'ASSET',
      account2Code: '',
      account2Type: 'REVENUE',
    },
    journalEntryLogic: {
      account1Label: 'Pendapatan yang Masih Harus Diterima (Asset)',
      account1DebitCredit: 'DEBIT',
      account2Label: 'Akun Pendapatan',
      account2DebitCredit: 'CREDIT',
    },
  },
  {
    type: 'ACCRUED_EXPENSE',
    title: 'Beban yang Masih Harus Dibayar',
    description: 'Mengakui beban untuk jasa yang telah diterima tetapi belum dibayar',
    example: 'Contoh: Listrik bulan ini sudah digunakan tetapi tagihan belum diterima',
    icon: <WarningOutlined style={{ fontSize: '32px' }} />,
    color: '#f5222d',
    defaultAccounts: {
      account1Code: '',
      account1Type: 'EXPENSE',
      account2Code: '2-1020',
      account2Type: 'LIABILITY',
    },
    journalEntryLogic: {
      account1Label: 'Akun Beban',
      account1DebitCredit: 'DEBIT',
      account2Label: 'Beban yang Masih Harus Dibayar (Liability)',
      account2DebitCredit: 'CREDIT',
    },
  },
];

const AdjustingEntryWizard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);

  const handleTemplateSelect = (type: TemplateType) => {
    setSelectedTemplate(type);
  };

  const handleNext = () => {
    if (currentStep === 0 && !selectedTemplate) {
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleCancel = () => {
    navigate('/accounting/journal-entries');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const template = templates.find((t) => t.type === selectedTemplate);
      if (!template) return;

      // Generate journal entry data
      const description = values.description;
      const amount = values.amount;
      const entryDate = values.entryDate.format('YYYY-MM-DD');

      // Create line items based on template logic
      const lineItems = [
        {
          accountCode: template.journalEntryLogic.account1DebitCredit === 'DEBIT'
            ? values.account1Code
            : values.account2Code,
          descriptionId: `${template.journalEntryLogic.account1DebitCredit === 'DEBIT' ? template.journalEntryLogic.account1Label : template.journalEntryLogic.account2Label}: ${description}`,
          debit: amount,
          credit: 0,
        },
        {
          accountCode: template.journalEntryLogic.account1DebitCredit === 'CREDIT'
            ? values.account1Code
            : values.account2Code,
          descriptionId: `${template.journalEntryLogic.account1DebitCredit === 'CREDIT' ? template.journalEntryLogic.account1Label : template.journalEntryLogic.account2Label}: ${description}`,
          debit: 0,
          credit: amount,
        },
      ];

      // Navigate to manual form with pre-filled data
      navigate('/accounting/journal-entries/create', {
        state: {
          prefilled: {
            entryDate: dayjs(entryDate),
            transactionType: 'ADJUSTMENT',
            descriptionId: `Penyesuaian ${template.title}: ${description}`,
            description: `Adjusting Entry - ${template.title}: ${description}`,
            lineItems,
          },
        },
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const selectedTemplateConfig = templates.find((t) => t.type === selectedTemplate);

  const steps = [
    {
      title: 'Pilih Tipe',
      description: 'Pilih tipe jurnal penyesuaian',
    },
    {
      title: 'Isi Data',
      description: 'Masukkan detail transaksi',
    },
    {
      title: 'Review',
      description: 'Periksa dan buat entry',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          style={{ marginBottom: '8px' }}
        >
          Kembali
        </Button>
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
          Wizard Jurnal Penyesuaian
        </Title>
        <Text type="secondary">
          Panduan langkah demi langkah untuk membuat ayat jurnal penyesuaian (adjusting entries)
        </Text>
      </div>

      {/* Steps */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <Card
          title="Pilih Tipe Jurnal Penyesuaian"
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Alert
            message="Apa itu Jurnal Penyesuaian?"
            description="Jurnal penyesuaian adalah ayat jurnal yang dibuat pada akhir periode akuntansi untuk memastikan pendapatan dan beban dicatat di periode yang tepat sesuai prinsip akrual."
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Radio.Group
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {templates.map((template) => (
                <Card
                  key={template.type}
                  hoverable
                  onClick={() => handleTemplateSelect(template.type)}
                  style={{
                    borderColor:
                      selectedTemplate === template.type
                        ? template.color
                        : theme.colors.border.default,
                    borderWidth: selectedTemplate === template.type ? '2px' : '1px',
                  }}
                >
                  <Radio value={template.type} style={{ marginBottom: '12px' }}>
                    <Space align="start">
                      <div style={{ color: template.color }}>{template.icon}</div>
                      <div>
                        <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>
                          {template.title}
                        </Title>
                        <Paragraph style={{ margin: '8px 0', color: theme.colors.text.secondary }}>
                          {template.description}
                        </Paragraph>
                        <Text type="secondary" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                          {template.example}
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                </Card>
              ))}
            </Space>
          </Radio.Group>
        </Card>
      )}

      {currentStep === 1 && selectedTemplateConfig && (
        <Card
          title={`Detail: ${selectedTemplateConfig.title}`}
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Form form={form} layout="vertical">
            <Alert
              message={selectedTemplateConfig.description}
              description={selectedTemplateConfig.example}
              type="info"
              showIcon
              icon={selectedTemplateConfig.icon}
              style={{ marginBottom: '24px' }}
            />

            <Form.Item
              label="Tanggal Penyesuaian"
              name="entryDate"
              rules={[{ required: true, message: 'Tanggal harus diisi' }]}
              initialValue={dayjs()}
            >
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                placeholder="Pilih tanggal"
              />
            </Form.Item>

            <Form.Item
              label="Deskripsi"
              name="description"
              rules={[
                { required: true, message: 'Deskripsi harus diisi' },
                { min: 10, message: 'Deskripsi minimal 10 karakter' },
              ]}
            >
              <TextArea
                rows={3}
                placeholder={`Contoh: ${selectedTemplateConfig.example.replace('Contoh: ', '')}`}
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item
              label="Jumlah"
              name="amount"
              rules={[
                { required: true, message: 'Jumlah harus diisi' },
                { type: 'number', min: 0.01, message: 'Jumlah harus lebih dari 0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/Rp\s?|(,*)/g, '') as any}
                precision={2}
                placeholder="Masukkan jumlah"
                prefix={<DollarOutlined />}
              />
            </Form.Item>

            <Divider>Akun-akun yang Terlibat</Divider>

            <Form.Item
              label={selectedTemplateConfig.journalEntryLogic.account1Label}
              name="account1Code"
              rules={[{ required: true, message: 'Akun harus dipilih' }]}
              initialValue={selectedTemplateConfig.defaultAccounts.account1Code}
            >
              <AccountSelector
                accountType={selectedTemplateConfig.defaultAccounts.account1Type}
                placeholder="Pilih akun..."
              />
            </Form.Item>

            <Form.Item
              label={selectedTemplateConfig.journalEntryLogic.account2Label}
              name="account2Code"
              rules={[{ required: true, message: 'Akun harus dipilih' }]}
              initialValue={selectedTemplateConfig.defaultAccounts.account2Code}
            >
              <AccountSelector
                accountType={selectedTemplateConfig.defaultAccounts.account2Type}
                placeholder="Pilih akun..."
              />
            </Form.Item>
          </Form>
        </Card>
      )}

      {currentStep === 2 && selectedTemplateConfig && (
        <Card
          title="Review Jurnal Penyesuaian"
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Alert
            message="Siap untuk Membuat Entry"
            description="Periksa kembali detail di bawah ini. Setelah klik 'Buat Entry', Anda akan diarahkan ke form manual dengan data yang sudah terisi."
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          {(() => {
            const values = form.getFieldsValue();
            const amount = values.amount || 0;
            const description = values.description || '';
            const entryDate = values.entryDate ? values.entryDate.format('DD/MM/YYYY') : '';

            return (
              <div>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Tipe: </Text>
                    <Text>{selectedTemplateConfig.title}</Text>
                  </div>
                  <div>
                    <Text strong>Tanggal: </Text>
                    <Text>{entryDate}</Text>
                  </div>
                  <div>
                    <Text strong>Deskripsi: </Text>
                    <Text>{description}</Text>
                  </div>
                  <div>
                    <Text strong>Jumlah: </Text>
                    <Text style={{ fontSize: '18px', color: theme.colors.accent.primary }}>
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(amount)}
                    </Text>
                  </div>

                  <Divider />

                  <div>
                    <Title level={5} style={{ color: theme.colors.text.primary }}>
                      Jurnal Entry yang Akan Dibuat:
                    </Title>
                    <Card size="small" style={{ marginTop: '12px' }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>
                            {selectedTemplateConfig.journalEntryLogic.account1DebitCredit === 'DEBIT'
                              ? selectedTemplateConfig.journalEntryLogic.account1Label
                              : selectedTemplateConfig.journalEntryLogic.account2Label}
                          </Text>
                          <Space>
                            <Text strong style={{ color: theme.colors.status.info }}>
                              Debit
                            </Text>
                            <Text strong>
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                              }).format(amount)}
                            </Text>
                          </Space>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>
                            {selectedTemplateConfig.journalEntryLogic.account1DebitCredit === 'CREDIT'
                              ? selectedTemplateConfig.journalEntryLogic.account1Label
                              : selectedTemplateConfig.journalEntryLogic.account2Label}
                          </Text>
                          <Space>
                            <Text strong style={{ color: theme.colors.status.success }}>
                              Kredit
                            </Text>
                            <Text strong>
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                              }).format(amount)}
                            </Text>
                          </Space>
                        </div>
                      </Space>
                    </Card>
                  </div>
                </Space>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Actions */}
      <Card
        style={{
          marginTop: '24px',
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        <Space>
          {currentStep > 0 && (
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Kembali
            </Button>
          )}
          <Button onClick={handleCancel}>Batal</Button>
          {currentStep < 2 && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={handleNext}
              disabled={currentStep === 0 && !selectedTemplate}
            >
              Lanjut
            </Button>
          )}
          {currentStep === 2 && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit}>
              Buat Entry
            </Button>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default AdjustingEntryWizard;
