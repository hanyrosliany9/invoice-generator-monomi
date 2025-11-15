import React from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  FloatButton,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  BankOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { vendorService } from '../services/vendors';
import type { Vendor } from '../types/vendor';
import { useTheme } from '../theme';
import { mobileTheme } from '../theme/mobileTheme';
import { useIsMobile } from '../hooks/useMediaQuery';
import { formatDate } from '../utils/dateFormatters';

const { Title, Text } = Typography;
const { Paragraph } = Typography;

export const VendorDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Alert message="Error" description="ID vendor tidak ditemukan" type="error" />;
  }

  // Query
  const {
    data: vendor,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorService.getVendor(id),
  });

  // Mutation
  const deleteMutation = useMutation({
    mutationFn: vendorService.deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      message.success('Vendor berhasil dihapus');
      navigate('/vendors');
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message ||
          'Gagal menghapus vendor. Mungkin vendor memiliki transaksi terkait.'
      );
    },
  });

  const handleDelete = () => {
    if (!vendor || !vendorService.canDelete(vendor)) {
      message.error(
        'Vendor tidak dapat dihapus karena memiliki transaksi terkait'
      );
      return;
    }

    modal.confirm({
      title: 'Hapus Vendor',
      content: `Apakah Anda yakin ingin menghapus vendor "${vendor.name}"?`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  if (isLoading) {
    return <Spin size="large" />;
  }

  if (error || !vendor) {
    return (
      <Alert
        message="Error"
        description="Gagal memuat data vendor"
        type="error"
        showIcon
      />
    );
  }

  const count = vendor._count || {};

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
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
                  {vendor.name}
                </Title>
                <Text type="secondary">
                  Kode: {vendor.vendorCode}
                </Text>
              </Space>
            </Col>
            {!isMobile && (
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/vendors/${id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'delete',
                          icon: <DeleteOutlined />,
                          label: 'Hapus Vendor',
                          danger: true,
                          onClick: handleDelete,
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button icon={<MoreOutlined />} />
                  </Dropdown>
                </Space>
              </Col>
            )}
          </Row>
        </Col>
      </Row>

      {/* Status & Tags */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small">
            <Space direction="vertical">
              <Text type="secondary">Jenis Vendor</Text>
              <Tag color="blue">
                {vendorService.getVendorTypeLabel(vendor.vendorType)}
              </Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small">
            <Space direction="vertical">
              <Text type="secondary">Status PKP</Text>
              <Tag
                color={
                  vendor.pkpStatus === 'PKP'
                    ? 'green'
                    : vendor.pkpStatus === 'NON_PKP'
                      ? 'orange'
                      : 'blue'
                }
              >
                {vendorService.getPKPStatusLabel(vendor.pkpStatus)}
              </Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small">
            <Space direction="vertical">
              <Text type="secondary">Status</Text>
              <Tag color={vendor.isActive ? 'green' : 'red'}>
                {vendor.isActive ? 'Aktif' : 'Tidak Aktif'}
              </Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Basic Information */}
      <Card
        title="Informasi Dasar"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div>
              <Text type="secondary">Nama Vendor</Text>
              <Paragraph strong>{vendor.name}</Paragraph>
            </div>
          </Col>
          {vendor.nameId && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Nama Indonesia</Text>
                <Paragraph strong>{vendor.nameId}</Paragraph>
              </div>
            </Col>
          )}
          {vendor.industryType && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Jenis Industri</Text>
                <Paragraph strong>{vendor.industryType}</Paragraph>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* Contact Information */}
      <Card
        title="Informasi Kontak"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 24]}>
          {vendor.contactPerson && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Orang Kontak</Text>
                <Paragraph strong>{vendor.contactPerson}</Paragraph>
              </div>
            </Col>
          )}
          {vendor.email && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Email</Text>
                <Paragraph>
                  <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
                </Paragraph>
              </div>
            </Col>
          )}
          {vendor.phone && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Telepon</Text>
                <Paragraph>
                  <a href={`tel:${vendor.phone}`}>{vendor.phone}</a>
                </Paragraph>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* Address Information */}
      <Card
        title="Informasi Alamat"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 24]}>
          {vendor.address && (
            <Col xs={24}>
              <div>
                <Text type="secondary">Alamat</Text>
                <Paragraph>{vendor.address}</Paragraph>
              </div>
            </Col>
          )}
          <Col xs={24} md={8}>
            <div>
              <Text type="secondary">Kota</Text>
              <Paragraph strong>{vendor.city || '-'}</Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div>
              <Text type="secondary">Provinsi</Text>
              <Paragraph strong>{vendor.province || '-'}</Paragraph>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div>
              <Text type="secondary">Kode Pos</Text>
              <Paragraph strong>{vendor.postalCode || '-'}</Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text type="secondary">Negara</Text>
              <Paragraph strong>{vendor.country || 'Indonesia'}</Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tax Information */}
      {(vendor.npwp || vendor.taxAddress) && (
        <Card
          title="Informasi Pajak"
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 24]}>
            {vendor.npwp && (
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary">NPWP</Text>
                  <Paragraph strong>
                    {vendorService.formatNPWP(vendor.npwp)}
                  </Paragraph>
                </div>
              </Col>
            )}
            {vendor.taxAddress && (
              <Col xs={24}>
                <div>
                  <Text type="secondary">Alamat Pajak</Text>
                  <Paragraph>{vendor.taxAddress}</Paragraph>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Banking Information */}
      {(vendor.bankName || vendor.bankAccountNumber) && (
        <Card
          title={<><BankOutlined /> Informasi Perbankan</>}
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 24]}>
            {vendor.bankName && (
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary">Nama Bank</Text>
                  <Paragraph strong>{vendor.bankName}</Paragraph>
                </div>
              </Col>
            )}
            {vendor.swiftCode && (
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary">SWIFT Code</Text>
                  <Paragraph strong>{vendor.swiftCode}</Paragraph>
                </div>
              </Col>
            )}
            {vendor.bankAccountNumber && (
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary">Nomor Rekening</Text>
                  <Paragraph strong>{vendor.bankAccountNumber}</Paragraph>
                </div>
              </Col>
            )}
            {vendor.bankAccountName && (
              <Col xs={24} md={12}>
                <div>
                  <Text type="secondary">Nama Pemilik Rekening</Text>
                  <Paragraph strong>{vendor.bankAccountName}</Paragraph>
                </div>
              </Col>
            )}
            {vendor.bankBranch && (
              <Col xs={24}>
                <div>
                  <Text type="secondary">Cabang Bank</Text>
                  <Paragraph strong>{vendor.bankBranch}</Paragraph>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Payment Terms */}
      <Card
        title="Syarat Pembayaran"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div>
              <Text type="secondary">Syarat Pembayaran</Text>
              <Paragraph strong>{vendor.paymentTerms}</Paragraph>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div>
              <Text type="secondary">Mata Uang</Text>
              <Paragraph strong>{vendor.currency || 'IDR'}</Paragraph>
            </div>
          </Col>
          {vendor.creditLimit && (
            <Col xs={24} md={12}>
              <div>
                <Text type="secondary">Limit Kredit</Text>
                <Paragraph strong>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: vendor.currency || 'IDR',
                    minimumFractionDigits: 0,
                  }).format(
                    typeof vendor.creditLimit === 'string'
                      ? parseFloat(vendor.creditLimit)
                      : vendor.creditLimit
                  )}
                </Paragraph>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {/* Transaction Summary */}
      <Card
        title="Ringkasan Transaksi"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Purchase Orders"
              value={(count as any).purchaseOrders || 0}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Vendor Invoices"
              value={(count as any).vendorInvoices || 0}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Expenses"
              value={(count as any).expenses || 0}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Assets"
              value={(count as any).assets || 0}
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Audit Information */}
      <Card title="Informasi Audit" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text type="secondary">Dibuat pada</Text>
            <Paragraph>{formatDate(vendor.createdAt)}</Paragraph>
          </Col>
          <Col xs={24} md={12}>
            <Text type="secondary">Diperbarui pada</Text>
            <Paragraph>{formatDate(vendor.updatedAt)}</Paragraph>
          </Col>
        </Row>
      </Card>

      {/* Mobile-only FloatButton.Group */}
      {isMobile && (
        <FloatButton.Group
          shape="circle"
          style={{
            right: mobileTheme.floatButton.right,
            bottom: mobileTheme.floatButton.bottom
          }}
        >
          <FloatButton
            icon={<EditOutlined />}
            tooltip="Edit Vendor"
            onClick={() => navigate(`/vendors/${id}/edit`)}
            type="primary"
            aria-label="Edit vendor"
          />
          <FloatButton
            icon={<DeleteOutlined />}
            tooltip="Hapus Vendor"
            onClick={handleDelete}
            aria-label="Delete vendor"
          />
        </FloatButton.Group>
      )}
    </div>
  );
};
