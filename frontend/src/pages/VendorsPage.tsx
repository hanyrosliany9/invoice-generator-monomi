import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { vendorService } from '../services/vendors';
import type {
  Vendor,
  VendorQueryParams,
  VendorType,
  PKPStatus,
} from '../types/vendor';
import { VENDOR_TYPES, PKP_STATUSES } from '../types/vendor';
import { useTheme } from '../theme';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatDate } from '../utils/dateFormatters';
import { useIsMobile } from '../hooks/useMediaQuery';
import MobileTableView from '../components/mobile/MobileTableView';
import { vendorToBusinessEntity } from '../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { Option } = Select;

export const VendorsPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const isMobile = useIsMobile();

  // State
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 300);
  const [typeFilter, setTypeFilter] = useState<VendorType | ''>('');
  const [pkpStatusFilter, setPkpStatusFilter] = useState<PKPStatus | ''>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Build query params
  const queryParams: VendorQueryParams = useMemo(() => {
    return {
      search: searchText || undefined,
      vendorType: typeFilter || undefined,
      pkpStatus: pkpStatusFilter || undefined,
      isActive: activeFilter ? activeFilter === 'active' : undefined,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
  }, [searchText, typeFilter, pkpStatusFilter, activeFilter, page, limit]);

  // Queries
  const {
    data: vendorsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vendors', queryParams],
    queryFn: () => vendorService.getVendors(queryParams),
  });

  const { data: statistics } = useQuery({
    queryKey: ['vendorStatistics'],
    queryFn: vendorService.getVendorStatistics,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: vendorService.deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      message.success('Vendor berhasil dihapus');
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message ||
          'Gagal menghapus vendor. Mungkin vendor memiliki transaksi terkait.'
      );
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map(id => vendorService.deleteVendor(id))
      );
      return {
        succeeded: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        total: results.length,
      };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      setSelectedRowKeys([]);
      message.success(
        `${data.succeeded} vendor berhasil dihapus${data.failed > 0 ? `, ${data.failed} gagal` : ''}`
      );
    },
  });

  const vendors = vendorsData?.data || [];
  const meta = vendorsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  // Mobile data adapter
  const mobileData = useMemo(() =>
    vendors.map(vendorToBusinessEntity),
    [vendors]
  );

  // Handler function (defined before mobileActions to avoid TDZ errors)
  const handleDeleteVendor = useCallback((vendor: Vendor) => {
    if (!vendorService.canDelete(vendor)) {
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
        deleteMutation.mutate(vendor.id);
      },
    });
  }, [message, modal, deleteMutation]);

  // Mobile actions - only vendor-specific actions
  // Note: 'view', 'edit', and 'whatsapp' are provided by MobileTableView's defaultMobileActions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (record) => {
        const vendor = vendors.find(v => v.id === record.id);
        if (vendor) handleDeleteVendor(vendor);
      },
    },
  ], [vendors, handleDeleteVendor]);

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Aktif', value: 'approved' },
        { label: 'Nonaktif', value: 'declined' },
      ],
    },
  ], []);

  // Handlers
  const handleBulkDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih vendor yang akan dihapus');
      return;
    }

    modal.confirm({
      title: 'Hapus Vendor',
      content: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.length} vendor?`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: () => {
        bulkDeleteMutation.mutate(selectedRowKeys as string[]);
      },
    });
  }, [selectedRowKeys]);

  const handleExport = useCallback(() => {
    message.info(
      'Fitur export sedang dalam pengembangan. Data vendor akan dapat di-export dalam format CSV/Excel pada update mendatang.'
    );
  }, [message]);

  // Table columns
  const columns = [
    {
      title: 'Kode Vendor',
      dataIndex: 'vendorCode',
      key: 'vendorCode',
      width: 140,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Nama Vendor',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Vendor) => (
        <div>
          <Text strong>{text}</Text>
          {record.nameId && <div style={{ fontSize: '12px', color: '#666' }}>{record.nameId}</div>}
        </div>
      ),
    },
    {
      title: 'Jenis',
      dataIndex: 'vendorType',
      key: 'vendorType',
      width: 140,
      render: (type: VendorType) => (
        <Tag color="blue">{vendorService.getVendorTypeLabel(type)}</Tag>
      ),
    },
    {
      title: 'Status PKP',
      dataIndex: 'pkpStatus',
      key: 'pkpStatus',
      width: 130,
      render: (status: PKPStatus) => {
        const colorMap: Record<PKPStatus, string> = {
          PKP: 'green',
          NON_PKP: 'orange',
          GOVERNMENT: 'blue',
        };
        return (
          <Tag color={colorMap[status]}>
            {vendorService.getPKPStatusLabel(status)}
          </Tag>
        );
      },
    },
    {
      title: 'Kontak',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone: string, record: Vendor) => (
        <div>
          {phone && <div>{phone}</div>}
          {record.email && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={isActive ? 'Aktif' : 'Tidak Aktif'}
        />
      ),
    },
    {
      title: 'Transaksi',
      key: 'transactions',
      width: 120,
      render: (_: unknown, record: Vendor) => {
        const count = record._count || {};
        const poCount = (count as any).purchaseOrders || 0;
        const invoiceCount = (count as any).vendorInvoices || 0;
        const expenseCount = (count as any).expenses || 0;
        const total = poCount + invoiceCount + expenseCount;
        return (
          <Tooltip
            title={`PO: ${poCount}, Invoice: ${invoiceCount}, Expense: ${expenseCount}`}
          >
            <Badge
              count={total}
              showZero
              style={{
                backgroundColor: total > 0 ? '#52c41a' : '#d9d9d9',
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Vendor) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/vendors/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/vendors/${record.id}/edit`)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: 'Hapus',
                  danger: true,
                  onClick: () => handleDeleteVendor(record),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        message="Error"
        description="Gagal memuat data vendor"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={isMobile ? 3 : 2} style={{ margin: 0, marginBottom: isMobile ? '4px' : '0' }}>
                {isMobile ? 'Vendor' : 'Manajemen Vendor'}
              </Title>
              <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                {isMobile ? 'Kelola data vendor' : 'Kelola data vendor, supplier, dan penyedia layanan'}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                >
                  Export
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/vendors/create')}
                >
                  Tambah Vendor
                </Button>
              </Space>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={isMobile ? [8, 8] : [16, 16]} style={{ marginBottom: isMobile ? '16px' : '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Vendor"
                value={statistics.totalVendors}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Aktif"
                value={statistics.activeVendors}
                prefix={<BankOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Dengan PO"
                value={statistics.vendorsWithPOs}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Dengan Invoice"
                value={statistics.vendorsWithInvoices}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card
        style={{ marginBottom: isMobile ? '16px' : '24px' }}
        size="small"
      >
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Cari nama, kode, atau kontak vendor..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Jenis Vendor"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
            >
              {VENDOR_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status PKP"
              value={pkpStatusFilter}
              onChange={setPkpStatusFilter}
              allowClear
            >
              {PKP_STATUSES.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              value={activeFilter}
              onChange={setActiveFilter}
              allowClear
            >
              <Option value="active">Aktif</Option>
              <Option value="inactive">Tidak Aktif</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              block
              onClick={() => {
                setSearchInput('');
                setTypeFilter('');
                setPkpStatusFilter('');
                setActiveFilter('');
                setPage(1);
              }}
            >
              Reset Filter
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <Alert
          message={`${selectedRowKeys.length} vendor dipilih`}
          type="info"
          action={
            <Space size="small">
              <Button
                size="small"
                danger
                onClick={handleBulkDelete}
                loading={bulkDeleteMutation.isPending}
              >
                Hapus Dipilih
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedRowKeys([])}
              >
                Batal
              </Button>
            </Space>
          }
          style={{ marginBottom: '16px' }}
          closable={false}
        />
      )}

      {/* Table / Mobile View */}
      {isMobile ? (
        <MobileTableView
          data={mobileData}
          loading={isLoading}
          entityType="vendors"
          showQuickStats
          searchable
          searchFields={['number', 'title']}
          filters={mobileFilters}
          actions={mobileActions}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['vendors'] })}
        />
      ) : (
        <Card>
          <Table
            loading={isLoading}
            dataSource={vendorsData?.data || []}
            columns={columns}
            rowKey="id"
            pagination={{
              total: vendorsData?.meta.total || 0,
              pageSize: limit,
              current: page,
              onChange: (newPage, newLimit) => {
                setPage(newPage);
                setLimit(newLimit);
              },
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} vendor`,
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
              selections: [
                Table.SELECTION_ALL,
                Table.SELECTION_NONE,
              ],
            }}
            size="small"
            scroll={{ x: 1200 }}
          />
        </Card>
      )}
    </div>
  );
};
