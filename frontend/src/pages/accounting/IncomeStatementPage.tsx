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
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getIncomeStatement, exportIncomeStatementPDF, exportIncomeStatementExcel } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const IncomeStatementPage: React.FC = () => {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['income-statement', dateRange],
    queryFn: () =>
      getIncomeStatement({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleExportPDF = async () => {
    await exportIncomeStatementPDF({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportIncomeStatementExcel({
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

  const revenueColumns = [
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
          <div style={{ fontWeight: 500, color: theme.colors.text.primary}}>{nameId}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.accountName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Jumlah',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      width: 180,
      render: (balance: number) => (
        <Text strong style={{ color: theme.colors.status.success }}>
          {formatCurrency(balance)}
        </Text>
      ),
    },
  ];

  const expenseColumns = [
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
          <div style={{ fontWeight: 500, color: theme.colors.text.primary}}>{nameId}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.accountName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Sub Tipe',
      dataIndex: 'accountSubType',
      key: 'accountSubType',
      width: 150,
      render: (subType: string) => (
        <Tag color="orange">{subType.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Jumlah',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      width: 180,
      render: (balance: number) => (
        <Text strong style={{ color: theme.colors.status.error }}>
          {formatCurrency(balance)}
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
            Laporan Laba Rugi (Income Statement)
          </Title>
          <Text type="secondary">
            Analisis pendapatan dan beban periode akuntansi
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
          <ExportButton
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
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
        <Card
          style={{
            textAlign: 'center',
            padding: '48px',
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Spin size="large" />
        </Card>
      ) : !data ? (
        <Card
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
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
                    <RiseOutlined style={{ color: theme.colors.status.success }} />
                    <span style={{ color: theme.colors.text.primary}}>Total Pendapatan</span>
                  </Space>
                }
                value={data.summary.totalRevenue}
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
                    <FallOutlined style={{ color: theme.colors.status.error }} />
                    <span style={{ color: theme.colors.text.primary}}>Total Beban</span>
                  </Space>
                }
                value={data.summary.totalExpenses}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              style={{
                background:
                  data.summary.netIncome >= 0
                    ? theme.colors.background.tertiary
                    : theme.colors.background.tertiary,
                borderColor:
                  data.summary.netIncome >= 0
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
                          data.summary.netIncome >= 0
                            ? theme.colors.status.success
                            : theme.colors.status.error,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: theme.colors.text.primary}}>
                      {data.summary.netIncome >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}
                    </span>
                  </Space>
                }
                value={Math.abs(data.summary.netIncome)}
                precision={0}
                valueStyle={{
                  color:
                    data.summary.netIncome >= 0
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  fontSize: '32px',
                  fontWeight: 'bold',
                }}
                prefix="Rp"
              />
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary">
                  Margin: {data.summary.profitMargin.toFixed(2)}%
                </Text>
              </div>
            </Card>
          </div>

          {/* Revenue Section */}
          <Card
            title={
              <Space>
                <RiseOutlined style={{ color: theme.colors.status.success }} />
                <span style={{ color: theme.colors.text.primary}}>Pendapatan (Revenue)</span>
                <Tag color="success">{data.revenue.accounts.length} Akun</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: '18px', color: theme.colors.status.success }}>
                {formatCurrency(data.revenue.total)}
              </Text>
            }
          >
            {data.revenue.accounts.length > 0 ? (
              <Table
                columns={revenueColumns}
                dataSource={data.revenue.accounts}
                rowKey="accountCode"
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row
                    style={{
                      background: theme.colors.background.tertiary,
                    }}
                  >
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong style={{ fontSize: '16px', color: theme.colors.text.primary}}>
                        Total Pendapatan
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.success }}
                      >
                        {formatCurrency(data.revenue.total)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada pendapatan pada periode ini" />
            )}
          </Card>

          {/* Expenses Section */}
          <Card
            title={
              <Space>
                <FallOutlined style={{ color: theme.colors.status.error }} />
                <span style={{ color: theme.colors.text.primary}}>Beban (Expenses)</span>
                <Tag color="error">{data.expenses.accounts.length} Akun</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: '18px', color: theme.colors.status.error }}>
                {formatCurrency(data.expenses.total)}
              </Text>
            }
          >
            {data.expenses.accounts.length > 0 ? (
              <Table
                columns={expenseColumns}
                dataSource={data.expenses.accounts}
                rowKey="accountCode"
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row
                    style={{
                      background: theme.colors.background.tertiary,
                    }}
                  >
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <Text strong style={{ fontSize: '16px', color: theme.colors.text.primary}}>
                        Total Beban
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.error }}
                      >
                        {formatCurrency(data.expenses.total)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada beban pada periode ini" />
            )}
          </Card>

          {/* Net Income Summary */}
          <Card
            style={{
              background:
                data.summary.netIncome >= 0
                  ? theme.colors.background.tertiary
                  : theme.colors.background.tertiary,
              borderColor:
                data.summary.netIncome >= 0 ? theme.colors.status.success : theme.colors.status.error,
              borderWidth: '2px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
              }}
            >
              <div>
                <Text
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: theme.colors.text.primary
                  }}
                >
                  {data.summary.netIncome >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">
                    Margin Laba: {data.summary.profitMargin.toFixed(2)}%
                  </Text>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color:
                      data.summary.netIncome >= 0
                        ? theme.colors.status.success
                        : theme.colors.status.error,
                  }}
                >
                  {formatCurrency(Math.abs(data.summary.netIncome))}
                </Text>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default IncomeStatementPage;
