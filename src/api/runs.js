import { apiRequest } from './apiClient'

export async function fetchClusterProfiles(runId) {
  return apiRequest(`/api/runs/${runId}/cluster-profiles`, { auth: true })
}
