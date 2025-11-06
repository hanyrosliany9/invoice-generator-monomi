import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
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
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useTheme } from '../../theme';
import {
  approveBankReconciliation,
  type BankReconciliation,
  type ChartOfAccount,
  createBankReconciliation,
  deleteBankReconciliation,
  getBankReconciliations,
  getChartOfAccounts,
  rejectBankReconciliation,
  reviewBankReconciliation,
} from '../../services/accounting';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import { bankReconciliationToBusinessEntity } from '../../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const BankReconciliationsPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const isMobile = useIsMobile();

  // State for filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [isBalanced, setIsBalanced] = useState<boolean | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<BankReconciliation | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch bank reconciliations
  const { data, isLoading } = useQuery({
    queryKey: [
      'bank-reconciliations',
      page,
      limit,
      search,
      status,
      isBalanced,
      dateRange,
    ],
    queryFn: () =>
      getBankReconciliations({
        page,
        limit,
        search,
        status: status as any,
        isBalanced,
        startDate: dateRange?.[0].format('YYYY-MM-DD'),
        endDate: dateRange?.[1].format('YYYY-MM-DD'),
        sortBy: 'statementDate',
        sortOrder: 'desc',
      }),
  });

  // Fetch chart of accounts for form
  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
  });

  const reconciliations = data?.data || [];

  // Mobile data adapter
  const mobileData = useMemo(() =>
    reconciliations.map(bankReconciliationToBusinessEntity),
    [reconciliations]
  );

  // Mobile actions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        const recon = reconciliations.find((r: any) => r.id === record.id);
        if (recon) {
          setSelectedReconciliation(recon);
          setIsViewModalOpen(true);
        }
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (record) => deleteMutation.mutate(record.id),
      visible: (record) => record.status === 'draft',
      confirm: {
        title: 'Hapus rekonsiliasi?',
        description: 'Aksi ini tidak dapat dibatalkan.',
      },
    },
  ], [reconciliations]);

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Seimbang', value: 'approved' },
        { label: 'Tidak Seimbang', value: 'draft' },
      ],
    },
  ], []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBankReconciliation,
    onSuccess: () => {
      message.success('Rekonsiliasi bank berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      setIsCreateModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal membuat rekonsiliasi bank');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: reviewBankReconciliation,
    onSuccess: () => {
      message.success('Rekonsiliasi berhasil direview');
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal mereview rekonsiliasi');
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveBankReconciliation,
    onSuccess: () => {
      message.success('Rekonsiliasi berhasil disetujui dan diposting');
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal menyetujui rekonsiliasi');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankReconciliation(id, reason),
    onSuccess: () => {
      message.success('Rekonsiliasi ditolak');
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      setRejectReason('');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal menolak rekonsiliasi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankReconciliation,
    onSuccess: () => {
      message.success('Rekonsiliasi berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal menghapus rekonsiliasi');
    },
  });

  // Filter bank accounts (1-1xxx)
  const bankAccounts = accounts?.filter((acc: ChartOfAccount) => acc.code.startsWith('1-1')) || [];

  // Calculate adjusted balances in form
  const watchedValues = Form.useWatch([], form);
  const calculatedBalances = useMemo(() => {
    if (!watchedValues) return { adjustedBook: 0, adjustedBank: 0, difference: 0, isBalanced: false };

    const bookBalanceEnd = watchedValues.bookBalanceEnd || 0;
    const statementBalance = watchedValues.statementBalance || 0;
    const depositsInTransit = watchedValues.depositsInTransit || 0;
    const outstandingChecks = watchedValues.outstandingChecks || 0;
    const bankCharges = watchedValues.bankCharges || 0;
    const bankInterest = watchedValues.bankInterest || 0;
    const otherAdjustments = watchedValues.otherAdjustments || 0;

    const adjustedBook = bookBalanceEnd + bankInterest - bankCharges + otherAdjustments;
    const adjustedBank = statementBalance + depositsInTransit - outstandingChecks;
    const difference = Math.abs(adjustedBook - adjustedBank);
    const isBalanced = difference < 0.01;

    return { adjustedBook, adjustedBank, difference, isBalanced };
  }, [watchedValues]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        bankAccountId: values.bankAccountId,
        statementDate: values.statementDate.toISOString(),
        periodStartDate: values.periodStartDate.toISOString(),
        periodEndDate: values.periodEndDate.toISOString(),
        statementReference: values.statementReference,
        bookBalanceStart: values.bookBalanceStart || 0,
        bookBalanceEnd: values.bookBalanceEnd,
        statementBalance: values.statementBalance,
        depositsInTransit: values.depositsInTransit || 0,
        outstandingChecks: values.outstandingChecks || 0,
        bankCharges: values.bankCharges || 0,
        bankInterest: values.bankInterest || 0,
        otherAdjustments: values.otherAdjustments || 0,
        adjustedBookBalance: calculatedBalances.adjustedBook,
        adjustedBankBalance: calculatedBalances.adjustedBank,
        notes: values.notes,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      DRAFT: { color: 'default', text: 'Draft' },
      IN_PROGRESS: { color: 'processing', text: 'Proses' },
      REVIEWED: { color: 'blue', text: 'Direview' },
      APPROVED: { color: 'purple', text: 'Disetujui' },
      REJECTED: { color: 'red', text: 'Ditolak' },
      COMPLETED: { color: 'success', text: 'Selesai' },
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleViewDetails = (reconciliation: BankReconciliation) => {
    setSelectedReconciliation(reconciliation);
    setIsViewModalOpen(true);
  };

  const handleReject = (reconciliation: BankReconciliation) => {
    Modal.confirm({
      title: 'Tolak Rekonsiliasi Bank',
      content: (
        <div>
          <p>Masukkan alasan penolakan:</p>
          <TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Masukkan alasan penolakan"
          />
        </div>
      ),
      onOk: () => {
        if (!rejectReason.trim()) {
          message.error('Alasan penolakan harus diisi');
          return Promise.reject();
        }
        return rejectMutation.mutateAsync({ id: reconciliation.id, reason: rejectReason });
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    {
      title: 'No. Rekonsiliasi',
      dataIndex: 'reconciliationNumber',
      key: 'reconciliationNumber',
      width: 180,
      render: (text: string, record: BankReconciliation) => (
        <Button type="link" onClick={() => handleViewDetails(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Tanggal Statement',
      dataIndex: 'statementDate',
      key: 'statementDate',
      width: 130,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Akun Bank',
      key: 'bankAccount',
      render: (_: any, record: BankReconciliation) => (
        <div>
          <div className='font-medium'>{record.bankAccount.code}</div>
          <div className='text-xs text-gray-600'>{record.bankAccount.nameId}</div>
        </div>
      ),
    },
    {
      title: 'Periode',
      key: 'period',
      width: 180,
      render: (_: any, record: BankReconciliation) => (
        <div className='text-xs'>
          {dayjs(record.periodStartDate).format('DD/MM/YY')} - {dayjs(record.periodEndDate).format('DD/MM/YY')}
        </div>
      ),
    },
    {
      title: 'Saldo Statement',
      dataIndex: 'statementBalance',
      key: 'statementBalance',
      width: 150,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{formatCurrency(value)}</Text>
      ),
    },
    {
      title: 'Saldo Buku',
      dataIndex: 'bookBalanceEnd',
      key: 'bookBalanceEnd',
      width: 150,
      align: 'right' as const,
      render: (value: number) => (
        <Text>{formatCurrency(value)}</Text>
      ),
    },
    {
      title: 'Selisih',
      dataIndex: 'difference',
      key: 'difference',
      width: 130,
      align: 'right' as const,
      render: (value: number) => (
        <Text style={{ color: value > 0.01 ? theme.colors.status.error : theme.colors.status.success }}>
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: 'Balanced',
      dataIndex: 'isBalanced',
      key: 'isBalanced',
      width: 100,
      render: (isBalanced: boolean) => (
        isBalanced ? (
          <CheckCircleOutlined style={{ color: theme.colors.status.success, fontSize: '18px' }} />
        ) : (
          <ExclamationCircleOutlined style={{ color: theme.colors.status.error, fontSize: '18px' }} />
        )
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 200,
      render: (_: any, record: BankReconciliation) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {(record.status === 'DRAFT' || record.status === 'IN_PROGRESS') && (
            <>
              <Tooltip title="Review">
                <Button
                  type="text"
                  size="small"
                  icon={<FileTextOutlined />}
                  style={{ color: theme.colors.accent.primary }}
                  onClick={() => reviewMutation.mutate(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title="Hapus rekonsiliasi ini?"
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Tooltip title="Hapus">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'REVIEWED' && (
            <>
              <Tooltip title="Setujui">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  style={{ color: theme.colors.status.success }}
                  onClick={() => {
                    if (!record.isBalanced) {
                      message.warning('Rekonsiliasi harus balanced sebelum disetujui');
                      return;
                    }
                    approveMutation.mutate(record.id);
                  }}
                />
              </Tooltip>
              <Tooltip title="Tolak">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleReject(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
          Rekonsiliasi Bank (Bank Reconciliations)
        </Title>
        <Text type="secondary">
          Kelola rekonsiliasi saldo bank dengan catatan pembukuan
        </Text>
      </div>

      {/* Filters */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        <Space wrap style={{ width: '100%' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Cari nomor rekonsiliasi..."
            style={{ width: 250 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Status"
            style={{ width: 150 }}
            value={status}
            onChange={setStatus}
            allowClear
          >
            <Select.Option value="DRAFT">Draft</Select.Option>
            <Select.Option value="IN_PROGRESS">Proses</Select.Option>
            <Select.Option value="REVIEWED">Direview</Select.Option>
            <Select.Option value="APPROVED">Disetujui</Select.Option>
            <Select.Option value="REJECTED">Ditolak</Select.Option>
            <Select.Option value="COMPLETED">Selesai</Select.Option>
          </Select>
          <Select
            placeholder="Balanced Status"
            style={{ width: 150 }}
            value={isBalanced}
            onChange={setIsBalanced}
            allowClear
          >
            <Select.Option value={true}>Balanced</Select.Option>
            <Select.Option value={false}>Unbalanced</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            format="DD/MM/YYYY"
            placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Buat Rekonsiliasi Bank
          </Button>
        </Space>
      </Card>

      {/* Table / Mobile View */}
      <Card
        style={{
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        {isMobile ? (
          <MobileTableView
            data={mobileData}
            loading={isLoading}
            entityType="bank-reconciliations"
            showQuickStats
            searchable
            searchFields={['number', 'title', 'client.name']}
            filters={mobileFilters}
            actions={mobileActions}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] })}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: limit,
              total: data?.pagination.total || 0,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} rekonsiliasi`,
              onChange: (newPage) => setPage(newPage),
            }}
            scroll={{ x: 1400 }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="Buat Rekonsiliasi Bank Baru"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        width={900}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Akun Bank"
                name="bankAccountId"
                rules={[{ required: true, message: 'Akun bank harus dipilih' }]}
              >
                <Select
                  showSearch
                  placeholder="Pilih akun bank"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {bankAccounts.map((account) => (
                    <Select.Option key={account.id} value={account.id}>
                      {account.code} - {account.nameId}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tanggal Statement"
                name="statementDate"
                rules={[{ required: true, message: 'Tanggal statement harus diisi' }]}
                initialValue={dayjs()}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tanggal Mulai Periode"
                name="periodStartDate"
                rules={[{ required: true, message: 'Tanggal mulai harus diisi' }]}
                initialValue={dayjs().startOf('month')}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tanggal Akhir Periode"
                name="periodEndDate"
                rules={[{ required: true, message: 'Tanggal akhir harus diisi' }]}
                initialValue={dayjs().endOf('month')}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Referensi Statement" name="statementReference">
            <Input placeholder="Nomor referensi bank statement (opsional)" />
          </Form.Item>

          <Divider>Saldo</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Saldo Buku Awal Periode"
                name="bookBalanceStart"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Saldo Buku Akhir Periode"
                name="bookBalanceEnd"
                rules={[
                  { required: true, message: 'Saldo buku harus diisi' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Saldo Bank Statement"
            name="statementBalance"
            rules={[
              { required: true, message: 'Saldo statement harus diisi' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
            />
          </Form.Item>

          <Divider>Item Penyesuaian</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Deposits in Transit"
                name="depositsInTransit"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Outstanding Checks"
                name="outstandingChecks"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Biaya Bank"
                name="bankCharges"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Bunga Bank"
                name="bankInterest"
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Penyesuaian Lainnya"
            name="otherAdjustments"
            initialValue={0}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
            />
          </Form.Item>

          <Divider>Hasil Perhitungan</Divider>

          <Card style={{ marginBottom: '16px', background: '#f5f5f5' }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Saldo Buku (Adjusted)">
                <Text strong style={{ color: theme.colors.accent.primary }}>
                  {formatCurrency(calculatedBalances.adjustedBook)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Saldo Bank (Adjusted)">
                <Text strong style={{ color: theme.colors.accent.primary }}>
                  {formatCurrency(calculatedBalances.adjustedBank)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Selisih">
                <Text strong style={{
                  color: calculatedBalances.difference > 0.01 ? theme.colors.status.error : theme.colors.status.success
                }}>
                  {formatCurrency(calculatedBalances.difference)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {calculatedBalances.isBalanced ? (
                  <Badge status="success" text="Balanced" />
                ) : (
                  <Badge status="error" text="Unbalanced" />
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Form.Item label="Catatan" name="notes">
            <TextArea rows={3} placeholder="Catatan tambahan (opsional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending}
                disabled={!calculatedBalances.isBalanced}
              >
                {calculatedBalances.isBalanced ? 'Buat Rekonsiliasi' : 'Belum Balanced'}
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        title="Detail Rekonsiliasi Bank"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Tutup
          </Button>,
        ]}
      >
        {selectedReconciliation && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="No. Rekonsiliasi" span={2}>
                {selectedReconciliation.reconciliationNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                {getStatusTag(selectedReconciliation.status)}
                {selectedReconciliation.isBalanced ? (
                  <Badge status="success" text="Balanced" style={{ marginLeft: '16px' }} />
                ) : (
                  <Badge status="error" text="Unbalanced" style={{ marginLeft: '16px' }} />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Akun Bank" span={2}>
                {selectedReconciliation.bankAccount.code} - {selectedReconciliation.bankAccount.nameId}
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal Statement">
                {dayjs(selectedReconciliation.statementDate).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Periode">
                {dayjs(selectedReconciliation.periodStartDate).format('DD/MM/YYYY')} - {dayjs(selectedReconciliation.periodEndDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              {selectedReconciliation.statementReference && (
                <Descriptions.Item label="Referensi" span={2}>
                  {selectedReconciliation.statementReference}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider>Saldo</Divider>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="Saldo Buku (Awal)">
                {formatCurrency(selectedReconciliation.bookBalanceStart)}
              </Descriptions.Item>
              <Descriptions.Item label="Saldo Buku (Akhir)">
                <Text strong>{formatCurrency(selectedReconciliation.bookBalanceEnd)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Saldo Bank Statement" span={2}>
                <Text strong>{formatCurrency(selectedReconciliation.statementBalance)}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Item Penyesuaian</Divider>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="Deposits in Transit">
                {formatCurrency(selectedReconciliation.depositsInTransit)}
              </Descriptions.Item>
              <Descriptions.Item label="Outstanding Checks">
                {formatCurrency(selectedReconciliation.outstandingChecks)}
              </Descriptions.Item>
              <Descriptions.Item label="Biaya Bank">
                {formatCurrency(selectedReconciliation.bankCharges)}
              </Descriptions.Item>
              <Descriptions.Item label="Bunga Bank">
                {formatCurrency(selectedReconciliation.bankInterest)}
              </Descriptions.Item>
              <Descriptions.Item label="Penyesuaian Lainnya" span={2}>
                {formatCurrency(selectedReconciliation.otherAdjustments)}
              </Descriptions.Item>
            </Descriptions>

            <Divider>Hasil Rekonsiliasi</Divider>

            <Card style={{ background: '#f5f5f5' }}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Saldo Buku (Adjusted)">
                  <Text strong style={{ color: theme.colors.accent.primary, fontSize: '16px' }}>
                    {formatCurrency(selectedReconciliation.adjustedBookBalance)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Saldo Bank (Adjusted)">
                  <Text strong style={{ color: theme.colors.accent.primary, fontSize: '16px' }}>
                    {formatCurrency(selectedReconciliation.adjustedBankBalance)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Selisih" span={2}>
                  <Text strong style={{
                    fontSize: '18px',
                    color: selectedReconciliation.difference > 0.01 ? theme.colors.status.error : theme.colors.status.success
                  }}>
                    {formatCurrency(selectedReconciliation.difference)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {selectedReconciliation.notes && (
              <>
                <Divider>Catatan</Divider>
                <Text>{selectedReconciliation.notes}</Text>
              </>
            )}

            {selectedReconciliation.rejectionReason && (
              <>
                <Divider>Alasan Penolakan</Divider>
                <Text type="danger">{selectedReconciliation.rejectionReason}</Text>
              </>
            )}

            {selectedReconciliation.reconciliationItems && selectedReconciliation.reconciliationItems.length > 0 && (
              <>
                <Divider>Item Rekonsiliasi</Divider>
                <Table
                  dataSource={selectedReconciliation.reconciliationItems}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Tanggal',
                      dataIndex: 'itemDate',
                      width: 100,
                      render: (date: string) => dayjs(date).format('DD/MM/YY'),
                    },
                    {
                      title: 'Tipe',
                      dataIndex: 'itemType',
                      width: 150,
                    },
                    {
                      title: 'Deskripsi',
                      dataIndex: 'descriptionId',
                      ellipsis: true,
                    },
                    {
                      title: 'Jumlah',
                      dataIndex: 'amount',
                      width: 130,
                      align: 'right' as const,
                      render: (value: number) => formatCurrency(value),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      width: 100,
                      render: (status: string) => (
                        <Tag color={status === 'MATCHED' ? 'success' : 'default'}>
                          {status}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankReconciliationsPage;
