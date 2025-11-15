# Social Media Reports Refactoring Plan (2025)

## Executive Summary

The social media reporting system has grown complex with 709-line components mixing concerns. This plan outlines a modern refactoring approach based on 2025 React best practices, focusing on separation of concerns, custom hooks, and feature-based architecture.

---

## Current State Analysis

### Complexity Issues

#### Page-Level Problems

**SocialMediaReportsPage.tsx (399 lines)**
- ❌ Mixed concerns: data fetching, state management, UI rendering, mobile adaptation
- ❌ Duplicate mobile/desktop rendering logic
- ❌ Business logic embedded in component (status colors, mobile adapters)
- ❌ Direct service calls instead of query abstractions

**ReportDetailPage.tsx (709 lines)**
- ❌ **MASSIVE** component doing too much (CSV parsing, form handling, modals, visualizations)
- ❌ Multiple modals managed in single component
- ❌ CSV parsing logic mixed with UI code
- ❌ Direct Papaparse calls in component (lines 101-123)
- ❌ Sample data generation embedded in render logic (lines 620-668)

#### Architectural Debt

**Current Structure:**
```
pages/
  ├── SocialMediaReportsPage.tsx    (List view - 399 lines)
  └── ReportDetailPage.tsx           (Detail view - 709 lines) ❌ TOO BIG

components/reports/
  ├── ChartRenderer.tsx
  ├── VisualChartEditor.tsx
  ├── ColumnSelector.tsx
  └── ChartErrorBoundary.tsx

services/
  └── social-media-reports.ts        (All API calls)
```

#### Specific Issues Matrix

| Issue | Impact | Location | Severity |
|-------|--------|----------|----------|
| No TanStack Query | Unnecessary loading states, no caching | Both pages | High |
| Inline CSV parsing | UI blocking, poor UX | ReportDetailPage:101-123 | High |
| Manual mobile adapters | Code duplication | SocialMediaReportsPage:118-135 | Medium |
| Form state complexity | Hard to maintain | ReportDetailPage:560-671 | High |
| No compound components | Props drilling | Throughout | Medium |
| Missing error boundaries | Poor error handling | All chart rendering | Medium |
| Direct service calls | No cache invalidation | Both pages | High |

---

## 2025 Best Practices Research

### Modern React Patterns

Based on research from leading React development sources in 2025:

#### 1. Compound Components
Compound components allow tightly-coupled UI pieces to communicate without prop drilling. In 2025, they're backed by Context API for flexibility and declarative code.

**Use Cases:**
- Report section management
- Chart editor interfaces
- Form wizards

#### 2. Custom Hooks
Custom hooks have overtaken Redux in many scenarios. Paired with TanStack Query, hooks become powerful state containers that are scalable, testable, and team-friendly.

**Implementation:**
- `useReports()` - Server state management
- `useReportMutations()` - CRUD operations
- `useCSVProcessor()` - Business logic extraction

#### 3. Context API Best Practices
Modern apps use context in smart, layered ways, breaking them down by domain:
- `ReportContext` - Report-specific state
- `ChartContext` - Visualization state
- Avoid global context bloat

#### 4. Recharts 3.0 (Already in Use ✅)
- Enhanced accessibility
- Better animations
- Improved TypeScript support
- Auto-sizing axes
- Tooltip enhancements

#### 5. TanStack Query Integration
- Automatic server state caching
- Background refetching
- Optimistic updates
- Automatic error handling
- Request deduplication

#### 6. Separation of Concerns
- Business logic → Custom hooks
- Data fetching → TanStack Query
- UI components → Presentation only
- State management → Context + Hooks

---

## Refactoring Architecture

### Phase 1: Extract Custom Hooks (High Impact, Low Risk)

**Goal:** Replace direct service calls with TanStack Query hooks

#### 1.1 Query Hooks

