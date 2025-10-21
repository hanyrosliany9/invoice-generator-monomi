# Adding Expenses to Project Detail Page - Implementation Guide

## Overview

This document provides a comprehensive guide for adding actual expense creation and viewing functionality to the **Project Detail Page**, specifically within the "Financial History" tab (currently a placeholder).

**Current State**: Financial History tab shows "coming soon" message
**Goal**: Replace placeholder with full expense management for the project

---

## Table of Contents

1. [Current Page Structure](#current-page-structure)
2. [Proposed UI/UX Design](#proposed-uiux-design)
3. [Implementation Approach](#implementation-approach)
4. [Component Architecture](#component-architecture)
5. [Complete Code Implementation](#complete-code-implementation)
6. [Data Flow](#data-flow)
7. [Integration Steps](#integration-steps)
8. [Alternative Approaches](#alternative-approaches)

---

## Current Page Structure

### ProjectDetailPage.tsx Analysis

**File**: `frontend/src/pages/ProjectDetailPage.tsx`
**Lines**: 1096 total

#### Current Tabs (Lines 933-1076):

1. **"Project Details"** (key: 'details') - Shows project metadata
2. **"Team & Resources"** (key: 'team') - Placeholder
3. **"Financial History"** (key: 'financial') - **⭐ PLACEHOLDER - TARGET FOR EXPENSES**
4. **"Related Documents"** (key: 'documents') - Active (FileUpload component)

#### Current Financial History Tab (Lines 1042-1054):

```typescript
{
  key: 'financial',
  label: (
    <span>
      <DollarOutlined />
      Financial History
    </span>
  ),
  children: (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <DollarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
      <Title level={4} type='secondary'>
        Financial History
      </Title>
      <Text type='secondary'>
        Detailed financial tracking is coming soon.
      </Text>
    </div>
  ),
}
```

**Status**: Empty placeholder, perfect for expense functionality!

---

## Proposed UI/UX Design

### Option 1: Full-Featured Expense Tab (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│ Financial History Tab                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Budget Summary                                          │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │  Estimated Budget: Rp 50,000,000                        │    │
│  │  Actual Expenses:  Rp 35,000,000   (70% of budget)     │    │
│  │  Remaining:        Rp 15,000,000   (30% available)     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [+ Add Expense to This Project]                                │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Actual Expenses                                         │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ Date       │ Expense #      │ Description  │ Amount    │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ 2025-01-15 │ EXP-2025-00042 │ Cloud Hosting│Rp 5,500,000│   │
│  │ 2025-01-20 │ EXP-2025-00045 │ Design Tools │Rp 3,000,000│   │
│  │ 2025-01-25 │ EXP-2025-00048 │ Marketing    │Rp 2,500,000│   │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ Total Approved & Paid                    │Rp 11,000,000│   │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Expense Breakdown by Category                           │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │  [Chart showing direct vs indirect costs]               │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features:

1. **Budget vs Actual Summary Card** - Shows variance analysis
2. **Add Expense Button** - Opens modal or navigates to form with project pre-selected
3. **Expenses Table** - List of all approved expenses for this project
4. **Visual Breakdown** - Charts showing category distribution
5. **Quick Actions** - View, edit, delete expense (based on permissions)

---

## Implementation Approach

### Recommended: Modal-Based Expense Creation

**Why?**
- ✅ User stays on project page (better UX)
- ✅ Context preserved (can see project details while adding expense)
- ✅ Faster workflow (no navigation)
- ✅ Can pre-fill projectId and clientId automatically

**User Flow**:
```
1. User on Project Detail Page
2. Clicks "Financial History" tab
3. Sees current expenses for project
4. Clicks "Add Expense" button
5. Modal opens with expense form
6. projectId and clientId pre-filled
7. User fills expense details
8. Saves → Modal closes → Table refreshes → Expense appears
```

---

## Component Architecture

### New Components to Create

#### 1. ProjectExpenseList Component
**File**: `frontend/src/components/projects/ProjectExpenseList.tsx`

**Purpose**: Display and manage expenses for a specific project

**Features**:
- Fetch expenses filtered by projectId
- Display in sortable, filterable table
- Show status badges (DRAFT, APPROVED, PAID)
- Quick actions (view details, delete if DRAFT)
- Real-time totals

#### 2. AddExpenseModal Component
**File**: `frontend/src/components/projects/AddExpenseModal.tsx`

**Purpose**: Simplified expense creation form in modal

**Features**:
- Pre-filled projectId from parent
- Pre-filled clientId from project data
- Simplified form (fewer fields than full expense page)
- Auto-mark as billable
- Quick save with validation

#### 3. ExpenseBudgetSummary Component
**File**: `frontend/src/components/projects/ExpenseBudgetSummary.tsx`

**Purpose**: Show budget vs actual comparison

**Features**:
- Parse estimated expenses from project
- Calculate total actual expenses (approved + paid)
- Show variance (over/under budget)
- Visual progress bar

---

## Complete Code Implementation

### Step 1: Create ProjectExpenseList Component

```typescript
// frontend/src/components/projects/ProjectExpenseList.tsx
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
        // Optionally filter by approved/paid only
        // status: 'APPROVED',
        // paymentStatus: 'PAID',
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
      title: 'Date',
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      width: 120,
      sorter: (a: Expense, b: Expense) =>
        dayjs(a.expenseDate).unix() - dayjs(b.expenseDate).unix(),
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Expense #',
      dataIndex: 'expenseNumber',
      key: 'expenseNumber',
      width: 150,
    },
    {
      title: 'Description',
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
      title: 'Category',
      dataIndex: ['category', 'nameId'],
      key: 'category',
      width: 150,
    },
    {
      title: 'Amount',
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
        { text: 'Submitted', value: 'SUBMITTED' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' },
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
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 120,
      filters: [
        { text: 'Unpaid', value: 'UNPAID' },
        { text: 'Paid', value: 'PAID' },
      ],
      onFilter: (value: any, record: Expense) => record.paymentStatus === value,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          UNPAID: 'red',
          PARTIALLY_PAID: 'orange',
          PAID: 'green',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
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
              title="Delete this expense?"
              description="This action cannot be undone."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Delete"
              cancelText="Cancel"
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
              title="Total Approved"
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
              title="Total Paid"
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
          Add Expense to This Project
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
          showTotal: (total) => `Total ${total} expenses`,
        }}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 0' }}>
              <DollarOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <p style={{ marginTop: 16 }}>No expenses recorded for this project yet.</p>
              <Button type="primary" onClick={onAddExpense}>
                Add First Expense
              </Button>
            </div>
          ),
        }}
      />

      {/* Expense Detail Modal */}
      <Modal
        title={`Expense: ${selectedExpense?.expenseNumber}`}
        open={!!selectedExpense}
        onCancel={() => setSelectedExpense(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedExpense(null)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedExpense && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <p><strong>Description:</strong></p>
                <p>{selectedExpense.description}</p>
              </Col>
              <Col span={12}>
                <p><strong>Vendor:</strong></p>
                <p>{selectedExpense.vendorName}</p>
              </Col>
              <Col span={12}>
                <p><strong>Category:</strong></p>
                <p>{selectedExpense.category?.nameId || 'N/A'}</p>
              </Col>
              <Col span={12}>
                <p><strong>Account Code:</strong></p>
                <p>{selectedExpense.accountCode}</p>
              </Col>
              <Col span={12}>
                <p><strong>Gross Amount:</strong></p>
                <p>{formatIDR(selectedExpense.grossAmount)}</p>
              </Col>
              <Col span={12}>
                <p><strong>PPN:</strong></p>
                <p>{formatIDR(selectedExpense.ppnAmount)}</p>
              </Col>
              <Col span={12}>
                <p><strong>Total Amount:</strong></p>
                <p><strong>{formatIDR(selectedExpense.totalAmount)}</strong></p>
              </Col>
              <Col span={12}>
                <p><strong>Status:</strong></p>
                <Tag color="green">{selectedExpense.status}</Tag>
                <Tag color="blue">{selectedExpense.paymentStatus}</Tag>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};
```

### Step 2: Create AddExpenseModal Component

```typescript
// frontend/src/components/projects/AddExpenseModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
  Row,
  Col,
  Alert,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import type { CreateExpenseFormData, WithholdingTaxType } from '../../types/expense';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface AddExpenseModalProps {
  projectId: string;
  clientId?: string;
  open: boolean;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  projectId,
  clientId,
  open,
  onClose,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [grossAmount, setGrossAmount] = useState(0);
  const [isLuxuryGoods, setIsLuxuryGoods] = useState(false);
  const [withholdingType, setWithholdingType] = useState<WithholdingTaxType>('NONE' as WithholdingTaxType);

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: () => {
      message.success('Expense added to project successfully!');
      queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] });
      form.resetFields();
      onClose();
    },
    onError: (error: any) => {
      message.error(`Failed to create expense: ${error.message}`);
    },
  });

  // Auto-calculate amounts
  useEffect(() => {
    if (grossAmount > 0) {
      const amounts = expenseService.calculateExpenseAmounts(
        grossAmount,
        isLuxuryGoods,
        withholdingType
      );

      form.setFieldsValue({
        ppnAmount: amounts.ppnAmount,
        withholdingAmount: amounts.withholdingAmount,
        netAmount: amounts.netAmount,
        totalAmount: amounts.totalAmount,
      });
    }
  }, [grossAmount, isLuxuryGoods, withholdingType, form]);

  // Handle category selection
  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      form.setFieldsValue({
        accountCode: category.accountCode,
        accountName: category.nameId || category.name,
        expenseClass: category.expenseClass,
        ppnCategory: category.defaultPPNCategory,
        withholdingTaxType: category.withholdingTaxType || 'NONE',
        withholdingTaxRate: category.withholdingTaxRate || 0,
      });

      if (category.withholdingTaxType) {
        setWithholdingType(category.withholdingTaxType);
      }
    }
  };

  const handleSubmit = (values: any) => {
    const expenseData: CreateExpenseFormData = {
      ...values,
      expenseDate: values.expenseDate.toISOString(),
      grossAmount: Number(values.grossAmount),
      ppnAmount: Number(values.ppnAmount),
      withholdingAmount: values.withholdingAmount
        ? Number(values.withholdingAmount)
        : 0,
      netAmount: Number(values.netAmount),
      totalAmount: Number(values.totalAmount),
      ppnRate: isLuxuryGoods ? 0.12 : 0.11,
      withholdingTaxRate: values.withholdingTaxRate || 0,
      isLuxuryGoods,
      isBillable: true, // Auto-set as billable
      projectId, // Pre-filled from parent
      clientId, // Pre-filled from parent
    };

    createMutation.mutate(expenseData);
  };

  return (
    <Modal
      title="Add Expense to Project"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create Expense"
      cancelText="Cancel"
      width={800}
      confirmLoading={createMutation.isPending}
    >
      <Alert
        message="Expense will be linked to this project"
        description="This expense will automatically be marked as billable and linked to the current project."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          expenseDate: dayjs(),
          ppnCategory: 'CREDITABLE',
          eFakturStatus: 'NOT_REQUIRED',
          withholdingTaxType: 'NONE',
          isLuxuryGoods: false,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="categoryId"
              label="Category"
              rules={[{ required: true, message: 'Select category' }]}
            >
              <Select
                placeholder="Select category"
                onChange={handleCategoryChange}
                showSearch
                filterOption={(input, option) =>
                  ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: `${cat.nameId} (${cat.accountCode})`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="accountCode" label="Account Code">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Enter description' }]}
        >
          <TextArea rows={2} placeholder="Expense description" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vendorName"
              label="Vendor"
              rules={[{ required: true, message: 'Enter vendor name' }]}
            >
              <Input placeholder="Vendor name" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="expenseDate" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="grossAmount"
              label="Gross Amount (IDR)"
              rules={[{ required: true, message: 'Enter amount' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
                parser={(value) => value?.replace(/Rp\s?|(\.*)/g, '') as any}
                onChange={(val) => setGrossAmount(Number(val) || 0)}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item name="totalAmount" label="Total Amount (Auto)">
              <InputNumber
                style={{ width: '100%' }}
                disabled
                formatter={(value) =>
                  `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="ppnCategory" label="PPN Category">
              <Select>
                <Option value="CREDITABLE">Creditable</Option>
                <Option value="NON_CREDITABLE">Non-Creditable</Option>
                <Option value="EXEMPT">Exempt</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="withholdingTaxType" label="Withholding Tax">
              <Select onChange={(val) => setWithholdingType(val as WithholdingTaxType)}>
                <Option value="NONE">None</Option>
                <Option value="PPH23">PPh 23</Option>
                <Option value="PPH4_2">PPh 4(2)</Option>
                <Option value="PPH15">PPh 15</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item name="isLuxuryGoods" label="Luxury Goods?" valuePropName="checked">
              <Switch
                onChange={setIsLuxuryGoods}
                checkedChildren="Yes (12%)"
                unCheckedChildren="No (11%)"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Hidden fields for auto-calculated values */}
        <Form.Item name="accountName" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="expenseClass" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="ppnAmount" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="withholdingAmount" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="netAmount" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="withholdingTaxRate" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item name="eFakturStatus" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

### Step 3: Create ExpenseBudgetSummary Component

```typescript
// frontend/src/components/projects/ExpenseBudgetSummary.tsx
import React from 'react';
import { Card, Row, Col, Statistic, Progress, Alert } from 'antd';
import { DollarOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { expenseService } from '../../services/expenses';
import { formatIDR } from '../../utils/currency';
import type { Project } from '../../services/projects';

interface ExpenseBudgetSummaryProps {
  project: Project;
}

export const ExpenseBudgetSummary: React.FC<ExpenseBudgetSummaryProps> = ({
  project,
}) => {
  // Parse estimated expenses
  let estimatedBudget = 0;
  if (project.estimatedExpenses) {
    try {
      const expensesData =
        typeof project.estimatedExpenses === 'string'
          ? JSON.parse(project.estimatedExpenses)
          : project.estimatedExpenses;

      estimatedBudget =
        (expensesData.totalDirect || 0) + (expensesData.totalIndirect || 0);
    } catch (error) {
      console.error('Failed to parse estimatedExpenses:', error);
    }
  }

  // Fetch actual expenses
  const { data: expensesResponse } = useQuery({
    queryKey: ['project-expenses-summary', project.id],
    queryFn: () =>
      expenseService.getExpenses({
        projectId: project.id,
        status: 'APPROVED',
      }),
  });

  const actualExpenses =
    expensesResponse?.data.reduce(
      (sum, exp) => sum + parseFloat(exp.totalAmount),
      0
    ) || 0;

  const remaining = estimatedBudget - actualExpenses;
  const percentUsed = estimatedBudget > 0 ? (actualExpenses / estimatedBudget) * 100 : 0;

  const isOverBudget = actualExpenses > estimatedBudget;

  return (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Statistic
            title="Estimated Budget"
            value={estimatedBudget}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Actual Expenses (Approved)"
            value={actualExpenses}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
            valueStyle={{ color: isOverBudget ? '#ff4d4f' : '#52c41a' }}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Remaining Budget"
            value={remaining}
            formatter={(value) => formatIDR(value as number)}
            prefix={<DollarOutlined />}
            valueStyle={{ color: remaining < 0 ? '#ff4d4f' : '#1890ff' }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <p style={{ marginBottom: 8 }}>
          <strong>Budget Usage:</strong> {percentUsed.toFixed(1)}%
        </p>
        <Progress
          percent={percentUsed}
          status={isOverBudget ? 'exception' : percentUsed > 80 ? 'normal' : 'success'}
          strokeColor={
            isOverBudget ? '#ff4d4f' : percentUsed > 80 ? '#faad14' : '#52c41a'
          }
        />
      </div>

      {isOverBudget && (
        <Alert
          message="Over Budget!"
          description={`This project is over budget by ${formatIDR(Math.abs(remaining))}`}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};
```

### Step 4: Update ProjectDetailPage.tsx

```typescript
// frontend/src/pages/ProjectDetailPage.tsx

// Add imports at top
import { ProjectExpenseList } from '../components/projects/ProjectExpenseList'
import { AddExpenseModal } from '../components/projects/AddExpenseModal'
import { ExpenseBudgetSummary } from '../components/projects/ExpenseBudgetSummary'
import { useState } from 'react' // If not already imported

// Inside component, add state for modal
const [expenseModalOpen, setExpenseModalOpen] = useState(false)

// Replace the "Financial History" tab (around line 1035):
{
  key: 'financial',
  label: (
    <span>
      <DollarOutlined />
      Financial History
    </span>
  ),
  children: (
    <div style={{ padding: '24px' }}>
      {/* Budget Summary */}
      <ExpenseBudgetSummary project={project} />

      {/* Expense List with Add button */}
      <ProjectExpenseList
        projectId={project.id}
        onAddExpense={() => setExpenseModalOpen(true)}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        projectId={project.id}
        clientId={project.client?.id}
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
      />
    </div>
  ),
}
```

---

## Data Flow

### Creating Expense from Project Detail Page

```
┌──────────────────────────────────────────────────────────────┐
│ USER ACTION                                                  │
│ User on Project Detail Page → Financial History Tab         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ COMPONENT: ExpenseBudgetSummary                              │
│ • Fetches project.estimatedExpenses                          │
│ • Queries actual expenses: GET /expenses?projectId=xyz       │
│ • Calculates budget variance                                 │
│ • Displays: Estimated vs Actual vs Remaining                 │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ COMPONENT: ProjectExpenseList                                │
│ • useQuery: GET /expenses?projectId=xyz                      │
│ • Displays table of expenses                                 │
│ • Shows [Add Expense] button                                 │
└──────────────────────────────────────────────────────────────┘
                          ↓ (User clicks Add)
┌──────────────────────────────────────────────────────────────┐
│ COMPONENT: AddExpenseModal                                   │
│ • Modal opens                                                │
│ • Form pre-filled:                                           │
│   - projectId: props.projectId (from parent)                 │
│   - clientId: props.clientId (from project data)             │
│   - isBillable: true (auto-set)                              │
│ • User fills:                                                │
│   - Category, Vendor, Amount, Date, Tax info                 │
│ • Auto-calculates: PPN, Withholding, Total                   │
└──────────────────────────────────────────────────────────────┘
                          ↓ (User clicks Create)
┌──────────────────────────────────────────────────────────────┐
│ MUTATION: createMutation.mutate(expenseData)                 │
│                                                              │
│ POST /api/v1/expenses                                        │
│ {                                                            │
│   description: "Cloud hosting",                              │
│   categoryId: "cat_hosting",                                 │
│   grossAmount: 5000000,                                      │
│   ppnAmount: 550000,                                         │
│   totalAmount: 5550000,                                      │
│   projectId: "cmgzipmni0000yz52659g959z",  ← Auto-filled    │
│   clientId: "client_acme",                  ← Auto-filled    │
│   isBillable: true                          ← Auto-set       │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ BACKEND: Expense Created                                     │
│ • Expense saved to database                                  │
│ • Linked to project via projectId foreign key               │
│ • Returns created expense with relations                     │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ MUTATION: onSuccess                                          │
│ • queryClient.invalidateQueries(['project-expenses', id])    │
│ • Table automatically refetches and updates                  │
│ • Modal closes                                               │
│ • Success message shown                                      │
│ • New expense appears in table                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration Steps

### Step-by-Step Implementation

1. **Create New Component Files**
   ```bash
   touch frontend/src/components/projects/ProjectExpenseList.tsx
   touch frontend/src/components/projects/AddExpenseModal.tsx
   touch frontend/src/components/projects/ExpenseBudgetSummary.tsx
   ```

2. **Copy Component Code**
   - Copy ProjectExpenseList code from above
   - Copy AddExpenseModal code from above
   - Copy ExpenseBudgetSummary code from above

3. **Update ProjectDetailPage.tsx**
   - Add imports for new components
   - Add state: `const [expenseModalOpen, setExpenseModalOpen] = useState(false)`
   - Replace Financial History tab children with new components

4. **Test the Implementation**
   ```bash
   # Start dev server
   docker compose -f docker-compose.dev.yml up

   # Navigate to a project detail page
   # Click "Financial History" tab
   # Verify budget summary displays
   # Click "Add Expense" button
   # Fill modal form
   # Save and verify expense appears in table
   ```

5. **Verify Data Flow**
   - Check expense is linked to project: `GET /expenses?projectId=xyz`
   - Verify `isBillable` is true
   - Verify `clientId` is set from project

---

## Alternative Approaches

### Alternative 1: Navigation-Based (Simpler)

Instead of modal, navigate to expense create page with pre-filled data:

```typescript
const handleAddExpense = () => {
  navigate('/expenses/create', {
    state: {
      projectId: project.id,
      clientId: project.client?.id,
      isBillable: true,
      // Optionally pre-fill more fields
    },
  });
};
```

Then in ExpenseCreatePage, read from location state:

```typescript
const location = useLocation();
const { projectId, clientId, isBillable } = location.state || {};

// Set initial values
form.setFieldsValue({
  projectId,
  clientId,
  isBillable,
});
```

**Pros**:
- ✅ Simpler (no new components needed)
- ✅ Full expense form available
- ✅ Less code duplication

**Cons**:
- ❌ User leaves project page
- ❌ Context lost
- ❌ More navigation clicks

### Alternative 2: Inline Form (Most Complex)

Add expense form directly in the tab (no modal):

```typescript
<Tabs>
  <TabPane key="expenses-list">
    <ProjectExpenseList />
  </TabPane>
  <TabPane key="add-expense">
    <ExpenseFormInline projectId={project.id} />
  </TabPane>
</Tabs>
```

**Pros**:
- ✅ No modal overlay
- ✅ Dedicated space for form

**Cons**:
- ❌ More complex tab structure
- ❌ Requires sub-tabs
- ❌ Less intuitive UX

### Alternative 3: Drawer (Material Design)

Use Ant Design Drawer instead of Modal:

```typescript
<Drawer
  title="Add Expense to Project"
  placement="right"
  width={720}
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
>
  <ExpenseFormContent projectId={project.id} />
</Drawer>
```

**Pros**:
- ✅ More screen space
- ✅ Side-panel UX pattern
- ✅ Can keep project visible on left

**Cons**:
- ❌ Less common pattern
- ❌ May feel disconnected

---

## Summary

### Recommended Implementation: **Modal-Based Approach**

1. **Three new components**:
   - `ExpenseBudgetSummary` - Shows budget vs actual
   - `ProjectExpenseList` - Lists project expenses with actions
   - `AddExpenseModal` - Simplified expense creation form

2. **Update ProjectDetailPage.tsx**:
   - Replace "Financial History" placeholder with new components
   - Add state for modal visibility

3. **Key Features**:
   - ✅ Budget variance tracking
   - ✅ Quick expense creation without navigation
   - ✅ Auto-linking to project and client
   - ✅ Real-time table updates
   - ✅ Full CRUD operations (view, delete drafts)
   - ✅ Indonesian tax compliance maintained

4. **User Benefits**:
   - ✅ Stay in project context
   - ✅ See budget impact immediately
   - ✅ Faster workflow
   - ✅ Clear visual feedback

### Next Steps

1. Create the three component files
2. Copy code implementations
3. Update ProjectDetailPage.tsx imports and tab
4. Test thoroughly
5. Consider adding:
   - Expense charts/graphs
   - Export expenses to Excel
   - Bulk expense import
   - Expense approval workflow from project page

---

*Generated: October 21, 2025*
*Document Type: Implementation Guide*
*Complexity: Medium*
*Estimated Implementation Time: 2-4 hours*
