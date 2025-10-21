import React, { useState } from 'react';
import { Table, Button, Select, InputNumber, Input, Space, message, Spin, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import type { EstimatedExpense } from '../../services/projects';
import type { ExpenseCategory } from '../../types/expense';

interface ExpenseEstimatorProps {
  value?: EstimatedExpense[];
  onChange?: (expenses: EstimatedExpense[]) => void;
  disabled?: boolean;
}

interface ExpenseRow extends EstimatedExpense {
  key: string;
}

/**
 * ExpenseEstimator Component
 *
 * Table for estimating project expenses before creation.
 * Features:
 * - Add/remove expense rows
 * - Select from PSAK-compliant categories
 * - Classify as direct/indirect costs
 * - Real-time total calculation
 * - Auto-calculates cost breakdown
 */
export const ExpenseEstimator: React.FC<ExpenseEstimatorProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  // Initialize state from value prop, but don't sync after that
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => {
    if (value && value.length > 0) {
      return value.map((exp, idx) => ({
        ...exp,
        key: `expense-${idx}-${Date.now()}`,
      }));
    }
    return [];
  });

  // Fetch expense categories
  const { data: categories = [], isLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  // Notify parent of changes
  const notifyChange = (updatedExpenses: ExpenseRow[]) => {
    if (onChange) {
      onChange(
        updatedExpenses.map(({ key, ...exp }) => exp)
      );
    }
  };

  // Add new expense row
  const handleAddExpense = () => {
    const newExpense: ExpenseRow = {
      key: `expense-${Date.now()}`,
      categoryId: '',
      categoryName: '',
      categoryNameId: '',
      amount: 0,
      notes: '',
      costType: 'direct',
    };

    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    notifyChange(updatedExpenses);
  };

  // Remove expense row
  const handleRemoveExpense = (key: string) => {
    const updatedExpenses = expenses.filter((exp) => exp.key !== key);
    setExpenses(updatedExpenses);
    notifyChange(updatedExpenses);
  };

  // Update expense field
  const handleUpdateExpense = (
    key: string,
    field: keyof EstimatedExpense,
    newValue: any
  ) => {
    const updatedExpenses = expenses.map((exp) => {
      if (exp.key === key) {
        // If category changes, update category names
        if (field === 'categoryId') {
          const category = categories.find((cat) => cat.id === newValue);
          return {
            ...exp,
            categoryId: newValue,
            categoryName: category?.name || '',
            categoryNameId: category?.nameId || '',
          };
        }
        return { ...exp, [field]: newValue };
      }
      return exp;
    });

    // Update local state immediately
    setExpenses(updatedExpenses);
    // Notify parent of changes
    notifyChange(updatedExpenses);
  };

  // Calculate totals
  const directTotal = expenses
    .filter((exp) => exp.costType === 'direct')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const indirectTotal = expenses
    .filter((exp) => exp.costType === 'indirect')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const grandTotal = directTotal + indirectTotal;

  // Table columns
  const columns = [
    {
      title: 'Kategori Biaya',
      dataIndex: 'categoryId',
      key: 'categoryId',
      width: '30%',
      render: (_: any, record: ExpenseRow) => (
        <Select
          value={record.categoryId || undefined}
          onChange={(value) => handleUpdateExpense(record.key, 'categoryId', value)}
          placeholder="Pilih kategori"
          disabled={disabled}
          style={{ width: '100%' }}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={categories.map((cat) => ({
            value: cat.id,
            label: `${cat.nameId} (${cat.accountCode})`,
          }))}
          loading={isLoading}
        />
      ),
    },
    {
      title: 'Tipe Biaya',
      dataIndex: 'costType',
      key: 'costType',
      width: '15%',
      render: (_: any, record: ExpenseRow) => (
        <Select
          value={record.costType}
          onChange={(value) => handleUpdateExpense(record.key, 'costType', value)}
          disabled={disabled}
          style={{ width: '100%' }}
          options={[
            { value: 'direct', label: <Tag color="blue">Langsung</Tag> },
            { value: 'indirect', label: <Tag color="orange">Tidak Langsung</Tag> },
          ]}
        />
      ),
    },
    {
      title: 'Estimasi Biaya',
      dataIndex: 'amount',
      key: 'amount',
      width: '20%',
      render: (_: any, record: ExpenseRow) => (
        <InputNumber
          value={record.amount}
          onChange={(value) => handleUpdateExpense(record.key, 'amount', value || 0)}
          disabled={disabled}
          style={{ width: '100%' }}
          min={0}
          formatter={(value) =>
            `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          }
          parser={(value) => Number(value!.replace(/Rp\s?|(\.*)/g, ''))}
          placeholder="0"
        />
      ),
    },
    {
      title: 'Catatan',
      dataIndex: 'notes',
      key: 'notes',
      width: '25%',
      render: (_: any, record: ExpenseRow) => (
        <Input
          value={record.notes}
          onChange={(e) => handleUpdateExpense(record.key, 'notes', e.target.value)}
          disabled={disabled}
          placeholder="Catatan opsional"
        />
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      width: '10%',
      align: 'center' as const,
      render: (_: any, record: ExpenseRow) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveExpense(record.key)}
          disabled={disabled}
          size="small"
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Memuat kategori biaya...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddExpense}
          disabled={disabled}
          block
        >
          Tambah Estimasi Biaya
        </Button>
      </div>

      <Table
        dataSource={expenses}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        locale={{
          emptyText: 'Belum ada estimasi biaya. Klik tombol di atas untuk menambah.',
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total Biaya Langsung</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong style={{ color: '#1890ff' }}>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(directTotal)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total Biaya Tidak Langsung</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong style={{ color: '#fa8c16' }}>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(indirectTotal)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={2} />
            </Table.Summary.Row>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>Total Estimasi Biaya</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong style={{ color: '#52c41a', fontSize: 16 }}>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(grandTotal)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={2} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};
