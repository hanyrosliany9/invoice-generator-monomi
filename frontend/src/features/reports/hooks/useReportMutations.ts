import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { socialMediaReportsService } from '../../../services/social-media-reports';
import type { CreateReportDto, ReportStatus } from '../types/report.types';

/**
 * Hook for report mutations (create, update status, delete, generate PDF)
 * Handles cache invalidation and user feedback automatically
 *
 * @returns Object containing mutation functions
 * @property {Mutation} createReport - Create a new report
 * @property {Mutation} updateStatus - Update report status (DRAFT → COMPLETED → SENT)
 * @property {Mutation} deleteReport - Delete a report
 * @property {Mutation} generatePDF - Generate PDF for a report
 *
 * @example
 * const { createReport, updateStatus, deleteReport } = useReportMutations();
 *
 * // Create report
 * const newReport = await createReport.mutateAsync(data);
 *
 * // Update status
 * await updateStatus.mutateAsync({ id, status: 'COMPLETED' });
 *
 * // Delete report
 * await deleteReport.mutateAsync(id);
 */
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
    mutationFn: ({ id, sectionId, snapshot }: { id: string; sectionId?: string; snapshot?: any }) =>
      socialMediaReportsService.generatePDF(id, { sectionId, snapshot }),
    onSuccess: (_, { id }) => {
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
