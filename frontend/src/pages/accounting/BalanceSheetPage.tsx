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
  Alert,
  message,
} from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  DollarOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBalanceSheet, exportBalanceSheetPDF, exportBalanceSheetExcel } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';

const { Title, Text } = Typography;

const BalanceSheetPage: React.FC = () => {
  const { theme } = useTheme();
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () =>
      getBalanceSheet({
        endDate: asOfDate.format('YYYY-MM-DD'),
      }),
    enabled: !!asOfDate,
  });

  const handleExportPDF = async () => {
    await exportBalanceSheetPDF({
      endDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportBalanceSheetExcel({
      endDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const accountColumns = [
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
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      width: 180,
      render: (balance: number) => (
        <Text strong>{formatCurrency(balance)}</Text>
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
            Neraca (Balance Sheet)
          </Title>
          <Text type="secondary">Laporan posisi keuangan perusahaan</Text>
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
            placeholder="Pilih Tanggal"
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
          {/* Balance Check */}
          {data.summary.isBalanced ? (
            <Alert
              message="Neraca Seimbang"
              description={`Aset = Kewajiban + Ekuitas (${formatCurrency(data.summary.totalAssets)} = ${formatCurrency(data.summary.liabilitiesAndEquity)})`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: '24px' }}
            />
          ) : (
            <Alert
              message="Neraca Tidak Seimbang"
              description={`Selisih: ${formatCurrency(data.summary.difference)}`}
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              style={{ marginBottom: '24px' }}
            />
          )}

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
                    <BankOutlined style={{ color: theme.colors.status.success }} />
                    <span>Total Aset</span>
                  </Space>
                }
                value={data.summary.totalAssets}
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
                    <DollarOutlined style={{ color: theme.colors.status.error }} />
                    <span>Total Kewajiban</span>
                  </Space>
                }
                value={data.summary.totalLiabilities}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: '28px' }}
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
                    <DollarOutlined style={{ color: theme.colors.status.info }} />
                    <span>Total Ekuitas</span>
                  </Space>
                }
                value={data.summary.totalEquity}
                precision={0}
                valueStyle={{ color: theme.colors.status.info, fontSize: '28px' }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Assets Section */}
          <Card
            title={
              <Space>
                <BankOutlined style={{ color: theme.colors.status.success }} />
                <span>Aset (Assets)</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: '18px', color: theme.colors.status.success }}>
                {formatCurrency(data.assets.total)}
              </Text>
            }
          >
            {data.assets.accounts.length > 0 ? (
              <Table
                columns={accountColumns}
                dataSource={data.assets.accounts}
                rowKey="accountCode"
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row style={{ background: theme.colors.background.tertiary }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong style={{ fontSize: '16px' }}>
                        Total Aset
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.success }}
                      >
                        {formatCurrency(data.assets.total)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada aset" />
            )}
          </Card>

          {/* Liabilities Section */}
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: theme.colors.status.error }} />
                <span>Kewajiban (Liabilities)</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: '18px', color: theme.colors.status.error }}>
                {formatCurrency(data.liabilities.total)}
              </Text>
            }
          >
            {data.liabilities.accounts.length > 0 ? (
              <Table
                columns={accountColumns}
                dataSource={data.liabilities.accounts}
                rowKey="accountCode"
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row style={{ background: theme.colors.background.tertiary }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong style={{ fontSize: '16px' }}>
                        Total Kewajiban
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.error }}
                      >
                        {formatCurrency(data.liabilities.total)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada kewajiban" />
            )}
          </Card>

          {/* Equity Section */}
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: theme.colors.status.info }} />
                <span>Ekuitas (Equity)</span>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: '18px', color: theme.colors.status.info }}>
                {formatCurrency(data.equity.total)}
              </Text>
            }
          >
            {data.equity.accounts.length > 0 ? (
              <Table
                columns={accountColumns}
                dataSource={data.equity.accounts}
                rowKey="accountCode"
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary.Row style={{ background: theme.colors.status.infoLight || '#e6f7ff' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong style={{ fontSize: '16px' }}>
                        Total Ekuitas
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.info }}
                      >
                        {formatCurrency(data.equity.total)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada ekuitas" />
            )}
          </Card>

          {/* Total Summary */}
          <Card
            style={{
              background: data.summary.isBalanced
                ? theme.colors.background.tertiary
                : theme.colors.background.tertiary,
              borderColor: data.summary.isBalanced
                ? theme.colors.status.success
                : theme.colors.status.error,
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
                <Text style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  Total Kewajiban + Ekuitas
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: data.summary.isBalanced
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  }}
                >
                  {formatCurrency(data.summary.liabilitiesAndEquity)}
                </Text>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default BalanceSheetPage;
