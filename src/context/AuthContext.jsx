import { createContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'

export const AUTH_STORAGE_KEY = 'eda_auth'

export const AuthContext = createContext({
  token: '',
  user: null,
  isAuthenticated: false,
  loginWithCredentials: async () => ({}),
  logout: () => {},
})

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = readStoredAuth()
    if (stored) {
      setToken(stored.token)
      setUser(stored.user)
    }
  }, [])

  const persist = (nextToken, nextUser) => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser }),
    )
    setToken(nextToken)
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setToken('')
    setUser(null)
  }

  const loginWithCredentials = async (email, password) => {
    const response = await authApi.login(email, password)
    persist(response.token, response.user)
    return response.user
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      loginWithCredentials,
      logout,
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
