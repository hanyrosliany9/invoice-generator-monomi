import React, { useState } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  Card,
  message,
  Popconfirm,
  Modal,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import { formatIDR } from '../../utils/currency';
import type { Expense } from '../../types/expense';
import dayjs from 'dayjs';

interface ProjectExpenseListProps {
  projectId: string;
  onAddExpense: () => void;
}

export const ProjectExpenseList: React.FC<ProjectExpenseListProps> = ({
  projectId,
  onAddExpense,
}) => {
  const queryClient = useQueryClient();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Fetch expenses for this project
  const { data: expensesResponse, isLoading } = useQuery({
    queryKey: ['project-expenses', projectId],
    queryFn: () =>
      expenseService.getExpenses({
        projectId,
      }),
  });

  const expenses = expensesResponse?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteExpense,
    onSuccess: () => {
      message.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] });
    },
    onError: (error: any) => {
      message.error(`Failed to delete: ${error.message}`);
    },
  });

  // Calculate totals
  const totalDraft = expenses
    .filter((e) => e.status === 'DRAFT')
    .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  const totalApproved = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  const totalPaid = expenses
    .filter((e) => e.paymentStatus === 'PAID')
    .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);

  // Table columns
  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 120,
      sorter: (a: Expense, b: Expense) =>
        dayjs(a.expenseDate).unix() - dayjs(b.expenseDate).unix(),
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'No. Biaya',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 150,
    },
    {
      title: 'Deskripsi',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Vendor',
      dataIndex: 'vendorName',
      key: 'vendorName',
      width: 150,
    },
    {
      title: 'Kategori',
      dataIndex: ['category', 'nameId'],
      key: 'category',
      width: 150,
      render: (nameId: string, record: Expense) => nameId || record.category?.name || '-',
    },
    {
      title: 'Jumlah',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 150,
      align: 'right' as const,
      sorter: (a: Expense, b: Expense) =>
        parseFloat(a.totalAmount) - parseFloat(b.totalAmount),
      render: (amount: string) => formatIDR(amount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Diajukan', value: 'SUBMITTED' },
        { text: 'Disetujui', value: 'APPROVED' },
        { text: 'Ditolak', value: 'REJECTED' },
      ],
      onFilter: (value: any, record: Expense) => record.status === value,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          DRAFT: 'default',
          SUBMITTED: 'blue',
          APPROVED: 'green',
          REJECTED: 'red',
          CANCELLED: 'orange',
        };
        const labelMap: Record<string, string> = {
          DRAFT: 'Draft',
          SUBMITTED: 'Diajukan',
          APPROVED: 'Disetujui',
          REJECTED: 'Ditolak',
          CANCELLED: 'Dibatalkan',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Pembayaran',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 120,
      filters: [
        { text: 'Belum Dibayar', value: 'UNPAID' },
        { text: 'Lunas', value: 'PAID' },
      ],
      onFilter: (value: any, record: Expense) => record.paymentStatus === value,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          UNPAID: 'red',
          PARTIALLY_PAID: 'orange',
          PAID: 'green',
        };
        const labelMap: Record<string, string> = {
          UNPAID: 'Belum Dibayar',
          PARTIALLY_PAID: 'Dibayar Sebagian',
          PAID: 'Lunas',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: Expense) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setSelectedExpense(record)}
            size="small"
          />
          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Hapus biaya ini?"
              description="Tindakan ini tidak dapat dibatalkan."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Hapus"
              cancelText="Batal"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Draft"
              value={totalDraft}
              formatter={(value) => formatIDR(value as number)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Disetujui"
              value={totalApproved}
              formatter={(value) => formatIDR(value as number)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Dibayar"
              value={totalPaid}
              formatter={(value) => formatIDR(value as number)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Add Expense Button */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddExpense}
          size="large"
        >
          Tambah Biaya ke Proyek Ini
        </Button>
      </div>

      {/* Expenses Table */}
      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} biaya`,
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 0' }}>
              <DollarOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <p style={{ marginTop: 16 }}>Belum ada biaya tercatat untuk proyek ini.</p>
              <Button type="primary" onClick={onAddExpense}>
                Tambah Biaya Pertama
              </Button>
            </div>
          ),
        }}
      />

      {/* Expense Detail Modal */}
      <Modal
        title={`Biaya: ${selectedExpense?.expenseNumber}`}
        open={!!selectedExpense}
        onCancel={() => setSelectedExpense(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedExpense(null)}>
            Tutup
          </Button>,
        ]}
        width={700}
      >
        {selectedExpense && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Deskripsi" span={2}>
              {selectedExpense.description}
            </Descriptions.Item>
            <Descriptions.Item label="Vendor">
              {selectedExpense.vendorName}
            </Descriptions.Item>
            <Descriptions.Item label="NPWP Vendor">
              {selectedExpense.vendorNPWP || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Kategori">
              {selectedExpense.category?.nameId || selectedExpense.category?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Kode Akun">
              {selectedExpense.accountCode}
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal">
              {dayjs(selectedExpense.expenseDate).format('DD MMMM YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Kelas Biaya">
              {selectedExpense.expenseClass}
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah Bruto">
              {formatIDR(selectedExpense.grossAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="PPN">
              {formatIDR(selectedExpense.ppnAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="PPh Dipotong">
              {selectedExpense.withholdingAmount ? formatIDR(selectedExpense.withholdingAmount) : 'Rp 0'}
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah Netto">
              {formatIDR(selectedExpense.netAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="Total">
              <strong>{formatIDR(selectedExpense.totalAmount)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color="green">{selectedExpense.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status Pembayaran">
              <Tag color="blue">{selectedExpense.paymentStatus}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Dapat Ditagih">
              {selectedExpense.isBillable ? 'Ya' : 'Tidak'}
            </Descriptions.Item>
            {selectedExpense.notes && (
              <Descriptions.Item label="Catatan" span={2}>
                {selectedExpense.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};
