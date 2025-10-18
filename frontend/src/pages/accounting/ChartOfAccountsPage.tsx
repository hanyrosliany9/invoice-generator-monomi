import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Tag,
  Input,
  Select,
  Space,
  Typography,
  Badge,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  BankOutlined,
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { getChartOfAccounts, ChartOfAccount } from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;

const ChartOfAccountsPage: React.FC = () => {
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSubType, setFilterSubType] = useState<string>('ALL');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: getChartOfAccounts,
  });

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.code.toLowerCase().includes(searchText.toLowerCase()) ||
      account.name.toLowerCase().includes(searchText.toLowerCase()) ||
      account.nameId.toLowerCase().includes(searchText.toLowerCase());

    const matchesType = filterType === 'ALL' || account.accountType === filterType;
    const matchesSubType = filterSubType === 'ALL' || account.accountSubType === filterSubType;

    return matchesSearch && matchesType && matchesSubType;
  });

  // Group by account type
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.accountType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, ChartOfAccount[]>);

  // Get icon for account type
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'ASSET':
        return <BankOutlined style={{ color: theme.colors.status.success }} />;
      case 'LIABILITY':
        return <FallOutlined style={{ color: theme.colors.status.error }} />;
      case 'EQUITY':
        return <DollarOutlined style={{ color: theme.colors.status.info }} />;
      case 'REVENUE':
        return <RiseOutlined style={{ color: theme.colors.status.success }} />;
      case 'EXPENSE':
        return <ShoppingOutlined style={{ color: theme.colors.status.warning }} />;
      default:
        return null;
    }
  };

  // Get color for account type
  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET':
        return 'success';
      case 'LIABILITY':
        return 'error';
      case 'EQUITY':
        return 'processing';
      case 'REVENUE':
        return 'success';
      case 'EXPENSE':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get Indonesian type name
  const getTypeNameId = (type: string) => {
    const names: Record<string, string> = {
      ASSET: 'Aset',
      LIABILITY: 'Kewajiban',
      EQUITY: 'Ekuitas',
      REVENUE: 'Pendapatan',
      EXPENSE: 'Beban',
    };
    return names[type] || type;
  };

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: ChartOfAccount) => (
        <Space>
          {getAccountTypeIcon(record.accountType)}
          <Text strong>{code}</Text>
        </Space>
      ),
    },
    {
      title: 'Nama Akun',
      dataIndex: 'nameId',
      key: 'nameId',
      render: (nameId: string, record: ChartOfAccount) => (
        <div>
          <div style={{ fontWeight: 500, color: theme.colors.text.primary}}>
            {nameId}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipe',
      dataIndex: 'accountType',
      key: 'accountType',
      width: 120,
      render: (type: string) => (
        <Tag color={getAccountTypeColor(type)}>{getTypeNameId(type)}</Tag>
      ),
    },
    {
      title: 'Sub Tipe',
      dataIndex: 'accountSubType',
      key: 'accountSubType',
      width: 150,
      render: (subType: string) => (
        <Text style={{ fontSize: '12px' }}>
          {subType.replace(/_/g, ' ')}
        </Text>
      ),
    },
    {
      title: 'Normal Balance',
      dataIndex: 'normalBalance',
      key: 'normalBalance',
      width: 120,
      align: 'center' as const,
      render: (balance: string) => (
        <Tag color={balance === 'DEBIT' ? 'blue' : 'green'}>
          {balance}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (record: ChartOfAccount) => (
        <Space direction="vertical" size="small">
          {record.isControlAccount && (
            <Badge status="processing" text="Control Account" />
          )}
          {record.isTaxAccount && (
            <Badge status="warning" text={`Tax: ${record.taxType}`} />
          )}
          {record.isSystemAccount && (
            <Badge status="default" text="System" />
          )}
          {!record.isActive && (
            <Badge status="error" text="Inactive" />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary}}>
          Bagan Akun (Chart of Accounts)
        </Title>
        <Text type="secondary">
          Daftar akun berdasarkan standar akuntansi PSAK Indonesia
        </Text>
      </div>

      {/* Filters */}
      <Card
        style={{
          marginBottom: '24px',
          background: theme.colors.background,
          borderColor: theme.colors.border.default,
        }}
      >
        <Space wrap size="middle" style={{ width: '100%' }}>
          <Input
            placeholder="Cari kode atau nama akun..."
            prefix={<SearchOutlined style={{ color: theme.colors.text.primaryecondary }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 150 }}
            placeholder="Filter Tipe"
          >
            <Option value="ALL">Semua Tipe</Option>
            <Option value="ASSET">Aset</Option>
            <Option value="LIABILITY">Kewajiban</Option>
            <Option value="EQUITY">Ekuitas</Option>
            <Option value="REVENUE">Pendapatan</Option>
            <Option value="EXPENSE">Beban</Option>
          </Select>
          <Select
            value={filterSubType}
            onChange={setFilterSubType}
            style={{ width: 180 }}
            placeholder="Filter Sub Tipe"
          >
            <Option value="ALL">Semua Sub Tipe</Option>
            <Option value="CURRENT_ASSET">Current Asset</Option>
            <Option value="FIXED_ASSET">Fixed Asset</Option>
            <Option value="CURRENT_LIABILITY">Current Liability</Option>
            <Option value="SELLING_EXPENSE">Selling Expense</Option>
            <Option value="ADMIN_EXPENSE">Admin Expense</Option>
            <Option value="OTHER_EXPENSE">Other Expense</Option>
          </Select>
        </Space>
      </Card>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {Object.entries(groupedAccounts).map(([type, accts]) => (
          <Card
            key={type}
            size="small"
            style={{
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            <Space>
              {getAccountTypeIcon(type)}
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary}}>
                  {accts.length}
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {getTypeNameId(type)}
                </Text>
              </div>
            </Space>
          </Card>
        ))}
      </div>

      {/* Accounts Table by Type */}
      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </Card>
      ) : filteredAccounts.length === 0 ? (
        <Card>
          <Empty description="Tidak ada akun yang ditemukan" />
        </Card>
      ) : (
        Object.entries(groupedAccounts).map(([type, accts]) => (
          <Card
            key={type}
            title={
              <Space>
                {getAccountTypeIcon(type)}
                <span>{getTypeNameId(type)}</span>
                <Tag color={getAccountTypeColor(type)}>{accts.length} Akun</Tag>
              </Space>
            }
            style={{
              marginBottom: '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
          >
            <Table
              columns={columns}
              dataSource={accts}
              rowKey="id"
              pagination={false}
              size="small"
              style={{
                background: theme.colors.background,
              }}
            />
          </Card>
        ))
      )}
    </div>
  );
};

export default ChartOfAccountsPage;
