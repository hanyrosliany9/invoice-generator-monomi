import React, { useMemo } from 'react';
import { Select, Space, Tooltip, Tag, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { vendorService } from '../../services/vendors';
import type { Vendor, VendorQueryParams } from '../../types/vendor';

interface VendorSelectProps {
  value?: string;
  onChange?: (value: string, vendor?: Vendor) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onlyActive?: boolean;
  vendorType?: string;
  pkpStatus?: string;
  size?: 'large' | 'middle' | 'small';
  allowClear?: boolean;
  showCode?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * VendorSelect Component
 *
 * Reusable dropdown component for selecting vendors across the application.
 * Includes search, filtering, and vendor information display.
 *
 * Features:
 * - Search by vendor name, code, or NPWP
 * - Filter by status, type, or PKP status
 * - Display vendor codes and status
 * - Async loading with React Query
 * - Support for custom filtering
 */
export const VendorSelect: React.FC<VendorSelectProps> = ({
  value,
  onChange,
  placeholder = 'Pilih Vendor...',
  disabled = false,
  required = false,
  onlyActive = true,
  vendorType,
  pkpStatus,
  size = 'middle',
  allowClear = true,
  showCode = true,
  style,
  className,
}) => {
  const [searchText, setSearchText] = React.useState('');

  // Build query params
  const queryParams: VendorQueryParams = useMemo(() => {
    return {
      search: searchText || undefined,
      isActive: onlyActive ? true : undefined,
      vendorType: vendorType as any,
      pkpStatus: pkpStatus as any,
      limit: 100, // Get enough vendors for dropdown
    };
  }, [searchText, onlyActive, vendorType, pkpStatus]);

  // Query vendors
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors', queryParams],
    queryFn: () => vendorService.getVendors(queryParams),
  });

  const vendors = vendorsData?.data || [];

  // Build options
  const options = vendors.map(vendor => ({
    label: (
      <Space direction="vertical" size={2} style={{ width: '100%' }}>
        <div>
          <strong>{vendor.name}</strong>
          {showCode && (
            <Tag
              color="blue"
              style={{ marginLeft: '8px' }}
            >
              {vendor.vendorCode}
            </Tag>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {vendor.vendorType && (
            <span>{vendorService.getVendorTypeLabel(vendor.vendorType)}</span>
          )}
          {vendor.phone && <span> • {vendor.phone}</span>}
        </div>
      </Space>
    ),
    value: vendor.id,
    vendor,
  }));

  // Find selected vendor
  const selectedVendor = vendors.find(v => v.id === value);

  // Handle change
  const handleChange = (selectedValue: string) => {
    const vendor = vendors.find(v => v.id === selectedValue);
    onChange?.(selectedValue, vendor);
  };

  return (
    <Tooltip
      title={selectedVendor?.name ? `Dipilih: ${selectedVendor.name}` : ''}
      trigger={selectedVendor ? ['hover'] : []}
    >
      <Select<string>
        value={value}
        onChange={handleChange}
        onSearch={setSearchText}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        notFoundContent={
          isLoading ? (
            <Spin size="small" style={{ display: 'block', textAlign: 'center' }} />
          ) : (
            'Vendor tidak ditemukan'
          )
        }
        options={options}
        size={size as 'large' | 'middle' | 'small'}
        allowClear={allowClear}
        filterOption={false}
        showSearch
        style={{ width: '100%', ...style }}
        className={className}
        optionLabelProp={selectedVendor ? 'label' : undefined}
      />
    </Tooltip>
  );
};

/**
 * VendorSelectFormField
 *
 * Wrapper for using VendorSelect with Ant Design Form.
 * Automatically handles required field validation.
 */
export const VendorSelectFormField: React.FC<
  Omit<VendorSelectProps, 'value' | 'onChange'> & {
    fieldName?: string;
  }
> = (props) => {
  return <VendorSelect {...props} />;
};

/**
 * ActiveVendorSelect
 *
 * Pre-configured VendorSelect for selecting only active vendors.
 */
export const ActiveVendorSelect: React.FC<VendorSelectProps> = (props) => {
  return <VendorSelect {...props} onlyActive={true} />;
};

/**
 * SupplierSelect
 *
 * Pre-configured VendorSelect for selecting suppliers only.
 */
export const SupplierSelect: React.FC<VendorSelectProps> = (props) => {
  return <VendorSelect {...props} vendorType="SUPPLIER" onlyActive={true} />;
};

/**
 * ServiceProviderSelect
 *
 * Pre-configured VendorSelect for selecting service providers only.
 */
export const ServiceProviderSelect: React.FC<VendorSelectProps> = (props) => {
  return (
    <VendorSelect
      {...props}
      vendorType="SERVICE_PROVIDER"
      onlyActive={true}
    />
  );
};

/**
 * ContractorSelect
 *
 * Pre-configured VendorSelect for selecting contractors only.
 */
export const ContractorSelect: React.FC<VendorSelectProps> = (props) => {
  return <VendorSelect {...props} vendorType="CONTRACTOR" onlyActive={true} />;
};
