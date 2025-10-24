import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  milestonesService,
  ProjectMilestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from '../services/milestones'

const MILESTONES_QUERY_KEYS = {
  all: ['milestones'],
  byProject: (projectId: string) => ['milestones', 'project', projectId],
  byId: (id: string) => ['milestones', id],
  dependencies: (id: string) => ['milestones', id, 'dependencies'],
} as const

// Get all milestones for a project
export const useProjectMilestones = (projectId: string) => {
  return useQuery({
    queryKey: MILESTONES_QUERY_KEYS.byProject(projectId),
    queryFn: () => milestonesService.getProjectMilestones(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get single milestone
export const useMilestone = (id: string) => {
  return useQuery({
    queryKey: MILESTONES_QUERY_KEYS.byId(id),
    queryFn: () => milestonesService.getMilestone(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// Check milestone dependencies
export const useMilestoneDependencies = (id: string) => {
  return useQuery({
    queryKey: MILESTONES_QUERY_KEYS.dependencies(id),
    queryFn: () => milestonesService.checkDependencies(id),
    enabled: !!id,
  })
}

// Create milestone mutation
export const useCreateMilestone = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMilestoneRequest) => milestonesService.createMilestone(data),
    onSuccess: (data) => {
      // Invalidate project milestones query
      queryClient.invalidateQueries({
        queryKey: MILESTONES_QUERY_KEYS.byProject(data.projectId),
      })
      // Add to cache
      queryClient.setQueryData(MILESTONES_QUERY_KEYS.byId(data.id), data)
    },
  })
}

// Update milestone mutation
export const useUpdateMilestone = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMilestoneRequest }) =>
      milestonesService.updateMilestone(id, data),
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(MILESTONES_QUERY_KEYS.byId(data.id), data)
      // Invalidate project milestones
      queryClient.invalidateQueries({
        queryKey: MILESTONES_QUERY_KEYS.byProject(data.projectId),
      })
    },
  })
}

// Delete milestone mutation
export const useDeleteMilestone = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      milestonesService.deleteMilestone(id),
    onSuccess: (_, { projectId }) => {
      // Invalidate project milestones query
      queryClient.invalidateQueries({
        queryKey: MILESTONES_QUERY_KEYS.byProject(projectId),
      })
    },
  })
}

// Update progress mutation
export const useUpdateMilestoneProgress = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, percentage }: { id: string; percentage: number }) =>
      milestonesService.updateMilestoneProgress(id, percentage),
    onSuccess: (data) => {
      queryClient.setQueryData(MILESTONES_QUERY_KEYS.byId(data.id), data)
      queryClient.invalidateQueries({
        queryKey: MILESTONES_QUERY_KEYS.byProject(data.projectId),
      })
    },
  })
}

// Complete milestone mutation
export const useCompleteMilestone = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => milestonesService.completeMilestone(id),
    onSuccess: (data) => {
      queryClient.setQueryData(MILESTONES_QUERY_KEYS.byId(data.id), data)
      queryClient.invalidateQueries({
        queryKey: MILESTONES_QUERY_KEYS.byProject(data.projectId),
      })
    },
  })
}