**File:** `frontend/src/features/reports/hooks/useReports.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { socialMediaReportsService } from '../services/reportsApi';
import { ReportStatus } from '../types/report.types';

interface ReportFilters {
  projectId?: string;
  year?: number;
  month?: number;
  status?: ReportStatus;
}

export const useReports = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => socialMediaReportsService.getReports(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

**File:** `frontend/src/features/reports/hooks/useReport.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { socialMediaReportsService } from '../services/reportsApi';

export const useReport = (id: string) => {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => socialMediaReportsService.getReport(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
```

#### 1.2 Mutation Hooks

**File:** `frontend/src/features/reports/hooks/useReportMutations.ts`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { socialMediaReportsService } from '../services/reportsApi';
import { CreateReportDto, ReportStatus } from '../types/report.types';

export const useReportMutations = () => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const createReport = useMutation({
    mutationFn: (data: CreateReportDto) =>
      socialMediaReportsService.createReport(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      message.success('Report created successfully!');
      return newReport;
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create report');
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      socialMediaReportsService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      message.success(`Report marked as ${variables.status}`);
    },
    onError: () => {
      message.error('Failed to update status');
    },
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => socialMediaReportsService.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      message.success('Report deleted');
    },
    onError: () => {
      message.error('Failed to delete report');
    },
  });

  const generatePDF = useMutation({
    mutationFn: (id: string) => socialMediaReportsService.generatePDF(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      message.success('PDF generated and downloaded successfully!');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to generate PDF');
    },
  });

  return {
    createReport,
    updateStatus,
    deleteReport,
    generatePDF,
  };
};
```

**File:** `frontend/src/features/reports/hooks/useSectionMutations.ts`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { socialMediaReportsService } from '../services/reportsApi';
import { AddSectionDto, UpdateVisualizationsDto } from '../types/report.types';

export const useSectionMutations = (reportId: string) => {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const addSection = useMutation({
    mutationFn: ({ file, data }: { file: File; data: AddSectionDto }) =>
      socialMediaReportsService.addSection(reportId, file, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      message.success('Section added successfully!');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to add section');
    },
  });

  const removeSection = useMutation({
    mutationFn: (sectionId: string) =>
      socialMediaReportsService.removeSection(reportId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      message.success('Section removed');
    },
    onError: () => {
      message.error('Failed to remove section');
    },
  });

  const reorderSections = useMutation({
    mutationFn: (sectionIds: string[]) =>
      socialMediaReportsService.reorderSections(reportId, sectionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    },
    onError: () => {
      message.error('Failed to reorder sections');
    },
  });

  const updateVisualizations = useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: string;
      data: UpdateVisualizationsDto;
    }) => socialMediaReportsService.updateVisualizations(reportId, sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
      message.success('Charts updated successfully!');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update charts');
    },
  });

  return {
    addSection,
    removeSection,
    reorderSections,
    updateVisualizations,
  };
};
```

#### 1.3 CSV Processing Hook

**File:** `frontend/src/features/reports/hooks/useCSVProcessor.ts`
```typescript
import { useState } from 'react';
import Papa from 'papaparse';
import { App } from 'antd';

interface CSVData {
  columns: string[];
  data: any[];
}

