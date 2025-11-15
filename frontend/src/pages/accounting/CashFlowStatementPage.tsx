import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportCashFlowStatementExcel, exportCashFlowStatementPDF, getCashFlowStatement } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CashFlowStatementPage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'cash-flow-statement',
      dateRange[0]?.format('YYYY-MM-DD'),
      dateRange[1]?.format('YYYY-MM-DD')
    ],
    queryFn: () =>
      getCashFlowStatement({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleExportPDF = async () => {
    await exportCashFlowStatementPDF({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportCashFlowStatementExcel({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Mobile data adapters
  const mobileOperatingData = useMemo(() => {
    if (!data?.operatingActivities?.transactions) return [];
    return data.operatingActivities.transactions.map(transaction => ({
      id: transaction.id || `operating-${transaction.date}-${transaction.description}`,
      number: dayjs(transaction.date).format('DD/MM/YYYY'),
      title: transaction.description,
      subtitle: transaction.cashIn > 0
        ? `Kas Masuk: ${formatCurrency(transaction.cashIn)}`
        : `Kas Keluar: ${formatCurrency(transaction.cashOut)}`,
      status: transaction.cashIn > 0 ? 'success' : 'error',
      metadata: {
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        cashIn: transaction.cashIn,
        cashOut: transaction.cashOut,
      }
    }));
  }, [data]);

  const mobileInvestingData = useMemo(() => {
    if (!data?.investingActivities?.transactions) return [];
    return data.investingActivities.transactions.map(transaction => ({
      id: transaction.id || `investing-${transaction.date}-${transaction.description}`,
      number: dayjs(transaction.date).format('DD/MM/YYYY'),
      title: transaction.description,
      subtitle: transaction.cashIn > 0
        ? `Kas Masuk: ${formatCurrency(transaction.cashIn)}`
        : `Kas Keluar: ${formatCurrency(transaction.cashOut)}`,
      status: transaction.cashIn > 0 ? 'success' : 'error',
      metadata: {
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        cashIn: transaction.cashIn,
        cashOut: transaction.cashOut,
      }
    }));
  }, [data]);

  const mobileFinancingData = useMemo(() => {
    if (!data?.financingActivities?.transactions) return [];
    return data.financingActivities.transactions.map(transaction => ({
      id: transaction.id || `financing-${transaction.date}-${transaction.description}`,
      number: dayjs(transaction.date).format('DD/MM/YYYY'),
      title: transaction.description,
      subtitle: transaction.cashIn > 0
        ? `Kas Masuk: ${formatCurrency(transaction.cashIn)}`
        : `Kas Keluar: ${formatCurrency(transaction.cashOut)}`,
      status: transaction.cashIn > 0 ? 'success' : 'error',
      metadata: {
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        cashIn: transaction.cashIn,
        cashOut: transaction.cashOut,
      }
    }));
  }, [data]);

  const cashFlowColumns = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => {
        const categoryColors: Record<string, string> = {
          OPERATING: 'blue',
          INVESTING: 'purple',
          FINANCING: 'orange',
        };
        return (
          <Tag color={categoryColors[category] || 'default'}>
            {category === 'OPERATING'
              ? 'Operasional'
              : category === 'INVESTING'
              ? 'Investasi'
              : 'Pendanaan'}
          </Tag>
        );
      },
    },
    {
      title: 'Kas Masuk',
      dataIndex: 'cashIn',
      key: 'cashIn',
      align: 'right' as const,
      width: 150,
      render: (amount: number) =>
        amount > 0 ? (
          <Text strong style={{ color: theme.colors.status.success }}>
            {formatCurrency(amount)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Kas Keluar',
      dataIndex: 'cashOut',
      key: 'cashOut',
      align: 'right' as const,
      width: 150,
      render: (amount: number) =>
        amount > 0 ? (
          <Text strong style={{ color: theme.colors.status.error }}>
            {formatCurrency(amount)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
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
            {isMobile ? 'Laporan Arus Kas' : 'Laporan Arus Kas (Cash Flow Statement)'}
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
            {isMobile ? 'Pergerakan kas masuk dan keluar' : 'Analisis pergerakan kas masuk dan keluar'}
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
            placeholder={isMobile ? ['Mulai', 'Akhir'] : ['Tanggal Mulai', 'Tanggal Akhir']}
            size={isMobile ? 'small' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          />
          <ExportButton
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </Space>
      </div>

      {/* Period Info */}
      <Card
        size={isMobile ? 'small' : 'default'}
        style={{
          marginBottom: isMobile ? '16px' : '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center">
          <CalendarOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#fff' }} />
          <div>
            <Text style={{ color: '#fff', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
              Periode: {dateRange[0].format(isMobile ? 'DD MMM' : 'DD MMMM YYYY')} - {dateRange[1].format(isMobile ? 'DD MMM YY' : 'DD MMMM YYYY')}
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
                ? 'repeat(auto-fit, minmax(140px, 1fr))'
                : 'repeat(auto-fit, minmax(250px, 1fr))',
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
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <DollarOutlined style={{ color: theme.colors.accent.primary, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>Saldo Awal</span>
                  </Space>
                }
                value={data.summary.openingBalance}
                precision={0}
                valueStyle={{ color: theme.colors.accent.primary, fontSize: isMobile ? '18px' : '28px' }}
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
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <ArrowUpOutlined style={{ color: theme.colors.status.success, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Operasional' : 'Arus Kas Operasional'}</span>
                  </Space>
                }
                value={data.summary.operatingCashFlow}
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
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <ArrowDownOutlined style={{ color: theme.colors.status.error, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>Saldo Akhir</span>
                  </Space>
                }
                value={data.summary.closingBalance}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background:
                  data.summary.netCashFlow >= 0
                    ? theme.colors.background.tertiary
                    : theme.colors.background.tertiary,
                borderColor:
                  data.summary.netCashFlow >= 0
                    ? theme.colors.status.success
                    : theme.colors.status.error,
                borderWidth: '2px',
              }}
            >
              <Statistic
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <DollarOutlined
                      style={{
                        color:
                          data.summary.netCashFlow >= 0
                            ? theme.colors.status.success
                            : theme.colors.status.error,
                        fontSize: isMobile ? '16px' : '20px',
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Kas Bersih' : 'Arus Kas Bersih'}</span>
                  </Space>
                }
                value={Math.abs(data.summary.netCashFlow)}
                precision={0}
                valueStyle={{
                  color:
                    data.summary.netCashFlow >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  fontSize: isMobile ? '20px' : '32px',
                  fontWeight: 'bold',
                }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Operating Activities */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>Operasional</Tag>
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Operasional' : 'Aktivitas Operasional'}</span>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: isMobile ? '14px' : '18px',
                  color:
                    data.operatingActivities.netCashFlow >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                }}
              >
                {formatCurrency(data.operatingActivities.netCashFlow)}
              </Text>
            }
          >
            {data.operatingActivities.transactions.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={mobileOperatingData}
                  loading={isLoading}
                  entityType="cashflow-operating"
                  searchable
                  searchFields={['title', 'number']}
                />
              ) : (
                <Table
                  columns={cashFlowColumns}
                  dataSource={data.operatingActivities.transactions}
                  rowKey={(record) => record.id || `operating-${record.date}-${record.description}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              )
            ) : (
              <Empty description="Tidak ada transaksi operasional" />
            )}
          </Card>

          {/* Investing Activities */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <Tag color="purple" style={{ fontSize: isMobile ? '10px' : '12px' }}>Investasi</Tag>
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Investasi' : 'Aktivitas Investasi'}</span>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: isMobile ? '14px' : '18px',
                  color:
                    data.investingActivities.netCashFlow >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                }}
              >
                {formatCurrency(data.investingActivities.netCashFlow)}
              </Text>
            }
          >
            {data.investingActivities.transactions.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={mobileInvestingData}
                  loading={isLoading}
                  entityType="cashflow-investing"
                  searchable
                  searchFields={['title', 'number']}
                />
              ) : (
                <Table
                  columns={cashFlowColumns}
                  dataSource={data.investingActivities.transactions}
                  rowKey={(record) => record.id || `investing-${record.date}-${record.description}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              )
            ) : (
              <Empty description="Tidak ada transaksi investasi" />
            )}
          </Card>

          {/* Financing Activities */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <Tag color="orange" style={{ fontSize: isMobile ? '10px' : '12px' }}>Pendanaan</Tag>
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Pendanaan' : 'Aktivitas Pendanaan'}</span>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: isMobile ? '14px' : '18px',
                  color:
                    data.financingActivities.netCashFlow >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                }}
              >
                {formatCurrency(data.financingActivities.netCashFlow)}
              </Text>
            }
          >
            {data.financingActivities.transactions.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={mobileFinancingData}
                  loading={isLoading}
                  entityType="cashflow-financing"
                  searchable
                  searchFields={['title', 'number']}
                />
              ) : (
                <Table
                  columns={cashFlowColumns}
                  dataSource={data.financingActivities.transactions}
                  rowKey={(record) => record.id || `financing-${record.date}-${record.description}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              )
            ) : (
              <Empty description="Tidak ada transaksi pendanaan" />
            )}
          </Card>

          {/* Net Cash Flow Summary */}
          <Card
            size={isMobile ? 'small' : 'default'}
            style={{
              background:
                data.summary.netCashFlow >= 0
                  ? theme.colors.background.tertiary
                  : theme.colors.background.tertiary,
              borderColor:
                data.summary.netCashFlow >= 0 ? theme.colors.status.success : theme.colors.status.error,
              borderWidth: '2px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? '16px' : '24px',
                alignItems: 'center',
              }}
            >
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Saldo Awal Kas</Text>
                <div>
                  <Text style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>
                    {formatCurrency(data.summary.openingBalance)}
                  </Text>
                </div>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'center' }}>
                <Text style={{ fontSize: isMobile ? '16px' : '24px', fontWeight: 'bold' }}>
                  ARUS KAS BERSIH
                </Text>
                <div>
                  <Text
                    style={{
                      fontSize: isMobile ? '20px' : '32px',
                      fontWeight: 'bold',
                      color:
                        data.summary.netCashFlow >= 0
                          ? theme.colors.status.success
                          : theme.colors.status.error,
                    }}
                  >
                    {formatCurrency(Math.abs(data.summary.netCashFlow))}
                  </Text>
                </div>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Saldo Akhir Kas</Text>
                <div>
                  <Text style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>
                    {formatCurrency(data.summary.closingBalance)}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default CashFlowStatementPage;
