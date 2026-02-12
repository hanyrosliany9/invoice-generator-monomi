import React, { useState, useEffect, useMemo } from 'react';
import { Space, Select, Radio, Button, Badge, theme, Input, Collapse, Tag } from 'antd';
import { FilterOutlined, ClearOutlined, SearchOutlined, DownOutlined, CloseOutlined } from '@ant-design/icons';
import { StarRating } from './StarRating';
import { MediaAssetFilters } from '../../services/media-collab';

const { Option } = Select;
const { Panel } = Collapse;

interface FilterBarProps {
  filters: MediaAssetFilters;
  onFilterChange: (filters: MediaAssetFilters) => void;
  activeFilterCount?: number;
  resultCount?: number;
  totalCount?: number;
}

/**
 * FilterBar Component
 *
 * Provides filtering controls for media assets:
 * - Media type (All, Photos, Videos, RAW)
 * - Review status
 * - Star rating
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  activeFilterCount = 0,
  resultCount,
  totalCount,
}) => {
  const { token } = theme.useToken();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect mobile device
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({
          ...filters,
          search: searchValue || undefined,
        });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  // Sync search value with filters prop
  useEffect(() => {
    if (filters.search !== searchValue) {
      setSearchValue(filters.search || '');
    }
  }, [filters.search]);

  const handleMediaTypeChange = (value: string) => {
    onFilterChange({
      ...filters,
      mediaType: value === 'all' ? undefined : (value as 'VIDEO' | 'IMAGE' | 'RAW_IMAGE'),
    });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value === 'all' ? undefined : (value as 'DRAFT' | 'IN_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'ARCHIVED'),
    });
  };

  const handleStarRatingChange = (rating: number) => {
    onFilterChange({
      ...filters,
      starRating: rating === 0 ? undefined : rating,
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    onFilterChange({
      ...filters,
      sortBy: sortBy as 'uploadedAt' | 'originalName' | 'size' | 'starRating',
      sortOrder: sortOrder as 'asc' | 'desc',
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      sortBy: 'uploadedAt',
      sortOrder: 'desc',
    });
    setSearchValue('');
  };

  // Generate active filter tags
  const getActiveFilterTags = () => {
    const tags = [];
    if (filters.search) tags.push({ key: 'search', label: `Search: "${filters.search}"` });
    if (filters.mediaType) tags.push({ key: 'mediaType', label: filters.mediaType === 'IMAGE' ? 'Photos' : filters.mediaType === 'VIDEO' ? 'Videos' : 'RAW' });
    if (filters.status) tags.push({ key: 'status', label: filters.status.replace('_', ' ') });
    if (filters.starRating) tags.push({ key: 'starRating', label: `${filters.starRating}+ Stars` });
    return tags;
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    if (key === 'search') {
      delete newFilters.search;
      setSearchValue('');
    } else if (key === 'mediaType') {
      delete newFilters.mediaType;
    } else if (key === 'status') {
      delete newFilters.status;
    } else if (key === 'starRating') {
      delete newFilters.starRating;
    }
    onFilterChange(newFilters);
  };

  return (
    <div
      style={{
        padding: isMobile ? '12px' : '16px',
        background: token.colorBgContainer,
        borderRadius: '8px',
        marginBottom: '16px',
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {isMobile ? (
        /* Mobile Layout: Vertical Stack */
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {/* Full-width search */}
          <Input
            placeholder="Search files..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
            style={{ width: '100%' }}
            size="large"
          />
          {/* Filter + Sort row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              type={activeFilterCount > 0 || isExpanded ? 'primary' : 'default'}
              style={{ flex: 1 }}
              size="large"
            >
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
            <Select
              value={filters.sortBy && filters.sortOrder ? `${filters.sortBy}-${filters.sortOrder}` : 'uploadedAt-desc'}
              onChange={handleSortChange}
              style={{ flex: 1 }}
              size="large"
            >
              <Option value="uploadedAt-desc">📅 Newest</Option>
              <Option value="uploadedAt-asc">📅 Oldest</Option>
              <Option value="originalName-asc">🔤 A-Z</Option>
              <Option value="originalName-desc">🔤 Z-A</Option>
            </Select>
          </div>
          {/* Expanded filters - vertical stack */}
          {isExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {/* Media Type Filter */}
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Media Type</span>
                <Radio.Group
                  value={filters.mediaType || 'all'}
                  onChange={(e) => handleMediaTypeChange(e.target.value)}
                  buttonStyle="solid"
                  size="middle"
                  style={{ width: '100%', display: 'flex' }}
                >
                  <Radio.Button value="all" style={{ flex: 1, textAlign: 'center' }}>All</Radio.Button>
                  <Radio.Button value="IMAGE" style={{ flex: 1, textAlign: 'center' }}>Photos</Radio.Button>
                  <Radio.Button value="VIDEO" style={{ flex: 1, textAlign: 'center' }}>Videos</Radio.Button>
                </Radio.Group>
              </Space>

              {/* Status Filter */}
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Status</span>
                <Select
                  value={filters.status || 'all'}
                  onChange={handleStatusChange}
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <Option value="all">All Status</Option>
                  <Option value="DRAFT">📝 Draft</Option>
                  <Option value="IN_REVIEW">🔄 In Review</Option>
                  <Option value="NEEDS_CHANGES">⚠️ Needs Changes</Option>
                  <Option value="APPROVED">✅ Approved</Option>
                  <Option value="ARCHIVED">📦 Archived</Option>
                </Select>
              </Space>

              {/* Star Rating Filter */}
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Minimum Rating</span>
                <div
                  style={{
                    padding: '8px 12px',
                    background: token.colorBgLayout,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: '6px',
                  }}
                >
                  <StarRating
                    value={filters.starRating}
                    onChange={handleStarRatingChange}
                    size={20}
                    enableKeyboard={false}
                  />
                </div>
              </Space>

              {/* Clear Filters */}
              {activeFilterCount > 0 && (
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearFilters}
                  danger
                  block
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
          {/* Result Count */}
          {resultCount !== undefined && totalCount !== undefined && (
            <div style={{ fontSize: 12, color: token.colorTextSecondary, textAlign: 'center', marginTop: 4 }}>
              {activeFilterCount > 0 ? (
                <span>
                  <strong style={{ color: token.colorText }}>{resultCount}</strong> of <strong>{totalCount}</strong> assets
                </span>
              ) : (
                <span>
                  <strong style={{ color: token.colorText }}>{totalCount}</strong> {totalCount === 1 ? 'asset' : 'assets'}
                </span>
              )}
            </div>
          )}
        </Space>
      ) : (
        /* Desktop Layout: Original Horizontal */
        <>
      {/* Compact Header - Always Visible */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Left Side: Search + Filter Button */}
        <Space size="middle">
          {/* Always-visible search */}
          <Input
            placeholder="Search assets..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
            style={{ width: 280 }}
            size="middle"
          />

          {/* Filter Toggle Button */}
          <Button
            icon={<FilterOutlined />}
            onClick={() => setIsExpanded(!isExpanded)}
            type={activeFilterCount > 0 || isExpanded ? 'primary' : 'default'}
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge
                count={activeFilterCount}
                style={{
                  marginLeft: 6,
                  background: token.colorBgContainer,
                  color: token.colorPrimary,
                  boxShadow: 'none',
                }}
              />
            )}
            <DownOutlined
              style={{
                marginLeft: 6,
                fontSize: 10,
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </Button>

          {/* Sort - Always visible for quick access */}
          <Select
            value={filters.sortBy && filters.sortOrder ? `${filters.sortBy}-${filters.sortOrder}` : 'uploadedAt-desc'}
            onChange={handleSortChange}
            style={{ width: 160 }}
            size="middle"
            suffixIcon={null}
            placeholder="Sort by"
            variant="borderless"
          >
            <Option value="uploadedAt-desc">📅 Newest First</Option>
            <Option value="uploadedAt-asc">📅 Oldest First</Option>
            <Option value="originalName-asc">🔤 Name (A-Z)</Option>
            <Option value="originalName-desc">🔤 Name (Z-A)</Option>
            <Option value="size-desc">📦 Size (Largest)</Option>
            <Option value="size-asc">📦 Size (Smallest)</Option>
            <Option value="starRating-desc">⭐ Rating (Highest)</Option>
            <Option value="starRating-asc">⭐ Rating (Lowest)</Option>
          </Select>
        </Space>

        {/* Right Side: Result Count */}
        {resultCount !== undefined && totalCount !== undefined && (
          <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
            {activeFilterCount > 0 ? (
              <span>
                <strong style={{ color: token.colorText }}>{resultCount}</strong> of <strong>{totalCount}</strong> assets
              </span>
            ) : (
              <span>
                <strong style={{ color: token.colorText }}>{totalCount}</strong> {totalCount === 1 ? 'asset' : 'assets'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && !isExpanded && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>Active filters:</span>
          {getActiveFilterTags().map((tag) => (
            <Tag
              key={tag.key}
              closable
              closeIcon={<CloseOutlined style={{ fontSize: 14 }} />}
              onClose={() => removeFilter(tag.key)}
              color="blue"
              style={{ fontSize: 13, padding: '4px 8px', minHeight: 32, display: 'flex', alignItems: 'center' }}
            >
              {tag.label}
            </Tag>
          ))}
          <Button
            type="link"
            size="small"
            onClick={handleClearFilters}
            style={{ padding: 0, height: 'auto' }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space size="large" wrap>
            {/* Media Type Filter */}
            <Space direction="vertical" size={4}>
              <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Media Type</span>
              <Radio.Group
                value={filters.mediaType || 'all'}
                onChange={(e) => handleMediaTypeChange(e.target.value)}
                buttonStyle="solid"
                size="middle"
              >
                <Radio.Button value="all">All</Radio.Button>
                <Radio.Button value="IMAGE">📷 Photos</Radio.Button>
                <Radio.Button value="VIDEO">🎬 Videos</Radio.Button>
                <Radio.Button value="RAW_IMAGE">📸 RAW</Radio.Button>
              </Radio.Group>
            </Space>

            {/* Status Filter */}
            <Space direction="vertical" size={4}>
              <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Status</span>
              <Select
                value={filters.status || 'all'}
                onChange={handleStatusChange}
                style={{ width: 180 }}
                size="middle"
              >
                <Option value="all">All Status</Option>
                <Option value="DRAFT">📝 Draft</Option>
                <Option value="IN_REVIEW">🔄 In Review</Option>
                <Option value="NEEDS_CHANGES">⚠️ Needs Changes</Option>
                <Option value="APPROVED">✅ Approved</Option>
                <Option value="ARCHIVED">📦 Archived</Option>
              </Select>
            </Space>

            {/* Star Rating Filter */}
            <Space direction="vertical" size={4}>
              <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>Minimum Rating</span>
              <div
                style={{
                  padding: '6px 12px',
                  background: token.colorBgLayout,
                  border: `1px solid ${token.colorBorder}`,
                  borderRadius: '6px',
                }}
              >
                <StarRating
                  value={filters.starRating}
                  onChange={handleStarRatingChange}
                  size={18}
                  enableKeyboard={false}
                />
              </div>
            </Space>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Space direction="vertical" size={4}>
                <span style={{ fontSize: 12, color: 'transparent', fontWeight: 500 }}>.</span>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClearFilters}
                  danger
                >
                  Clear All Filters
                </Button>
              </Space>
            )}
          </Space>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default FilterBar;
