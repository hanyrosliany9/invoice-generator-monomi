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
  Tag,
  message,
} from 'antd';
import {
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCashFlowStatement, exportCashFlowStatementPDF } from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CashFlowStatementPage: React.FC = () => {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow-statement', dateRange],
    queryFn: () =>
      getCashFlowStatement({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportCashFlowStatementPDF({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
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
            Laporan Arus Kas (Cash Flow Statement)
          </Title>
          <Text type="secondary">
            Analisis pergerakan kas masuk dan keluar
          </Text>
        </div>
        <Space>
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
          <Button icon={<DownloadOutlined />} onClick={handleExportPDF} loading={isExporting}>Export PDF</Button>
        </Space>
      </div>

      {/* Period Info */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center">
          <CalendarOutlined style={{ fontSize: '24px', color: '#fff' }} />
          <div>
            <Text style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>
              Periode: {dateRange[0].format('DD MMMM YYYY')} -{' '}
              {dateRange[1].format('DD MMMM YYYY')}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
                title={
                  <Space>
                    <DollarOutlined style={{ color: theme.colors.accent.primary }} />
                    <span>Saldo Awal</span>
                  </Space>
                }
                value={data.summary.openingBalance}
                precision={0}
                valueStyle={{ color: theme.colors.accent.primary, fontSize: '28px' }}
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
                title={
                  <Space>
                    <ArrowUpOutlined style={{ color: theme.colors.status.success }} />
                    <span>Arus Kas Operasional</span>
                  </Space>
                }
                value={data.summary.operatingCashFlow}
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
                title={
                  <Space>
                    <ArrowDownOutlined style={{ color: theme.colors.status.error }} />
                    <span>Saldo Akhir</span>
                  </Space>
                }
                value={data.summary.closingBalance}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
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
                  <Space>
                    <DollarOutlined
                      style={{
                        color:
                          data.summary.netCashFlow >= 0
                            ? theme.colors.status.success
                            : theme.colors.status.error,
                      }}
                    />
                    <span style={{ fontWeight: 600 }}>Arus Kas Bersih</span>
                  </Space>
                }
                value={Math.abs(data.summary.netCashFlow)}
                precision={0}
                valueStyle={{
                  color:
                    data.summary.netCashFlow >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  fontSize: '32px',
                  fontWeight: 'bold',
                }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Operating Activities */}
          <Card
            title={
              <Space>
                <Tag color="blue">Operasional</Tag>
                <span>Aktivitas Operasional</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: '18px',
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
              <Table
                columns={cashFlowColumns}
                dataSource={data.operatingActivities.transactions}
                rowKey={(record) => record.id || `operating-${record.date}-${record.description}`}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Tidak ada transaksi operasional" />
            )}
          </Card>

          {/* Investing Activities */}
          <Card
            title={
              <Space>
                <Tag color="purple">Investasi</Tag>
                <span>Aktivitas Investasi</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: '18px',
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
              <Table
                columns={cashFlowColumns}
                dataSource={data.investingActivities.transactions}
                rowKey={(record) => record.id || `investing-${record.date}-${record.description}`}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Tidak ada transaksi investasi" />
            )}
          </Card>

          {/* Financing Activities */}
          <Card
            title={
              <Space>
                <Tag color="orange">Pendanaan</Tag>
                <span>Aktivitas Pendanaan</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text
                strong
                style={{
                  fontSize: '18px',
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
              <Table
                columns={cashFlowColumns}
                dataSource={data.financingActivities.transactions}
                rowKey={(record) => record.id || `financing-${record.date}-${record.description}`}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Tidak ada transaksi pendanaan" />
            )}
          </Card>

          {/* Net Cash Flow Summary */}
          <Card
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
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
                alignItems: 'center',
              }}
            >
              <div>
                <Text type="secondary">Saldo Awal Kas</Text>
                <div>
                  <Text style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(data.summary.openingBalance)}
                  </Text>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  ARUS KAS BERSIH
                </Text>
                <div>
                  <Text
                    style={{
                      fontSize: '32px',
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
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">Saldo Akhir Kas</Text>
                <div>
                  <Text style={{ fontSize: '20px', fontWeight: 'bold' }}>
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