export const useCSVProcessor = () => {
  const { message } = App.useApp();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = (file: File): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      setIsProcessing(true);

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const columns = Object.keys(results.data[0] as object);
            const data = {
              columns,
              data: results.data,
            };
            setCsvData(data);
            setIsProcessing(false);
            resolve(data);
          } else {
            const error = new Error('CSV file is empty or invalid');
            setIsProcessing(false);
            reject(error);
          }
        },
        error: (error) => {
          message.error(`Failed to parse CSV: ${error.message}`);
          setIsProcessing(false);
          reject(error);
        },
      });
    });
  };

  const filterColumns = (selectedColumns: string[]): string => {
    if (!csvData) return '';

    const filteredData = csvData.data.map((row) => {
      const filteredRow: any = {};
      selectedColumns.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });

    return Papa.unparse(filteredData);
  };

  const reset = () => {
    setCsvData(null);
    setIsProcessing(false);
  };

  return {
    csvData,
    isProcessing,
    processFile,
    filterColumns,
    reset,
  };
};
```

**Benefits:**
- ✅ Eliminates 200+ lines of inline CSV parsing code
- ✅ Reusable across components
- ✅ Testable in isolation
- ✅ Non-blocking with proper loading states

---

### Phase 2: Component Extraction (Critical)

**Goal:** Break down monolithic pages into focused, single-responsibility components

#### 2.1 Reports List Components

**Directory Structure:**
```
frontend/src/features/reports/components/ReportsList/
├── ReportsList.tsx              (Main container - 60 lines)
├── ReportsListItem.tsx          (Single report card - 40 lines)
├── ReportsFilters.tsx           (Filter controls - 80 lines)
└── CreateReportModal.tsx        (Extracted modal - 120 lines)
```

**File:** `frontend/src/features/reports/components/ReportsList/CreateReportModal.tsx`
```typescript
import React from 'react';
import { Modal, Form, Input, Select, InputNumber, Space } from 'antd';
import { useIsMobile } from '../../../../hooks/useMediaQuery';
import { Project } from '../../../../services/projects';
import { CreateReportDto } from '../../types/report.types';

interface CreateReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateReportDto) => void;
  projects: Project[];
  loading?: boolean;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  open,
  onClose,
  onSubmit,
  projects,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const isMobile = useIsMobile();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Create New Report"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={isMobile ? '100%' : 600}
      style={isMobile ? { top: 20, paddingBottom: 0 } : undefined}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {/* Project Select */}
        <Form.Item
          name="projectId"
          label="Project"
          rules={[{ required: true, message: 'Please select a project' }]}
        >
          <Select
            showSearch
            placeholder="Select a project"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.number} - {project.description}
                {project.client && ` (${project.client.company || project.client.name})`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Title */}
        <Form.Item
          name="title"
          label="Report Title"
          rules={[{ required: true, message: 'Please enter title' }]}
        >
          <Input placeholder="e.g., December 2024 Social Media Report" />
        </Form.Item>

        {/* Description */}
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Optional description" />
        </Form.Item>

        {/* Month & Year */}
        <Space
          style={{ width: '100%' }}
          direction={isMobile ? 'vertical' : 'horizontal'}
          size="middle"
        >
          <Form.Item
            name="month"
            label="Month"
            rules={[{ required: true, message: 'Required' }]}
            style={{ width: isMobile ? '100%' : '150px', marginBottom: isMobile ? 0 : undefined }}
          >
            <Select placeholder="Select month">
              {Array.from({ length: 12 }, (_, i) => (
                <Select.Option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="year"
            label="Year"
            rules={[{ required: true, message: 'Required' }]}
            style={{ width: isMobile ? '100%' : '150px', marginBottom: 0 }}
          >
            <InputNumber
              min={2020}
              max={2030}
              placeholder="2024"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};
```

#### 2.2 Report Detail Components

**Directory Structure:**
```
frontend/src/features/reports/components/ReportDetail/
├── ReportDetailHeader.tsx       (Header with actions - 80 lines)
├── ReportMetadata.tsx           (Project, client, period - 40 lines)
├── ReportSectionsList.tsx       (Sections display - 100 lines)
└── ReportActions.tsx            (Status updates, PDF - 60 lines)
```

#### 2.3 Section Components

**Directory Structure:**
```
frontend/src/features/reports/components/ReportSections/
├── SectionCard.tsx              (Single section display - 100 lines)
├── SectionActions.tsx           (Reorder, edit, delete - 50 lines)
├── SectionCharts.tsx            (Chart preview collapse - 60 lines)
└── AddSectionModal/
    ├── AddSectionModal.tsx      (Main modal - 80 lines)
    ├── CSVUploader.tsx          (File upload logic - 60 lines)
    ├── ColumnSelector.tsx       (Already exists ✅)
    └── SampleDataLoader.tsx     (Sample data buttons - 40 lines)
```

**File:** `frontend/src/features/reports/components/ReportSections/AddSectionModal/SampleDataLoader.tsx`
```typescript
import React from 'react';
import { Button, Space, Typography } from 'antd';
import { generateSampleData, dataToCSV } from '../../../../../utils/sample-data-generator';

const { Text } = Typography;

interface SampleDataLoaderProps {
  onLoad: (file: File, title: string, description: string) => void;
}

export const SampleDataLoader: React.FC<SampleDataLoaderProps> = ({ onLoad }) => {
  const loadSample = (type: 'social_media' | 'sales' | 'analytics') => {
    const data = generateSampleData({ type, rows: 30 });
    const csv = dataToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], `sample_${type}.csv`, { type: 'text/csv' });

    const titles = {
      social_media: 'Facebook Ads Performance',
      sales: 'Sales Performance',
      analytics: 'Website Analytics',
    };

    const descriptions = {
      social_media: 'Sample social media advertising data with metrics',
      sales: 'Sample sales data by product and region',
      analytics: 'Sample website traffic and engagement metrics',
    };

    onLoad(file, titles[type], descriptions[type]);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Text strong>Quick Test with Sample Data:</Text>
      <Space wrap>
        <Button size="small" onClick={() => loadSample('social_media')}>
          Load Social Media Sample
        </Button>
        <Button size="small" onClick={() => loadSample('sales')}>
          Load Sales Sample
        </Button>
        <Button size="small" onClick={() => loadSample('analytics')}>
          Load Analytics Sample
        </Button>
      </Space>
    </Space>
  );
};
```

#### 2.4 Chart Editor Components

**Directory Structure:**
```
frontend/src/features/reports/components/ChartEditor/
├── ChartEditorModal.tsx         (Main modal - 100 lines)
├── ChartConfigForm.tsx          (Form logic - 120 lines)
└── ChartPreview.tsx             (Live preview - 80 lines)
```

---

### Phase 3: Service Layer Improvements

**Goal:** Organize services by domain and responsibility

**Directory Structure:**
```
frontend/src/features/reports/services/
├── reportsApi.ts                (API calls - moved from social-media-reports.ts)
├── csvProcessor.ts              (CSV processing utilities)
├── reportTransforms.ts          (Data transformations)
└── reportUtils.ts               (Utility functions)
```

**File:** `frontend/src/features/reports/services/csvProcessor.ts`
```typescript
import Papa from 'papaparse';

