import { apiRequest, getStoredToken } from './apiClient'
import { validateCsvUploadFile } from '@/utils/csvUpload'

/**
 * Sube una fuente tabular y devuelve el perfil de columnas inferido.
 * @param {File} file
 */
export async function uploadDataset(file) {
  const validation = validateCsvUploadFile(file)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const form = new FormData()
  form.append('file', file)
  return apiRequest('/api/datasets/upload', {
    method: 'POST',
    body: form,
    auth: true,
  })
}

export async function fetchDatasetProfile(datasetId) {
  return apiRequest(`/api/datasets/${datasetId}`, { auth: true })
}

export async function fetchDatasetExploreProfile(datasetId) {
  return apiRequest(`/api/datasets/${datasetId}/explore-profile`, { auth: true })
}

export async function fetchDatasetFullProfile(datasetId) {
  return apiRequest(`/api/datasets/${datasetId}/full-profile`, { auth: true })
}

export function datasetProfileReportUrl(datasetId) {
  const base = import.meta.env.VITE_API_BASE ?? ''
  return `${base}/api/datasets/${datasetId}/profile-report`
}

export async function downloadDatasetProfileReport(datasetId) {
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')
  const token = getStoredToken()
  const response = await fetch(`${base}/api/datasets/${datasetId}/profile-report`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const text = await response.text()
    let detail = text
    try {
      detail = JSON.parse(text)?.detail ?? text
    } catch {
      /* keep text */
    }
    throw new Error(typeof detail === 'string' ? detail : 'No se pudo generar el informe')
  }
  const html = await response.text()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
