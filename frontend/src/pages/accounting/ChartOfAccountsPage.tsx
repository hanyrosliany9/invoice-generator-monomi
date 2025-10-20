import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Tag,
  Input,
  Select,
  Space,
  Typography,
  Badge,
  Empty,
  Spin,
  Button,
  Modal,
  Form,
  Switch,
  message,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  BankOutlined,
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import {
  getChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
  toggleAccountStatus,
  ChartOfAccount,
} from '../../services/accounting';
import { useTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;

interface AccountFormValues {
  code: string;
  name: string;
  nameId: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  parentId?: string;
  isControlAccount: boolean;
  isTaxAccount: boolean;
  taxType?: string;
  isActive: boolean;
  description?: string;
  descriptionId?: string;
}

const ChartOfAccountsPage: React.FC = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSubType, setFilterSubType] = useState<string>('ALL');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [form] = Form.useForm();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createChartOfAccount,
    onSuccess: () => {
      message.success('Account created successfully!');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create account');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<ChartOfAccount> }) =>
      updateChartOfAccount(code, data),
    onSuccess: () => {
      message.success('Account updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setIsModalVisible(false);
      setEditingAccount(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update account');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteChartOfAccount,
    onSuccess: () => {
      message.success('Account deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete account');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: toggleAccountStatus,
    onSuccess: () => {
      message.success('Account status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to toggle account status');
    },
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

  // Handle create button click
  const handleCreate = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      isControlAccount: false,
      isTaxAccount: false,
      normalBalance: 'DEBIT',
    });
    setIsModalVisible(true);
  };

  // Handle edit button click
  const handleEdit = (account: ChartOfAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({
      code: account.code,
      name: account.name,
      nameId: account.nameId,
      accountType: account.accountType,
      accountSubType: account.accountSubType,
      normalBalance: account.normalBalance,
      parentId: account.parentId,
      isControlAccount: account.isControlAccount,
      isTaxAccount: account.isTaxAccount,
      taxType: account.taxType,
      isActive: account.isActive,
      description: account.description,
      descriptionId: account.descriptionId,
    });
    setIsModalVisible(true);
  };

  // Handle form submit
  const handleSubmit = async (values: AccountFormValues) => {
    if (editingAccount) {
      updateMutation.mutate({ code: editingAccount.code, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Handle delete
  const handleDelete = (code: string) => {
    deleteMutation.mutate(code);
  };

  // Handle toggle status
  const handleToggleStatus = (code: string) => {
    toggleStatusMutation.mutate(code);
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
          <div style={{ fontWeight: 500, color: theme.colors.text.primary }}>
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
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center' as const,
      render: (record: ChartOfAccount) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.isSystemAccount}
            title="Edit Account"
          />
          <Popconfirm
            title="Toggle Status"
            description={`Are you sure you want to ${record.isActive ? 'deactivate' : 'activate'} this account?`}
            onConfirm={() => handleToggleStatus(record.code)}
            disabled={record.isSystemAccount}
          >
            <Button
              type="text"
              size="small"
              icon={<PoweroffOutlined />}
              disabled={record.isSystemAccount}
              danger={record.isActive}
              title={record.isActive ? 'Deactivate' : 'Activate'}
            />
          </Popconfirm>
          <Popconfirm
            title="Delete Account"
            description="Are you sure you want to delete this account? This action cannot be undone."
            onConfirm={() => handleDelete(record.code)}
            okText="Yes, Delete"
            cancelText="No"
            okButtonProps={{ danger: true }}
            disabled={record.isSystemAccount}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              disabled={record.isSystemAccount}
              title="Delete Account"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
            Bagan Akun (Chart of Accounts)
          </Title>
          <Text type="secondary">
            Daftar akun berdasarkan standar akuntansi PSAK Indonesia
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          size="large"
        >
          Tambah Akun Baru
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
          <Input
            placeholder="Cari kode atau nama akun..."
            prefix={<SearchOutlined style={{ color: theme.colors.text.secondary }} />}
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
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.primary }}>
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
                background: theme.colors.background.primary,
              }}
            />
          </Card>
        ))
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingAccount(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Kode Akun"
            name="code"
            rules={[{ required: true, message: 'Kode akun wajib diisi!' }]}
          >
            <Input placeholder="contoh: 1-1101" disabled={!!editingAccount} />
          </Form.Item>

          <Form.Item
            label="Nama Akun (Bahasa Indonesia)"
            name="nameId"
            rules={[{ required: true, message: 'Nama akun dalam Bahasa Indonesia wajib diisi!' }]}
          >
            <Input placeholder="contoh: Kas di Bank BCA" />
          </Form.Item>

          <Form.Item
            label="Nama Akun (English)"
            name="name"
            rules={[{ required: true, message: 'Nama akun dalam English wajib diisi!' }]}
          >
            <Input placeholder="example: Cash in Bank BCA" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Tipe Akun"
              name="accountType"
              rules={[{ required: true, message: 'Tipe akun wajib dipilih!' }]}
            >
              <Select placeholder="Pilih tipe akun">
                <Option value="ASSET">Aset (Asset)</Option>
                <Option value="LIABILITY">Kewajiban (Liability)</Option>
                <Option value="EQUITY">Ekuitas (Equity)</Option>
                <Option value="REVENUE">Pendapatan (Revenue)</Option>
                <Option value="EXPENSE">Beban (Expense)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Sub Tipe"
              name="accountSubType"
              rules={[{ required: true, message: 'Sub tipe wajib diisi!' }]}
            >
              <Input placeholder="contoh: CURRENT_ASSET" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Normal Balance"
              name="normalBalance"
              rules={[{ required: true, message: 'Normal balance wajib dipilih!' }]}
            >
              <Select placeholder="Pilih normal balance">
                <Option value="DEBIT">Debit</Option>
                <Option value="CREDIT">Credit</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Parent Account ID"
              name="parentId"
            >
              <Input placeholder="Optional" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Control Account"
              name="isControlAccount"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Tax Account"
              name="isTaxAccount"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            label="Tax Type"
            name="taxType"
          >
            <Input placeholder="contoh: PPN, PPh" />
          </Form.Item>

          <Form.Item
            label="Deskripsi (Indonesia)"
            name="descriptionId"
          >
            <Input.TextArea placeholder="Deskripsi akun (opsional)" rows={2} />
          </Form.Item>

          <Form.Item
            label="Description (English)"
            name="description"
          >
            <Input.TextArea placeholder="Account description (optional)" rows={2} />
          </Form.Item>

          <Form.Item
            label="Active"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingAccount ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setIsModalVisible(false);
                setEditingAccount(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChartOfAccountsPage;
