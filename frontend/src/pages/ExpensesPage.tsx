import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { expenseService } from '../services/expenses';
import type {
  Expense,
  ExpensePaymentStatus,
  ExpenseQueryParams,
  ExpenseStatus,
} from '../types/expense';
import { useTheme } from '../theme';
import { CompactMetricCard } from '../components/ui/CompactMetricCard';
import { formatDate } from '../utils/dateFormatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export const ExpensesPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  // State
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | ''>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<ExpensePaymentStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // Build query params
  const queryParams: ExpenseQueryParams = useMemo(() => {
    const params: ExpenseQueryParams = {
      search: searchText || undefined,
      status: statusFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      categoryId: categoryFilter || undefined,
      projectId: projectFilter || undefined,
      startDate: dateRange?.[0]?.toISOString(),
      endDate: dateRange?.[1]?.toISOString(),
      page: 1,
      limit: 20,
      sortBy: 'expenseDate',
      sortOrder: 'desc',
    };
    return params;
  }, [searchText, statusFilter, paymentStatusFilter, categoryFilter, projectFilter, dateRange]);

  // Queries
  const {
    data: expensesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: () => expenseService.getExpenses(queryParams),
  });

  const { data: statistics } = useQuery({
    queryKey: ['expenses-statistics', queryParams],
    queryFn: () => expenseService.getExpenseStatistics(queryParams),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseService.getExpenseCategories(),
  });

  const expenses = expensesData?.data || [];
  const meta = expensesData?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 };

  // Navigation
  const handleCreate = useCallback(() => {
    navigate('/expenses/new');
  }, [navigate]);

  const handleView = useCallback((expense: Expense) => {
    navigate(`/expenses/${expense.id}`);
  }, [navigate]);

  const handleEdit = useCallback((expense: Expense) => {
    navigate(`/expenses/${expense.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((id: string) => {
    modal.confirm({
      title: 'Konfirmasi Hapus',
      content: 'Apakah Anda yakin ingin menghapus expense ini? Tindakan ini tidak dapat dibatalkan.',
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okType: 'danger',
      onOk: async () => {
        try {
          await expenseService.deleteExpense(id);
          message.success('Expense berhasil dihapus');
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (error: any) {
          message.error(`Gagal menghapus expense: ${error.message}`);
        }
      },
    });
  }, [modal, message, queryClient]);

  const handleSubmit = useCallback((expense: Expense) => {
    modal.confirm({
      title: 'Konfirmasi Pengajuan',
      content: `Apakah Anda yakin ingin mengajukan expense ${expense.expenseNumber} untuk disetujui?`,
      okText: 'Ya, Ajukan',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          await expenseService.submitExpense(expense.id);
          message.success('Expense berhasil diajukan untuk persetujuan');
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (error: any) {
          message.error(`Gagal mengajukan expense: ${error.message}`);
        }
      },
    });
  }, [modal, message, queryClient]);

  const handleExport = useCallback(() => {
    message.info('Fitur export expense sedang dalam pengembangan');
  }, [message]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    message.success('Data berhasil di-refresh');
  }, [queryClient, message]);

  // Table columns
  const columns = [
    {
      title: 'Expense & Context',
      key: 'expenseContext',
      render: (_: any, expense: Expense) => (
        <div className='space-y-1'>
          <div className='font-medium'>
            <Button
              type='link'
              onClick={() => handleView(expense)}
              className='text-blue-600 hover:text-blue-800 p-0 font-medium'
            >
              {expense.expenseNumber}
            </Button>
          </div>

          <div className='text-xs text-gray-600'>
            {expense.buktiPengeluaranNumber}
          </div>

          {expense.category && (
            <div className='text-xs'>
              <Tag color='blue' style={{ fontSize: '10px', padding: '0 6px' }}>
                {expense.category.code}
              </Tag>
              <span className='text-gray-500'>{expense.category.nameId}</span>
            </div>
          )}

          {expense.eFakturNSFP && (
            <Tooltip title='e-Faktur tersedia'>
              <Badge size='small' color='green' text={expense.eFakturNSFP.substring(0, 15) + '...'} />
            </Tooltip>
          )}
        </div>
      ),
      sorter: (a: Expense, b: Expense) => a.expenseNumber.localeCompare(b.expenseNumber),
    },
    {
      title: 'Vendor',
      key: 'vendor',
      render: (_: any, expense: Expense) => (
        <div>
          <div className='font-medium'>{expense.vendorName}</div>
          {expense.vendorNPWP && (
            <div className='text-xs text-gray-500'>{expenseService.formatNPWP(expense.vendorNPWP)}</div>
          )}
        </div>
      ),
      sorter: (a: Expense, b: Expense) => a.vendorName.localeCompare(b.vendorName),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string, expense: Expense) => (
        <Tooltip title={expense.descriptionId || desc}>
          <div className='max-w-xs truncate'>{expense.descriptionId || desc}</div>
        </Tooltip>
      ),
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, expense: Expense) => (
        <div className='space-y-1'>
          <div className='font-medium'>{expenseService.formatIDR(expense.totalAmount)}</div>
          {parseFloat(expense.ppnAmount) > 0 && (
            <div className='text-xs text-gray-500'>
              PPN: {expenseService.formatIDR(expense.ppnAmount)}
            </div>
          )}
          {expense.withholdingAmount && parseFloat(expense.withholdingAmount) > 0 && (
            <div className='text-xs text-orange-600'>
              PPh: -{expenseService.formatIDR(expense.withholdingAmount)}
            </div>
          )}
        </div>
      ),
      sorter: (a: Expense, b: Expense) => parseFloat(a.totalAmount) - parseFloat(b.totalAmount),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, expense: Expense) => (
        <div className='space-y-1'>
          <Tag color={getStatusTagColor(expense.status)}>
            {expenseService.getStatusLabel(expense.status)}
          </Tag>
          <Tag color={getPaymentStatusTagColor(expense.paymentStatus)}>
            {expenseService.getPaymentStatusLabel(expense.paymentStatus)}
          </Tag>
        </div>
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Diajukan', value: 'SUBMITTED' },
        { text: 'Disetujui', value: 'APPROVED' },
        { text: 'Ditolak', value: 'REJECTED' },
      ],
      onFilter: (value: any, record: Expense) => record.status === value,
    },
    {
      title: 'Tanggal',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDate(date),
      sorter: (a: Expense, b: Expense) => dayjs(a.expenseDate).unix() - dayjs(b.expenseDate).unix(),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: any, expense: Expense) => (
        <Dropdown
          menu={{ items: getActionMenuItems(expense) }}
          trigger={['click']}
          placement='bottomRight'
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const getStatusTagColor = (status: ExpenseStatus): string => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'blue';
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'CANCELLED': return 'orange';
      default: return 'default';
    }
  };

  const getPaymentStatusTagColor = (status: ExpensePaymentStatus): string => {
    switch (status) {
      case 'UNPAID': return 'red';
      case 'PARTIALLY_PAID': return 'orange';
      case 'PAID': return 'green';
      default: return 'default';
    }
  };

  const getActionMenuItems = (expense: Expense): any[] => {
    const items: any[] = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(expense),
      },
    ];

    if (expenseService.canEdit(expense)) {
      items.push({
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(expense),
      });
    }

    if (expenseService.canSubmit(expense)) {
      items.push({
        key: 'submit',
        icon: <SendOutlined />,
        label: 'Ajukan',
        onClick: () => handleSubmit(expense),
      });
    }

    if (expenseService.canDelete(expense)) {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        onClick: () => handleDelete(expense.id),
        danger: true,
      });
    }

    return items;
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setCategoryFilter('');
    setProjectFilter('');
    setDateRange(null);
  };

  const hasActiveFilters = !!(searchText || statusFilter || paymentStatusFilter || categoryFilter || projectFilter || dateRange);

  return (
    <div>
      <div className='mb-6'>
        <Title level={2} style={{ color: theme.colors.text.primary, marginBottom: '24px' }}>
          Manajemen Biaya
        </Title>

        {/* Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<FileTextOutlined />}
              iconColor='#1e40af'
              iconBg='rgba(30, 64, 175, 0.15)'
              label='Total Biaya'
              value={statistics?.totalExpenses || 0}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Disetujui'
              value={statistics?.byStatus?.APPROVED?.count || 0}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ClockCircleOutlined />}
              iconColor='#3b82f6'
              iconBg='rgba(59, 130, 246, 0.15)'
              label='Diajukan'
              value={statistics?.byStatus?.SUBMITTED?.count || 0}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ExclamationCircleOutlined />}
              iconColor='#f5222d'
              iconBg='rgba(245, 34, 45, 0.15)'
              label='Belum Dibayar'
              value={statistics?.byPaymentStatus?.UNPAID?.count || 0}
            />
          </Col>
        </Row>

        {/* Financial Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={8}>
            <CompactMetricCard
              icon={<DollarOutlined />}
              iconColor='#10b981'
              iconBg='rgba(16, 185, 129, 0.15)'
              label='Total Pengeluaran'
              value={expenseService.formatIDR(statistics?.totalAmount || '0')}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <CompactMetricCard
              icon={<WarningOutlined />}
              iconColor='#f59e0b'
              iconBg='rgba(245, 158, 11, 0.15)'
              label='Total PPN'
              value={expenseService.formatIDR(statistics?.totalPPN || '0')}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <CompactMetricCard
              icon={<ExclamationCircleOutlined />}
              iconColor='#ef4444'
              iconBg='rgba(239, 68, 68, 0.15)'
              label='Total PPh Dipotong'
              value={expenseService.formatIDR(statistics?.totalWithholding || '0')}
            />
          </Col>
        </Row>

        {/* Controls */}
        <div className='flex justify-between items-center mb-4 flex-wrap gap-4'>
          <Space wrap>
            <Input
              placeholder='Cari expense...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder='Filter status'
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='DRAFT'>Draft</Option>
              <Option value='SUBMITTED'>Diajukan</Option>
              <Option value='APPROVED'>Disetujui</Option>
              <Option value='REJECTED'>Ditolak</Option>
              <Option value='CANCELLED'>Dibatalkan</Option>
            </Select>
            <Select
              placeholder='Status pembayaran'
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='UNPAID'>Belum Dibayar</Option>
              <Option value='PARTIALLY_PAID'>Dibayar Sebagian</Option>
              <Option value='PAID'>Lunas</Option>
            </Select>
            <Select
              placeholder='Kategori'
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 180 }}
              allowClear
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>
                  {cat.nameId || cat.name}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
              format='DD/MM/YYYY'
            />
            {hasActiveFilters && (
              <Button onClick={clearFilters}>Reset</Button>
            )}
          </Space>

          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport} size='large'>
              Export
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleCreate}
              size='large'
              style={{
                height: '48px',
                borderRadius: '24px',
                padding: '0 32px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Tambah Biaya
            </Button>
          </Space>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text type='secondary' style={{ fontSize: '13px' }}>Filter aktif:</Text>
            {searchText && (
              <Tag closable onClose={() => setSearchText('')} color='blue'>
                Search: "{searchText}"
              </Tag>
            )}
            {statusFilter && (
              <Tag closable onClose={() => setStatusFilter('')} color='green'>
                Status: {expenseService.getStatusLabel(statusFilter)}
              </Tag>
            )}
            {paymentStatusFilter && (
              <Tag closable onClose={() => setPaymentStatusFilter('')} color='orange'>
                Pembayaran: {expenseService.getPaymentStatusLabel(paymentStatusFilter)}
              </Tag>
            )}
            {categoryFilter && (
              <Tag closable onClose={() => setCategoryFilter('')} color='purple'>
                Kategori
              </Tag>
            )}
            {dateRange && (
              <Tag closable onClose={() => setDateRange(null)} color='gold'>
                {dateRange[0]?.format('DD/MM/YY')} - {dateRange[1]?.format('DD/MM/YY')}
              </Tag>
            )}
            <Button size='small' type='text' onClick={clearFilters} style={{ color: '#ef4444' }}>
              Clear all
            </Button>
          </div>
        )}

        {/* Batch Operations */}
        {selectedRowKeys.length > 0 && (
          <Card
            className='mb-4'
            size='small'
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
            }}
          >
            <div className='flex justify-between items-center'>
              <Text strong style={{ color: theme.colors.text.primary }}>
                {selectedRowKeys.length} expense dipilih
              </Text>
              <Space>
                <Button size='small' icon={<ExportOutlined />}>
                  Export
                </Button>
                <Button size='small' icon={<DeleteOutlined />} danger>
                  Hapus
                </Button>
                <Button size='small' icon={<CloseOutlined />} onClick={() => setSelectedRowKeys([])}>
                  Batal Pilih
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          message='Error loading expenses'
          description={(error as Error).message}
          type='error'
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Main Table */}
      <Card
        style={{
          borderRadius: '12px',
          border: theme.colors.glass.border,
          boxShadow: theme.colors.glass.shadow,
          background: theme.colors.glass.background,
          backdropFilter: theme.colors.glass.backdropFilter,
        }}
      >
        <Table
          columns={columns}
          dataSource={expenses}
          loading={isLoading}
          rowKey='id'
          rowSelection={rowSelection}
          pagination={{
            current: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} expense`,
          }}
        />
      </Card>
    </div>
  );
};
