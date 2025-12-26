import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../config/api'
import { Project } from '../services/projects'

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/projects')
      return response?.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
  })
}

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${id}`)
      return response?.data?.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
