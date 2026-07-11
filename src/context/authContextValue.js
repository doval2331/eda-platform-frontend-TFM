import { createContext } from 'react'

export const AUTH_STORAGE_KEY = 'eda_auth'

export const AuthContext = createContext({
  token: '',
  user: null,
  isAuthenticated: false,
  loginWithCredentials: async () => ({}),
  logout: () => {},
})
