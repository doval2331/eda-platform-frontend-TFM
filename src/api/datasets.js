import { apiRequest } from './apiClient'
import { validateCsvUploadFile } from '../utils/csvUpload'

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
