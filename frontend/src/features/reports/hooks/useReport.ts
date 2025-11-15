import { useQuery } from '@tanstack/react-query';
import { socialMediaReportsService } from '../../../services/social-media-reports';

/**
 * Hook to fetch a single social media report by ID
 * Uses TanStack Query for automatic caching
 *
 * @param id - The report ID to fetch
 * @returns Query result with report data, loading state, and error state
 *
 * @example
 * const { id } = useParams();
 * const { data: report, isLoading } = useReport(id);
 */
export const useReport = (id: string | undefined) => {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => socialMediaReportsService.getReport(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
