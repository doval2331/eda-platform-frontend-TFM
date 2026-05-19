import { apiRequest } from './apiClient'

/**
 * Sube un CSV y devuelve el perfil de columnas inferido.
 * @param {File} file
 */
export async function uploadDataset(file) {
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