export interface ParsedCSV {
  columns: string[];
  data: any[];
  rowCount: number;
}

export class CSVProcessorService {
  /**
   * Parse CSV file from File object
   */
  static async parseFile(file: File): Promise<ParsedCSV> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const columns = Object.keys(results.data[0] as object);
            resolve({
              columns,
              data: results.data,
              rowCount: results.data.length,
            });
          } else {
            reject(new Error('CSV file is empty or invalid'));
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Filter CSV data by selected columns
   */
  static filterColumns(data: any[], selectedColumns: string[]): any[] {
    return data.map((row) => {
      const filteredRow: any = {};
      selectedColumns.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });
  }

  /**
   * Convert data array back to CSV string
   */
  static toCSV(data: any[]): string {
    return Papa.unparse(data);
  }

  /**
   * Create File from CSV string
   */
  static createFileFromCSV(csv: string, filename: string): File {
    const blob = new Blob([csv], { type: 'text/csv' });
    return new File([blob], filename, { type: 'text/csv' });
  }
}
```

**File:** `frontend/src/features/reports/services/reportUtils.ts`
```typescript
import { ReportStatus } from '../types/report.types';

export class ReportUtils {
  /**
   * Get Ant Design color for report status
   */
  static getStatusColor(status: ReportStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'COMPLETED':
        return 'success';
      case 'SENT':
        return 'processing';
      default:
        return 'default';
    }
  }

  /**
   * Format period as localized string
   */
  static formatPeriod(month: number, year: number, locale: string = 'id-ID'): string {
    return new Date(year, month - 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Check if report can be edited
   */
  static canEdit(status: ReportStatus): boolean {
    return status === 'DRAFT' || status === 'COMPLETED';
  }

  /**
   * Check if report can generate PDF
   */
  static canGeneratePDF(sectionsCount: number): boolean {
    return sectionsCount > 0;
  }
}
```

---

### Phase 4: Context Layer (Advanced)

**Goal:** Reduce prop drilling and provide domain-specific state

**File:** `frontend/src/features/reports/contexts/ReportContext.tsx`
```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useReport } from '../hooks/useReport';
import { useReportMutations } from '../hooks/useReportMutations';
import { useSectionMutations } from '../hooks/useSectionMutations';
import { SocialMediaReport, ReportStatus } from '../types/report.types';

