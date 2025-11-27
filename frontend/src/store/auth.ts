import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number // Timestamp when access token expires
}

interface AuthState {
  user: User | null
  tokenData: TokenData | null
  isAuthenticated: boolean

  // Actions
  login: (user: User, accessToken: string, refreshToken: string, expiresIn: number) => void
  logout: () => void
  updateTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void
  updateUser: (user: Partial<User>) => void

  // Helpers
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  isTokenExpired: () => boolean
  isTokenExpiringSoon: () => boolean // < 2 minutes remaining
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokenData: null,
      isAuthenticated: false,

      login: (user: User, accessToken: string, refreshToken: string, expiresIn: number) => {
        const expiresAt = Date.now() + (expiresIn * 1000);
        set({
          user,
          tokenData: { accessToken, refreshToken, expiresAt },
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          user: null,
          tokenData: null,
          isAuthenticated: false,
        })
      },

      updateTokens: (accessToken: string, refreshToken: string, expiresIn: number) => {
        const expiresAt = Date.now() + (expiresIn * 1000);
        set(state => ({
          tokenData: { accessToken, refreshToken, expiresAt },
        }))
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      getAccessToken: () => {
        return get().tokenData?.accessToken || null
      },

      getRefreshToken: () => {
        return get().tokenData?.refreshToken || null
      },

      isTokenExpired: () => {
        const tokenData = get().tokenData
        if (!tokenData) return true
        return Date.now() >= tokenData.expiresAt
      },

      isTokenExpiringSoon: () => {
        const tokenData = get().tokenData
        if (!tokenData) return true
        const twoMinutes = 2 * 60 * 1000
        return Date.now() >= (tokenData.expiresAt - twoMinutes)
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        tokenData: state.tokenData,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
