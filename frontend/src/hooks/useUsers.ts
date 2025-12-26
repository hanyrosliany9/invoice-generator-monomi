import { useQuery } from '@tanstack/react-query'
import { usersService } from '../services/users'
import { User, UserFilters } from '../types/user'

/**
 * Hook to fetch all users
 * Used for assignee/attendee dropdowns in calendar events
 */
export const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => usersService.getUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch a single user by ID
 */
export const useUser = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => (userId ? usersService.getUserById(userId) : null),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  })
}

/**
 * Hook to fetch active users only (for event assignment)
 */
export const useActiveUsers = () => {
  return useQuery({
    queryKey: ['users', { isActive: true }],
    queryFn: () => usersService.getUsers({ isActive: true }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to search users by name or email
 */
export const useSearchUsers = (query: string, filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', 'search', query, filters],
    queryFn: async () => {
      const users = await usersService.getUsers(filters)
      return usersService.searchUsers(users, query)
    },
    enabled: !!query,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
