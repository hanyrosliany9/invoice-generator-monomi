import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportGeneralLedgerExcel, exportGeneralLedgerPDF, getChartOfAccounts, getGeneralLedger } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import { generalLedgerEntryToBusinessEntity } from '../../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const GeneralLedgerPage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string | undefined>(
    undefined
  );
  const [selectedAccountType, setSelectedAccountType] = useState<string | undefined>(
    undefined
  );

  // Fetch accounts for filter
  const { data: accountsData } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['general-ledger', dateRange, selectedAccountCode, selectedAccountType],
    queryFn: () =>
      getGeneralLedger({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        accountCode: selectedAccountCode,
        accountType: selectedAccountType as any,
        includeInactive: false,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const entries = data?.entries || [];

  // Mobile data adapter
  const mobileData = useMemo(() =>
    entries.map(generalLedgerEntryToBusinessEntity),
    [entries]
  );

  // Mobile actions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        message.info(`Detail untuk ${record.number}`);
      },
    },
  ], []);

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'accountType',
      label: 'Tipe Akun',
      type: 'select' as const,
      options: [
        { label: 'Aset', value: 'ASSET' },
        { label: 'Liabilitas', value: 'LIABILITY' },
        { label: 'Ekuitas', value: 'EQUITY' },
        { label: 'Pendapatan', value: 'REVENUE' },
        { label: 'Beban', value: 'EXPENSE' },
      ],
    },
  ], []);

  const handleExportPDF = async () => {
    await exportGeneralLedgerPDF({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      accountCode: selectedAccountCode,
      accountType: selectedAccountType as any,
      includeInactive: false,
    });
  };

  const handleExportExcel = async () => {
    await exportGeneralLedgerExcel({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      accountCode: selectedAccountCode,
      accountType: selectedAccountType as any,
      includeInactive: false,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Nomor Jurnal',
      dataIndex: ['journalEntry', 'entryNumber'],
      key: 'entryNumber',
      width: 130,
    },
    {
      title: 'Akun',
      key: 'account',
      render: (_: unknown, record: any) => (
        <div>
          <div>
            <Text strong>{record.accountCode}</Text> - {record.accountNameId}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.accountName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Deskripsi',
      dataIndex: ['journalEntry', 'descriptionId'],
      key: 'description',
      render: (descId: string, record: any) => (
        <div>
          <div>{descId}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.journalEntry?.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      width: 150,
      render: (debit: number) =>
        debit > 0 ? (
          <Text strong style={{ color: theme.colors.status.success }}>
            {formatCurrency(debit)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Kredit',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      width: 150,
      render: (credit: number) =>
        credit > 0 ? (
          <Text strong style={{ color: theme.colors.status.error }}>
            {formatCurrency(credit)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Saldo Berjalan',
      dataIndex: 'runningBalance',
      key: 'runningBalance',
      align: 'right' as const,
      width: 150,
      render: (balance: number) => (
        <Text
          strong
          style={{
            color:
              balance >= 0 ? theme.colors.accent.primary : theme.colors.status.error,
          }}
        >
          {formatCurrency(Math.abs(balance))}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: isMobile ? '16px' : '24px',
          gap: isMobile ? '12px' : '0',
        }}
      >
        <div>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: theme.colors.text.primary}}>
            {isMobile ? 'Buku Besar' : 'Buku Besar (General Ledger)'}
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
            {isMobile ? 'Catatan transaksi per akun' : 'Catatan transaksi per akun secara detail'}
          </Text>
        </div>
        <ExportButton
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />
      </div>

      {/* Filters - Desktop Only */}
      {!isMobile && (
        <Card
          style={{
            marginBottom: '24px',
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Space wrap size="middle">
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Periode:
              </Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD/MM/YYYY"
                placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
              />
            </div>
            <div style={{ minWidth: '250px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Filter Akun:
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Pilih Akun (opsional)"
                allowClear
                showSearch
                value={selectedAccountCode}
                onChange={(value) => {
                  setSelectedAccountCode(value);
                  setSelectedAccountType(undefined);
                }}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={accountsData?.map((account: any) => ({
                  value: account.code,
                  label: `${account.code} - ${account.nameId}`,
                }))}
              />
            </div>
            <div style={{ minWidth: '200px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Tipe Akun:
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Pilih Tipe (opsional)"
                allowClear
                value={selectedAccountType}
                onChange={(value) => {
                  setSelectedAccountType(value);
                  setSelectedAccountCode(undefined);
                }}
                options={[
                  { value: 'ASSET', label: 'Aset' },
                  { value: 'LIABILITY', label: 'Liabilitas' },
                  { value: 'EQUITY', label: 'Ekuitas' },
                  { value: 'REVENUE', label: 'Pendapatan' },
                  { value: 'EXPENSE', label: 'Beban' },
                ]}
              />
            </div>
          </Space>
        </Card>
      )}

      {/* Period Info */}
      <Card
        size={isMobile ? 'small' : 'default'}
        style={{
          marginBottom: isMobile ? '16px' : '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <BookOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#fff' }} />
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Text style={{ color: '#fff', fontSize: isMobile ? '13px' : '16px', fontWeight: 500 }}>
              {selectedAccountCode
                ? `Akun: ${selectedAccountCode}`
                : selectedAccountType
                ? `Tipe: ${selectedAccountType}`
                : 'Semua Akun'}
              {isMobile && <br />}
              {!isMobile && ' | '}
              Periode: {dateRange[0].format(isMobile ? 'DD MMM' : 'DD MMM YYYY')} - {dateRange[1].format(isMobile ? 'DD MMM YY' : 'DD MMM YYYY')}
            </Text>
          </div>
        </Space>
      </Card>

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </Card>
      ) : !data ? (
        <Card>
          <Empty description="Tidak ada data untuk periode ini" />
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(auto-fit, minmax(100px, 1fr))'
                : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: isMobile ? '8px' : '16px',
              marginBottom: isMobile ? '16px' : '24px',
            }}
          >
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Entri</span>}
                value={data.summary.totalEntries}
                valueStyle={{ color: theme.colors.accent.primary, fontSize: isMobile ? '20px' : '28px' }}
              />
            </Card>
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Debit</span>}
                value={data.summary.totalDebit}
                precision={0}
                valueStyle={{ color: theme.colors.status.success, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Kredit</span>}
                value={data.summary.totalCredit}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Ledger Entries Table */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Transaksi' : 'Catatan Transaksi'}</span>
                <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>{data.entries.length} Entri</Tag>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {isMobile ? (
              <MobileTableView
                data={mobileData}
                loading={isLoading}
                entityType="general-ledger"
                showQuickStats
                searchable
                searchFields={['number', 'title', 'client.name']}
                filters={mobileFilters}
                actions={mobileActions}
                onRefresh={() => {
                  // Trigger refetch
                  message.success('Data diperbarui');
                }}
              />
            ) : data.entries.length > 0 ? (
              <Table
                columns={columns}
                dataSource={data.entries}
                rowKey="id"
                pagination={{
                  pageSize: isMobile ? 10 : 20,
                  showSizeChanger: !isMobile,
                  showTotal: (total) => `Total ${total} entri`,
                }}
                size="small"
                scroll={isMobile ? { x: 800 } : undefined}
                summary={() => (
                  <Table.Summary.Row style={{ background: theme.colors.background.tertiary }}>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Text strong style={{ fontSize: '16px' }}>
                        TOTAL
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.success }}
                      >
                        {formatCurrency(data.summary.totalDebit)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.error }}
                      >
                        {formatCurrency(data.summary.totalCredit)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada transaksi pada periode ini" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default GeneralLedgerPage;
