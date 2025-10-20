import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  DepreciationSummary,
  getDepreciationSummary,
  processMonthlyDepreciation,
} from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DepreciationPage: React.FC = () => {
  const { theme } = useTheme();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [processDate, setProcessDate] = useState<dayjs.Dayjs>(dayjs());
  const [autoPost, setAutoPost] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['depreciation-summary', dateRange],
    queryFn: () =>
      getDepreciationSummary({
        startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
        endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
      }),
    enabled: Boolean(dateRange[0] && dateRange[1]),
  });

  const processMutation = useMutation({
    mutationFn: processMonthlyDepreciation,
    onSuccess: (data) => {
      message.success(
        `Berhasil memproses ${data.processed} entri depresiasi. ${data.posted} telah di-posting ke jurnal.`,
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation-summary'] });
      setProcessModalVisible(false);
    },
    onError: (error: any) => {
      message.error(`Gagal memproses depresiasi: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMethodName = (method: string) => {
    const names: Record<string, string> = {
      STRAIGHT_LINE: 'Garis Lurus',
      DECLINING_BALANCE: 'Saldo Menurun',
      UNITS_OF_PRODUCTION: 'Unit Produksi',
    };
    return names[method] || method;
  };

  const handleProcessMonthly = () => {
    processMutation.mutate({
      periodDate: processDate.format('YYYY-MM-DD'),
      autoPost: autoPost,
    });
  };

  const showAssetDetails = (asset: any) => {
    setSelectedAsset(asset);
    setDetailsVisible(true);
  };

  const columns = [
    {
      title: 'Aset',
      dataIndex: 'assetName',
      key: 'assetName',
      render: (name: string, record: any) => (
        <div>
          <div>
            <Text strong style={{ color: theme.colors.accent.primary }}>
              {name}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.assetCode}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Depresiasi Periode',
      dataIndex: 'depreciationAmount',
      key: 'depreciationAmount',
      align: 'right' as const,
      width: 180,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.error }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Akumulasi Depresiasi',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      align: 'right' as const,
      width: 200,
      render: (amount: number) => (
        <Text style={{ color: theme.colors.text.secondary }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Nilai Buku Bersih',
      dataIndex: 'netBookValue',
      key: 'netBookValue',
      align: 'right' as const,
      width: 180,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.success }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Entri',
      dataIndex: 'entryCount',
      key: 'entryCount',
      align: 'center' as const,
      width: 80,
      render: (count: number) => <Badge count={count} showZero color={theme.colors.accent.primary} />,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => showAssetDetails(record)}>
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: theme.colors.text.primary}}>
            <DollarOutlined /> Depresiasi Aset (PSAK 16)
          </Title>
          <Text type="secondary">Manajemen depresiasi aset tetap sesuai standar PSAK 16</Text>
        </div>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => setProcessModalVisible(true)}
          size="large"
        >
          Proses Depresiasi Bulanan
        </Button>
      </div>

      {/* Filters */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.background.primary,
          borderColor: theme.colors.border.default,
        }}
      >
        <Space wrap size="middle" style={{ width: '100%' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            format="DD/MM/YYYY"
            placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
          />
        </Space>
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            <Statistic
              title="Total Depresiasi"
              value={summary?.totalDepreciation || 0}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: theme.colors.status.error }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            size="small"
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            <Statistic
              title="Jumlah Aset"
              value={summary?.assetCount || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: theme.colors.accent.primary }}
            />
          </Card>
        </Col>
        {summary?.byMethod && Object.keys(summary.byMethod).length > 0 && (
          <>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  background: theme.colors.card.background,
                  borderColor: theme.colors.border.default,
                }}
              >
                <Statistic
                  title="Garis Lurus"
                  value={summary?.byMethod['STRAIGHT_LINE']?.totalDepreciation || 0}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{ color: theme.colors.status.info, fontSize: '18px' }}
                  suffix={
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({summary?.byMethod['STRAIGHT_LINE']?.assetCount || 0} aset)
                    </Text>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  background: theme.colors.card.background,
                  borderColor: theme.colors.border.default,
                }}
              >
                <Statistic
                  title="Saldo Menurun"
                  value={summary?.byMethod['DECLINING_BALANCE']?.totalDepreciation || 0}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{ color: theme.colors.status.warning, fontSize: '18px' }}
                  suffix={
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({summary?.byMethod['DECLINING_BALANCE']?.assetCount || 0} aset)
                    </Text>
                  }
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Depreciation Table */}
      <Card
        style={{
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : !summary || summary.byAsset.length === 0 ? (
          <Empty description="Tidak ada data depresiasi untuk periode ini" />
        ) : (
          <Table
            columns={columns}
            dataSource={summary.byAsset}
            rowKey="assetId"
            pagination={false}
            style={{
              background: theme.colors.background.primary,
            }}
            summary={(data) => {
              const totalDep = data.reduce((sum, item) => sum + item.depreciationAmount, 0);
              const totalAcc = data.reduce((sum, item) => sum + item.accumulatedDepreciation, 0);
              const totalNBV = data.reduce((sum, item) => sum + item.netBookValue, 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{formatCurrency(totalDep)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatCurrency(totalAcc)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{formatCurrency(totalNBV)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Card>

      {/* Process Monthly Modal */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined />
            <span>Proses Depresiasi Bulanan</span>
          </Space>
        }
        open={processModalVisible}
        onCancel={() => setProcessModalVisible(false)}
        onOk={handleProcessMonthly}
        confirmLoading={processMutation.isPending}
        okText="Proses"
        cancelText="Batal"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text>Tanggal Periode:</Text>
            <DatePicker
              value={processDate}
              onChange={(date) => setProcessDate(date || dayjs())}
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: '8px' }}
            />
          </div>
          <div>
            <Text>Opsi:</Text>
            <Select
              value={autoPost ? 'auto' : 'manual'}
              onChange={(value) => setAutoPost(value === 'auto')}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Option value="manual">Simpan sebagai draft (posting manual)</Option>
              <Option value="auto">Posting otomatis ke jurnal</Option>
            </Select>
          </div>
          <div
            style={{
              padding: '12px',
              background: theme.colors.background.primary,
              borderRadius: '4px',
              borderLeft: `4px solid ${theme.colors.status.info}`,
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Proses ini akan menghitung depresiasi untuk semua aset aktif pada periode yang
              dipilih. Pastikan tanggal periode sudah benar.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Asset Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail Depresiasi Aset</span>
          </Space>
        }
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsVisible(false)}>
            Tutup
          </Button>,
        ]}
        width={700}
      >
        {selectedAsset && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Nama Aset" span={2}>
                <Text strong>{selectedAsset.assetName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Kode Aset">
                {selectedAsset.assetCode}
              </Descriptions.Item>
              <Descriptions.Item label="Jumlah Entri">
                <Badge count={selectedAsset.entryCount} showZero />
              </Descriptions.Item>
              <Descriptions.Item label="Depresiasi Periode">
                <Text strong style={{ color: theme.colors.status.error }}>
                  {formatCurrency(selectedAsset.depreciationAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Akumulasi Depresiasi">
                <Text>{formatCurrency(selectedAsset.accumulatedDepreciation)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nilai Buku Bersih" span={2}>
                <Text strong style={{ color: theme.colors.status.success }}>
                  {formatCurrency(selectedAsset.netBookValue)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepreciationPage;
