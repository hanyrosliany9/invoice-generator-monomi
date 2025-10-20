import React, { useState } from 'react';
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

const { Title, Text } = Typography;

const TrialBalancePage: React.FC = () => {
  const { theme } = useTheme();
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance', asOfDate],
    queryFn: () =>
      getTrialBalance({
        asOfDate: asOfDate.format('YYYY-MM-DD'),
        includeInactive: false,
        includeZeroBalances: false,
      }),
    enabled: !!asOfDate,
  });

  const handleExportPDF = async () => {
    await exportTrialBalancePDF({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
      includeInactive: false,
      includeZeroBalances: false,
    });
  };

  const handleExportExcel = async () => {
    await exportTrialBalanceExcel({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
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
      render: (_: any, record: any) =>
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
            Neraca Saldo (Trial Balance)
          </Title>
          <Text type="secondary">
            Ringkasan saldo debit dan kredit semua akun
          </Text>
        </div>
        <Space>
          <DatePicker
            value={asOfDate}
            onChange={(date) => {
              if (date) {
                setAsOfDate(date);
              }
            }}
            format="DD/MM/YYYY"
            placeholder="Per Tanggal"
          />
          <ExportButton
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </Space>
      </div>

      {/* Date Info */}
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
              Per Tanggal: {asOfDate.format('DD MMMM YYYY')}
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
              message="Neraca Tidak Seimbang"
              description={`Terdapat selisih ${formatCurrency(Math.abs(data.summary.difference))} antara total debit dan kredit. Silakan periksa jurnal entries.`}
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: '24px' }}
            />
          )}

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
                title="Jumlah Akun"
                value={data.summary.accountCount}
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
            <Card
              style={{
                background: theme.colors.background.tertiary,
                borderColor: data.summary.isBalanced
                  ? theme.colors.status.success
                  : theme.colors.status.error,
                borderWidth: '2px',
              }}
            >
              <Statistic
                title="Selisih"
                value={Math.abs(data.summary.difference)}
                precision={0}
                valueStyle={{
                  color: data.summary.isBalanced
                    ? theme.colors.status.success
                    : theme.colors.status.error,
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}
                prefix="Rp"
                suffix={
                  data.summary.isBalanced ? (
                    <CheckCircleOutlined style={{ fontSize: '20px' }} />
                  ) : (
                    <ExclamationCircleOutlined style={{ fontSize: '20px' }} />
                  )
                }
              />
            </Card>
          </div>

          {/* Trial Balance Table */}
          <Card
            title={
              <Space>
                <span>Daftar Saldo Akun</span>
                <Tag color="blue">{data.balances.length} Akun</Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.balances.length > 0 ? (
              <Table
                columns={columns}
                dataSource={data.balances}
                rowKey="accountCode"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} akun`,
                }}
                size="small"
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
