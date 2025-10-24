import React, { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { expenseService } from '../services/expenses';
import { clientService } from '../services/clients';
import { projectService } from '../services/projects';
import type {
  CreateExpenseFormData,
  EFakturStatus,
  ExpenseClass,
  PPNCategory,
  WithholdingTaxType,
} from '../types/expense';
import { useTheme } from '../theme';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

export const ExpenseCreatePage: React.FC = () => {
  const { message } = App.useApp();
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State for auto-calculations
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [isLuxuryGoods, setIsLuxuryGoods] = useState(false);
  const [withholdingType, setWithholdingType] = useState<WithholdingTaxType>('NONE' as WithholdingTaxType);
  const [includePPN, setIncludePPN] = useState(true);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  // Mutation
  const createMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      message.success('Expense berhasil dibuat');
      navigate(`/expenses/${expense.id}`);
    },
    onError: (error: any) => {
      message.error(`Gagal membuat expense: ${error.message}`);
    },
  });

  // Auto-calculate amounts when inputs change
  useEffect(() => {
    if (grossAmount > 0) {
      const amounts = expenseService.calculateExpenseAmounts(
        grossAmount,
        includePPN ? isLuxuryGoods : false,
        withholdingType
      );

      // If PPN is disabled, force ppnAmount to 0 and recalculate total
      const ppnAmount = includePPN ? amounts.ppnAmount : 0;
      const totalAmount = grossAmount + ppnAmount;

      form.setFieldsValue({
        ppnAmount: ppnAmount,
        withholdingAmount: amounts.withholdingAmount,
        netAmount: amounts.netAmount,
        totalAmount: totalAmount,
      });
    }
  }, [grossAmount, isLuxuryGoods, withholdingType, includePPN, form]);

  // Handle category selection (auto-fill fields)
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      form.setFieldsValue({
        accountCode: category.accountCode,
        accountName: category.nameId || category.name,
        expenseClass: category.expenseClass,
        ppnCategory: category.defaultPPNCategory,
        withholdingTaxType: category.withholdingTaxType || 'NONE',
        withholdingTaxRate: category.withholdingTaxRate || 0,
      });

      if (category.withholdingTaxType) {
        setWithholdingType(category.withholdingTaxType);
      }
    }
  };

  const handleSubmit = (values: any) => {
    const expenseData: CreateExpenseFormData = {
      ...values,
      expenseDate: values.expenseDate.toISOString(),
      grossAmount: Number(values.grossAmount),
      ppnAmount: includePPN ? Number(values.ppnAmount) : 0,
      withholdingAmount: values.withholdingAmount ? Number(values.withholdingAmount) : 0,
      netAmount: Number(values.netAmount),
      totalAmount: Number(values.totalAmount),
      ppnRate: includePPN ? (isLuxuryGoods ? 0.12 : 0.11) : 0,
      withholdingTaxRate: values.withholdingTaxRate || 0,
      isLuxuryGoods: includePPN ? isLuxuryGoods : false,
    };

    createMutation.mutate(expenseData);
  };

  const handleSaveAndSubmit = async () => {
    try {
      const values = await form.validateFields();
      const expenseData: CreateExpenseFormData = {
        ...values,
        expenseDate: values.expenseDate.toISOString(),
        grossAmount: Number(values.grossAmount),
        ppnAmount: includePPN ? Number(values.ppnAmount) : 0,
        withholdingAmount: values.withholdingAmount ? Number(values.withholdingAmount) : 0,
        netAmount: Number(values.netAmount),
        totalAmount: Number(values.totalAmount),
        ppnRate: includePPN ? (isLuxuryGoods ? 0.12 : 0.11) : 0,
        withholdingTaxRate: values.withholdingTaxRate || 0,
        isLuxuryGoods: includePPN ? isLuxuryGoods : false,
      };

      // Create and submit in one go
      const expense = await expenseService.createExpense(expenseData);
      await expenseService.submitExpense(expense.id);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      message.success('Expense berhasil dibuat dan diajukan untuk persetujuan');
      navigate(`/expenses/${expense.id}`);
    } catch (error: any) {
      message.error(`Gagal: ${error.message || 'Please complete required fields'}`);
    }
  };

  return (
    <div>
      <div className='mb-6'>
        <Title level={2} style={{ color: theme.colors.text.primary }}>
          Tambah Biaya Baru
        </Title>
        <Text type='secondary'>
          Buat expense baru dengan perhitungan PPN dan PPh otomatis
        </Text>
      </div>

      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{
          expenseDate: dayjs(),
          ppnCategory: 'CREDITABLE',
          eFakturStatus: 'NOT_REQUIRED',
          withholdingTaxType: 'NONE',
          isLuxuryGoods: false,
          isBillable: false,
        }}
        autoComplete='off'
      >
        <Row gutter={[24, 24]}>
          {/* Left Column - Main Info */}
          <Col xs={24} lg={16}>
            {/* Category & Account */}
            <Card
              title={<><FileTextOutlined /> Kategori & Akun</>}
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name='categoryId'
                    label='Kategori Biaya'
                    rules={[{ required: true, message: 'Pilih kategori' }]}
                  >
                    <Select
                      placeholder='Pilih kategori'
                      size='large'
                      onChange={handleCategoryChange}
                      showSearch
                      filterOption={(input, option) =>
                        ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={categories.map(cat => ({
                        value: cat.id,
                        label: `${cat.code} - ${cat.nameId || cat.name}`,
                      }))}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={6}>
                  <Form.Item name='accountCode' label='Kode Akun (PSAK)'>
                    <Input placeholder='6-2020' disabled />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={6}>
                  <Form.Item name='expenseClass' label='Kelas'>
                    <Select disabled>
                      <Option value='SELLING'>Beban Penjualan</Option>
                      <Option value='GENERAL_ADMIN'>Beban Umum</Option>
                      <Option value='OTHER'>Lain-Lain</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item
                    name='description'
                    label='Deskripsi (Indonesia)'
                    rules={[{ required: true, message: 'Masukkan deskripsi' }]}
                  >
                    <TextArea
                      rows={2}
                      placeholder='Contoh: Sewa kantor bulan Januari 2025'
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name='notes' label='Catatan Tambahan'>
                    <TextArea rows={2} placeholder='Catatan internal (opsional)' />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Vendor Information */}
            <Card
              title={<><DollarOutlined /> Informasi Vendor</>}
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name='vendorName'
                    label='Nama Vendor'
                    rules={[{ required: true, message: 'Masukkan nama vendor' }]}
                  >
                    <Input placeholder='PT. Vendor Indonesia' size='large' />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    name='vendorNPWP'
                    label='NPWP Vendor (Opsional)'
                    help='Format: 01.234.567.8-901.000'
                  >
                    <Input placeholder='01.234.567.8-901.000' size='large' />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name='vendorAddress' label='Alamat Vendor (Opsional)'>
                    <TextArea rows={2} placeholder='Alamat lengkap vendor' />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Amount Calculations */}
            <Card
              title={<><DollarOutlined /> Perhitungan Jumlah (Auto-Calculate)</>}
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name='grossAmount'
                    label='Jumlah Bruto (IDR)'
                    rules={[{ required: true, message: 'Masukkan jumlah' }]}
                  >
                    <InputNumber
                      size='large'
                      style={{ width: '100%' }}
                      placeholder='0'
                      formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      parser={value => value?.replace(/Rp\s?|(\.*)/g, '') as any}
                      onChange={val => setGrossAmount(Number(val) || 0)}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='expenseDate' label='Tanggal Biaya' rules={[{ required: true }]}>
                    <DatePicker size='large' style={{ width: '100%' }} format='DD MMM YYYY' />
                  </Form.Item>
                </Col>
              </Row>

              <Card size='small' style={{ marginBottom: '16px' }}>
                <Checkbox
                  checked={includePPN}
                  onChange={(e) => setIncludePPN(e.target.checked)}
                >
                  Include PPN (11%)
                </Checkbox>
              </Card>

              <Alert
                message='Perhitungan PPN & PPh Otomatis'
                description='Nilai PPN, PPh, dan total akan dihitung otomatis berdasarkan jumlah bruto'
                type='info'
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <Row gutter={[16, 16]}>
                {includePPN && (
                  <Col xs={24} sm={8}>
                    <Form.Item name='ppnAmount' label='PPN (Auto)'>
                      <InputNumber
                        size='large'
                        style={{ width: '100%' }}
                        disabled
                        formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      />
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24} sm={8}>
                  <Form.Item name='withholdingAmount' label='PPh Dipotong (Auto)'>
                    <InputNumber
                      size='large'
                      style={{ width: '100%' }}
                      disabled
                      formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item name='totalAmount' label='Total (Auto)'>
                    <InputNumber
                      size='large'
                      style={{ width: '100%' }}
                      disabled
                      formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                {includePPN && (
                  <Col xs={24} sm={8}>
                    <Form.Item name='ppnCategory' label='Kategori PPN'>
                      <Select size='large'>
                        <Option value='CREDITABLE'>Dapat Dikreditkan</Option>
                        <Option value='NON_CREDITABLE'>Tidak Dapat Dikreditkan</Option>
                        <Option value='EXEMPT'>Bebas PPN</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24} sm={includePPN ? 8 : 12}>
                  <Form.Item name='withholdingTaxType' label='Jenis PPh'>
                    <Select
                      size='large'
                      onChange={val => setWithholdingType(val as WithholdingTaxType)}
                    >
                      <Option value='NONE'>Tidak Ada</Option>
                      <Option value='PPH23'>PPh 23 (Jasa)</Option>
                      <Option value='PPH4_2'>PPh 4(2) (Sewa)</Option>
                      <Option value='PPH15'>PPh 15 (Pengiriman)</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {includePPN && (
                  <Col xs={24} sm={8}>
                    <Form.Item name='isLuxuryGoods' label='Barang Mewah?' valuePropName='checked'>
                      <Switch
                        onChange={setIsLuxuryGoods}
                        disabled={!includePPN}
                        checkedChildren='Ya (PPN 12%)'
                        unCheckedChildren='Tidak (PPN 11%)'
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            </Card>

            {/* e-Faktur (Optional) */}
            <Card
              title={<><FileTextOutlined /> e-Faktur (Opsional)</>}
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name='eFakturNSFP'
                    label='Nomor Seri Faktur Pajak (NSFP)'
                    help='Format: 010.123-25.12345678'
                  >
                    <Input placeholder='010.123-25.12345678' />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='eFakturStatus' label='Status e-Faktur'>
                    <Select>
                      <Option value='NOT_REQUIRED'>Tidak Diperlukan</Option>
                      <Option value='REQUIRED'>Diperlukan</Option>
                      <Option value='UPLOADED'>Sudah Upload</Option>
                      <Option value='VALIDATED'>Tervalidasi</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Billable to Project/Client */}
            <Card
              title='Project & Client (Opsional)'
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item name='isBillable' label='Dapat Ditagih?' valuePropName='checked'>
                    <Switch checkedChildren='Ya' unCheckedChildren='Tidak' />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item name='projectId' label='Project'>
                    <Select placeholder='Pilih project' allowClear>
                      {projects.map(p => (
                        <Option key={p.id} value={p.id}>
                          {p.number} - {p.description}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item name='clientId' label='Client'>
                    <Select placeholder='Pilih client' allowClear>
                      {clients.map(c => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Right Column - Summary */}
          <Col xs={24} lg={8}>
            <Card
              title='Ringkasan'
              style={{
                position: 'sticky',
                top: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Space direction='vertical' size='large' style={{ width: '100%' }}>
                <div>
                  <Text type='secondary'>Jumlah Bruto</Text>
                  <Title level={3}>{expenseService.formatIDR(grossAmount)}</Title>
                </div>

                {grossAmount > 0 && (
                  <>
                    {includePPN && (
                      <div>
                        <Text type='secondary'>
                          PPN {isLuxuryGoods ? '12%' : '11% (Efektif)'}
                        </Text>
                        <Title level={4} type='warning'>
                          +{expenseService.formatIDR(form.getFieldValue('ppnAmount') || 0)}
                        </Title>
                      </div>
                    )}

                    {withholdingType !== 'NONE' && (
                      <div>
                        <Text type='secondary'>PPh Dipotong</Text>
                        <Title level={4} type='danger'>
                          -{expenseService.formatIDR(form.getFieldValue('withholdingAmount') || 0)}
                        </Title>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: '16px' }}>
                      <Text type='secondary'>Total Biaya</Text>
                      <Title level={2} style={{ color: theme.colors.text.primary }}>
                        {expenseService.formatIDR(form.getFieldValue('totalAmount') || 0)}
                      </Title>
                    </div>
                  </>
                )}

                <Alert
                  message='Indonesian Tax Compliance'
                  description={
                    <>
                      <div>✓ PPN 12% untuk barang mewah</div>
                      <div>✓ PPN 11% efektif untuk non-mewah</div>
                      <div>✓ PPh dipotong sesuai kategori</div>
                      <div>✓ Format NSFP tervalidasi</div>
                    </>
                  }
                  type='success'
                  showIcon
                />

                <Card
                  style={{
                    textAlign: 'center',
                    background: theme.colors.glass.background,
                  }}
                >
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    <Button
                      block
                      size='large'
                      onClick={() => navigate('/expenses')}
                    >
                      Batal
                    </Button>
                    <Button
                      block
                      type='default'
                      size='large'
                      icon={<SaveOutlined />}
                      htmlType='submit'
                      loading={createMutation.isPending}
                    >
                      Simpan sebagai Draft
                    </Button>
                    <Button
                      block
                      type='primary'
                      size='large'
                      icon={<SendOutlined />}
                      onClick={handleSaveAndSubmit}
                      loading={createMutation.isPending}
                    >
                      Simpan & Ajukan
                    </Button>
                  </Space>
                </Card>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
