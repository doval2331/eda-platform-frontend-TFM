import { apiRequest } from './apiClient'

export async function fetchMetabaseStatus() {
  return apiRequest('/api/metabase/status', { auth: true })
}

export async function syncBiTables(runId) {
  const path = runId ? `/api/runs/${runId}/bi-sync` : '/api/bi-sync'
  return apiRequest(path, { method: 'POST', auth: true })
}

export async function createMetabaseDashboard() {
  return apiRequest('/api/metabase/dashboard', { method: 'POST', auth: true })
}

export async function fetchMetabaseEmbedToken(runId) {
  const query = runId ? `?run_id=${encodeURIComponent(runId)}` : ''
  return apiRequest(`/api/metabase/embed-token${query}`, { auth: true })
}
