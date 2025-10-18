import React, { useState, useEffect } from 'react';
import { Select, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getChartOfAccounts, ChartOfAccount } from '../../services/accounting';
import { useTheme } from '../../theme';

const { Text } = Typography;

interface AccountSelectorProps {
  value?: string;
  onChange?: (accountCode: string, account?: ChartOfAccount) => void;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showInactive?: boolean;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  value,
  onChange,
  accountType,
  placeholder = 'Pilih akun...',
  disabled = false,
  allowClear = true,
  showInactive = false,
}) => {
  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', showInactive],
    queryFn: () => getChartOfAccounts({ includeInactive: showInactive }),
  });

  // Filter accounts by type if specified
  const filteredAccounts = accountType
    ? accounts.filter((acc) => acc.accountType === accountType)
    : accounts;

  // Filter by search
  const searchedAccounts = searchValue
    ? filteredAccounts.filter(
        (acc) =>
          acc.code.toLowerCase().includes(searchValue.toLowerCase()) ||
          acc.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          acc.nameId?.toLowerCase().includes(searchValue.toLowerCase())
      )
    : filteredAccounts;

  const handleChange = (code: string) => {
    const selectedAccount = accounts.find((acc) => acc.code === code);
    onChange?.(code, selectedAccount);
  };

  const accountTypeColors: Record<string, string> = {
    ASSET: theme.colors.status.info,
    LIABILITY: theme.colors.status.warning,
    EQUITY: theme.colors.accent.primary,
    REVENUE: theme.colors.status.success,
    EXPENSE: theme.colors.status.error,
  };

  return (
    <Select
      showSearch
      value={value}
      onChange={handleChange}
      onSearch={setSearchValue}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      loading={isLoading}
      filterOption={false} // We handle filtering manually
      style={{ width: '100%' }}
      optionLabelProp="label"
    >
      {searchedAccounts.map((account) => (
        <Select.Option
          key={account.code}
          value={account.code}
          label={`${account.code} - ${account.nameId || account.name}`}
        >
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Space>
              <Text strong style={{ color: theme.colors.text.primary }}>
                {account.code}
              </Text>
              <Text
                style={{
                  fontSize: '11px',
                  color: accountTypeColors[account.accountType],
                  fontWeight: 500,
                }}
              >
                {account.accountType}
              </Text>
            </Space>
            <Text style={{ fontSize: '13px', color: theme.colors.text.primary }}>
              {account.nameId || account.name}
            </Text>
            {account.nameId && account.nameId !== account.name && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {account.name}
              </Text>
            )}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
};

export default AccountSelector;
