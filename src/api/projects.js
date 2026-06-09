import { apiRequest } from './apiClient'
import { validateCsvUploadFile } from '../utils/csvUpload'

export async function createProject({ name, description = '', strategy = 'per_source' }) {
  return apiRequest('/api/projects', {
    method: 'POST',
    body: { name, description, strategy },
    auth: true,
  })
}

export async function listProjects(limit = 50) {
  return apiRequest(`/api/projects?limit=${limit}`, { auth: true })
}

export async function fetchProject(projectId) {
  return apiRequest(`/api/projects/${projectId}`, { auth: true })
}

export async function updateProject(projectId, patch) {
  return apiRequest(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: patch,
    auth: true,
  })
}

export async function uploadProjectSource(projectId, sourceType, file) {
  const isCsv = ['incidents', 'change_mgmt', 'software', 'hardware'].includes(sourceType)
  if (isCsv) {
    const validation = validateCsvUploadFile(file)
    if (!validation.ok) {
      throw new Error(validation.message)
    }
  }

  const form = new FormData()
  form.append('file', file)
  const query = new URLSearchParams({ source_type: sourceType })
  return apiRequest(`/api/projects/${projectId}/sources?${query}`, {
    method: 'POST',
    body: form,
    auth: true,
  })
}

export async function removeProjectSource(projectId, sourceId) {
  return apiRequest(`/api/projects/${projectId}/sources/${sourceId}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function executeProjectRuns(projectId, options = {}) {
  const body = {
    reduction_method: options.reductionMethod ?? 'UMAP',
  }
  if (options.seed != null) body.seed = options.seed
  if (options.nSamples != null) body.n_samples = options.nSamples
  if (options.idColumn) body.id_column = options.idColumn

  return apiRequest(`/api/projects/${projectId}/runs`, {
    method: 'POST',
    body,
    auth: true,
  })
}