interface ReportContextValue {
  // Data
  report: SocialMediaReport | null;
  isLoading: boolean;
  error: Error | null;

  // Report mutations
  updateStatus: (status: ReportStatus) => void;
  generatePDF: () => void;
  deleteReport: () => void;

  // Section mutations
  addSection: (file: File, data: any) => Promise<void>;
  removeSection: (sectionId: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  updateVisualizations: (sectionId: string, data: any) => Promise<void>;

  // Loading states
  isUpdatingStatus: boolean;
  isGeneratingPDF: boolean;
  isAddingSection: boolean;
}

const ReportContext = createContext<ReportContextValue | undefined>(undefined);

export const ReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id!);
  const reportMutations = useReportMutations();
  const sectionMutations = useSectionMutations(id!);

  const value: ReportContextValue = {
    report: report || null,
    isLoading,
    error: error as Error | null,

    updateStatus: (status: ReportStatus) => {
      reportMutations.updateStatus.mutate({ id: id!, status });
    },

    generatePDF: () => {
      reportMutations.generatePDF.mutate(id!);
    },

    deleteReport: () => {
      reportMutations.deleteReport.mutate(id!);
    },

    addSection: async (file: File, data: any) => {
      await sectionMutations.addSection.mutateAsync({ file, data });
    },

    removeSection: async (sectionId: string) => {
      await sectionMutations.removeSection.mutateAsync(sectionId);
    },

    reorderSections: async (sectionIds: string[]) => {
      await sectionMutations.reorderSections.mutateAsync(sectionIds);
    },

    updateVisualizations: async (sectionId: string, data: any) => {
      await sectionMutations.updateVisualizations.mutateAsync({ sectionId, data });
    },

    isUpdatingStatus: reportMutations.updateStatus.isPending,
    isGeneratingPDF: reportMutations.generatePDF.isPending,
    isAddingSection: sectionMutations.addSection.isPending,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

export const useReportContext = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within ReportProvider');
  }
  return context;
};
```

**Usage:**
```typescript
// In App.tsx or router configuration
<Route
  path="/social-media-reports/:id"
  element={
    <ReportProvider>
      <ReportDetailPage />
    </ReportProvider>
  }
/>

// In any child component
const { report, addSection, isAddingSection } = useReportContext();
```

---

### Phase 5: Refactored Pages (Final)

**Goal:** Pages become thin orchestration layers

**File:** `frontend/src/pages/SocialMediaReportsPage.tsx` (50 lines)
```typescript
import React, { useState } from 'react';
import { Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useReports } from '../features/reports/hooks/useReports';
import { useReportMutations } from '../features/reports/hooks/useReportMutations';
import { ReportsList } from '../features/reports/components/ReportsList/ReportsList';
import { CreateReportModal } from '../features/reports/components/ReportsList/CreateReportModal';
import { useProjects } from '../hooks/useProjects'; // Assume this exists

