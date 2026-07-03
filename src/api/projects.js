import { ApiHttpError, apiRequest, getStoredToken } from './apiClient'
import { validateProjectSourceFile } from '@/utils/csvUpload'

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function parseJsonResponse(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

function uploadFormData(path, form, { onUploadProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}${path}`)
    const token = getStoredToken()
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    xhr.upload.onprogress = (event) => {
      if (!onUploadProgress) return
      onUploadProgress({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : null,
        percent:
          event.lengthComputable && event.total
            ? Math.round((event.loaded / event.total) * 100)
            : null,
      })
    }
    xhr.onload = () => {
      const data = parseJsonResponse(xhr.responseText)
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = data?.detail
        const message =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((e) => e.msg ?? JSON.stringify(e)).join('; ')
              : `Error del servidor (${xhr.status})`
        reject(new ApiHttpError(xhr.status, message, data))
        return
      }
      resolve(data)
    }
    xhr.onerror = () => reject(new Error('No se pudo subir el archivo'))
    xhr.onabort = () => reject(new Error('Carga cancelada'))
    xhr.send(form)
  })
}

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

export async function uploadProjectSource(
  projectId,
  sourceType,
  file,
  sourceName = '',
  options = {},
) {
  const validation = validateProjectSourceFile(file, sourceType)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const form = new FormData()
  form.append('file', file)
  if (sourceName.trim()) {
    form.append('source_name', sourceName.trim())
  }
  const query = new URLSearchParams({ source_type: sourceType })
  return uploadFormData(`/api/projects/${projectId}/sources?${query}`, form, options)
}

export async function fetchProjectSourceUploadJob(projectId, jobId) {
  return apiRequest(`/api/projects/${projectId}/sources/jobs/${jobId}`, { auth: true })
}

export async function waitForProjectSourceUploadJob(
  projectId,
  jobId,
  { intervalMs = 1500, timeoutMs = 20 * 60 * 1000, onUpdate } = {},
) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const job = await fetchProjectSourceUploadJob(projectId, jobId)
    onUpdate?.(job)
    if (job.status === 'completed') return job
    if (job.status === 'failed') {
      throw new Error(job.error || job.message || 'No se pudo procesar la fuente')
    }
    await delay(intervalMs)
  }
  throw new Error('La carga sigue procesando luego del tiempo máximo de espera.')
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
