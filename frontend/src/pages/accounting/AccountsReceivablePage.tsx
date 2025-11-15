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
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import { accountsReceivableToBusinessEntity } from '../../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';

const { Title, Text } = Typography;

const AccountsReceivablePage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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

  const entries = data?.data || [];

  // Mobile data adapter
  const mobileData = useMemo(() =>
    entries.map(accountsReceivableToBusinessEntity),
    [entries]
  );

  // Mobile actions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Invoice',
      icon: <EyeOutlined />,
      onClick: (record) => navigate(`/invoices/${record.id}`),
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
      render: (_: unknown, record: any) => {
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
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: isMobile ? '16px' : '24px',
        }}
      >
        <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: theme.colors.text.primary}}>
          {isMobile ? 'Laporan Piutang' : 'Laporan Piutang (Accounts Receivable)'}
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {isMobile ? 'Ringkasan piutang usaha' : 'Ringkasan piutang usaha dan analisis umur piutang'}
        </Text>
      </div>

      <Tabs
        defaultActiveKey="1"
        size={isMobile ? 'small' : 'middle'}
        items={[
          {
            key: '1',
            label: (
              <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                <FileTextOutlined />
                {!isMobile && ' '}Ringkasan{isMobile ? '' : ' Piutang'}
              </span>
            ),
            children: (
              <div>
                {/* Controls */}
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
                      size={isMobile ? 'small' : 'middle'}
                      style={{ width: isMobile ? '100%' : 'auto' }}
                    />
                  </Space>
                  <ExportButton
                    onExportPDF={handleExportPDF}
                    onExportExcel={handleExportExcel}
                  />
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
                        Per Tanggal: {endDate.format(isMobile ? 'DD MMM YYYY' : 'DD MMMM YYYY')}
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
                : 'repeat(auto-fit, minmax(220px, 1fr))',
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
                    <FileTextOutlined style={{ color: theme.colors.accent.primary, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total Piutang</span>
                  </Space>
                }
                value={data.summary.totalOutstanding}
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
                    <UserOutlined style={{ color: theme.colors.status.info, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>Jumlah Klien</span>
                  </Space>
                }
                value={data.summary.customerCount}
                valueStyle={{ color: theme.colors.status.info, fontSize: isMobile ? '18px' : '28px' }}
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
                    <FileTextOutlined style={{ color: theme.colors.status.warning, fontSize: isMobile ? '16px' : '20px' }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Belum Bayar' : 'Invoice Belum Bayar'}</span>
                  </Space>
                }
                value={data.aging?.aging?.length || 0}
                valueStyle={{ color: theme.colors.status.warning, fontSize: isMobile ? '18px' : '28px' }}
              />
            </Card>
          </div>

          {/* Receivables by Client */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <UserOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Per Klien' : 'Piutang Per Klien'}</span>
                <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>{data.topCustomers?.length || 0} Klien</Tag>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              marginBottom: isMobile ? '16px' : '24px',
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
                scroll={isMobile ? { x: 500 } : undefined}
              />
            ) : (
              <Empty description="Tidak ada piutang pada periode ini" />
            )}
          </Card>

          {/* Outstanding Invoices */}
          <Card
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <FileTextOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Belum Terbayar' : 'Invoice Belum Terbayar'}</span>
                <Tag color="orange" style={{ fontSize: isMobile ? '10px' : '12px' }}>{data.aging?.aging?.length || 0} Invoice</Tag>
              </Space>
            }
            size={isMobile ? 'small' : 'default'}
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {isMobile ? (
              <MobileTableView
                data={mobileData}
                loading={isLoading}
                entityType="accounts-receivable"
                showQuickStats
                searchable
                searchFields={['number', 'title', 'client.name']}
                filters={mobileFilters}
                actions={mobileActions}
                onRefresh={() => message.success('Data diperbarui')}
              />
            ) : data.aging?.aging && data.aging.aging.length > 0 ? (
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
              <span style={{ fontSize: isMobile ? '12px' : '14px' }}>
                <ClockCircleOutlined />
                {!isMobile && ' '}Analisis{isMobile ? '' : ' Umur Piutang'}
              </span>
            ),
            children: (
              <div>
                {/* Controls */}
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
                      size={isMobile ? 'small' : 'middle'}
                      style={{ width: isMobile ? '100%' : 'auto' }}
                    />
                  </Space>
                  <ExportButton
                    onExportPDF={handleAgingExportPDF}
                    onExportExcel={handleAgingExportExcel}
                  />
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
                  <Space align="center">
                    <CalendarOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#fff' }} />
                    <div>
                      <Text style={{ color: '#fff', fontSize: isMobile ? '14px' : '16px', fontWeight: 500 }}>
                        Per Tanggal: {asOfDate.format(isMobile ? 'DD MMM YYYY' : 'DD MMMM YYYY')}
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
                          background: theme.colors.background.tertiary,
                          borderColor: theme.colors.status.success,
                        }}
                      >
                        <Statistic
                          title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? 'Belum J.T.' : 'Belum Jatuh Tempo'}</span>}
                          value={agingData.summary.current}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.success, fontSize: isMobile ? '18px' : '24px' }}
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
                          style={{ marginTop: isMobile ? '4px' : '8px' }}
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
                          title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>1-30 Hari</span>}
                          value={agingData.summary.days1to30}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.info, fontSize: isMobile ? '18px' : '24px' }}
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
                          style={{ marginTop: isMobile ? '4px' : '8px' }}
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
                          title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>31-60 Hari</span>}
                          value={agingData.summary.days31to60}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.warning, fontSize: isMobile ? '18px' : '24px' }}
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
                          style={{ marginTop: isMobile ? '4px' : '8px' }}
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
                          title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>61-90 Hari</span>}
                          value={agingData.summary.days61to90}
                          precision={0}
                          valueStyle={{ color: '#ff7875', fontSize: isMobile ? '18px' : '24px' }}
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
                          style={{ marginTop: isMobile ? '4px' : '8px' }}
                        />
                      </Card>
                      <Card
                        size={isMobile ? 'small' : 'default'}
                        style={{
                          background: theme.colors.background.tertiary,
                          borderColor: theme.colors.status.error,
                        }}
                      >
                        <Statistic
                          title={
                            <Space size={isMobile ? 'small' : 'middle'}>
                              <WarningOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />
                              <span style={{ fontSize: isMobile ? '11px' : '14px' }}>{isMobile ? '>90 Hari' : 'Lebih dari 90 Hari'}</span>
                            </Space>
                          }
                          value={agingData.summary.over90}
                          precision={0}
                          valueStyle={{ color: theme.colors.status.error, fontSize: isMobile ? '18px' : '24px' }}
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
                          style={{ marginTop: isMobile ? '4px' : '8px' }}
                        />
                      </Card>
                    </div>

                    {/* Total AR Card */}
                    <Card
                      size={isMobile ? 'small' : 'default'}
                      style={{
                        marginBottom: isMobile ? '16px' : '24px',
                        background: theme.colors.accent.primary,
                        borderColor: theme.colors.accent.primary,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          justifyContent: 'space-between',
                          alignItems: isMobile ? 'flex-start' : 'center',
                          gap: isMobile ? '8px' : '0',
                        }}
                      >
                        <div>
                          <Text style={{ color: '#fff', fontSize: isMobile ? '14px' : '18px' }}>
                            Total Piutang Usaha
                          </Text>
                        </div>
                        <div>
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: isMobile ? '24px' : '36px',
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
                        <Space size={isMobile ? 'small' : 'middle'}>
                          <ClockCircleOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />
                          <span style={{ fontSize: isMobile ? '13px' : '14px' }}>{isMobile ? 'Per Umur' : 'Detail Piutang Per Umur'}</span>
                          <Tag color="blue" style={{ fontSize: isMobile ? '10px' : '12px' }}>{agingData.aging.length} Invoice</Tag>
                        </Space>
                      }
                      size={isMobile ? 'small' : 'default'}
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
                            pageSize: isMobile ? 10 : 20,
                            showSizeChanger: !isMobile,
                            showTotal: (total) => `Total ${total} invoice`,
                          }}
                          size="small"
                          scroll={isMobile ? { x: 800 } : undefined}
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
