import React, { memo, useCallback } from 'react';
import { Button, Input, InputNumber, message, Space, Table, Tag, Typography } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import AccountSelector from './AccountSelector';

const { Text } = Typography;

// Memoized DebitCell component to prevent unnecessary re-renders and focus loss
// Using custom comparison to only re-render if the actual value or disabled state changes
const DebitCell = memo<{
  value: number;
  index: number;
  onChange: (index: number, val: number | null) => void;
  disabled: boolean;
}>(
  ({ value, index, onChange, disabled }) => (
    <InputNumber
      value={value}
      onChange={(val) => onChange(index, val)}
      min={0}
      precision={2}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(v) => v?.replace(/[,\s]/g, '') as any}
      style={{ width: '100%' }}
      disabled={disabled}
    />
  ),
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render), false if different (re-render)
    return prevProps.value === nextProps.value && prevProps.disabled === nextProps.disabled;
  }
);

// Memoized CreditCell component to prevent unnecessary re-renders and focus loss
const CreditCell = memo<{
  value: number;
  index: number;
  onChange: (index: number, val: number | null) => void;
  disabled: boolean;
}>(
  ({ value, index, onChange, disabled }) => (
    <InputNumber
      value={value}
      onChange={(val) => onChange(index, val)}
      min={0}
      precision={2}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(v) => v?.replace(/[,\s]/g, '') as any}
      style={{ width: '100%' }}
      disabled={disabled}
    />
  ),
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render), false if different (re-render)
    return prevProps.value === nextProps.value && prevProps.disabled === nextProps.disabled;
  }
);

DebitCell.displayName = 'DebitCell';
CreditCell.displayName = 'CreditCell';

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
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accountCode: '',
      description: '',
      descriptionId: '',
      debit: 0,
      credit: 0,
    };
    onChange?.([...value, newLine]);
  };

  // Ensure all items have unique IDs - memoized to prevent unnecessary re-renders
  const dataSourceWithIds = React.useMemo(() => {
    return value.map((item, index) => {
      // Ensure item ALWAYS has a stable ID - create a new object if ID is missing
      if (!item.id) {
        return {
          ...item,
          id: `line-${Date.now()}-${index}`,
        };
      }
      return item;
    });
  }, [value]);

  const handleRemoveLine = useCallback((index: number) => {
    onChange?.((prevValue) => {
      if (prevValue.length <= 2) {
        message.warning('Minimal 2 item baris diperlukan untuk jurnal entry');
        return prevValue;
      }
      const newValue = [...prevValue];
      newValue.splice(index, 1);
      return newValue;
    });
  }, [onChange]);

  const handleFieldChange = useCallback((index: number, field: keyof JournalLineItemFormData, fieldValue: any) => {
    onChange?.((prevValue) => {
      const newValue = [...prevValue];
      newValue[index] = { ...newValue[index], [field]: fieldValue };
      return newValue;
    });
  }, [onChange]);

  // Handle debit input - using functional update to avoid stale closures
  const handleDebitChange = useCallback((index: number, val: number | null) => {
    const numVal = val || 0;
    onChange?.((prevValue) => {
      const newValue = [...prevValue];
      newValue[index] = { ...newValue[index], debit: numVal };
      return newValue;
    });
  }, [onChange]);

  // Handle credit input - using functional update to avoid stale closures
  const handleCreditChange = useCallback((index: number, val: number | null) => {
    const numVal = val || 0;
    onChange?.((prevValue) => {
      const newValue = [...prevValue];
      newValue[index] = { ...newValue[index], credit: numVal };
      return newValue;
    });
  }, [onChange]);

  // Calculate totals
  const totalDebit = value.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = value.reduce((sum, item) => sum + (item.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0 && totalCredit > 0;

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const columns = React.useMemo(() => [
    {
      title: <Text strong>Kode Akun</Text>,
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 250,
      render: (text: string, record: JournalLineItemFormData, index: number) => {
        return (
          <AccountSelector
            value={text}
            onChange={(code, account) => {
              // Update both accountCode and accountName using functional update
              onChange?.((prevValue) => {
                const newValue = [...prevValue];
                if (index >= 0 && index < newValue.length) {
                  newValue[index] = {
                    ...newValue[index],
                    accountCode: code,
                    accountName: account ? (account.nameId || account.name) : '',
                  };
                }
                return newValue;
              });
            }}
            disabled={disabled}
            placeholder="Pilih akun..."
          />
        );
      },
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
        <DebitCell
          value={text}
          index={index}
          onChange={handleDebitChange}
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
        <CreditCell
          value={text}
          index={index}
          onChange={handleCreditChange}
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
          onClick={() => {
            // Use index parameter directly - it's reliable because rowKey="id"
            handleRemoveLine(index);
          }}
          disabled={disabled || value.length <= 2}
        />
      ),
    },
  ], [value, onChange, handleDebitChange, handleCreditChange, disabled, handleRemoveLine, handleFieldChange])
  ;

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
        dataSource={dataSourceWithIds}
        rowKey="id"
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
