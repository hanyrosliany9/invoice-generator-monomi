import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Tag,
  Select,
  Space,
  Typography,
  Button,
  DatePicker,
  Badge,
  Empty,
  Spin,
  Modal,
  message,
  Statistic,
  Row,
  Col,
  Descriptions,
  Progress,
} from 'antd';
import {
  DollarOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getECLSummary,
  processMonthlyECL,
  ECLSummary,
} from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ECLProvisionPage: React.FC = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [processDate, setProcessDate] = useState<dayjs.Dayjs>(dayjs());
  const [autoPost, setAutoPost] = useState(false);
  const [includeWrittenOff, setIncludeWrittenOff] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['ecl-summary', dateRange, includeWrittenOff],
    queryFn: () =>
      getECLSummary({
        startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
        endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
        includeWrittenOff,
      }),
    enabled: Boolean(dateRange[0] && dateRange[1]),
  });

  const processMutation = useMutation({
    mutationFn: processMonthlyECL,
    onSuccess: (data) => {
      message.success(
        `Berhasil memproses ${data.processed} provisi ECL. ${data.posted} telah di-posting ke jurnal. Total ECL: ${formatCurrency(data.totalECLAmount)}`,
      );
      queryClient.invalidateQueries({ queryKey: ['ecl-summary'] });
      setProcessModalVisible(false);
    },
    onError: (error: any) => {
      message.error(`Gagal memproses ECL: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAgingBucketColor = (bucket: string) => {
    const colors: Record<string, string> = {
      Current: theme.colors.status.success,
      '1-30': theme.colors.status.info,
      '31-60': theme.colors.status.warning,
      '61-90': theme.colors.status.error,
      '91-120': theme.colors.status.error,
      'Over 120': theme.colors.status.error,
    };
    return colors[bucket] || theme.colors.text.secondary;
  };

  const getAgingBucketName = (bucket: string) => {
    const names: Record<string, string> = {
      Current: 'Lancar',
      '1-30': '1-30 Hari',
      '31-60': '31-60 Hari',
      '61-90': '61-90 Hari',
      '91-120': '91-120 Hari',
      'Over 120': '> 120 Hari',
    };
    return names[bucket] || bucket;
  };

  const handleProcessMonthly = () => {
    processMutation.mutate({
      calculationDate: processDate.format('YYYY-MM-DD'),
      autoPost: autoPost,
    });
  };

  const showInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDetailsVisible(true);
  };

  const riskColumns = [
    {
      title: 'Faktur',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (invoiceNumber: string, record: any) => (
        <div>
          <div>
            <Text strong style={{ color: theme.colors.accent.primary }}>
              {invoiceNumber}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.clientName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Umur Piutang',
      dataIndex: 'agingBucket',
      key: 'agingBucket',
      width: 140,
      render: (bucket: string, record: any) => (
        <div>
          <Tag color={getAgingBucketColor(bucket)}>{getAgingBucketName(bucket)}</Tag>
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.daysPastDue} hari jatuh tempo
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstandingAmount',
      key: 'outstandingAmount',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text style={{ color: theme.colors.text.primary}}>{formatCurrency(amount)}</Text>
      ),
    },
    {
      title: 'ECL Rate',
      dataIndex: 'eclRate',
      key: 'eclRate',
      align: 'center' as const,
      width: 100,
      render: (rate: number) => (
        <Tag color="orange">{(rate * 100).toFixed(1)}%</Tag>
      ),
    },
    {
      title: 'Provisi ECL',
      dataIndex: 'eclAmount',
      key: 'eclAmount',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.error }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => showInvoiceDetails(record)}>
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
            <WarningOutlined /> Provisi Kerugian Kredit (PSAK 71)
          </Title>
          <Text type="secondary">
            Expected Credit Loss (ECL) untuk piutang sesuai standar PSAK 71
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => setProcessModalVisible(true)}
          size="large"
        >
          Proses ECL Bulanan
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
          <Select
            value={includeWrittenOff}
            onChange={setIncludeWrittenOff}
            style={{ width: 200 }}
          >
            <Option value={false}>Tanpa Write-off</Option>
            <Option value={true}>Termasuk Write-off</Option>
          </Select>
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
              title="Total Provisi ECL"
              value={summary?.summary.totalECL || 0}
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
              title="Total Write-off"
              value={summary?.summary.totalWrittenOff || 0}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<WarningOutlined />}
              valueStyle={{ color: theme.colors.status.warning }}
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
              title="Total Pemulihan"
              value={summary?.summary.totalRecovered || 0}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: theme.colors.status.success }}
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
              title="Jumlah Faktur"
              value={summary?.summary.totalProvisions || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: theme.colors.accent.primary }}
            />
          </Card>
        </Col>
      </Row>

      {/* Aging Bucket Analysis */}
      {summary?.byAgingBucket && Object.keys(summary.byAgingBucket).length > 0 && (
        <Card
          title={<Text strong>Analisis per Umur Piutang</Text>}
          style={{
            marginBottom: '24px',
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Row gutter={16}>
            {Object.entries(summary.byAgingBucket).map(([bucket, data]) => (
              <Col xs={24} sm={12} lg={4} key={bucket}>
                <div
                  style={{
                    padding: '16px',
                    background: theme.colors.background.primary,
                    borderRadius: '4px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Tag color={getAgingBucketColor(bucket)}>{getAgingBucketName(bucket)}</Tag>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Faktur: {data.count}
                    </Text>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      {formatCurrency(data.totalECL)}
                    </Text>
                  </div>
                  <Progress
                    percent={Number((data.averageECLRate * 100).toFixed(1))}
                    strokeColor={getAgingBucketColor(bucket)}
                    size="small"
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Top Risky Invoices */}
      <Card
        title={<Text strong>Faktur Berisiko Tinggi</Text>}
        style={{
          background: theme.colors.card.background,
          borderColor: theme.colors.border.default,
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : !summary || summary.provisions.length === 0 ? (
          <Empty description="Tidak ada faktur berisiko untuk periode ini" />
        ) : (
          <Table
            columns={riskColumns}
            dataSource={summary.provisions}
            rowKey="id"
            pagination={false}
            style={{
              background: theme.colors.background.primary,
            }}
            summary={(data) => {
              const totalOutstanding = data.reduce((sum, item) => sum + item.outstandingAmount, 0);
              const totalECL = data.reduce((sum, item) => sum + item.eclAmount, 0);
              const avgRate = totalOutstanding > 0 ? (totalECL / totalOutstanding) : 0;
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} />
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatCurrency(totalOutstanding)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="center">
                    <Tag color="orange">{(avgRate * 100).toFixed(1)}%</Tag>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong>{formatCurrency(totalECL)}</Text>
                  </Table.Summary.Cell>
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
            <span>Proses ECL Bulanan</span>
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
            <Text>Tanggal Perhitungan:</Text>
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
              borderLeft: `4px solid ${theme.colors.status.warning}`,
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Proses ini akan menghitung Expected Credit Loss untuk semua faktur outstanding pada
              tanggal yang dipilih berdasarkan umur piutang dan default ECL rates.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail ECL Faktur</span>
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
        {selectedInvoice && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="No. Faktur" span={2}>
                <Text strong>{selectedInvoice.invoiceNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Klien" span={2}>
                {selectedInvoice.clientName}
              </Descriptions.Item>
              <Descriptions.Item label="Umur Piutang">
                <Tag color={getAgingBucketColor(selectedInvoice.agingBucket)}>
                  {getAgingBucketName(selectedInvoice.agingBucket)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hari Jatuh Tempo">
                <Badge count={selectedInvoice.daysPastDue} showZero />
              </Descriptions.Item>
              <Descriptions.Item label="Jumlah Outstanding">
                <Text strong>{formatCurrency(selectedInvoice.outstandingAmount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ECL Rate">
                <Tag color="orange">{(selectedInvoice.eclRate * 100).toFixed(1)}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Provisi ECL" span={2}>
                <Text strong style={{ color: theme.colors.status.error, fontSize: '16px' }}>
                  {formatCurrency(selectedInvoice.eclAmount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: theme.colors.background.primary,
                borderRadius: '4px',
              }}
            >
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>Catatan:</strong> Provisi ECL dihitung berdasarkan umur piutang menggunakan
                default ECL rates sesuai PSAK 71. Rate dapat disesuaikan berdasarkan pengalaman
                historis perusahaan.
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ECLProvisionPage;
