import React, { useMemo, useState } from 'react';
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
  ClockCircleOutlined,
  DownloadOutlined,
  TagOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportAPAgingExcel, exportAPAgingPDF, getAccountsPayableAging } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction, MobileFilterConfig } from '../../components/mobile/MobileTableView';
import { apAgingToBusinessEntity } from '../../adapters/mobileTableAdapters';

const { Title, Text } = Typography;

const APAgingPage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['ap-aging', asOfDate?.format('YYYY-MM-DD')],
    queryFn: () =>
      getAccountsPayableAging({
        asOfDate: asOfDate.format('YYYY-MM-DD'),
      }),
    enabled: !!asOfDate,
  });

  const handleExportPDF = async () => {
    await exportAPAgingPDF({
      asOfDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
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

  // Mobile view data
  const agingEntries = data?.aging || [];

  const mobileData = useMemo(() =>
    agingEntries.map(apAgingToBusinessEntity),
    [agingEntries]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail Beban',
      icon: <TagOutlined />,
      onClick: (record) => {
        // Navigate to expense detail if needed
        console.log('View expense:', record.number);
      },
    },
  ], []);

  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'agingBucket',
      label: 'Kategori Umur',
      type: 'select',
      options: [
        { label: 'Semua', value: '' },
        { label: 'Belum Jatuh Tempo', value: 'Current' },
        { label: '1-30 Hari', value: '1-30 days' },
        { label: '31-60 Hari', value: '31-60 days' },
        { label: '61-90 Hari', value: '61-90 days' },
        { label: 'Lebih dari 90 Hari', value: 'Over 90 days' },
      ],
      value: '',
      onChange: () => {},
    },
  ], []);

  const columns = [
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
            Aging Hutang (AP Aging Report)
          </Title>
          <Text type="secondary">
            Analisis umur hutang berdasarkan jatuh tempo
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
                value={data.summary.current}
                precision={0}
                valueStyle={{ color: theme.colors.status.success, fontSize: '24px' }}
                prefix="Rp"
              />
              <Progress
                percent={
                  data.summary.totalAP > 0
                    ? (data.summary.current / data.summary.totalAP) * 100
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
                value={data.summary.days1to30}
                precision={0}
                valueStyle={{ color: theme.colors.status.info, fontSize: '24px' }}
                prefix="Rp"
              />
              <Progress
                percent={
                  data.summary.totalAP > 0
                    ? (data.summary.days1to30 / data.summary.totalAP) * 100
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
                value={data.summary.days31to60}
                precision={0}
                valueStyle={{ color: theme.colors.status.warning, fontSize: '24px' }}
                prefix="Rp"
              />
              <Progress
                percent={
                  data.summary.totalAP > 0
                    ? (data.summary.days31to60 / data.summary.totalAP) * 100
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
                value={data.summary.days61to90}
                precision={0}
                valueStyle={{ color: '#ff7875', fontSize: '24px' }}
                prefix="Rp"
              />
              <Progress
                percent={
                  data.summary.totalAP > 0
                    ? (data.summary.days61to90 / data.summary.totalAP) * 100
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
                value={data.summary.over90}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: '24px' }}
                prefix="Rp"
              />
              <Progress
                percent={
                  data.summary.totalAP > 0
                    ? (data.summary.over90 / data.summary.totalAP) * 100
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
                  {formatCurrency(data.summary.totalAP)}
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
                <Tag color="blue">{data.aging.length} Beban</Tag>
              </Space>
            }
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            {data.aging.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={mobileData}
                  loading={isLoading}
                  entityType="ap-aging"
                  showQuickStats
                  searchable
                  searchFields={['number', 'client.name']}
                  filters={mobileFilters}
                  actions={mobileActions}
                  onRefresh={() => {}}
                />
              ) : (
                <Table
                  columns={columns}
                  dataSource={data.aging}
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
                          {formatCurrency(data.summary.totalAP)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            ) : (
              <Empty description="Tidak ada hutang pada tanggal ini" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default APAgingPage;
