import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  DatePicker,
  Space,
  Typography,
  Button,
  Empty,
  Spin,
  Statistic,
  Table,
  Select,
  Tag,
  message,
} from 'antd';
import {
  CalendarOutlined,
  BookOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getGeneralLedger, getChartOfAccounts, exportGeneralLedgerPDF } from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const GeneralLedgerPage: React.FC = () => {
  const { theme } = useTheme();
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
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportGeneralLedgerPDF({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        accountCode: selectedAccountCode,
        accountType: selectedAccountType as any,
        includeInactive: false,
      });
      message.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
      render: (_: any, record: any) => (
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
              balance >= 0 ? theme.colors.primary : theme.colors.status.error,
          }}
        >
          {formatCurrency(Math.abs(balance))}
        </Text>
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
          <Title level={2} style={{ margin: 0, color: theme.colors.text.primary}}>
            Buku Besar (General Ledger)
          </Title>
          <Text type="secondary">
            Catatan transaksi per akun secara detail
          </Text>
        </div>
        <Button icon={<DownloadOutlined />} onClick={handleExportPDF} loading={isExporting}>Export PDF</Button>
      </div>

      {/* Filters */}
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

      {/* Period Info */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center">
          <BookOutlined style={{ fontSize: '24px', color: '#fff' }} />
          <div>
            <Text style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>
              {selectedAccountCode
                ? `Akun: ${selectedAccountCode}`
                : selectedAccountType
                ? `Tipe: ${selectedAccountType}`
                : 'Semua Akun'}{' '}
              | Periode: {dateRange[0].format('DD MMM YYYY')} -{' '}
              {dateRange[1].format('DD MMM YYYY')}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <Card
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title="Total Entri"
                value={data.summary.totalEntries}
                valueStyle={{ color: theme.colors.accent.primary, fontSize: '28px' }}
              />
            </Card>
            <Card
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title="Total Debit"
                value={data.summary.totalDebit}
                precision={0}
                valueStyle={{ color: theme.colors.status.success, fontSize: '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title="Total Kredit"
                value={data.summary.totalCredit}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: '28px' }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Ledger Entries Table */}
          <Card
            title={
              <Space>
                <span>Catatan Transaksi</span>
                <Tag color="blue">{data.entries.length} Entri</Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.entries.length > 0 ? (
              <Table
                columns={columns}
                dataSource={data.entries}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} entri`,
                }}
                size="small"
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