export const SocialMediaReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: reports, isLoading } = useReports();
  const { data: projects } = useProjects();
  const { createReport } = useReportMutations();

  const handleCreate = async (values: any) => {
    const newReport = await createReport.mutateAsync(values);
    setCreateModalOpen(false);
    navigate(`/social-media-reports/${newReport.id}`);
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <Card
        title="Universal Social Media Reports"
        extra={
          !isMobile && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Report
            </Button>
          )
        }
      >
        <ReportsList
          reports={reports || []}
          loading={isLoading}
          onCreateClick={() => setCreateModalOpen(true)}
        />
      </Card>

      <CreateReportModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreate}
        projects={projects || []}
        loading={createReport.isPending}
      />
    </div>
  );
};
```

**File:** `frontend/src/pages/ReportDetailPage.tsx` (80 lines)
```typescript
import React from 'react';
import { Card, Spin, Empty, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ReportProvider, useReportContext } from '../features/reports/contexts/ReportContext';
import { ReportDetailHeader } from '../features/reports/components/ReportDetail/ReportDetailHeader';
import { ReportSectionsList } from '../features/reports/components/ReportDetail/ReportSectionsList';

const ReportDetailContent: React.FC = () => {
  const navigate = useNavigate();
  const { report, isLoading } = useReportContext();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <Empty description="Report not found" />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button onClick={() => navigate('/social-media-reports')}>
            Back to Reports
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <ReportDetailHeader />
      <ReportSectionsList />
    </div>
  );
};

export const ReportDetailPage: React.FC = () => {
  return (
    <ReportProvider>
      <ReportDetailContent />
    </ReportProvider>
  );
};
```

---

## Final Directory Structure

```
frontend/src/
├── pages/
│   ├── SocialMediaReportsPage.tsx       (50 lines - orchestration only)
│   └── ReportDetailPage.tsx             (80 lines - orchestration only)
│
├── features/reports/                    (Feature-based organization)
│   ├── hooks/
│   │   ├── useReports.ts                (Query hook)
│   │   ├── useReport.ts                 (Single report query)
│   │   ├── useReportMutations.ts        (CRUD mutations)
│   │   ├── useSectionMutations.ts       (Section operations)
│   │   └── useCSVProcessor.ts           (CSV processing logic)
│   │
│   ├── components/
│   │   ├── ReportsList/
│   │   │   ├── ReportsList.tsx
│   │   │   ├── ReportsListItem.tsx
│   │   │   ├── ReportsFilters.tsx
│   │   │   └── CreateReportModal.tsx
│   │   │
│   │   ├── ReportDetail/
│   │   │   ├── ReportDetailHeader.tsx
│   │   │   ├── ReportMetadata.tsx
│   │   │   ├── ReportSectionsList.tsx
│   │   │   └── ReportActions.tsx
│   │   │
│   │   ├── ReportSections/
│   │   │   ├── SectionCard.tsx
│   │   │   ├── SectionActions.tsx
│   │   │   ├── SectionCharts.tsx
│   │   │   └── AddSectionModal/
│   │   │       ├── AddSectionModal.tsx
│   │   │       ├── CSVUploader.tsx
│   │   │       ├── ColumnSelector.tsx   (Already exists ✅)
│   │   │       └── SampleDataLoader.tsx
│   │   │
│   │   └── ChartEditor/
│   │       ├── ChartEditorModal.tsx
│   │       ├── ChartConfigForm.tsx
│   │       └── ChartPreview.tsx
│   │
│   ├── contexts/
│   │   └── ReportContext.tsx            (Domain state management)
│   │
│   ├── services/
│   │   ├── reportsApi.ts                (API calls)
│   │   ├── csvProcessor.ts              (CSV utilities)
│   │   ├── reportTransforms.ts          (Data transformations)
│   │   └── reportUtils.ts               (Helper functions)
│   │
│   └── types/
│       └── report.types.ts              (Already exists ✅)
│
└── components/reports/                  (Shared components)
    ├── ChartRenderer.tsx                (Already exists ✅)
    ├── ColumnSelector.tsx               (Move to features/reports)
    ├── VisualChartEditor.tsx            (Already exists ✅)
    └── ChartErrorBoundary.tsx           (Already exists ✅)
