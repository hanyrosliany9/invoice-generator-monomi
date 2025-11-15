import { useQuery } from '@tanstack/react-query';
import { socialMediaReportsService } from '../../../services/social-media-reports';
import type { ReportStatus } from '../types/report.types';

interface ReportFilters {
  projectId?: string;
  year?: number;
  month?: number;
  status?: ReportStatus;
}

/**
 * Hook to fetch all social media reports with optional filters
 * Uses TanStack Query for automatic caching and background refetching
 *
 * @param filters - Optional filters for project, year, month, and status
 * @returns Query result with reports data, loading state, and error state
 *
 * @example
 * // Fetch all reports
 * const { data: reports, isLoading } = useReports();
 *
 * @example
 * // Fetch reports with filters
 * const { data: reports } = useReports({ year: 2024, status: 'COMPLETED' });
 */
export const useReports = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => socialMediaReportsService.getReports(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
