import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
  Row,
  Col,
  Alert,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import type { CreateExpenseFormData, WithholdingTaxType } from '../../types/expense';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface AddExpenseModalProps {
  projectId: string;
  clientId?: string;
  open: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  projectId,
  clientId,
  open,
  onClose,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [grossAmount, setGrossAmount] = useState(0);
  const [isLuxuryGoods, setIsLuxuryGoods] = useState(false);
  const [withholdingType, setWithholdingType] = useState<WithholdingTaxType>('NONE' as WithholdingTaxType);

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: () => {
      message.success('Biaya berhasil ditambahkan ke proyek!');
      queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-expenses-summary', projectId] });
      form.resetFields();
      setGrossAmount(0);
      setIsLuxuryGoods(false);
      setWithholdingType('NONE' as WithholdingTaxType);
      onClose();
    },
    onError: (error: any) => {
      message.error(`Gagal membuat biaya: ${error.message}`);
    },
  });

  // Auto-calculate amounts
  useEffect(() => {
    if (grossAmount > 0) {
      const amounts = expenseService.calculateExpenseAmounts(
        grossAmount,
        isLuxuryGoods,
        withholdingType
      );

      form.setFieldsValue({
        ppnAmount: amounts.ppnAmount,
        withholdingAmount: amounts.withholdingAmount,
        netAmount: amounts.netAmount,
        totalAmount: amounts.totalAmount,
      });
    }
  }, [grossAmount, isLuxuryGoods, withholdingType, form]);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
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
      ppnAmount: Number(values.ppnAmount),
      withholdingAmount: values.withholdingAmount
        ? Number(values.withholdingAmount)
        : 0,
      netAmount: Number(values.netAmount),
      totalAmount: Number(values.totalAmount),
      ppnRate: isLuxuryGoods ? 0.12 : 0.11,
      withholdingTaxRate: values.withholdingTaxRate || 0,
      isLuxuryGoods,
      isBillable: true, // Auto-set as billable
      projectId, // Pre-filled from parent
      clientId, // Pre-filled from parent
      currency: 'IDR', // Default to Indonesian Rupiah
      isTaxDeductible: true, // Default to tax deductible
    };

    createMutation.mutate(expenseData);
  };

  // Reset form when modal closes
  const handleCancel = () => {
    form.resetFields();
    setGrossAmount(0);
    setIsLuxuryGoods(false);
    setWithholdingType('NONE' as WithholdingTaxType);
    onClose();
  };

  return (
    <Modal
      title="Tambah Biaya ke Proyek"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="Buat Biaya"
      cancelText="Batal"
      width={800}
      confirmLoading={createMutation.isPending}
      forceRender
    >
      <Alert
        message="Biaya akan ditautkan ke proyek ini"
        description="Biaya ini akan otomatis ditandai sebagai dapat ditagih dan ditautkan ke proyek saat ini."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          expenseDate: dayjs(),
          ppnCategory: 'CREDITABLE',
          eFakturStatus: 'NOT_REQUIRED',
          withholdingTaxType: 'NONE',
          isLuxuryGoods: false,
        }}
      >
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="categoryId"
              label="Kategori Biaya"
              rules={[{ required: true, message: 'Pilih kategori' }]}
            >
              <Select
                placeholder="Pilih kategori"
                onChange={handleCategoryChange}
                showSearch
                filterOption={(input, option) =>
                  ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: `${cat.nameId || cat.name} (${cat.accountCode})`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="accountCode" label="Kode Akun">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Deskripsi"
          rules={[{ required: true, message: 'Masukkan deskripsi' }]}
        >
          <TextArea rows={2} placeholder="Deskripsi biaya" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vendorName"
              label="Vendor"
              rules={[{ required: true, message: 'Masukkan nama vendor' }]}
            >
              <Input placeholder="Nama vendor" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="vendorNPWP" label="NPWP Vendor (Opsional)">
              <Input placeholder="01.234.567.8-901.000" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="expenseDate" label="Tanggal Biaya" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="grossAmount"
              label="Jumlah Bruto (IDR)"
              rules={[{ required: true, message: 'Masukkan jumlah' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
                parser={(value) => value?.replace(/Rp\s?|(\.*)/g, '') as any}
                onChange={(val) => setGrossAmount(Number(val) || 0)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="ppnAmount" label="PPN (Auto)">
              <InputNumber
                style={{ width: '100%' }}
                disabled
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="withholdingAmount" label="PPh Dipotong (Auto)">
              <InputNumber
                style={{ width: '100%' }}
                disabled
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="totalAmount" label="Total (Auto)">
              <InputNumber
                style={{ width: '100%' }}
                disabled
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="ppnCategory" label="Kategori PPN">
              <Select>
                <Option value="CREDITABLE">Dapat Dikreditkan</Option>
                <Option value="NON_CREDITABLE">Tidak Dapat Dikreditkan</Option>
                <Option value="EXEMPT">Bebas PPN</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="withholdingTaxType" label="Jenis PPh">
              <Select onChange={(val) => setWithholdingType(val as WithholdingTaxType)}>
                <Option value="NONE">Tidak Ada</Option>
                <Option value="PPH23">PPh 23 (Jasa)</Option>
                <Option value="PPH4_2">PPh 4(2) (Sewa)</Option>
                <Option value="PPH15">PPh 15 (Pengiriman)</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="isLuxuryGoods" label="Barang Mewah?" valuePropName="checked">
              <Switch
                id="isLuxuryGoods"
                onChange={setIsLuxuryGoods}
                checkedChildren="Ya (12%)"
                unCheckedChildren="Tidak (11%)"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Catatan (Opsional)">
          <TextArea rows={2} placeholder="Catatan tambahan" />
        </Form.Item>

        {/* Hidden fields for auto-calculated values */}
        <Form.Item name="accountName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="expenseClass" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="netAmount" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="withholdingTaxRate" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="eFakturStatus" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