```

---

## Implementation Roadmap

### Quick Wins (Week 1)

**Priority 1: Extract Hooks (2-3 days)**
- [ ] Create `useReports` hook with TanStack Query
- [ ] Create `useReport` hook
- [ ] Create `useReportMutations` hook
- [ ] Create `useSectionMutations` hook
- [ ] Create `useCSVProcessor` hook
- [ ] Update SocialMediaReportsPage to use hooks
- [ ] Update ReportDetailPage to use hooks

**Benefits:**
- Immediate performance boost (caching)
- Reduced loading state complexity
- Automatic error handling
- Foundation for further refactoring

**Priority 2: Extract Modals (1-2 days)**
- [ ] Extract `CreateReportModal` from SocialMediaReportsPage
- [ ] Extract `AddSectionModal` from ReportDetailPage
- [ ] Extract `ChartEditorModal` from ReportDetailPage
- [ ] Create `SampleDataLoader` component

**Benefits:**
- Reduces page complexity by 250+ lines
- Improves testability
- Enables modal reusability

### Medium Priority (Week 2-3)

**Priority 3: Service Layer (2-3 days)**
- [ ] Create `csvProcessor.ts` service
- [ ] Create `reportUtils.ts` service
- [ ] Move `social-media-reports.ts` to `reportsApi.ts`
- [ ] Create `reportTransforms.ts` for data transformations

**Priority 4: Component Extraction (3-4 days)**
- [ ] Create `ReportDetailHeader` component
- [ ] Create `ReportMetadata` component
- [ ] Create `ReportSectionsList` component
- [ ] Create `SectionCard` component
- [ ] Create `SectionActions` component
- [ ] Create `ReportsList` component
- [ ] Create `ReportsListItem` component

**Benefits:**
- Single Responsibility Principle
- Easier to maintain and test
- Improved code readability

### Advanced (Week 4)

**Priority 5: Context Layer (2-3 days)**
- [ ] Implement `ReportContext`
- [ ] Create `ReportProvider`
- [ ] Update components to use context
- [ ] Remove prop drilling

**Priority 6: Optimization (2 days)**
- [ ] Add error boundaries around charts
- [ ] Implement optimistic updates
- [ ] Add loading skeletons
- [ ] Performance monitoring

**Priority 7: Testing (3 days)**
- [ ] Unit tests for hooks
- [ ] Integration tests for components
- [ ] E2E tests for critical flows

---

## Migration Strategy

### Incremental Approach (Recommended)

**Phase 1: Hooks (No Breaking Changes)**
1. Create hooks alongside existing code
2. Gradually replace direct service calls
3. Test thoroughly before removing old code

**Phase 2: Components (Parallel Development)**
1. Create new components in `features/` directory
2. Test in isolation with Storybook (optional)
3. Replace old implementations one at a time

**Phase 3: Context (After Components)**
1. Implement context when prop drilling becomes obvious
2. Migrate components to use context incrementally
3. Remove intermediate props

**Phase 4: Cleanup**
1. Remove old code after new code is stable
2. Update imports and references
3. Clean up unused files

### Big Bang Approach (Risky)

**Not recommended** unless:
- You have comprehensive test coverage
- You can afford downtime
- Team is small and communication is easy

---

## Testing Strategy

### Unit Tests

**Hooks Testing:**
```typescript
// useReports.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReports } from './useReports';

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useReports', () => {
  it('should fetch reports successfully', async () => {
    const { result } = renderHook(() => useReports(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

**Component Testing:**
```typescript
// CreateReportModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateReportModal } from './CreateReportModal';

describe('CreateReportModal', () => {
  const mockOnSubmit = jest.fn();
  const mockProjects = [
    { id: '1', number: 'PRJ-001', description: 'Test Project' },
  ];

  it('should render form fields', () => {
    render(
      <CreateReportModal
        open={true}
        onClose={jest.fn()}
        onSubmit={mockOnSubmit}
        projects={mockProjects}
      />
    );

    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Report Title')).toBeInTheDocument();
  });

  it('should call onSubmit with form values', async () => {
    // Test implementation
  });
});
```

### Integration Tests

**Full Flow Testing:**
```typescript
// ReportDetailPage.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportDetailPage } from './ReportDetailPage';

describe('ReportDetailPage Integration', () => {
  it('should load and display report with sections', async () => {
    // Mock API responses
    // Render component
    // Assert data is displayed correctly
  });

  it('should allow adding a new section', async () => {
    // Test full section addition flow
  });
});
```

---

## Performance Optimization

### TanStack Query Configuration

```typescript
// queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Code Splitting

```typescript
// Lazy load report detail page
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'));

// In router
<Route
  path="/social-media-reports/:id"
  element={
    <Suspense fallback={<PageLoader />}>
      <ReportDetailPage />
    </Suspense>
  }
/>
```

### Memoization

```typescript
// Only re-render when report data changes
const SectionCard = React.memo(({ section }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  return prevProps.section.id === nextProps.section.id &&
         prevProps.section.updatedAt === nextProps.section.updatedAt;
});
```

---

## Benefits Summary

### Before Refactoring

| Metric | Value |
|--------|-------|
| SocialMediaReportsPage.tsx | 399 lines |
| ReportDetailPage.tsx | 709 lines |
| Components | 2 pages + 4 shared |
| Loading state management | Manual |
| Caching | None |
| Error handling | Try/catch only |
| Code reusability | Low |
| Test coverage | Difficult |
| Prop drilling | Severe |

### After Refactoring

| Metric | Value |
|--------|-------|
| SocialMediaReportsPage.tsx | 50 lines |
| ReportDetailPage.tsx | 80 lines |
| Components | 20+ focused components |
| Loading state management | Automatic (TanStack Query) |
| Caching | Automatic with configurable stale time |
| Error handling | Centralized + Error boundaries |
| Code reusability | High |
| Test coverage | Easy to test in isolation |
| Prop drilling | Eliminated with Context |

### Key Improvements

1. **70% reduction** in page component size
2. **Automatic caching** - No redundant API calls
3. **Better UX** - Optimistic updates, background refetching
4. **Maintainability** - Single Responsibility Principle
5. **Testability** - Isolated, mockable units
6. **Developer Experience** - Clear separation of concerns
7. **Performance** - Code splitting, memoization
8. **Error Resilience** - Error boundaries, retry logic

---

## Risk Mitigation

### Potential Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Incremental migration, thorough testing |
| Team learning curve | Medium | Documentation, pair programming |
| Increased bundle size | Low | Code splitting, tree shaking |
| Over-engineering | Medium | Start simple, add complexity as needed |
| Migration time | Medium | Phased approach, prioritize high-impact changes |

### Rollback Strategy

1. Keep old code in place during migration
2. Use feature flags for gradual rollout
3. Monitor error rates and performance metrics
4. Maintain backward compatibility during transition

---

## Success Metrics

### Code Quality Metrics

- [ ] Average component size < 150 lines
- [ ] Test coverage > 80%
- [ ] Zero prop drilling beyond 2 levels
- [ ] All API calls use TanStack Query
- [ ] All CSV processing extracted to services

### Performance Metrics

- [ ] Page load time < 1s (cached)
- [ ] API call deduplication = 100%
- [ ] Bundle size increase < 5%
- [ ] Lighthouse performance score > 90

### Developer Experience Metrics

- [ ] Time to add new feature reduced by 50%
- [ ] Code review time reduced by 30%
- [ ] Bug reports decreased by 40%
- [ ] New developer onboarding time reduced

---

## Conclusion

This refactoring plan transforms the social media reporting system from a monolithic structure to a modern, maintainable architecture following 2025 React best practices. The phased approach ensures minimal risk while delivering immediate benefits through custom hooks and TanStack Query integration.

**Recommended First Steps:**
1. Start with Phase 1 (Extract Hooks) - High impact, low risk
2. Extract modals to reduce page complexity immediately
3. Gradually extract components as you touch related code
4. Add Context layer when prop drilling becomes obvious

**Timeline Estimate:**
- Quick Wins (Phase 1-2): 1 week
- Medium Priority (Phase 3-4): 2 weeks
- Advanced (Phase 5-7): 1 week
- **Total: 4 weeks** for complete refactoring

**Next Action:**
Choose your preferred starting point and I'll help implement the first phase!
