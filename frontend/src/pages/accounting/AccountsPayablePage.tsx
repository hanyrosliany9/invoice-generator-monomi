import React, { useState, useMemo } from 'react';
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
  EyeOutlined,
  FileTextOutlined,
  TagOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  exportAccountsPayableExcel,
  exportAccountsPayablePDF,
  exportAPAgingExcel,
  exportAPAgingPDF,
  getAccountsPayableAging,
  getAccountsPayableReport,
} from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import { accountsPayableToBusinessEntity } from '../../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const AccountsPayablePage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-payable', dateRange],
    queryFn: () =>
      getAccountsPayableReport({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      }),
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['ap-aging', asOfDate.format('YYYY-MM-DD')],
    queryFn: () =>
      getAccountsPayableAging({
        asOfDate: asOfDate.format('YYYY-MM-DD'),
      }),
    enabled: !!asOfDate,
  });

  const entries = data?.data || [];

  // Mobile data adapter
  const mobileData = useMemo(() =>
    entries.map(accountsPayableToBusinessEntity),
    [entries]
  );

  // Mobile actions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => navigate(`/expenses/${record.id}`),
    },
  ], [navigate]);

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Belum Lunas', value: 'sent' },
        { label: 'Telat', value: 'overdue' },
        { label: 'Lunas', value: 'paid' },
      ],
    },
  ], []);

  const handleExportPDF = async () => {
    await exportAccountsPayablePDF({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportAccountsPayableExcel({
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const handleAgingExportPDF = async () => {
    await exportAPAgingPDF({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const handleAgingExportExcel = async () => {
    await exportAPAgingExcel({
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

  const expenseColumns = [
    {
      title: 'Nomor Beban',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 150,
    },
    {
      title: 'Kategori',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (name: string) => (
        <Space>
          <TagOutlined />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Tanggal Beban',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
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
      title: 'Umur Hutang',
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
        <Text strong style={{ color: theme.colors.status.error }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
  ];

  const agingColumns = [
    {
      title: 'Nomor Beban',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 150,
    },
    {
      title: 'Kategori',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (name: string) => (
        <Space>
          <TagOutlined />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Tanggal Beban',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
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
        <Text strong style={{ color: theme.colors.status.error }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
  ];

  const categoryColumns = [
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      render: (category: { code: string; name: string; nameId: string }) => (
        <Space>
          <TagOutlined />
          <span>{category?.nameId || category?.name || '-'}</span>
        </Space>
      ),
    },
    {
      title: 'Jumlah Beban',
      dataIndex: 'expenseCount',
      key: 'expenseCount',
      width: 120,
      align: 'center' as const,
    },
    {
      title: 'Total Hutang',
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
              strokeColor={theme.colors.status.error}
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
          Laporan Hutang (Accounts Payable)
        </Title>
        <Text type="secondary">
          Ringkasan hutang usaha dan analisis umur hutang
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
                {' '}Ringkasan Hutang
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
                    <FileTextOutlined style={{ color: theme.colors.status.error }} />
                    <span>Total Hutang</span>
                  </Space>
                }
                value={data.summary.totalOutstanding}
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
                    <TagOutlined style={{ color: theme.colors.status.info }} />
                    <span>Jumlah Kategori</span>
                  </Space>
                }
                value={data.summary.categoryCount}
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
                    <span>Beban Belum Bayar</span>
                  </Space>
                }
                value={data.aging?.aging?.length || 0}
                valueStyle={{ color: theme.colors.status.warning, fontSize: '28px' }}
              />
            </Card>
          </div>

          {/* Payables by Category */}
          <Card
            title={
              <Space>
                <TagOutlined />
                <span>Hutang Per Kategori</span>
                <Tag color="blue">{data.topCategories?.length || 0} Kategori</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.topCategories && data.topCategories.length > 0 ? (
              <Table
                columns={categoryColumns}
                dataSource={data.topCategories}
                rowKey={(record) => record.category?.code || 'unknown'}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty description="Tidak ada hutang pada periode ini" />
            )}
          </Card>

          {/* Outstanding Expenses */}
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Beban Belum Terbayar</span>
                <Tag color="orange">{data.aging?.aging?.length || 0} Beban</Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {isMobile ? (
              <MobileTableView
                data={mobileData}
                loading={isLoading}
                entityType="accounts-payable"
                showQuickStats
                searchable
                searchFields={['number', 'title', 'client.name']}
                filters={mobileFilters}
                actions={mobileActions}
                onRefresh={() => message.success('Data diperbarui')}
              />
            ) : data.aging?.aging && data.aging.aging.length > 0 ? (
              <Table
                columns={expenseColumns}
                dataSource={data.aging.aging}
                rowKey={(record: any) => record.expenseNumber || record.id || Math.random().toString()}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} beban`,
                }}
                size="small"
                summary={() => (
                  <Table.Summary.Row
                    style={{ background: theme.colors.background.tertiary }}
                  >
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Text strong style={{ fontSize: '16px' }}>
                        TOTAL HUTANG
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <Text
                        strong
                        style={{ fontSize: '18px', color: theme.colors.status.error }}
                      >
                        {formatCurrency(data.summary.totalOutstanding)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            ) : (
              <Empty description="Tidak ada beban belum terbayar" />
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
                {' '}Analisis Umur Hutang
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
                            agingData.summary.totalAP > 0
                              ? (agingData.summary.current / agingData.summary.totalAP) * 100
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
                            agingData.summary.totalAP > 0
                              ? (agingData.summary.days1to30 / agingData.summary.totalAP) * 100
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
                            agingData.summary.totalAP > 0
                              ? (agingData.summary.days31to60 / agingData.summary.totalAP) * 100
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
                            agingData.summary.totalAP > 0
                              ? (agingData.summary.days61to90 / agingData.summary.totalAP) * 100
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
                            agingData.summary.totalAP > 0
                              ? (agingData.summary.over90 / agingData.summary.totalAP) * 100
                              : 0
                          }
                          strokeColor={theme.colors.status.error}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: '8px' }}
                        />
                      </Card>
                    </div>

                    {/* Total AP Card */}
                    <Card
                      style={{
                        marginBottom: '24px',
                        background: theme.colors.status.error,
                        borderColor: theme.colors.status.error,
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
                            Total Hutang Usaha
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
                            {formatCurrency(agingData.summary.totalAP)}
                          </Text>
                        </div>
                      </div>
                    </Card>

                    {/* Aging Details Table */}
                    <Card
                      title={
                        <Space>
                          <ClockCircleOutlined />
                          <span>Detail Hutang Per Umur</span>
                          <Tag color="blue">{agingData.aging.length} Beban</Tag>
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
                          rowKey={(record: any) => record.expenseNumber || record.id || Math.random().toString()}
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} beban`,
                          }}
                          size="small"
                          summary={() => (
                            <Table.Summary.Row
                              style={{ background: theme.colors.background.tertiary }}
                            >
                              <Table.Summary.Cell index={0} colSpan={6}>
                                <Text strong style={{ fontSize: '16px' }}>
                                  TOTAL HUTANG
                                </Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={6} align="right">
                                <Text
                                  strong
                                  style={{ fontSize: '18px', color: theme.colors.status.error }}
                                >
                                  {formatCurrency(agingData.summary.totalAP)}
                                </Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          )}
                        />
                      ) : (
                        <Empty description="Tidak ada hutang pada tanggal ini" />
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

export default AccountsPayablePage;
