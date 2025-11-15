import React, { useMemo, useState } from 'react';
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
  theme,
  Popconfirm,
  message,
} from 'antd';
import {
  BankOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  DeleteOutlined,
  DollarOutlined,
  FallOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../store/auth';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction } from '../../components/mobile/MobileTableView';
import { cashBankBalanceToBusinessEntity } from '../../adapters/mobileTableAdapters';
import {
  getCashBankBalances,
  createCashBankBalance,
  deleteCashBankBalance,
  type CashBankBalance as APICashBankBalance,
} from '../../services/cash-bank-balance';

const { Title, Text } = Typography;
const { useToken } = theme;

// Component-level type that extends API type with Dayjs
interface CashBankBalance extends Omit<APICashBankBalance, 'periodDate'> {
  periodDate: Dayjs;
}

export const CashBankBalancePage: React.FC = () => {
  const [form] = Form.useForm();
  const { theme } = useTheme();
  const { token } = useToken();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Fetch cash/bank balances from API
  const { data: balancesData, isLoading } = useQuery({
    queryKey: ['cash-bank-balances'],
    queryFn: () => getCashBankBalances({ sortBy: 'periodDate', sortOrder: 'desc' }),
  });

  // Transform API data to component data (convert date strings to Dayjs)
  const balances: CashBankBalance[] = useMemo(() => {
    const dataArray = balancesData?.data;
    if (!dataArray || !Array.isArray(dataArray)) return [];
    return dataArray.map(b => ({
      ...b,
      periodDate: dayjs(b.periodDate),
    }));
  }, [balancesData]);

  // Mutation to create new balance
  const createMutation = useMutation({
    mutationFn: createCashBankBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] });
      message.success('Saldo kas/bank berhasil dihitung dan disimpan');
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Gagal menyimpan saldo kas/bank');
    },
  });

  // Mutation to delete balance
  const deleteMutation = useMutation({
    mutationFn: deleteCashBankBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] });
      message.success('Saldo berhasil dihapus');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Gagal menghapus saldo');
    },
  });

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async (values: Record<string, any>) => {
    const openingBalance = Number(values.openingBalance);
    const periodDate = values.period as Dayjs;

    // Backend will automatically calculate totalInflow, totalOutflow, closingBalance, netChange
    createMutation.mutate({
      period: periodDate.format('MMMM YYYY'),
      periodDate: periodDate.format('YYYY-MM-DD'),
      year: periodDate.year(),
      month: periodDate.month() + 1, // dayjs months are 0-indexed
      openingBalance,
    });
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
        <Text style={{ color: token.colorSuccess }}>{formatIDR(value)}</Text>
      ),
    },
    {
      title: 'Total Keluar',
      dataIndex: 'totalOutflow',
      key: 'totalOutflow',
      align: 'right' as const,
      render: (value: number) => (
        <Text style={{ color: token.colorError }}>{formatIDR(value)}</Text>
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
    {
      title: 'Aksi',
      key: 'action',
      align: 'center' as const,
      width: 100,
      render: (_: any, record: CashBankBalance) => (
        <Popconfirm
          title="Hapus Saldo"
          description={`Yakin ingin menghapus saldo periode ${record.period}?`}
          onConfirm={() => handleDelete(record.id)}
          okText="Ya"
          cancelText="Batal"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const latestBalance = balances[0];
  const latestNetChange = latestBalance?.netChange ? Number(latestBalance.netChange) : 0;

  // Mobile view data
  const mobileData = useMemo(() =>
    balances.map(cashBankBalanceToBusinessEntity),
    [balances]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <BankOutlined />,
      onClick: (record) => {
        console.log('View balance:', record.number);
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      onClick: (record) => {
        const balance = balances.find((b) => b.id === record.id);
        if (balance) {
          if (window.confirm(`Yakin ingin menghapus saldo periode ${balance.period}?`)) {
            handleDelete(record.id);
          }
        }
      },
      danger: true,
    },
  ], [balances]);

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
              valueStyle={{ color: token.colorSuccess }}
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
              valueStyle={{ color: token.colorSuccess }}
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
              valueStyle={{ color: token.colorError }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Perubahan Bersih (Periode Terakhir)"
              value={latestNetChange}
              formatter={(value) => formatIDR(Number(value))}
              prefix={latestNetChange >= 0 ? <RiseOutlined /> : <FallOutlined />}
              valueStyle={{
                color: latestNetChange >= 0 ? token.colorSuccess : token.colorError,
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {latestBalance?.period || '-'}
            </Text>
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
                  loading={createMutation.isPending}
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
        {isMobile ? (
          <MobileTableView
            data={mobileData}
            loading={isLoading}
            entityType="cash-bank-balance"
            showQuickStats
            searchable
            searchFields={['number', 'title']}
            actions={mobileActions}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] })}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={balances}
            rowKey="id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} periode`,
            }}
          />
        )}
      </Card>
    </div>
  );
};
