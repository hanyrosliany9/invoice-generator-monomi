import React, { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { vendorService } from '../services/vendors';
import type { CreateVendorRequest, VendorType, PKPStatus } from '../types/vendor';
import {
  VENDOR_TYPES,
  PKP_STATUSES,
  PAYMENT_TERMS,
  CURRENCIES,
} from '../types/vendor';
import { useTheme } from '../theme';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const VendorCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [pkpStatus, setPkpStatus] = useState<PKPStatus>('NON_PKP');
  const [vendorType, setVendorType] = useState<VendorType>('SUPPLIER');

  // Mutation
  const createMutation = useMutation({
    mutationFn: vendorService.createVendor,
    onSuccess: vendor => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      message.success('Vendor berhasil dibuat');
      navigate(`/vendors/${vendor.id}`);
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || 'Gagal membuat vendor'
      );
    },
  });

  const handleSubmit = async (values: any) => {
    const data: CreateVendorRequest = {
      name: values.name,
      vendorType: values.vendorType || 'SUPPLIER',
      nameId: values.nameId,
      industryType: values.industryType,
      contactPerson: values.contactPerson,
      email: values.email,
      phone: values.phone,
      address: values.address,
      city: values.city,
      province: values.province,
      postalCode: values.postalCode,
      country: values.country || 'Indonesia',
      npwp: values.npwp,
      pkpStatus: values.pkpStatus || 'NON_PKP',
      taxAddress: values.taxAddress,
      bankName: values.bankName,
      bankAccountNumber: values.bankAccountNumber,
      bankAccountName: values.bankAccountName,
      bankBranch: values.bankBranch,
      swiftCode: values.swiftCode,
      paymentTerms: values.paymentTerms || 'NET 30',
      creditLimit: values.creditLimit ? parseFloat(values.creditLimit) : undefined,
      currency: values.currency || 'IDR',
      isActive: true,
    };

    createMutation.mutate(data);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Space direction="vertical" size={0}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/vendors')}
              style={{ padding: 0 }}
            >
              Kembali ke Daftar Vendor
            </Button>
            <Title level={2} style={{ margin: '8px 0 0 0' }}>
              Tambah Vendor Baru
            </Title>
            <Text type="secondary">
              Lengkapi informasi vendor dengan detail yang akurat
            </Text>
          </Space>
        </Col>
      </Row>

      {/* Form Card */}
      <Card
        loading={createMutation.isPending}
        style={{ maxWidth: '1000px', margin: '0 auto' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          <Tabs
            items={[
              {
                key: 'basic',
                label: 'Informasi Dasar',
                children: (
                  <BasicInfoForm
                    pkpStatus={pkpStatus}
                    setPkpStatus={setPkpStatus}
                    vendorType={vendorType}
                    setVendorType={setVendorType}
                  />
                ),
              },
              {
                key: 'address',
                label: 'Alamat & Kontak',
                children: <AddressForm />,
              },
              {
                key: 'tax',
                label: 'Info Pajak',
                children: <TaxInfoForm pkpStatus={pkpStatus} />,
              },
              {
                key: 'banking',
                label: 'Informasi Perbankan',
                children: <BankingForm />,
              },
              {
                key: 'payment',
                label: 'Syarat Pembayaran',
                children: <PaymentTermsForm />,
              },
            ]}
          />

          {/* Form Actions */}
          <Divider style={{ marginTop: '24px' }} />
          <Row justify="end" gutter={16}>
            <Col>
              <Button onClick={() => navigate('/vendors')}>
                Batal
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={createMutation.isPending}
              >
                Simpan Vendor
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

// Form Section Components
const BasicInfoForm: React.FC<{
  pkpStatus: PKPStatus;
  setPkpStatus: (status: PKPStatus) => void;
  vendorType: VendorType;
  setVendorType: (type: VendorType) => void;
}> = ({ pkpStatus, setPkpStatus, vendorType, setVendorType }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Nama Vendor"
          name="name"
          rules={[
            { required: true, message: 'Nama vendor wajib diisi' },
            { min: 3, message: 'Minimal 3 karakter' },
          ]}
        >
          <Input placeholder="PT. Contoh Vendor" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Nama Indonesia"
          name="nameId"
          help="Nama dalam bahasa Indonesia jika berbeda"
        >
          <Input placeholder="PT. Contoh Vendor Indonesia" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Jenis Vendor"
          name="vendorType"
          initialValue="SUPPLIER"
          rules={[{ required: true, message: 'Jenis vendor wajib dipilih' }]}
        >
          <Select
            onChange={setVendorType}
            placeholder="Pilih jenis vendor"
          >
            {VENDOR_TYPES.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Jenis Industri"
          name="industryType"
          help="Contoh: Manufaktur, Teknologi, Konstruksi"
        >
          <Input placeholder="Contoh: Manufaktur" />
        </Form.Item>
      </Col>

      <Col xs={24}>
        <Form.Item
          label="Status PKP"
          name="pkpStatus"
          initialValue="NON_PKP"
          rules={[{ required: true, message: 'Status PKP wajib dipilih' }]}
        >
          <Select
            onChange={setPkpStatus}
            placeholder="Pilih status PKP"
          >
            {PKP_STATUSES.map(status => (
              <Option key={status.value} value={status.value}>
                {status.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>
  );
};

const AddressForm: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Orang Kontak"
          name="contactPerson"
        >
          <Input placeholder="Nama orang yang bertanggung jawab" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { type: 'email', message: 'Email tidak valid' },
          ]}
        >
          <Input type="email" placeholder="email@vendor.com" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Telepon"
          name="phone"
        >
          <Input placeholder="+62 XXX XXXX XXXX" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Negara"
          name="country"
          initialValue="Indonesia"
        >
          <Input placeholder="Indonesia" />
        </Form.Item>
      </Col>

      <Col xs={24}>
        <Form.Item
          label="Alamat"
          name="address"
          rules={[{ required: true, message: 'Alamat wajib diisi' }]}
        >
          <TextArea
            rows={3}
            placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"
          />
        </Form.Item>
      </Col>

      <Col xs={24} md={8}>
        <Form.Item
          label="Kota"
          name="city"
        >
          <Input placeholder="Jakarta" />
        </Form.Item>
      </Col>

      <Col xs={24} md={8}>
        <Form.Item
          label="Provinsi"
          name="province"
        >
          <Input placeholder="DKI Jakarta" />
        </Form.Item>
      </Col>

      <Col xs={24} md={8}>
        <Form.Item
          label="Kode Pos"
          name="postalCode"
        >
          <Input placeholder="12345" />
        </Form.Item>
      </Col>
    </Row>
  );
};

const TaxInfoForm: React.FC<{ pkpStatus: PKPStatus }> = ({ pkpStatus }) => {
  return (
    <Row gutter={[16, 16]}>
      {pkpStatus === 'PKP' && (
        <Col xs={24}>
          <Alert
            message="Vendor PKP"
            description="Vendor ini terdaftar sebagai Pengusaha Kena Pajak dan harus memiliki NPWP"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        </Col>
      )}

      <Col xs={24} md={12}>
        <Form.Item
          label="NPWP"
          name="npwp"
          help="Format: 15 digit angka (NNNNNNNNNNNNNN)"
          rules={[
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (!/^\d{15}$/.test(value.replace(/\D/g, ''))) {
                  return Promise.reject(
                    new Error('NPWP harus 15 digit')
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="01234567890123"
            maxLength={15}
          />
        </Form.Item>
      </Col>

      <Col xs={24}>
        <Form.Item
          label="Alamat Pajak"
          name="taxAddress"
          help="Alamat untuk keperluan perpajakan (jika berbeda dari alamat operasional)"
        >
          <TextArea
            rows={3}
            placeholder="Alamat untuk dokumen pajak"
          />
        </Form.Item>
      </Col>
    </Row>
  );
};

const BankingForm: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Nama Bank"
          name="bankName"
        >
          <Input placeholder="PT. Bank Contoh" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Kode SWIFT"
          name="swiftCode"
        >
          <Input placeholder="BKXXIDXX" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Nomor Rekening"
          name="bankAccountNumber"
        >
          <Input placeholder="1234567890" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Nama Pemilik Rekening"
          name="bankAccountName"
        >
          <Input placeholder="Nama sesuai rekening" />
        </Form.Item>
      </Col>

      <Col xs={24}>
        <Form.Item
          label="Cabang Bank"
          name="bankBranch"
        >
          <Input placeholder="Cabang Jakarta Pusat" />
        </Form.Item>
      </Col>
    </Row>
  );
};

const PaymentTermsForm: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Syarat Pembayaran"
          name="paymentTerms"
          initialValue="NET 30"
          rules={[{ required: true, message: 'Syarat pembayaran wajib dipilih' }]}
        >
          <Select
            placeholder="Pilih syarat pembayaran"
          >
            {PAYMENT_TERMS.map(term => (
              <Option key={term} value={term}>
                {term}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Mata Uang"
          name="currency"
          initialValue="IDR"
          rules={[{ required: true, message: 'Mata uang wajib dipilih' }]}
        >
          <Select placeholder="Pilih mata uang">
            {CURRENCIES.map(curr => (
              <Option key={curr} value={curr}>
                {curr}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item
          label="Limit Kredit"
          name="creditLimit"
          help="Jumlah maksimal kredit yang dapat diberikan (kosongkan jika tidak ada)"
        >
          <Input
            type="number"
            placeholder="1000000"
            min="0"
            step="1"
          />
        </Form.Item>
      </Col>
    </Row>
  );
};
