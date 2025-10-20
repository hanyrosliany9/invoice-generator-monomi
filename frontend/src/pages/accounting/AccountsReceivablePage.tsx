import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Progress,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  DownloadOutlined,
  FileTextOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportAccountsReceivableExcel, exportAccountsReceivablePDF, getAccountsReceivableReport } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';

const { Title, Text } = Typography;

const AccountsReceivablePage: React.FC = () => {
  const { theme } = useTheme();
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable', endDate.format('YYYY-MM-DD')],
    queryFn: () =>
      getAccountsReceivableReport({
        endDate: endDate.format('YYYY-MM-DD'),
      }),
  });

  const handleExportPDF = async () => {
    await exportAccountsReceivablePDF({
      endDate: endDate.format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportAccountsReceivableExcel({
      endDate: endDate.format('YYYY-MM-DD'),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const invoiceColumns = [
    {
      title: 'Nomor Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 150,
    },
    {
      title: 'Klien',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Tanggal Invoice',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 130,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Tanggal Jatuh Tempo',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Umur Piutang',
      dataIndex: 'agingBucket',
      key: 'agingBucket',
      width: 120,
      render: (bucket: string) => {
        const colors: Record<string, string> = {
          Current: 'green',
          '1-30 days': 'blue',
          '31-60 days': 'orange',
          '61-90 days': 'red',
          'Over 90 days': 'purple',
        };
        return <Tag color={colors[bucket] || 'default'}>{bucket}</Tag>;
      },
    },
    {
      title: 'Jumlah',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.accent.primary }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
  ];

  const clientColumns = [
    {
      title: 'Klien',
      dataIndex: ['client', 'name'],
      key: 'clientName',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Jumlah Invoice',
      dataIndex: 'invoiceCount',
      key: 'invoiceCount',
      width: 120,
      align: 'center' as const,
    },
    {
      title: 'Total Piutang',
      dataIndex: 'outstandingAmount',
      key: 'outstandingAmount',
      align: 'right' as const,
      width: 180,
      render: (amount: number) => (
        <Text strong style={{ fontSize: '16px' }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Persentase',
      key: 'percentage',
      width: 200,
      render: (_: any, record: any) => {
        const percentage = data?.summary?.totalOutstanding
          ? (record.outstandingAmount / data.summary.totalOutstanding) * 100
          : 0;
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text>{percentage.toFixed(1)}%</Text>
            <Progress
              percent={percentage}
              showInfo={false}
              strokeColor={theme.colors.accent.primary}
              size="small"
            />
          </Space>
        );
      },
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
            Laporan Piutang (Accounts Receivable)
          </Title>
          <Text type="secondary">
            Ringkasan piutang usaha dan invoice belum terbayar
          </Text>
        </div>
        <Space>
          <DatePicker
            value={endDate}
            onChange={(date) => {
              if (date) {
                setEndDate(date);
              }
            }}
            format="DD/MM/YYYY"
            placeholder="Tanggal Akhir"
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
              Per Tanggal: {endDate.format('DD MMMM YYYY')}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                    <FileTextOutlined style={{ color: theme.colors.accent.primary }} />
                    <span>Total Piutang</span>
                  </Space>
                }
                value={data.summary.totalOutstanding}
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
                    <UserOutlined style={{ color: theme.colors.status.info }} />
                    <span>Jumlah Klien</span>
                  </Space>
                }
                value={data.summary.customerCount}
                valueStyle={{ color: theme.colors.status.info, fontSize: '28px' }}
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
                    <FileTextOutlined style={{ color: theme.colors.status.warning }} />
                    <span>Invoice Belum Bayar</span>
                  </Space>
                }
                value={data.aging?.aging?.length || 0}
                valueStyle={{ color: theme.colors.status.warning, fontSize: '28px' }}
              />
            </Card>
          </div>

          {/* Receivables by Client */}
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Piutang Per Klien</span>
                <Tag color="blue">{data.topCustomers?.length || 0} Klien</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.topCustomers && data.topCustomers.length > 0 ? (
              <Table
                columns={clientColumns}
                dataSource={data.topCustomers}
                rowKey={(record: any) => record.client?.id || 'unknown'}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Tidak ada piutang pada periode ini" />
            )}
          </Card>

          {/* Outstanding Invoices */}
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Invoice Belum Terbayar</span>
                <Tag color="orange">{data.aging?.aging?.length || 0} Invoice</Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.aging?.aging && data.aging.aging.length > 0 ? (
              <Table
                columns={invoiceColumns}
                dataSource={data.aging.aging}
                rowKey={(record: any) => record.invoiceNumber || record.id || Math.random().toString()}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} invoice`,
                }}
                size="small"
                summary={() => (
                  <Table.Summary.Row
                    style={{ background: theme.colors.background.tertiary }}
                  >
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Text strong style={{ fontSize: '16px' }}>
                        TOTAL PIUTANG
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.accent.primary }}
                      >
                        {formatCurrency(data.summary.totalOutstanding)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada invoice belum terbayar" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AccountsReceivablePage;
