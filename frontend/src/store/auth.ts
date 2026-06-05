import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryClient } from '../lib/queryClient'
import { useMediaTokenStore } from '../stores/mediaTokenStore'

export interface User {
  id: string
  email: string
  name: string
  role: string
}

interface TokenData {
  accessToken: string
  // Hardening 2: refreshToken is no longer persisted to localStorage (XSS risk).
  // The httpOnly cookie carries it for browser refresh flows.
  // We keep the field optional so existing serialised stores deserialise cleanly.
  refreshToken?: string
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
        // Clear TanStack Query cache so prior user's PII/financial data is
        // never served to the next user who logs in on the same browser session.
        queryClient.clear()
        // Clear the signed media JWT so the next user on this browser cannot
        // reuse a token issued for the previous session.
        useMediaTokenStore.getState().clearToken()
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
      // Hardening 2: strip refreshToken from localStorage persistence.
      // The httpOnly cookie is the authoritative refresh token store;
      // removing it from JS-accessible storage eliminates the XSS prize.
      // accessToken is still stored so the Bearer header can be set on
      // page reload before the first cookie-based refresh fires.
      partialize: state => ({
        user: state.user,
        tokenData: state.tokenData
          ? { accessToken: state.tokenData.accessToken, expiresAt: state.tokenData.expiresAt }
          : null,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
