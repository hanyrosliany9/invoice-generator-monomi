import React, { useState, useMemo } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { expenseService } from '../services/expenses';
import { useIsMobile } from '../hooks/useMediaQuery';
import MobileTableView from '../components/mobile/MobileTableView';
import { expenseCategoryToBusinessEntity } from '../adapters/mobileTableAdapters';
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView';

const { Title, Text } = Typography;
const { Option } = Select;

export const ExpenseCategoriesPage: React.FC = () => {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const isMobile = useIsMobile();

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  // Mobile data adapter
  const mobileData = useMemo(() =>
    categories.map(expenseCategoryToBusinessEntity),
    [categories]
  );

  // Handler functions (must be defined before mobileActions useMemo)
  const handleEdit = (category: any) => {
    setEditingCategory(category);
    form.setFieldsValue({
      ...category,
      withholdingTaxRate: category.withholdingTaxRate
        ? parseFloat(category.withholdingTaxRate) * 100
        : 0,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Mobile actions
  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'edit',
      label: 'Edit Kategori',
      icon: <EditOutlined />,
      color: '#1890ff',
      onClick: (record) => {
        const category = categories.find((c) => c.id === record.id);
        if (category) handleEdit(category);
      },
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (record) => handleDelete(record.id),
      confirm: {
        title: 'Hapus kategori?',
        description: 'Aksi ini tidak dapat dibatalkan. Hanya kategori yang tidak digunakan oleh expense yang dapat dihapus.',
      },
    },
  ], [categories, handleEdit, handleDelete]);

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Aktif', value: 'approved' },
        { label: 'Nonaktif', value: 'declined' },
      ],
    },
  ], []);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: expenseService.createExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      message.success('Category created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(`Failed to create category: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      expenseService.updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      message.success('Category updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(`Failed to update category: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      message.success('Category deleted successfully');
    },
    onError: (error: any) => {
      message.error(`Failed to delete category: ${error.message}`);
    },
  });

  const handleCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      expenseClass: 'GENERAL_ADMIN',
      withholdingTaxType: 'NONE',
      isActive: true,
      isBillable: false,
    });
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleSubmit = (values: any) => {
    const data = {
      ...values,
      withholdingTaxRate: values.withholdingTaxRate
        ? values.withholdingTaxRate / 100
        : 0,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {code}
        </Text>
      ),
    },
    {
      title: 'PSAK Account Code',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 150,
      render: (code: string) => (
        <Tag
          color="blue"
          style={{ fontFamily: 'monospace', fontSize: '13px' }}
        >
          {code}
        </Tag>
      ),
    },
    {
      title: 'Category Name',
      dataIndex: 'nameId',
      key: 'nameId',
      width: 200,
      render: (nameId: string, record: any) => (
        <div>
          <div>{nameId || record.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'expenseClass',
      key: 'expenseClass',
      width: 150,
      render: (expenseClass: string) => {
        const colorMap: Record<string, string> = {
          SELLING: 'magenta',
          GENERAL_ADMIN: 'green',
          OTHER: 'orange',
        };
        return (
          <Tag color={colorMap[expenseClass] || 'default'}>
            {expenseClass === 'GENERAL_ADMIN' ? 'G&A' : expenseClass}
          </Tag>
        );
      },
    },
    {
      title: 'PPh Type',
      dataIndex: 'withholdingTaxType',
      key: 'withholdingTaxType',
      width: 120,
      render: (type: string, record: any) => {
        if (!type || type === 'NONE') return <Text type="secondary">-</Text>;
        return (
          <div>
            <Tag color="volcano">{type}</Tag>
            {record.withholdingTaxRate && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {(parseFloat(record.withholdingTaxRate) * 100).toFixed(1)}%
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete category?"
            description="This action cannot be undone. Only categories not used by expenses can be deleted."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={2} style={{ marginBottom: 8, color: theme.colors.text.primary }}>
            Expense Categories & PSAK Codes
          </Title>
          <Text type="secondary">
            Manage expense categories with Indonesian PSAK accounting codes
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          size="large"
        >
          Create Category
        </Button>
      </div>

      {/* Table / Mobile View */}
      {isMobile ? (
        <MobileTableView
          data={mobileData}
          loading={isLoading}
          entityType="expense-categories"
          showQuickStats
          searchable
          searchFields={['number', 'title', 'client.company']}
          filters={mobileFilters}
          actions={mobileActions}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['expense-categories'] })}
        />
      ) : (
        <Card
          style={{
            borderRadius: '12px',
            border: theme.colors.glass.border,
            background: theme.colors.glass.background,
          }}
        >
          <Table
            columns={columns}
            dataSource={categories}
            loading={isLoading}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} categories`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingCategory ? 'Edit Expense Category' : 'Create Expense Category'}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="Category Code"
                rules={[{ required: true, message: 'Code is required' }]}
                tooltip="Unique uppercase code (e.g., OFFICE_SUPPLIES)"
              >
                <Input
                  placeholder="OFFICE_SUPPLIES"
                  disabled={!!editingCategory}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="accountCode"
                label="PSAK Account Code"
                rules={[{ required: true, message: 'Account code is required' }]}
                tooltip="PSAK standard: 6-1xxx (Selling), 6-2xxx (G&A), 8-xxxx (Other)"
              >
                <Input
                  placeholder="6-2030"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="expenseClass"
                label="Expense Class"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="SELLING">Selling Expenses (6-1xxx)</Option>
                  <Option value="GENERAL_ADMIN">
                    General & Admin (6-2xxx)
                  </Option>
                  <Option value="OTHER">Other Expenses (8-xxxx)</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="withholdingTaxType"
                label="Default PPh Type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="NONE">No Withholding</Option>
                  <Option value="PPH23">PPh 23 (2%)</Option>
                  <Option value="PPH4_2">PPh 4(2) (10%)</Option>
                  <Option value="PPH15">PPh 15</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Category Name (English)"
                rules={[{ required: true }]}
              >
                <Input placeholder="Office Supplies" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="nameId" label="Category Name (Indonesian)">
                <Input placeholder="Perlengkapan Kantor" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="description" label="Description (English)">
                <Input.TextArea
                  rows={2}
                  placeholder="Stationery and office materials"
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="descriptionId"
                label="Description (Indonesian)"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Alat tulis dan material kantor"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="withholdingTaxRate" label="PPh Rate (%)">
                <InputNumber
                  min={0}
                  max={100}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="2.0"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="sortOrder" label="Sort Order">
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="10"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="color" label="Color (Hex)">
                <Input placeholder="#1890ff" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="isBillable"
                label="Can be Billed to Clients?"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="isActive" label="Active?" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
