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
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useTheme } from '../../theme';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';
import { bankTransferToBusinessEntity } from '../../adapters/mobileTableAdapters';
import {
  approveBankTransfer,
  type BankTransfer,
  cancelBankTransfer,
  type ChartOfAccount,
  createBankTransfer,
  deleteBankTransfer,
  getBankTransfers,
  getChartOfAccounts,
  rejectBankTransfer,
} from '../../services/accounting';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const BankTransfersPage: React.FC = () => {
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
  const [transferMethod, setTransferMethod] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<BankTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch bank transfers
  const { data, isLoading } = useQuery({
    queryKey: [
      'bank-transfers',
      page,
      limit,
      search,
      status,
      transferMethod,
      dateRange,
    ],
    queryFn: () =>
      getBankTransfers({
        page,
        limit,
        search,
        status: status as any,
        transferMethod: transferMethod as any,
        startDate: dateRange?.[0].format('YYYY-MM-DD'),
        endDate: dateRange?.[1].format('YYYY-MM-DD'),
        sortBy: 'transferDate',
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
    mutationFn: createBankTransfer,
    onSuccess: () => {
      message.success('Transfer bank berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
      setIsCreateModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Gagal membuat transfer bank');
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveBankTransfer,
    onSuccess: () => {
      message.success('Transfer bank berhasil disetujui dan diposting');
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Gagal menyetujui transfer bank');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankTransfer(id, reason),
    onSuccess: () => {
      message.success('Transfer bank ditolak');
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
      setRejectReason('');
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Gagal menolak transfer bank');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBankTransfer,
    onSuccess: () => {
      message.success('Transfer bank berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Gagal membatalkan transfer bank');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankTransfer,
    onSuccess: () => {
      message.success('Transfer bank berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Gagal menghapus transfer bank');
    },
  });

  // Filter bank accounts (1-1xxx)
  const bankAccounts = accounts?.filter((acc: ChartOfAccount) => acc.code.startsWith('1-1')) || [];
  const expenseAccounts = accounts?.filter((acc: ChartOfAccount) =>
    acc.accountType === 'EXPENSE' && acc.accountSubType === 'BANK_CHARGES'
  ) || [];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate({
        transferDate: values.transferDate.toISOString(),
        amount: values.amount,
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        description: values.description,
        descriptionId: values.descriptionId || values.description,
        reference: values.reference,
        transferMethod: values.transferMethod || 'INTERNAL',
        transferFee: values.transferFee || 0,
        feeAccountId: values.feeAccountId,
        feePaymentMethod: values.feePaymentMethod || 'FROM_SOURCE',
        bankReference: values.bankReference,
        confirmationCode: values.confirmationCode,
        notes: values.notes,
        status: 'PENDING',
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: 'Menunggu' },
      APPROVED: { color: 'blue', text: 'Disetujui' },
      IN_PROGRESS: { color: 'processing', text: 'Proses' },
      COMPLETED: { color: 'success', text: 'Selesai' },
      FAILED: { color: 'error', text: 'Gagal' },
      REJECTED: { color: 'red', text: 'Ditolak' },
      CANCELLED: { color: 'default', text: 'Dibatalkan' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTransferMethodTag = (method: string) => {
    const methodConfig: Record<string, { color: string; text: string }> = {
      INTERNAL: { color: 'blue', text: 'Internal' },
      INTERBANK: { color: 'purple', text: 'Antar Bank' },
      RTGS: { color: 'orange', text: 'RTGS' },
      CLEARING: { color: 'cyan', text: 'Kliring' },
      SKN: { color: 'geekblue', text: 'SKN' },
      BIFAST: { color: 'magenta', text: 'BI-FAST' },
      OTHER: { color: 'default', text: 'Lainnya' },
    };
    const config = methodConfig[method] || methodConfig.INTERNAL;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const handleViewDetails = (transfer: BankTransfer) => {
    setSelectedTransfer(transfer);
    setIsViewModalOpen(true);
  };

  const handleReject = (transfer: BankTransfer) => {
    Modal.confirm({
      title: 'Tolak Transfer Bank',
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
        return rejectMutation.mutateAsync({ id: transfer.id, reason: rejectReason });
      },
    });
  };

  // Mobile view data
  const transfers = data?.data || [];

  const mobileData = useMemo(() =>
    transfers.map(bankTransferToBusinessEntity),
    [transfers]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        const transfer = transfers.find((t: BankTransfer) => t.id === record.id);
        if (transfer) {
          handleViewDetails(transfer);
        }
      },
    },
    {
      key: 'approve',
      label: 'Setujui',
      icon: <CheckOutlined />,
      visible: (record) => record.status === 'draft', // PENDING maps to draft in adapter
      onClick: (record) => {
        approveMutation.mutate(record.id);
      },
    },
    {
      key: 'reject',
      label: 'Tolak',
      icon: <CloseOutlined />,
      danger: true,
      visible: (record) => record.status === 'draft', // PENDING maps to draft in adapter
      onClick: (record) => {
        const transfer = transfers.find((t: BankTransfer) => t.id === record.id);
        if (transfer) {
          handleReject(transfer);
        }
      },
    },
    {
      key: 'cancel',
      label: 'Batalkan',
      icon: <StopOutlined />,
      danger: true,
      visible: (record) => {
        const transfer = transfers.find((t: BankTransfer) => t.id === record.id);
        return transfer && (transfer.status === 'APPROVED' || transfer.status === 'IN_PROGRESS');
      },
      confirmMessage: 'Batalkan transfer ini?',
      onClick: (record) => {
        cancelMutation.mutate(record.id);
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      visible: (record) => record.status === 'draft', // PENDING maps to draft in adapter
      confirmMessage: 'Hapus transfer ini?',
      onClick: (record) => {
        deleteMutation.mutate(record.id);
      },
    },
  ], [transfers, approveMutation, cancelMutation, deleteMutation]);

  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Semua Status', value: '' },
        { label: 'Menunggu', value: 'PENDING' },
        { label: 'Disetujui', value: 'APPROVED' },
        { label: 'Proses', value: 'IN_PROGRESS' },
        { label: 'Selesai', value: 'COMPLETED' },
        { label: 'Gagal', value: 'FAILED' },
        { label: 'Ditolak', value: 'REJECTED' },
        { label: 'Dibatalkan', value: 'CANCELLED' },
      ],
      value: status || '',
      onChange: (value) => setStatus(value || undefined),
    },
    {
      key: 'transferMethod',
      label: 'Metode',
      type: 'select',
      options: [
        { label: 'Semua Metode', value: '' },
        { label: 'Internal', value: 'INTERNAL' },
        { label: 'Antar Bank', value: 'INTERBANK' },
        { label: 'RTGS', value: 'RTGS' },
        { label: 'Kliring', value: 'CLEARING' },
        { label: 'SKN', value: 'SKN' },
        { label: 'BI-FAST', value: 'BIFAST' },
        { label: 'Lainnya', value: 'OTHER' },
      ],
      value: transferMethod || '',
      onChange: (value) => setTransferMethod(value || undefined),
    },
  ], [status, transferMethod]);

  const columns = [
    {
      title: 'No. Transfer',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      width: 180,
      render: (text: string, record: BankTransfer) => (
        <Button type="link" onClick={() => handleViewDetails(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'transferDate',
      key: 'transferDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Transfer',
      key: 'transfer',
      render: (_: unknown, record: BankTransfer) => (
        <div>
          <div className='text-xs text-gray-600 mb-1'>Dari:</div>
          <div className='text-sm font-medium mb-2'>
            {record.fromAccount.code} - {record.fromAccount.nameId}
          </div>
          <div className='text-xs text-gray-600 mb-1'>Ke:</div>
          <div className='text-sm font-medium'>
            {record.toAccount.code} - {record.toAccount.nameId}
          </div>
        </div>
      ),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'descriptionId',
      key: 'descriptionId',
      ellipsis: true,
    },
    {
      title: 'Metode',
      dataIndex: 'transferMethod',
      key: 'transferMethod',
      width: 120,
      render: (method: string) => getTransferMethodTag(method),
    },
    {
      title: 'Jumlah',
      key: 'amount',
      width: 180,
      align: 'right' as const,
      render: (_: unknown, record: BankTransfer) => (
        <div>
          <div>
            <Text strong style={{ color: theme.colors.text.primary }}>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(record.amount)}
            </Text>
          </div>
          {record.transferFee && parseFloat(record.transferFee.toString()) > 0 && (
            <div className='text-xs text-gray-500'>
              Biaya: {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(parseFloat(record.transferFee.toString()))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: BankTransfer) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {record.status === 'PENDING' && (
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
              <Popconfirm
                title="Hapus transfer ini?"
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Tooltip title="Hapus">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {(record.status === 'APPROVED' || record.status === 'IN_PROGRESS') && (
            <Popconfirm
              title="Batalkan transfer ini?"
              onConfirm={() => cancelMutation.mutate(record.id)}
            >
              <Tooltip title="Batalkan">
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
          Transfer Bank (Bank Transfers)
        </Title>
        <Text type="secondary">
          Kelola transfer antar rekening bank dan akun kas
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
            placeholder="Cari nomor transfer, deskripsi..."
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
            <Select.Option value="PENDING">Menunggu</Select.Option>
            <Select.Option value="APPROVED">Disetujui</Select.Option>
            <Select.Option value="IN_PROGRESS">Proses</Select.Option>
            <Select.Option value="COMPLETED">Selesai</Select.Option>
            <Select.Option value="FAILED">Gagal</Select.Option>
            <Select.Option value="REJECTED">Ditolak</Select.Option>
            <Select.Option value="CANCELLED">Dibatalkan</Select.Option>
          </Select>
          <Select
            placeholder="Metode Transfer"
            style={{ width: 150 }}
            value={transferMethod}
            onChange={setTransferMethod}
            allowClear
          >
            <Select.Option value="INTERNAL">Internal</Select.Option>
            <Select.Option value="INTERBANK">Antar Bank</Select.Option>
            <Select.Option value="RTGS">RTGS</Select.Option>
            <Select.Option value="CLEARING">Kliring</Select.Option>
            <Select.Option value="SKN">SKN</Select.Option>
            <Select.Option value="BIFAST">BI-FAST</Select.Option>
            <Select.Option value="OTHER">Lainnya</Select.Option>
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
            Buat Transfer Bank
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
            entityType="bank-transfers"
            showQuickStats
            searchable
            searchFields={['number', 'title', 'client.name']}
            filters={mobileFilters}
            actions={mobileActions}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['bank-transfers'] })}
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
              showTotal: (total) => `Total ${total} transfer`,
              onChange: (newPage) => setPage(newPage),
            }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="Buat Transfer Bank Baru"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        width={700}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Tanggal Transfer"
            name="transferDate"
            rules={[{ required: true, message: 'Tanggal harus diisi' }]}
            initialValue={dayjs()}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Dari Akun (Debit)"
            name="fromAccountId"
            rules={[{ required: true, message: 'Akun sumber harus dipilih' }]}
          >
            <Select
              showSearch
              placeholder="Pilih akun sumber"
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

          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <SwapOutlined style={{ fontSize: '24px', color: theme.colors.accent.primary }} />
          </div>

          <Form.Item
            label="Ke Akun (Credit)"
            name="toAccountId"
            rules={[{ required: true, message: 'Akun tujuan harus dipilih' }]}
          >
            <Select
              showSearch
              placeholder="Pilih akun tujuan"
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

          <Form.Item
            label="Jumlah Transfer"
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
            label="Metode Transfer"
            name="transferMethod"
            initialValue="INTERNAL"
          >
            <Select>
              <Select.Option value="INTERNAL">Internal</Select.Option>
              <Select.Option value="INTERBANK">Antar Bank</Select.Option>
              <Select.Option value="RTGS">RTGS</Select.Option>
              <Select.Option value="CLEARING">Kliring</Select.Option>
              <Select.Option value="SKN">SKN</Select.Option>
              <Select.Option value="BIFAST">BI-FAST</Select.Option>
              <Select.Option value="OTHER">Lainnya</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Biaya Transfer (Opsional)"
            name="transferFee"
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/Rp\s?|(,*)/g, '') as any}
              min={0}
            />
          </Form.Item>

          <Form.Item
            label="Akun Biaya Transfer"
            name="feeAccountId"
          >
            <Select
              showSearch
              placeholder="Pilih akun biaya (opsional)"
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            >
              {expenseAccounts.map((account) => (
                <Select.Option key={account.id} value={account.id}>
                  {account.code} - {account.nameId}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Deskripsi (Bahasa Indonesia)"
            name="descriptionId"
            rules={[{ required: true, message: 'Deskripsi harus diisi' }]}
          >
            <TextArea rows={2} placeholder="Contoh: Transfer dana operasional ke rekening BCA" />
          </Form.Item>

          <Form.Item label="Deskripsi (English)" name="description">
            <TextArea rows={2} placeholder="Example: Transfer operational funds to BCA account" />
          </Form.Item>

          <Form.Item label="Referensi Bank" name="bankReference">
            <Input placeholder="Nomor referensi dari bank (opsional)" />
          </Form.Item>

          <Form.Item label="Kode Konfirmasi" name="confirmationCode">
            <Input placeholder="Kode konfirmasi transfer (opsional)" />
          </Form.Item>

          <Form.Item label="Referensi" name="reference">
            <Input placeholder="Nomor referensi internal (opsional)" />
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
                Buat Transfer
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        title="Detail Transfer Bank"
        open={isViewModalOpen}
        onCancel={() => setIsViewModalOpen(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setIsViewModalOpen(false)}>
            Tutup
          </Button>,
        ]}
      >
        {selectedTransfer && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>No. Transfer:</Text> {selectedTransfer.transferNumber}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Status:</Text> {getStatusTag(selectedTransfer.status)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Metode Transfer:</Text> {getTransferMethodTag(selectedTransfer.transferMethod)}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Tanggal:</Text>{' '}
              {dayjs(selectedTransfer.transferDate).format('DD MMMM YYYY')}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Dari Akun:</Text>{' '}
              {selectedTransfer.fromAccount.code} - {selectedTransfer.fromAccount.nameId}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Ke Akun:</Text>{' '}
              {selectedTransfer.toAccount.code} - {selectedTransfer.toAccount.nameId}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Jumlah Transfer:</Text>{' '}
              <Text style={{ color: theme.colors.accent.primary, fontSize: '18px', fontWeight: 'bold' }}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(selectedTransfer.amount)}
              </Text>
            </div>
            {selectedTransfer.transferFee && parseFloat(selectedTransfer.transferFee.toString()) > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Biaya Transfer:</Text>{' '}
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(parseFloat(selectedTransfer.transferFee.toString()))}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Deskripsi:</Text> {selectedTransfer.descriptionId}
            </div>
            {selectedTransfer.reference && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Referensi:</Text> {selectedTransfer.reference}
              </div>
            )}
            {selectedTransfer.bankReference && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Referensi Bank:</Text> {selectedTransfer.bankReference}
              </div>
            )}
            {selectedTransfer.confirmationCode && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Kode Konfirmasi:</Text> {selectedTransfer.confirmationCode}
              </div>
            )}
            {selectedTransfer.notes && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Catatan:</Text> {selectedTransfer.notes}
              </div>
            )}
            {selectedTransfer.rejectionReason && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong style={{ color: theme.colors.status.error }}>
                  Alasan Penolakan:
                </Text>{' '}
                {selectedTransfer.rejectionReason}
              </div>
            )}
            {selectedTransfer.journalEntryId && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Journal Entry ID:</Text> {selectedTransfer.journalEntryId}
              </div>
            )}
            {selectedTransfer.approvedAt && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Disetujui pada:</Text>{' '}
                {dayjs(selectedTransfer.approvedAt).format('DD MMMM YYYY HH:mm')}
              </div>
            )}
            {selectedTransfer.completedAt && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Diselesaikan pada:</Text>{' '}
                {dayjs(selectedTransfer.completedAt).format('DD MMMM YYYY HH:mm')}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankTransfersPage;
