import React from 'react';
import { Button, Input, InputNumber, message, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import AccountSelector from './AccountSelector';

const { Text } = Typography;

export interface JournalLineItemFormData {
  id?: string;
  accountCode: string;
  accountName?: string;
  description?: string;
  descriptionId?: string;
  debit: number;
  credit: number;
}

interface JournalLineItemsEditorProps {
  value?: JournalLineItemFormData[];
  onChange?: (lineItems: JournalLineItemFormData[]) => void;
  disabled?: boolean;
}

const JournalLineItemsEditor: React.FC<JournalLineItemsEditorProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const handleAddLine = () => {
    const newLine: JournalLineItemFormData = {
      accountCode: '',
      description: '',
      descriptionId: '',
      debit: 0,
      credit: 0,
    };
    onChange?.([...value, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    if (value.length <= 2) {
      message.warning('Minimal 2 item baris diperlukan untuk jurnal entry');
      return;
    }
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange?.(newValue);
  };

  const handleFieldChange = (index: number, field: keyof JournalLineItemFormData, fieldValue: any) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], [field]: fieldValue };
    onChange?.(newValue);
  };

  // Calculate totals
  const totalDebit = value.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = value.reduce((sum, item) => sum + (item.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0 && totalCredit > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    {
      title: <Text strong>Kode Akun</Text>,
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 250,
      render: (text: string, record: JournalLineItemFormData, index: number) => (
        <AccountSelector
          value={text}
          onChange={(code, account) => {
            handleFieldChange(index, 'accountCode', code);
            if (account) {
              handleFieldChange(index, 'accountName', account.nameId || account.name);
            }
          }}
          disabled={disabled}
          placeholder="Pilih akun..."
        />
      ),
    },
    {
      title: <Text strong>Nama Akun</Text>,
      dataIndex: 'accountName',
      key: 'accountName',
      width: 200,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: <Text strong>Deskripsi</Text>,
      dataIndex: 'descriptionId',
      key: 'descriptionId',
      width: 250,
      render: (text: string, record: JournalLineItemFormData, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleFieldChange(index, 'descriptionId', e.target.value)}
          placeholder="Deskripsi (opsional)"
          disabled={disabled}
        />
      ),
    },
    {
      title: <Text strong>Debit</Text>,
      dataIndex: 'debit',
      key: 'debit',
      width: 150,
      align: 'right' as const,
      render: (text: number, record: JournalLineItemFormData, index: number) => (
        <InputNumber
          value={text}
          onChange={(val) => {
            handleFieldChange(index, 'debit', val || 0);
            // Auto-clear credit if debit is entered
            if (val && val > 0 && record.credit > 0) {
              handleFieldChange(index, 'credit', 0);
            }
          }}
          min={0}
          precision={2}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      ),
    },
    {
      title: <Text strong>Kredit</Text>,
      dataIndex: 'credit',
      key: 'credit',
      width: 150,
      align: 'right' as const,
      render: (text: number, record: JournalLineItemFormData, index: number) => (
        <InputNumber
          value={text}
          onChange={(val) => {
            handleFieldChange(index, 'credit', val || 0);
            // Auto-clear debit if credit is entered
            if (val && val > 0 && record.debit > 0) {
              handleFieldChange(index, 'debit', 0);
            }
          }}
          min={0}
          precision={2}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      ),
    },
    {
      title: <Text strong>Aksi</Text>,
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: JournalLineItemFormData, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveLine(index)}
          disabled={disabled || value.length <= 2}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Balance Status */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: isBalanced
            ? theme.colors.background.tertiary
            : theme.colors.background.tertiary,
          border: `1px solid ${isBalanced ? theme.colors.status.success : theme.colors.status.warning}`,
        }}
      >
        <Space size="large" wrap>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Total Debit
            </Text>
            <div>
              <Text strong style={{ fontSize: '16px', color: theme.colors.text.primary }}>
                {formatCurrency(totalDebit)}
              </Text>
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Total Kredit
            </Text>
            <div>
              <Text strong style={{ fontSize: '16px', color: theme.colors.text.primary }}>
                {formatCurrency(totalCredit)}
              </Text>
            </div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Selisih
            </Text>
            <div>
              <Text
                strong
                style={{
                  fontSize: '16px',
                  color: isBalanced ? theme.colors.status.success : theme.colors.status.error,
                }}
              >
                {formatCurrency(difference)}
              </Text>
            </div>
          </div>
          <div>
            {isBalanced ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                Seimbang
              </Tag>
            ) : (
              <Tag color="warning" icon={<WarningOutlined />}>
                Tidak Seimbang
              </Tag>
            )}
          </div>
        </Space>
      </div>

      {/* Line Items Table */}
      <Table
        columns={columns}
        dataSource={value}
        rowKey={(record, index) => index?.toString() || '0'}
        pagination={false}
        size="small"
        style={{
          background: theme.colors.card.background,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* Add Line Button */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddLine}
        disabled={disabled}
        style={{ width: '100%', marginTop: '16px' }}
      >
        Tambah Baris
      </Button>

      {/* Validation Messages */}
      {!isBalanced && value.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <Text type="warning" style={{ fontSize: '13px' }}>
            <WarningOutlined /> Total debit harus sama dengan total kredit untuk jurnal yang valid
          </Text>
        </div>
      )}
      {value.length < 2 && (
        <div style={{ marginTop: '12px' }}>
          <Text type="warning" style={{ fontSize: '13px' }}>
            <WarningOutlined /> Minimal 2 item baris diperlukan
          </Text>
        </div>
      )}
    </div>
  );
};

export default JournalLineItemsEditor;
