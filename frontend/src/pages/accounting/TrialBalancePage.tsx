import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportTrialBalanceExcel, exportTrialBalancePDF, getTrialBalance } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';
import { trialBalanceToBusinessEntity } from '../../adapters/mobileTableAdapters';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const TrialBalancePage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'trial-balance',
      dateRange[0]?.format('YYYY-MM-DD'),
      dateRange[1]?.format('YYYY-MM-DD')
    ],
    queryFn: () =>
      getTrialBalance({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        includeInactive: false,
        includeZeroBalances: false,
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleExportPDF = async () => {
    await exportTrialBalancePDF({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      includeInactive: false,
      includeZeroBalances: false,
    });
  };

  const handleExportExcel = async () => {
    await exportTrialBalanceExcel({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      includeInactive: false,
      includeZeroBalances: false,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Mobile view data
  const trialBalanceEntries = data?.balances || [];

  const mobileData = useMemo(() =>
    trialBalanceEntries.map(trialBalanceToBusinessEntity),
    [trialBalanceEntries]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail Akun',
      icon: <CheckCircleOutlined />,
      onClick: (record) => {
        console.log('View account:', record.number);
      },
    },
  ], []);

  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'accountType',
      label: 'Tipe Akun',
      type: 'select',
      options: [
        { label: 'Semua', value: '' },
        { label: 'Aset', value: 'ASSET' },
        { label: 'Liabilitas', value: 'LIABILITY' },
        { label: 'Ekuitas', value: 'EQUITY' },
        { label: 'Pendapatan', value: 'REVENUE' },
        { label: 'Beban', value: 'EXPENSE' },
      ],
      value: '',
      onChange: () => {},
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Semua', value: '' },
        { label: 'Normal', value: 'normal' },
        { label: 'Abnormal', value: 'abnormal' },
      ],
      value: '',
      onChange: () => {},
    },
  ], []);

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 120,
    },
    {
      title: 'Nama Akun',
      dataIndex: 'accountNameId',
      key: 'accountNameId',
      render: (nameId: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{nameId}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.accountName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipe',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{type.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Debit',
      dataIndex: 'debitBalance',
      key: 'debitBalance',
      align: 'right' as const,
      width: 180,
      render: (balance: number) =>
        balance > 0 ? (
          <Text strong>{formatCurrency(balance)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Kredit',
      dataIndex: 'creditBalance',
      key: 'creditBalance',
      align: 'right' as const,
      width: 180,
      render: (balance: number) =>
        balance > 0 ? (
          <Text strong>{formatCurrency(balance)}</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: any) =>
        record.isAbnormal ? (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>
            Abnormal
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Normal
          </Tag>
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
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: theme.colors.text.primary }}>
            {isMobile ? 'Neraca Saldo' : 'Neraca Saldo (Trial Balance)'}
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
            {isMobile ? 'Ringkasan saldo debit dan kredit' : 'Ringkasan saldo debit dan kredit semua akun'}
          </Text>
        </div>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            format="DD/MM/YYYY"
            placeholder={isMobile ? ['Mulai', 'Akhir'] : ['Dari Tanggal', 'Sampai Tanggal']}
            size={isMobile ? 'small' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          />
          <ExportButton
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </Space>
      </div>

      {/* Date Info */}
      <Card
        size={isMobile ? 'small' : 'default'}
        style={{
          marginBottom: isMobile ? '16px' : '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <CalendarOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#fff' }} />
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Text style={{ color: '#fff', fontSize: isMobile ? '13px' : '16px', fontWeight: 500 }}>
              Periode: {dateRange[0].format(isMobile ? 'DD MMM YYYY' : 'DD MMMM YYYY')} s/d {dateRange[1].format(isMobile ? 'DD MMM YYYY' : 'DD MMMM YYYY')}
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
          <Empty description="Tidak ada data untuk tanggal ini" />
        </Card>
      ) : (
        <>
          {/* Balance Check Alert */}
          {!data.summary.isBalanced && (
            <Alert
              message={isMobile ? 'Tidak Seimbang' : 'Neraca Tidak Seimbang'}
              description={
                isMobile
                  ? `Selisih ${formatCurrency(Math.abs(data.summary.difference))} antara debit dan kredit.`
                  : `Terdapat selisih ${formatCurrency(Math.abs(data.summary.difference))} antara total debit dan kredit. Silakan periksa jurnal entries.`
              }
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: isMobile ? '16px' : '24px', fontSize: isMobile ? '12px' : '14px' }}
            />
          )}

          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(auto-fit, minmax(140px, 1fr))'
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
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Jumlah Akun</span>}
                value={data.summary.accountCount}
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
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.background.tertiary,
                borderColor: data.summary.isBalanced
                  ? theme.colors.status.success
                  : theme.colors.status.error,
                borderWidth: '2px',
              }}
            >
              <Statistic
                title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Selisih</span>}
                value={Math.abs(data.summary.difference)}
                precision={0}
                valueStyle={{
                  color: data.summary.isBalanced
                    ? theme.colors.status.success
                    : theme.colors.status.error,
                  fontSize: isMobile ? '18px' : '28px',
                  fontWeight: 'bold',
                }}
                prefix="Rp"
                suffix={
                  data.summary.isBalanced ? (
                    <CheckCircleOutlined style={{ fontSize: isMobile ? '16px' : '20px' }} />
                  ) : (
                    <ExclamationCircleOutlined style={{ fontSize: isMobile ? '16px' : '20px' }} />
                  )
                }
              />
            </Card>
          </div>

          {/* Trial Balance Table */}
          <Card
            size={isMobile ? 'small' : 'default'}
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                  {isMobile ? 'Saldo Akun' : 'Daftar Saldo Akun'}
                </span>
                <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>
                  {data.balances.length} Akun
                </Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.balances.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={mobileData}
                  loading={isLoading}
                  entityType="trial-balance"
                  showQuickStats
                  searchable
                  searchFields={['number', 'title']}
                  filters={mobileFilters}
                  actions={mobileActions}
                  onRefresh={() => {}}
                />
              ) : (
                <Table
                  columns={columns}
                  dataSource={data.balances}
                  rowKey="accountCode"
                  pagination={{
                    pageSize: isMobile ? 10 : 20,
                    showSizeChanger: !isMobile,
                    showTotal: (total) => `Total ${total} akun`,
                  }}
                  size="small"
                  scroll={isMobile ? { x: 800 } : undefined}
                  summary={() => (
                    <Table.Summary.Row
                      style={{
                        background: theme.colors.background.tertiary,
                      }}
                    >
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <Text strong style={{ fontSize: '16px' }}>
                          TOTAL
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <Text
                          strong
                          style={{ fontSize: '18px', color: theme.colors.status.success }}
                        >
                          {formatCurrency(data.summary.totalDebit)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <Text
                          strong
                          style={{ fontSize: '18px', color: theme.colors.status.error }}
                        >
                          {formatCurrency(data.summary.totalCredit)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="center">
                        {data.summary.isBalanced ? (
                          <Tag
                            color="success"
                            icon={<CheckCircleOutlined />}
                            style={{ fontSize: '14px' }}
                          >
                            Seimbang
                          </Tag>
                        ) : (
                          <Tag
                            color="error"
                            icon={<ExclamationCircleOutlined />}
                            style={{ fontSize: '14px' }}
                          >
                            Tidak Seimbang
                          </Tag>
                        )}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            ) : (
              <Empty description="Tidak ada saldo akun pada tanggal ini" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default TrialBalancePage;
