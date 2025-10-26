import React, { useMemo, useState } from 'react';
import { Select, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ChartOfAccount, getChartOfAccounts } from '../../services/accounting';
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

  // Filter by account type
  const filteredByType = useMemo(() => {
    if (!accountType) return accounts;
    return accounts.filter((acc) => acc.accountType === accountType);
  }, [accounts, accountType]);

  // Further filter by search
  const displayedAccounts = useMemo(() => {
    if (!searchValue) return filteredByType;
    const searchLower = searchValue.toLowerCase();
    return filteredByType.filter(
      (acc) =>
        acc.code.toLowerCase().includes(searchLower) ||
        acc.name.toLowerCase().includes(searchLower) ||
        acc.nameId?.toLowerCase().includes(searchLower)
    );
  }, [filteredByType, searchValue]);

  const handleChange = (selectedCode: string | null) => {
    if (!selectedCode || selectedCode === '') {
      onChange?.('', undefined);
      setSearchValue('');
      return;
    }

    // Ensure selectedCode is a string
    const codeString = String(selectedCode).trim();

    // Find account from full accounts list (not just filtered)
    const selectedAccount = accounts.find((acc) => acc.code === codeString);
    onChange?.(codeString, selectedAccount);
    setSearchValue('');
  };

  const accountTypeColors: Record<string, string> = {
    ASSET: theme.colors.status.info,
    LIABILITY: theme.colors.status.warning,
    EQUITY: theme.colors.accent.primary,
    REVENUE: theme.colors.status.success,
    EXPENSE: theme.colors.status.error,
  };

  // Get label for selected value
  const selectedAccount = accounts.find((acc) => acc.code === value);
  const selectedLabel = selectedAccount
    ? `${selectedAccount.code} - ${selectedAccount.nameId || selectedAccount.name}`
    : undefined;

  return (
    <Select
      showSearch
      value={value && String(value).trim() !== '' ? value : undefined}
      onChange={handleChange}
      onSearch={setSearchValue}
      searchValue={searchValue}
      placeholder={placeholder}
      disabled={disabled || isLoading}
      allowClear={allowClear}
      loading={isLoading}
      filterOption={false}
      notFoundContent={isLoading ? 'Memuat...' : 'Tidak ada akun yang cocok'}
      style={{ width: '100%' }}
      optionLabelProp="label"
    >
      {displayedAccounts.map((account) => (
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
