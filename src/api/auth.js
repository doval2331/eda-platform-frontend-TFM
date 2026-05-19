import { apiRequest } from './apiClient'

export async function login(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function fetchMe(token) {
  return apiRequest('/api/auth/me', { token })
}
