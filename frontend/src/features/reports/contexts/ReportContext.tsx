import React, { createContext, useContext, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useReport } from '../hooks/useReport';
import { useReportMutations } from '../hooks/useReportMutations';
import { useSectionMutations } from '../hooks/useSectionMutations';
import { captureSnapshotSafe } from '../../../utils/pdfSnapshot';
import type { SocialMediaReport, ReportStatus, AddSectionDto, UpdateVisualizationsDto } from '../types/report.types';

interface ReportContextValue {
  // Data
  report: SocialMediaReport | null;
  reportId: string | undefined;
  isLoading: boolean;
  error: Error | null;

  // Report mutations
  updateStatus: (status: ReportStatus) => Promise<void>;
  generatePDF: (sectionId?: string) => Promise<void>;
  deleteReport: () => Promise<void>;

  // Section mutations
  addSection: (file: File, data: AddSectionDto, selectedColumns: string[]) => Promise<void>;
  removeSection: (sectionId: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;
  updateVisualizations: (sectionId: string, data: UpdateVisualizationsDto) => Promise<void>;

  // Loading states
  isUpdatingStatus: boolean;
  isGeneratingPDF: boolean;
  isAddingSection: boolean;
  isRemovingSection: boolean;
  isReorderingSections: boolean;
  isUpdatingVisualizations: boolean;
}

const ReportContext = createContext<ReportContextValue | undefined>(undefined);

interface ReportProviderProps {
  children: ReactNode;
}

/**
 * Provider for report context
 * Provides report data and mutation functions to all child components
 * Eliminates prop drilling for report-related operations
 *
 * @example
 * <ReportProvider>
 *   <ReportDetailPage />
 * </ReportProvider>
 */
export const ReportProvider: React.FC<ReportProviderProps> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id);
  const reportMutations = useReportMutations();
  const sectionMutations = useSectionMutations(id!);

  // Helper to process CSV filtering
  const processCSVFiltering = async (
    file: File,
    selectedColumns: string[]
  ): Promise<File> => {
    const Papa = await import('papaparse');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const parseResult = Papa.parse(csvText, { header: true });

        const filteredData = parseResult.data.map((row: any) => {
          const filteredRow: any = {};
          selectedColumns.forEach((col) => {
            filteredRow[col] = row[col];
          });
          return filteredRow;
        });

        const csv = Papa.unparse(filteredData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const filteredFile = new File([blob], file.name, { type: 'text/csv' });
        resolve(filteredFile);
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const value: ReportContextValue = {
    // Data
    report: report || null,
    reportId: id,
    isLoading,
    error: error as Error | null,

    // Report mutations
    updateStatus: async (status: ReportStatus) => {
      if (!id) return;
      await reportMutations.updateStatus.mutateAsync({ id, status });
    },

    generatePDF: async (sectionId?: string) => {
      if (!id) return;

      // ✅ NEW: Server-side rendering from data (RELIABLE)
      if (sectionId) {
        console.log('✅ Generating PDF from visual builder data (server-side template mode)');
        await reportMutations.generatePDF.mutateAsync({ id, sectionId });
      }
      // Legacy: Try snapshot capture (for backward compatibility)
      else {
        const snapshot = await captureSnapshotSafe();
        if (snapshot) {
          console.log('📊 Generating PDF from HTML snapshot (legacy mode)');
          await reportMutations.generatePDF.mutateAsync({ id, snapshot });
        } else {
          console.log('📊 Generating full report PDF (fallback mode)');
          await reportMutations.generatePDF.mutateAsync({ id });
        }
      }
    },

    deleteReport: async () => {
      if (!id) return;
      await reportMutations.deleteReport.mutateAsync(id);
    },

    // Section mutations
    addSection: async (file: File, data: AddSectionDto, selectedColumns: string[]) => {
      const filteredFile = await processCSVFiltering(file, selectedColumns);
      await sectionMutations.addSection.mutateAsync({
        file: filteredFile,
        data,
      });
    },

    removeSection: async (sectionId: string) => {
      await sectionMutations.removeSection.mutateAsync(sectionId);
    },

    reorderSections: async (sectionIds: string[]) => {
      await sectionMutations.reorderSections.mutateAsync(sectionIds);
    },

    updateVisualizations: async (sectionId: string, data: UpdateVisualizationsDto) => {
      await sectionMutations.updateVisualizations.mutateAsync({ sectionId, data });
    },

    // Loading states
    isUpdatingStatus: reportMutations.updateStatus.isPending,
    isGeneratingPDF: reportMutations.generatePDF.isPending,
    isAddingSection: sectionMutations.addSection.isPending,
    isRemovingSection: sectionMutations.removeSection.isPending,
    isReorderingSections: sectionMutations.reorderSections.isPending,
    isUpdatingVisualizations: sectionMutations.updateVisualizations.isPending,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};

/**
 * Hook to access report context
 * Must be used within ReportProvider
 *
 * @throws Error if used outside ReportProvider
 * @returns ReportContextValue with report data and mutation functions
 *
 * @example
 * const { report, addSection, isAddingSection } = useReportContext();
 */
export const useReportContext = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within ReportProvider');
  }
  return context;
};
