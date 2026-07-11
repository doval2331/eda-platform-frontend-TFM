import { useCallback, useEffect, useMemo, useState } from 'react'
import { AUTH_EXPIRED_EVENT } from '@/api/apiClient'
import * as authApi from '@/api/auth'
import { AUTH_STORAGE_KEY, AuthContext } from './authContextValue'

function readStoredAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const stored = readStoredAuth()
    return {
      token: stored?.token ?? '',
      user: stored?.user ?? null,
    }
  })
  const { token, user } = authState

  useEffect(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  const persist = useCallback((nextToken, nextUser) => {
    sessionStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser }),
    )
    setAuthState({ token: nextToken, user: nextUser })
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthState({ token: '', user: null })
  }, [])

  useEffect(() => {
    const onAuthExpired = () => {
      logout()
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [logout])

  const loginWithCredentials = useCallback(async (email, password) => {
    const response = await authApi.login(email, password)
    persist(response.token, response.user)
    return response.user
  }, [persist])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loginWithCredentials,
      logout,
    }),
    [loginWithCredentials, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
