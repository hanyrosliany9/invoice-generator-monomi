import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { socialMediaReportsService } from '../../../services/social-media-reports';
import type { AddSectionDto, UpdateVisualizationsDto } from '../types/report.types';

/**
 * Hook for section mutations (add, remove, reorder, update visualizations)
 * Scoped to a specific report ID
 */
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
    // Optimistic update for instant UI feedback
    onMutate: async (sectionIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['report', reportId] });

      // Snapshot previous value
      const previousReport = queryClient.getQueryData(['report', reportId]);

      // Optimistically update cache
      queryClient.setQueryData(['report', reportId], (old: any) => {
        if (!old?.sections) return old;

        const sectionsMap = new Map(old.sections.map((s: any) => [s.id, s]));
        const reorderedSections = sectionIds.map((id, index) => {
          const section = sectionsMap.get(id);
          return section ? { ...section, order: index + 1 } : null;
        }).filter(Boolean);

        return {
          ...old,
          sections: reorderedSections,
        };
      });

      return { previousReport };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousReport) {
        queryClient.setQueryData(['report', reportId], context.previousReport);
      }
      message.error('Failed to reorder sections');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
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
