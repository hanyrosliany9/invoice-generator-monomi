import React from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../services/expenses';
import type { Expense } from '../types/expense';
import { useTheme } from '../theme';
import { formatDate } from '../utils/dateFormatters';

const { Title, Text } = Typography;

export const ExpenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  // Fetch expense
  const {
    data: expense,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => expenseService.getExpense(id!),
    enabled: !!id,
  });

  // Mutations
  // Submit mutation removed - expenses are now automatically PAID on creation

  const deleteMutation = useMutation({
    mutationFn: () => expenseService.deleteExpense(id!),
    onSuccess: () => {
      message.success('Expense berhasil dihapus');
      navigate('/expenses');
    },
  });

  // All approval/payment mutations removed - expenses are now automatically PAID on creation

  const handleDelete = () => {
    modal.confirm({
      title: 'Konfirmasi Hapus',
      content: 'Apakah Anda yakin ingin menghapus expense ini?',
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: () => deleteMutation.mutate(),
    });
  };

  // All handler functions for approval/payment removed

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <Spin size='large' />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <Alert
        message='Error'
        description={(error as Error)?.message || 'Expense not found'}
        type='error'
        showIcon
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className='mb-6 flex justify-between items-start'>
        <div>
          <Title level={2} style={{ color: theme.colors.text.primary, marginBottom: '8px' }}>
            {expense.expenseNumber}
          </Title>
          <Space>
            <Tag color={expenseService.getStatusColor(expense.status).split(' ')[0]}>
              {expenseService.getStatusLabel(expense.status)}
            </Tag>
            <Tag color={expenseService.getPaymentStatusColor(expense.paymentStatus).split(' ')[0]}>
              {expenseService.getPaymentStatusLabel(expense.paymentStatus)}
            </Tag>
            <Text type='secondary'>{expense.buktiPengeluaranNumber}</Text>
          </Space>
        </div>

        <Space>
          <Button onClick={() => navigate('/expenses')}>
            <CloseOutlined /> Tutup
          </Button>
          {expenseService.canEdit(expense) && (
            <Button icon={<EditOutlined />} onClick={() => navigate(`/expenses/${id}/edit`)}>
              Edit
            </Button>
          )}
          {expenseService.canDelete(expense) && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Hapus
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Main Info */}
        <Col xs={24} lg={16}>
          {/* Basic Info */}
          <Card
            title='Informasi Dasar'
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              border: theme.colors.glass.border,
              background: theme.colors.glass.background,
            }}
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label='Kategori'>
                {expense.category?.nameId || expense.category?.name}
              </Descriptions.Item>
              <Descriptions.Item label='Kode Akun'>
                {expense.accountCode}
              </Descriptions.Item>
              <Descriptions.Item label='Deskripsi' span={2}>
                {expense.descriptionId || expense.description}
              </Descriptions.Item>
              <Descriptions.Item label='Vendor'>
                {expense.vendorName}
              </Descriptions.Item>
              <Descriptions.Item label='NPWP Vendor'>
                {expense.vendorNPWP ? expenseService.formatNPWP(expense.vendorNPWP) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label='Tanggal'>
                {formatDate(expense.expenseDate)}
              </Descriptions.Item>
              <Descriptions.Item label='Status'>
                {expenseService.getStatusLabel(expense.status)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Financial Details */}
          <Card
            title='Rincian Keuangan'
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              border: theme.colors.glass.border,
              background: theme.colors.glass.background,
            }}
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label='Jumlah Bruto'>
                {expenseService.formatIDR(expense.grossAmount)}
              </Descriptions.Item>
              <Descriptions.Item label='PPN'>
                {expenseService.formatIDR(expense.ppnAmount)} ({parseFloat(expense.ppnRate) * 100}%)
              </Descriptions.Item>
              <Descriptions.Item label='PPh Dipotong'>
                {expense.withholdingAmount ? expenseService.formatIDR(expense.withholdingAmount) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label='Jumlah Netto'>
                {expenseService.formatIDR(expense.netAmount)}
              </Descriptions.Item>
              <Descriptions.Item label='Total Biaya' span={2}>
                <Text strong style={{ fontSize: '18px' }}>
                  {expenseService.formatIDR(expense.totalAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label='Kategori PPN'>
                {expense.ppnCategory}
              </Descriptions.Item>
              <Descriptions.Item label='Barang Mewah'>
                {expense.isLuxuryGoods ? 'Ya (PPN 12%)' : 'Tidak (PPN 11%)'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* e-Faktur */}
          {expense.eFakturNSFP && (
            <Card
              title='e-Faktur'
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Descriptions bordered column={2}>
                <Descriptions.Item label='NSFP'>
                  {expenseService.formatNSFP(expense.eFakturNSFP)}
                </Descriptions.Item>
                <Descriptions.Item label='Status'>
                  {expense.eFakturStatus}
                </Descriptions.Item>
                {expense.eFakturIssueDate && (
                  <Descriptions.Item label='Tanggal Terbit'>
                    {formatDate(expense.eFakturIssueDate)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Project & Client */}
          {expense.isBillable && (
            <Card
              title='Project & Client'
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: theme.colors.glass.border,
                background: theme.colors.glass.background,
              }}
            >
              <Descriptions bordered column={2}>
                <Descriptions.Item label='Dapat Ditagih'>
                  <Tag color='green'>Ya</Tag>
                </Descriptions.Item>
                <Descriptions.Item label='Project'>
                  {expense.project?.number} - {expense.project?.description}
                </Descriptions.Item>
                <Descriptions.Item label='Client' span={2}>
                  {expense.client?.name}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          {/* Summary */}
          <Card
            title='Ringkasan'
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              border: theme.colors.glass.border,
              background: theme.colors.glass.background,
            }}
          >
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Total Biaya</Text>
                <Title level={2}>{expenseService.formatIDR(expense.totalAmount)}</Title>
              </div>

              <div>
                <Text type='secondary'>Status Approval</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={expenseService.getStatusColor(expense.status).split(' ')[0]} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {expenseService.getStatusLabel(expense.status)}
                  </Tag>
                </div>
              </div>

              <div>
                <Text type='secondary'>Status Pembayaran</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={expenseService.getPaymentStatusColor(expense.paymentStatus).split(' ')[0]} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {expenseService.getPaymentStatusLabel(expense.paymentStatus)}
                  </Tag>
                </div>
              </div>

              {expense.approver && (
                <div>
                  <Text type='secondary'>Disetujui Oleh</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>{expense.approver.name}</Text>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      {expense.approvedAt ? formatDate(expense.approvedAt) : '-'}
                    </div>
                  </div>
                </div>
              )}

              {expense.rejectionReason && (
                <Alert
                  message='Alasan Penolakan'
                  description={expense.rejectionReason}
                  type='error'
                  showIcon
                />
              )}
            </Space>
          </Card>

          {/* Indonesian Tax Summary */}
          <Card
            title='Indonesian Tax Compliance'
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              background: theme.colors.glass.background,
            }}
          >
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <div className='flex justify-between'>
                <Text>PPN {parseFloat(expense.ppnRate) * 100}%</Text>
                <Text strong>{expenseService.formatIDR(expense.ppnAmount)}</Text>
              </div>
              {expense.withholdingAmount && parseFloat(expense.withholdingAmount) > 0 && (
                <div className='flex justify-between'>
                  <Text>PPh Dipotong</Text>
                  <Text strong type='danger'>-{expenseService.formatIDR(expense.withholdingAmount)}</Text>
                </div>
              )}
              {expense.eFakturNSFP && (
                <div>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> e-Faktur tersedia
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
