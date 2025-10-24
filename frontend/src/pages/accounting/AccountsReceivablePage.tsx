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
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  exportAccountsReceivableExcel,
  exportAccountsReceivablePDF,
  exportARAgingExcel,
  exportARAgingPDF,
  getAccountsReceivableAging,
  getAccountsReceivableReport,
} from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';

const { Title, Text } = Typography;

const AccountsReceivablePage: React.FC = () => {
  const { theme } = useTheme();
  const [endDate, setEndDate] = useState<dayjs.Dayjs>(dayjs());
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable', endDate.format('YYYY-MM-DD')],
    queryFn: () =>
      getAccountsReceivableReport({
        endDate: endDate.format('YYYY-MM-DD'),
      }),
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['ar-aging', asOfDate.format('YYYY-MM-DD')],
    queryFn: () =>
      getAccountsReceivableAging({
        asOfDate: asOfDate.format('YYYY-MM-DD'),
      }),
    enabled: !!asOfDate,
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

  const handleAgingExportPDF = async () => {
    await exportARAgingPDF({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const handleAgingExportExcel = async () => {
    await exportARAgingExcel({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
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

  const agingColumns = [
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
      title: 'Hari Terlambat',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      width: 130,
      align: 'center' as const,
      render: (days: number) =>
        days > 0 ? (
          <Tag color="red" icon={<WarningOutlined />}>
            {days} hari
          </Tag>
        ) : (
          <Tag color="green">Belum jatuh tempo</Tag>
        ),
    },
    {
      title: 'Kategori Umur',
      dataIndex: 'agingBucket',
      key: 'agingBucket',
      width: 150,
      render: (bucket: string) => {
        const bucketColors: Record<string, string> = {
          Current: 'green',
          '1-30 days': 'blue',
          '31-60 days': 'orange',
          '61-90 days': 'volcano',
          'Over 90 days': 'red',
        };
        return <Tag color={bucketColors[bucket] || 'default'}>{bucket}</Tag>;
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
          marginBottom: '24px',
        }}
      >
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary}}>
          Laporan Piutang (Accounts Receivable)
        </Title>
        <Text type="secondary">
          Ringkasan piutang usaha dan analisis umur piutang
        </Text>
      </div>

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: (
              <span>
                <FileTextOutlined />
                {' '}Ringkasan Piutang
              </span>
            ),
            children: (
              <div>
                {/* Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
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
                  </Space>
                  <ExportButton
                    onExportPDF={handleExportPDF}
                    onExportExcel={handleExportExcel}
                  />
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
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <ClockCircleOutlined />
                {' '}Analisis Umur Piutang
              </span>
            ),
            children: (
              <div>
                {/* Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
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
                  </Space>
                  <ExportButton
                    onExportPDF={handleAgingExportPDF}
                    onExportExcel={handleAgingExportExcel}
                  />
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

                {agingLoading ? (
                  <Card style={{ textAlign: 'center', padding: '48px' }}>
                    <Spin size="large" />
                  </Card>
                ) : !agingData ? (
                  <Card>
                    <Empty description="Tidak ada data untuk tanggal ini" />
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
                          background: theme.colors.background.tertiary,
                          borderColor: theme.colors.status.success,
                        }}
                      >
                        <Statistic
                          title="Belum Jatuh Tempo"
                          value={agingData.summary.current}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.success, fontSize: '24px' }}
                          prefix="Rp"
                        />
                        <Progress
                          percent={
                            agingData.summary.totalAR > 0
                              ? (agingData.summary.current / agingData.summary.totalAR) * 100
                              : 0
                          }
                          strokeColor={theme.colors.status.success}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                      <Card
                        style={{
                          background: theme.colors.card.background,
                          borderColor: theme.colors.border.default,
                        }}
                      >
                        <Statistic
                          title="1-30 Hari"
                          value={agingData.summary.days1to30}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.info, fontSize: '24px' }}
                          prefix="Rp"
                        />
                        <Progress
                          percent={
                            agingData.summary.totalAR > 0
                              ? (agingData.summary.days1to30 / agingData.summary.totalAR) * 100
                              : 0
                          }
                          strokeColor={theme.colors.status.info}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                      <Card
                        style={{
                          background: theme.colors.card.background,
                          borderColor: theme.colors.border.default,
                        }}
                      >
                        <Statistic
                          title="31-60 Hari"
                          value={agingData.summary.days31to60}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.warning, fontSize: '24px' }}
                          prefix="Rp"
                        />
                        <Progress
                          percent={
                            agingData.summary.totalAR > 0
                              ? (agingData.summary.days31to60 / agingData.summary.totalAR) * 100
                              : 0
                          }
                          strokeColor={theme.colors.status.warning}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                      <Card
                        style={{
                          background: theme.colors.card.background,
                          borderColor: theme.colors.border.default,
                        }}
                      >
                        <Statistic
                          title="61-90 Hari"
                          value={agingData.summary.days61to90}
                          precision={0}
                          valueStyle={{ color: '#ff7875', fontSize: '24px' }}
                          prefix="Rp"
                        />
                        <Progress
                          percent={
                            agingData.summary.totalAR > 0
                              ? (agingData.summary.days61to90 / agingData.summary.totalAR) * 100
                              : 0
                          }
                          strokeColor="#ff7875"
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                      <Card
                        style={{
                          background: theme.colors.background.tertiary,
                          borderColor: theme.colors.status.error,
                        }}
                      >
                        <Statistic
                          title={
                            <Space>
                              <WarningOutlined />
                              <span>Lebih dari 90 Hari</span>
                            </Space>
                          }
                          value={agingData.summary.over90}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.error, fontSize: '24px' }}
                          prefix="Rp"
                        />
                        <Progress
                          percent={
                            agingData.summary.totalAR > 0
                              ? (agingData.summary.over90 / agingData.summary.totalAR) * 100
                              : 0
                          }
                          strokeColor={theme.colors.status.error}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                    </div>

                    {/* Total AR Card */}
                    <Card
                      style={{
                        marginBottom: '24px',
                        background: theme.colors.accent.primary,
                        borderColor: theme.colors.accent.primary,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <Text style={{ color: '#fff', fontSize: '18px' }}>
                            Total Piutang Usaha
                          </Text>
                        </div>
                        <div>
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: '36px',
                              fontWeight: 'bold',
                            }}
                          >
                            {formatCurrency(agingData.summary.totalAR)}
                          </Text>
                        </div>
                      </div>
                    </Card>

                    {/* Aging Details Table */}
                    <Card
                      title={
                        <Space>
                          <ClockCircleOutlined />
                          <span>Detail Piutang Per Umur</span>
                          <Tag color="blue">{agingData.aging.length} Invoice</Tag>
                        </Space>
                      }
                      style={{
                        background: theme.colors.card.background,
                        borderColor: theme.colors.border.default,
                      }}
                    >
                      {agingData.aging.length > 0 ? (
                        <Table
                          columns={agingColumns}
                          dataSource={agingData.aging}
                          rowKey={(record: any) => record.invoiceNumber || record.id || Math.random().toString()}
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} invoice`,
                          }}
                          size="small"
                          summary={() => (
                            <Table.Summary.Row
                              style={{ background: theme.colors.background.tertiary }}
                            >
                              <Table.Summary.Cell index={0} colSpan={6}>
                                <Text strong style={{ fontSize: '16px' }}>
                                  TOTAL PIUTANG
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={6} align="right">
                                <Text
                                  strong
                                  style={{ fontSize: '18px', color: theme.colors.accent.primary }}
                                >
                                  {formatCurrency(agingData.summary.totalAR)}
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          )}
                        />
                      ) : (
                        <Empty description="Tidak ada piutang pada tanggal ini" />
                      )}
                    </Card>
                  </>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AccountsReceivablePage;
