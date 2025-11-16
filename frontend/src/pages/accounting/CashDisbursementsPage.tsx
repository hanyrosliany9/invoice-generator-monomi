import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useTheme } from '../../theme';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';
import { cashDisbursementToBusinessEntity } from '../../adapters/mobileTableAdapters';
import {
  approveCashTransaction,
  type CashTransaction,
  type ChartOfAccount,
  createCashTransaction,
  deleteCashTransaction,
  getCashTransactions,
  getChartOfAccounts,
  rejectCashTransaction,
  submitCashTransaction,
  voidCashTransaction,
} from '../../services/accounting';
import { getErrorMessage } from '../../utils/errorHandling';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const CashDisbursementsPage: React.FC = () => {
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
  const [category, setCategory] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch cash disbursements (only DISBURSEMENT type)
  const { data, isLoading } = useQuery({
    queryKey: [
      'cash-transactions',
      'DISBURSEMENT',
      page,
      limit,
      search,
      status,
      category,
      dateRange,
    ],
    queryFn: () =>
      getCashTransactions({
        page,
        limit,
        search,
        transactionType: 'DISBURSEMENT',
        status: status as any,
        category: category as any,
        startDate: dateRange?.[0].format('YYYY-MM-DD'),
        endDate: dateRange?.[1].format('YYYY-MM-DD'),
        sortBy: 'transactionDate',
        sortOrder: 'desc',
      }),
  });

  // Fetch chart of accounts for form
  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCashTransaction,
    onSuccess: () => {
      message.success('Pengeluaran kas berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      setIsCreateModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal membuat pengeluaran kas'));
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitCashTransaction,
    onSuccess: () => {
      message.success('Pengeluaran kas berhasil diajukan');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal mengajukan pengeluaran kas'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveCashTransaction,
    onSuccess: () => {
      message.success('Pengeluaran kas berhasil disetujui dan diposting');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal menyetujui pengeluaran kas'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectCashTransaction(id, reason),
    onSuccess: () => {
      message.success('Pengeluaran kas ditolak');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
      setRejectReason('');
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal menolak pengeluaran kas'));
    },
  });

  const voidMutation = useMutation({
    mutationFn: voidCashTransaction,
    onSuccess: () => {
      message.success('Pengeluaran kas berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal membatalkan pengeluaran kas'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCashTransaction,
    onSuccess: () => {
      message.success('Pengeluaran kas berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['cash-transactions'] });
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal menghapus pengeluaran kas'));
    },
  });

  // Filter cash and expense accounts
  const cashAccounts = accounts?.filter((acc: ChartOfAccount) => acc.code.startsWith('1-1')) || [];
  const expenseAccounts = accounts?.filter((acc: ChartOfAccount) =>
    acc.accountType === 'EXPENSE' ||
    (acc.accountType === 'EQUITY' && acc.accountSubType === 'DRAWING')
  ) || [];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        transactionType: 'DISBURSEMENT',
        category: values.category,
        transactionDate: values.transactionDate.toISOString(),
        amount: values.amount,
        cashAccountId: values.cashAccountId,
        offsetAccountId: values.offsetAccountId,
        description: values.description,
        descriptionId: values.descriptionId || values.description,
        reference: values.reference,
        paymentMethod: values.paymentMethod || 'CASH',
        checkNumber: values.checkNumber,
        bankReference: values.bankReference,
        notes: values.notes,
        status: values.submitNow ? 'SUBMITTED' : 'DRAFT',
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      DRAFT: { color: 'default', text: 'Draft' },
      SUBMITTED: { color: 'processing', text: 'Diajukan' },
      APPROVED: { color: 'success', text: 'Disetujui' },
      REJECTED: { color: 'error', text: 'Ditolak' },
      POSTED: { color: 'success', text: 'Posted' },
      VOID: { color: 'default', text: 'Void' },
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getCategoryTag = (category: string) => {
    const categoryConfig: Record<string, { color: string; text: string }> = {
      OPERATING: { color: 'blue', text: 'Operasional' },
      INVESTING: { color: 'purple', text: 'Investasi' },
      FINANCING: { color: 'orange', text: 'Pendanaan' },
    };
    const config = categoryConfig[category] || categoryConfig.OPERATING;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleViewDetails = (transaction: CashTransaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };

  const handleReject = (transaction: CashTransaction) => {
    Modal.confirm({
      title: 'Tolak Pengeluaran Kas',
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
        return rejectMutation.mutateAsync({ id: transaction.id, reason: rejectReason });
      },
    });
  };

  // Mobile view data
  const disbursements = data?.data || [];

  const mobileData = useMemo(() =>
    disbursements.map(cashDisbursementToBusinessEntity),
    [disbursements]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        const transaction = disbursements.find((t: CashTransaction) => t.id === record.id);
        if (transaction) {
          handleViewDetails(transaction);
        }
      },
    },
    {
      key: 'submit',
      label: 'Ajukan',
      icon: <SendOutlined />,
      visible: (record) => record.status === 'draft',
      onClick: (record) => {
        submitMutation.mutate(record.id);
      },
    },
    {
      key: 'approve',
      label: 'Setujui',
      icon: <CheckOutlined />,
      visible: (record) => record.status === 'approved', // MobileTableView maps SUBMITTED to 'approved'
      onClick: (record) => {
        approveMutation.mutate(record.id);
      },
    },
    {
      key: 'reject',
      label: 'Tolak',
      icon: <CloseOutlined />,
      danger: true,
      visible: (record) => record.status === 'approved', // MobileTableView maps SUBMITTED to 'approved'
      onClick: (record) => {
        const transaction = disbursements.find((t: CashTransaction) => t.id === record.id);
        if (transaction) {
          handleReject(transaction);
        }
      },
    },
    {
      key: 'void',
      label: 'Void',
      icon: <StopOutlined />,
      danger: true,
      visible: (record) => record.status === 'declined', // MobileTableView maps POSTED/VOID to 'declined'
      confirmMessage: 'Batalkan pengeluaran kas ini? Jurnal entry akan direverse.',
      onClick: (record) => {
        voidMutation.mutate(record.id);
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      visible: (record) => record.status === 'draft',
      confirmMessage: 'Hapus pengeluaran kas ini?',
      onClick: (record) => {
        deleteMutation.mutate(record.id);
      },
    },
  ], [disbursements, submitMutation, approveMutation, deleteMutation, voidMutation]);

  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Semua Status', value: '' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Diajukan', value: 'SUBMITTED' },
        { label: 'Posted', value: 'POSTED' },
        { label: 'Ditolak', value: 'REJECTED' },
        { label: 'Void', value: 'VOID' },
      ],
    },
    {
      key: 'category',
      label: 'Kategori',
      type: 'select' as const,
      options: [
        { label: 'Semua Kategori', value: '' },
        { label: 'Operasional', value: 'OPERATING' },
        { label: 'Investasi', value: 'INVESTING' },
        { label: 'Pendanaan', value: 'FINANCING' },
      ],
    },
  ], []);

  const columns = [
    {
      title: 'No. Transaksi',
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      width: 180,
      render: (text: string, record: CashTransaction) => (
        <Button type="link" onClick={() => handleViewDetails(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'descriptionId',
      key: 'descriptionId',
      ellipsis: true,
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (category: string) => getCategoryTag(category),
    },
    {
      title: 'Jumlah',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.error }}>
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount)}
        </Text>
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
      render: (_: unknown, record: CashTransaction) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'DRAFT' && (
            <>
              <Tooltip title="Ajukan">
                <Button
                  type="text"
                  size="small"
                  icon={<SendOutlined />}
                  onClick={() => submitMutation.mutate(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title="Hapus pengeluaran kas ini?"
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Tooltip title="Hapus">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'SUBMITTED' && (
            <>
              <Tooltip title="Setujui">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  style={{ color: theme.colors.status.success }}
                  onClick={() => approveMutation.mutate(record.id)}
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
          {record.status === 'POSTED' && (
            <Popconfirm
              title="Batalkan pengeluaran kas ini?"
              description="Jurnal entry akan direverse."
              onConfirm={() => voidMutation.mutate(record.id)}
            >
              <Tooltip title="Void">
                <Button type="text" size="small" danger icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
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
          Pengeluaran Kas (Cash Disbursements)
        </Title>
        <Text type="secondary">
          Kelola pengeluaran kas keluar untuk berbagai keperluan operasional
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
            placeholder="Cari nomor transaksi, deskripsi..."
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
            <Select.Option value="SUBMITTED">Diajukan</Select.Option>
            <Select.Option value="POSTED">Posted</Select.Option>
            <Select.Option value="REJECTED">Ditolak</Select.Option>
            <Select.Option value="VOID">Void</Select.Option>
          </Select>
          <Select
            placeholder="Kategori"
            style={{ width: 150 }}
            value={category}
            onChange={setCategory}
            allowClear
          >
            <Select.Option value="OPERATING">Operasional</Select.Option>
            <Select.Option value="INVESTING">Investasi</Select.Option>
            <Select.Option value="FINANCING">Pendanaan</Select.Option>
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
            Buat Pengeluaran Kas
          </Button>
        </Space>
      </Card>

      {/* Table */}
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
            entityType="cash-disbursements"
            showQuickStats
            searchable
            searchFields={['number', 'title']}
            filters={mobileFilters}
            actions={mobileActions}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['cash-transactions'] })}
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
              showTotal: (total) => `Total ${total} transaksi`,
              onChange: (newPage) => setPage(newPage),
            }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="Buat Pengeluaran Kas Baru"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        width={700}
        footer={null}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Tanggal Transaksi"
            name="transactionDate"
            rules={[{ required: true, message: 'Tanggal harus diisi' }]}
            initialValue={dayjs()}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Kategori"
            name="category"
            rules={[{ required: true, message: 'Kategori harus dipilih' }]}
            initialValue="OPERATING"
          >
            <Select>
              <Select.Option value="OPERATING">Operasional</Select.Option>
              <Select.Option value="INVESTING">Investasi</Select.Option>
              <Select.Option value="FINANCING">Pendanaan</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Akun Kas/Bank (Credit)"
            name="cashAccountId"
            rules={[{ required: true, message: 'Akun kas harus dipilih' }]}
          >
            <Select
              showSearch
              placeholder="Pilih akun kas/bank"
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {cashAccounts.map((account) => (
                <Select.Option key={account.id} value={account.id}>
                  {account.code} - {account.nameId}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Akun Beban/Biaya (Debit)"
            name="offsetAccountId"
            rules={[{ required: true, message: 'Akun beban harus dipilih' }]}
          >
            <Select
              showSearch
              placeholder="Pilih akun beban/biaya"
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {expenseAccounts.map((account) => (
                <Select.Option key={account.id} value={account.id}>
                  {account.code} - {account.nameId}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Jumlah"
            name="amount"
            rules={[
              { required: true, message: 'Jumlah harus diisi' },
              { type: 'number', min: 0, message: 'Jumlah harus positif' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
              min={0}
            />
          </Form.Item>

          <Form.Item
            label="Deskripsi (Bahasa Indonesia)"
            name="descriptionId"
            rules={[{ required: true, message: 'Deskripsi harus diisi' }]}
          >
            <TextArea rows={2} placeholder="Contoh: Pembayaran biaya listrik bulan Januari" />
          </Form.Item>

          <Form.Item label="Deskripsi (English)" name="description">
            <TextArea rows={2} placeholder="Example: Electricity payment for January" />
          </Form.Item>

          <Form.Item label="Referensi" name="reference">
            <Input placeholder="Nomor referensi eksternal (opsional)" />
          </Form.Item>

          <Form.Item
            label="Metode Pembayaran"
            name="paymentMethod"
            initialValue="CASH"
          >
            <Select>
              <Select.Option value="CASH">Tunai</Select.Option>
              <Select.Option value="BANK_TRANSFER">Transfer Bank</Select.Option>
              <Select.Option value="CHEQUE">Cek</Select.Option>
              <Select.Option value="E_WALLET">E-Wallet</Select.Option>
              <Select.Option value="OTHER">Lainnya</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="Catatan" name="notes">
            <TextArea rows={2} placeholder="Catatan tambahan (opsional)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending}
              >
                Simpan sebagai Draft
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        title="Detail Pengeluaran Kas"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Tutup
          </Button>,
        ]}
      >
        {selectedTransaction && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>No. Transaksi:</Text> {selectedTransaction.transactionNumber}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Status:</Text> {getStatusTag(selectedTransaction.status)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Kategori:</Text> {getCategoryTag(selectedTransaction.category)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Tanggal:</Text>{' '}
              {dayjs(selectedTransaction.transactionDate).format('DD MMMM YYYY')}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Jumlah:</Text>{' '}
              <Text style={{ color: theme.colors.status.error, fontSize: '18px', fontWeight: 'bold' }}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(selectedTransaction.amount)}
              </Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Akun Beban (Debit):</Text>{' '}
              {selectedTransaction.offsetAccount.code} - {selectedTransaction.offsetAccount.nameId}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Akun Kas (Credit):</Text>{' '}
              {selectedTransaction.cashAccount.code} - {selectedTransaction.cashAccount.nameId}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Deskripsi:</Text> {selectedTransaction.descriptionId}
            </div>
            {selectedTransaction.reference && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Referensi:</Text> {selectedTransaction.reference}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Metode Pembayaran:</Text> {selectedTransaction.paymentMethod}
            </div>
            {selectedTransaction.notes && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Catatan:</Text> {selectedTransaction.notes}
              </div>
            )}
            {selectedTransaction.rejectionReason && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ color: theme.colors.status.error }}>
                  Alasan Penolakan:
                </Text>{' '}
                {selectedTransaction.rejectionReason}
              </div>
            )}
            {selectedTransaction.journalEntryId && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Journal Entry ID:</Text> {selectedTransaction.journalEntryId}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashDisbursementsPage;
