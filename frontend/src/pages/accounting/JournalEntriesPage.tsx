import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  deleteJournalEntry,
  getJournalEntries,
  JournalEntry,
  postJournalEntry,
  reverseJournalEntry,
} from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const JournalEntriesPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      'journal-entries',
      page,
      pageSize,
      searchText,
      filterStatus,
      filterType,
      dateRange,
    ],
    queryFn: () =>
      getJournalEntries({
        page,
        limit: pageSize,
        search: searchText || undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        transactionType: filterType !== 'ALL' ? filterType : undefined,
        startDate: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        endDate: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        sortBy: 'entryDate',
        sortOrder: 'desc',
      }),
  });

  const entries = data?.data || [];
  const pagination = data?.pagination;

  // Mutations
  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: () => {
      message.success('Jurnal entry berhasil diposting ke buku besar');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      if (selectedEntry) {
        queryClient.invalidateQueries({ queryKey: ['journal-entry', selectedEntry.id] });
        setDetailsVisible(false);
        setSelectedEntry(null);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal memposting jurnal entry');
    },
  });

  const reverseMutation = useMutation({
    mutationFn: reverseJournalEntry,
    onSuccess: (reversingEntry) => {
      message.success(`Entry pembalik berhasil dibuat: ${reversingEntry.entryNumber}`);
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setDetailsVisible(false);
      setSelectedEntry(null);
      // Show the reversing entry
      showDetails(reversingEntry);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal membuat entry pembalik');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => {
      message.success('Jurnal entry berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      setDetailsVisible(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Gagal menghapus jurnal entry');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionTypeName = (type: string) => {
    const names: Record<string, string> = {
      INVOICE_SENT: 'Faktur Terkirim',
      PAYMENT_RECEIVED: 'Pembayaran Diterima',
      EXPENSE_SUBMITTED: 'Beban Diajukan',
      PAYMENT_MADE: 'Pembayaran Dilakukan',
      DEPRECIATION: 'Penyusutan',
      ECL_PROVISION: 'Penyisihan Piutang',
      ECL_REVERSAL: 'Pembalikan Penyisihan',
      ADJUSTMENT: 'Penyesuaian',
      REVENUE_RECOGNITION: 'Pengakuan Pendapatan',
      DEFERRED_REVENUE: 'Pendapatan Ditangguhkan',
      WIP_RECOGNITION: 'Pengakuan WIP',
      TAX_PROVISION: 'Provisi Pajak',
      MANUAL: 'Manual',
    };
    return names[type] || type;
  };

  const showDetails = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setDetailsVisible(true);
  };

  const handleCreateEntry = () => {
    navigate('/accounting/journal-entries/create');
  };

  const handleEditEntry = () => {
    if (selectedEntry) {
      navigate(`/accounting/journal-entries/${selectedEntry.id}/edit`);
    }
  };

  const handlePostEntry = () => {
    if (selectedEntry) {
      postMutation.mutate(selectedEntry.id);
    }
  };

  const handleReverseEntry = () => {
    if (selectedEntry) {
      reverseMutation.mutate(selectedEntry.id);
    }
  };

  const handleDeleteEntry = () => {
    if (selectedEntry) {
      deleteMutation.mutate(selectedEntry.id);
    }
  };

  const columns = [
    {
      title: 'No. Jurnal',
      dataIndex: 'entryNumber',
      key: 'entryNumber',
      width: 150,
      render: (entryNumber: string) => (
        <Text strong style={{ color: theme.colors.accent.primary }}>
          {entryNumber}
        </Text>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'descriptionId',
      key: 'descriptionId',
      ellipsis: true,
      render: (descId: string, record: JournalEntry) => (
        <Tooltip title={descId || record.description}>
          <Text>{descId || record.description}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Tipe Transaksi',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 180,
      render: (type: string) => (
        <Tag color="blue">{getTransactionTypeName(type)}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string, record: JournalEntry) => (
        <Space direction="vertical" size="small" align="center">
          {record.isPosted ? (
            <Badge
              status="success"
              text={
                <Text style={{ fontSize: '12px' }}>
                  Posted
                </Text>
              }
            />
          ) : (
            <Badge
              status="default"
              text={
                <Text style={{ fontSize: '12px' }}>
                  Draft
                </Text>
              }
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 150,
      align: 'right' as const,
      render: (record: JournalEntry) => {
        const total = record.lineItems.reduce((sum, item) => sum + item.debitAmount, 0);
        return (
          <Text strong style={{ color: theme.colors.status.success }}>
            {formatCurrency(total)}
          </Text>
        );
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (record: JournalEntry) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetails(record)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
            <FileTextOutlined /> Jurnal Umum (Journal Entries)
          </Title>
          <Text type="secondary">
            Semua transaksi jurnal dengan sistem pembukuan berpasangan
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateEntry}
          size="large"
        >
          Buat Entry Manual
        </Button>
      </div>

      {/* Filters */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.background.primary,
          borderColor: theme.colors.border.default,
        }}
      >
        <Space wrap size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Cari no. jurnal atau deskripsi..."
            prefix={<SearchOutlined style={{ color: theme.colors.text.secondary }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            format="DD/MM/YYYY"
            placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 150 }}
            placeholder="Filter Status"
          >
            <Option value="ALL">Semua Status</Option>
            <Option value="DRAFT">Draft</Option>
            <Option value="POSTED">Posted</Option>
          </Select>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 180 }}
            placeholder="Filter Tipe"
          >
            <Option value="ALL">Semua Tipe</Option>
            <Option value="INVOICE">Faktur</Option>
            <Option value="PAYMENT_RECEIVED">Pembayaran Diterima</Option>
            <Option value="EXPENSE">Beban</Option>
            <Option value="PAYMENT_MADE">Pembayaran Dilakukan</Option>
          </Select>
        </Space>
      </Card>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card
          size="small"
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Space>
            <FileTextOutlined style={{ fontSize: '24px', color: theme.colors.accent.primary }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary}}>
                {pagination?.total || 0}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Total Jurnal
              </Text>
            </div>
          </Space>
        </Card>
        <Card
          size="small"
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Space>
            <CheckCircleOutlined style={{ fontSize: '24px', color: theme.colors.status.success }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary}}>
                {entries.filter((e) => e.isPosted).length}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Posted
              </Text>
            </div>
          </Space>
        </Card>
        <Card
          size="small"
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Space>
            <ClockCircleOutlined style={{ fontSize: '24px', color: theme.colors.status.warning }} />
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary}}>
                {entries.filter((e) => !e.isPosted).length}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Draft
              </Text>
            </div>
          </Space>
        </Card>
      </div>

      {/* Journal Entries Table */}
      <Card
        style={{
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : entries.length === 0 ? (
          <Empty description="Tidak ada jurnal yang ditemukan" />
        ) : (
          <Table
            columns={columns}
            dataSource={entries}
            rowKey="id"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} jurnal`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
            }}
            style={{
              background: theme.colors.background.primary,
            }}
          />
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail Jurnal Umum</span>
          </Space>
        }
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={[
          selectedEntry && !selectedEntry.isPosted && (
            <Button
              key="edit"
              icon={<EditOutlined />}
              onClick={handleEditEntry}
            >
              Edit
            </Button>
          ),
          selectedEntry && !selectedEntry.isPosted && (
            <Popconfirm
              key="post"
              title="Posting ke Buku Besar"
              description="Posting akan mengunci entry ini dan memperbarui saldo akun. Lanjutkan?"
              onConfirm={handlePostEntry}
              okText="Ya, Posting"
              cancelText="Batal"
            >
              <Button
                icon={<LockOutlined />}
                type="primary"
                loading={postMutation.isPending}
              >
                Post ke Ledger
              </Button>
            </Popconfirm>
          ),
          selectedEntry && selectedEntry.isPosted && !selectedEntry.isReversing && (
            <Popconfirm
              key="reverse"
              title="Balik Entry"
              description="Ini akan membuat entry pembalik dengan debit/kredit terbalik. Lanjutkan?"
              onConfirm={handleReverseEntry}
              okText="Ya, Balik"
              cancelText="Batal"
            >
              <Button
                icon={<SwapOutlined />}
                type="primary"
                loading={reverseMutation.isPending}
              >
                Balik Entry
              </Button>
            </Popconfirm>
          ),
          selectedEntry && !selectedEntry.isPosted && (
            <Popconfirm
              key="delete"
              title="Hapus Entry"
              description="Hapus draft entry ini? Tidak dapat dibatalkan."
              onConfirm={handleDeleteEntry}
              okText="Ya, Hapus"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              >
                Hapus
              </Button>
            </Popconfirm>
          ),
          <Button key="close" onClick={() => setDetailsVisible(false)}>
            Tutup
          </Button>,
        ]}
        width={800}
      >
        {selectedEntry && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="No. Jurnal" span={2}>
                <Text strong>{selectedEntry.entryNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal">
                {dayjs(selectedEntry.entryDate).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selectedEntry.isPosted ? (
                  <Tag color="success">Posted</Tag>
                ) : (
                  <Tag color="default">Draft</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tipe Transaksi" span={2}>
                {getTransactionTypeName(selectedEntry.transactionType)}
              </Descriptions.Item>
              <Descriptions.Item label="Deskripsi" span={2}>
                {selectedEntry.descriptionId || selectedEntry.description}
              </Descriptions.Item>
              {selectedEntry.documentNumber && (
                <Descriptions.Item label="No. Dokumen" span={2}>
                  {selectedEntry.documentNumber}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: '24px' }}>
              <Title level={5}>Item Jurnal</Title>
              <Table
                dataSource={selectedEntry.lineItems}
                columns={[
                  {
                    title: 'Kode Akun',
                    dataIndex: 'accountCode',
                    key: 'accountCode',
                    width: 100,
                  },
                  {
                    title: 'Deskripsi',
                    dataIndex: 'descriptionId',
                    key: 'descriptionId',
                    render: (descId: string, record: any) => descId || record.description,
                  },
                  {
                    title: 'Debit',
                    dataIndex: 'debitAmount',
                    key: 'debitAmount',
                    width: 150,
                    align: 'right' as const,
                    render: (amount: number) =>
                      amount > 0 ? formatCurrency(amount) : '-',
                  },
                  {
                    title: 'Kredit',
                    dataIndex: 'creditAmount',
                    key: 'creditAmount',
                    width: 150,
                    align: 'right' as const,
                    render: (amount: number) =>
                      amount > 0 ? formatCurrency(amount) : '-',
                  },
                ]}
                pagination={false}
                size="small"
                summary={(data) => {
                  const totalDebit = data.reduce((sum, item) => sum + item.debitAmount, 0);
                  const totalCredit = data.reduce((sum, item) => sum + item.creditAmount, 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong>Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong>{formatCurrency(totalDebit)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <Text strong>{formatCurrency(totalCredit)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JournalEntriesPage;
