import React, { useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  DatePicker,
  Button,
  Table,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Tag,
} from 'antd';
import {
  BankOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  DollarOutlined,
  FallOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;

interface CashBankBalance {
  id: string;
  period: string;
  periodDate: Dayjs;
  openingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
  createdAt: string;
}

export const CashBankBalancePage: React.FC = () => {
  const [form] = Form.useForm();
  const { theme } = useTheme();
  const [isCalculating, setIsCalculating] = useState(false);
  const [balances, setBalances] = useState<CashBankBalance[]>([
    {
      id: '1',
      period: 'Januari 2025',
      periodDate: dayjs('2025-01-01'),
      openingBalance: 50000000,
      totalInflow: 100000000, // Calculated from journal entries (cash/bank debits)
      totalOutflow: 75000000, // Calculated from journal entries (cash/bank credits)
      closingBalance: 75000000, // Auto: 50M + 100M - 75M = 75M
      netChange: 25000000, // Auto: 100M - 75M = 25M
      createdAt: '2025-01-31',
    },
    {
      id: '2',
      period: 'Februari 2025',
      periodDate: dayjs('2025-02-01'),
      openingBalance: 75000000,
      totalInflow: 80000000, // Calculated from journal entries
      totalOutflow: 65000000, // Calculated from journal entries
      closingBalance: 90000000, // Auto: 75M + 80M - 65M = 90M
      netChange: 15000000, // Auto: 80M - 65M = 15M
      createdAt: '2025-02-28',
    },
  ]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (values: any) => {
    const openingBalance = Number(values.openingBalance);
    const periodDate = values.period as Dayjs;

    setIsCalculating(true);

    // TODO: Backend Implementation
    // This should call an API endpoint that:
    // 1. Queries all journal entries for the selected period
    // 2. Sums all debits to Cash/Bank accounts (inflows)
    // 3. Sums all credits to Cash/Bank accounts (outflows)
    // Example:
    // const { totalInflow, totalOutflow } = await getCashBankMovements({
    //   startDate: periodDate.startOf('month').format('YYYY-MM-DD'),
    //   endDate: periodDate.endOf('month').format('YYYY-MM-DD'),
    // });

    // MOCK DATA for demonstration (in production, this comes from database)
    // Simulating database query for cash movements
    const totalInflow = Math.floor(Math.random() * 150000000) + 50000000;
    const totalOutflow = Math.floor(Math.random() * 100000000) + 40000000;

    // Automatically calculate closing balance and net change
    const closingBalance = openingBalance + totalInflow - totalOutflow;
    const netChange = totalInflow - totalOutflow;

    setTimeout(() => {
      const newBalance: CashBankBalance = {
        id: Date.now().toString(),
        period: periodDate.format('MMMM YYYY'),
        periodDate: periodDate,
        openingBalance,
        closingBalance,
        totalInflow,
        totalOutflow,
        netChange,
        createdAt: new Date().toISOString(),
      };

      setBalances([newBalance, ...balances]);
      setIsCalculating(false);
      form.resetFields();
    }, 1000);
  };

  const columns = [
    {
      title: 'Periode',
      dataIndex: 'period',
      key: 'period',
      render: (text: string, record: CashBankBalance) => (
        <Space>
          <CalendarOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Saldo Awal',
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      align: 'right' as const,
      render: (value: number) => <Text>{formatIDR(value)}</Text>,
    },
    {
      title: 'Total Masuk',
      dataIndex: 'totalInflow',
      key: 'totalInflow',
      align: 'right' as const,
      render: (value: number) => (
        <Text style={{ color: '#52c41a' }}>{formatIDR(value)}</Text>
      ),
    },
    {
      title: 'Total Keluar',
      dataIndex: 'totalOutflow',
      key: 'totalOutflow',
      align: 'right' as const,
      render: (value: number) => (
        <Text style={{ color: '#ff4d4f' }}>{formatIDR(value)}</Text>
      ),
    },
    {
      title: 'Saldo Akhir',
      dataIndex: 'closingBalance',
      key: 'closingBalance',
      align: 'right' as const,
      render: (value: number) => <Text strong>{formatIDR(value)}</Text>,
    },
    {
      title: 'Perubahan Bersih',
      dataIndex: 'netChange',
      key: 'netChange',
      align: 'right' as const,
      render: (value: number) => (
        <Tag
          icon={value >= 0 ? <RiseOutlined /> : <FallOutlined />}
          color={value >= 0 ? 'success' : 'error'}
        >
          {formatIDR(value)}
        </Tag>
      ),
    },
  ];

  const latestBalance = balances[0];
  const totalBalanceChange = balances.reduce((sum, b) => sum + b.netChange, 0);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ color: theme.colors.text.primary }}>
          <BankOutlined style={{ marginRight: '8px' }} />
          Saldo Kas/Bank
        </Title>
        <Text type="secondary">
          Kelola saldo awal dan akhir kas/bank per periode
        </Text>
      </div>

      <Alert
        message="Cara Kerja Saldo Kas/Bank"
        description={
          <div>
            <div><strong>Input Manual:</strong> Periode dan Saldo Awal</div>
            <div><strong>Dihitung Otomatis:</strong> Total Masuk, Total Keluar, Saldo Akhir</div>
            <div style={{ marginTop: '8px' }}>
              Sistem akan mengambil semua transaksi kas/bank dari jurnal umum pada periode yang dipilih.
              Formula: <strong>Saldo Akhir = Saldo Awal (manual) + Total Masuk (otomatis) - Total Keluar (otomatis)</strong>
            </div>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Saldo Terakhir"
              value={latestBalance?.closingBalance || 0}
              formatter={(value) => formatIDR(Number(value))}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {latestBalance?.period || '-'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Masuk (Periode Terakhir)"
              value={latestBalance?.totalInflow || 0}
              formatter={(value) => formatIDR(Number(value))}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Keluar (Periode Terakhir)"
              value={latestBalance?.totalOutflow || 0}
              formatter={(value) => formatIDR(Number(value))}
              prefix={<FallOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Perubahan Bersih (Total)"
              value={totalBalanceChange}
              formatter={(value) => formatIDR(Number(value))}
              prefix={totalBalanceChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{
                color: totalBalanceChange >= 0 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Input Form */}
      <Card
        title={
          <Space>
            <CalculatorOutlined />
            <span>Hitung Saldo Kas/Bank untuk Periode Baru</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            period: dayjs(),
          }}
        >
          <Row gutter={16} align="bottom">
            <Col xs={24} md={8}>
              <Form.Item
                name="period"
                label="Periode"
                rules={[{ required: true, message: 'Pilih periode' }]}
              >
                <DatePicker
                  picker="month"
                  format="MMMM YYYY"
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="Pilih bulan"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={10}>
              <Form.Item
                name="openingBalance"
                label={
                  <Space>
                    <span>Saldo Awal (IDR)</span>
                    <Tag color="blue">Manual Input</Tag>
                  </Space>
                }
                rules={[{ required: true, message: 'Masukkan saldo awal' }]}
                tooltip="Masukkan saldo awal periode ini secara manual. Biasanya sama dengan saldo akhir periode sebelumnya."
                extra={
                  balances.length > 0 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Saldo akhir periode terakhir: {formatIDR(balances[0].closingBalance)}
                    </Text>
                  )
                }
              >
                <InputNumber
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(value) =>
                    `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  }
                  parser={(value) => value?.replace(/Rp\s?|(\.*)/g, '') as any}
                  min={0}
                  placeholder="Masukkan saldo awal secara manual"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CalculatorOutlined />}
                  size="large"
                  block
                  loading={isCalculating}
                >
                  Hitung Saldo
                </Button>
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="Catatan"
            description="Total Masuk dan Total Keluar akan dihitung otomatis dari semua transaksi jurnal kas/bank pada periode yang dipilih."
            type="success"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Card>

      {/* Balance History Table */}
      <Card title="Riwayat Saldo Per Periode">
        <Table
          columns={columns}
          dataSource={balances}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} periode`,
          }}
        />
      </Card>
    </div>
  );
};
