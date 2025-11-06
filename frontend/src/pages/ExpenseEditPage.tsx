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
  Spin,
  Switch,
  Typography,
} from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { expenseService } from '../services/expenses';
import { VendorSelect } from '../components/vendors';
import type {
  UpdateExpenseFormData,
  WithholdingTaxType,
} from '../types/expense';
import type { Vendor } from '../types/vendor';
import { useTheme } from '../theme';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

export const ExpenseEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const [selectedVendor, setSelectedVendor] = useState<Vendor | undefined>(undefined);

  // Fetch expense
  const {
    data: expense,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => expenseService.getExpense(id!),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  // Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateExpenseFormData) => expenseService.updateExpense(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      message.success('Expense berhasil diupdate');
      navigate(`/expenses/${id}`);
    },
    onError: (error) => {
      message.error(`Gagal update expense: ${error.message}`);
    },
  });

  // Pre-fill form when expense data is loaded
  useEffect(() => {
    if (expense) {
      // Check if expense can be edited
      if (!expenseService.canEdit(expense)) {
        message.error('Hanya expense dengan status DRAFT yang dapat diedit');
        navigate(`/expenses/${id}`);
        return;
      }

      form.setFieldsValue({
        ...expense,
        expenseDate: dayjs(expense.expenseDate),
        grossAmount: parseFloat(expense.grossAmount),
        ppnAmount: parseFloat(expense.ppnAmount),
        withholdingAmount: expense.withholdingAmount ? parseFloat(expense.withholdingAmount) : 0,
        netAmount: parseFloat(expense.netAmount),
        totalAmount: parseFloat(expense.totalAmount),
      });

      setGrossAmount(parseFloat(expense.grossAmount));
      setIsLuxuryGoods(expense.isLuxuryGoods);
      setWithholdingType((expense.withholdingTaxType || 'NONE') as WithholdingTaxType);
    }
  }, [expense, form, id, navigate, message]);

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

  const handleSubmit = (values: Record<string, any>) => {
    const expenseData: UpdateExpenseFormData = {
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

    updateMutation.mutate(expenseData);
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <Spin size='large' />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <Alert
        message='Error'
        description={(error as Error)?.message || 'Expense not found'}
        type='error'
        showIcon
      />
    );
  }

  return (
    <div>
      <div className='mb-6'>
        <Title level={2} style={{ color: theme.colors.text.primary }}>
          Edit Biaya: {expense.expenseNumber}
        </Title>
        <Text type='secondary'>
          Update expense dengan perhitungan PPN dan PPh otomatis
        </Text>
      </div>

      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        autoComplete='off'
      >
        <Row gutter={[24, 24]}>
          {/* Main Form */}
          <Col xs={24} lg={16}>
            {/* Category */}
            <Card
              title='Kategori & Akun'
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
                    label='Kategori'
                    rules={[{ required: true }]}
                  >
                    <Select placeholder='Pilih kategori' size='large'>
                      {categories.map(cat => (
                        <Option key={cat.id} value={cat.id}>
                          {cat.code} - {cat.nameId || cat.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='accountCode' label='Kode Akun'>
                    <Input disabled />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name='description' label='Deskripsi' rules={[{ required: true }]}>
                    <TextArea rows={2} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Vendor */}
            <Card
              title='Vendor'
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item
                    label='Pilih Vendor dari Master Data'
                    help='Pilih vendor dari daftar vendor yang sudah terdaftar.'
                  >
                    <VendorSelect
                      value={selectedVendor?.id}
                      onChange={(vendorId, vendor) => {
                        setSelectedVendor(vendor);
                        // Auto-fill vendor details from master data
                        if (vendor) {
                          form.setFieldsValue({
                            vendorName: vendor.name,
                            vendorNPWP: vendor.npwp,
                          });
                        }
                      }}
                      onlyActive={true}
                      placeholder='Cari vendor...'
                      allowClear
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='vendorName' label='Nama Vendor' rules={[{ required: true }]}>
                    <Input size='large' />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='vendorNPWP' label='NPWP Vendor'>
                    <Input size='large' />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Amounts */}
            <Card
              title='Perhitungan Jumlah'
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name='grossAmount' label='Jumlah Bruto' rules={[{ required: true }]}>
                    <InputNumber
                      size='large'
                      style={{ width: '100%' }}
                      formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      parser={value => value?.replace(/Rp\s?|(\.*)/g, '') as any}
                      onChange={val => setGrossAmount(Number(val) || 0)}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name='expenseDate' label='Tanggal' rules={[{ required: true }]}>
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
                  <Form.Item name='withholdingAmount' label='PPh (Auto)'>
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

                <Col xs={24} sm={includePPN ? 12 : 24}>
                  <Form.Item name='withholdingTaxType' label='Jenis PPh'>
                    <Select
                      size='large'
                      onChange={val => setWithholdingType(val as WithholdingTaxType)}
                    >
                      <Option value='NONE'>Tidak Ada</Option>
                      <Option value='PPH23'>PPh 23</Option>
                      <Option value='PPH4_2'>PPh 4(2)</Option>
                      <Option value='PPH15'>PPh 15</Option>
                    </Select>
                  </Form.Item>
                </Col>

                {includePPN && (
                  <Col xs={24} sm={12}>
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
          </Col>

          {/* Summary Sidebar */}
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
                  <Text type='secondary'>Total Biaya</Text>
                  <Title level={2}>{expenseService.formatIDR(form.getFieldValue('totalAmount') || 0)}</Title>
                </div>

                <Alert
                  message='Status: DRAFT'
                  description='Expense ini masih dalam status draft dan dapat diedit'
                  type='info'
                  showIcon
                />

                <Card style={{ textAlign: 'center' }}>
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    <Button block size='large' onClick={() => navigate(`/expenses/${id}`)}>
                      Batal
                    </Button>
                    <Button
                      block
                      type='primary'
                      size='large'
                      icon={<SaveOutlined />}
                      htmlType='submit'
                      loading={updateMutation.isPending}
                    >
                      Simpan Perubahan
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
