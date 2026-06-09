import { apiRequest } from './apiClient'


export async function executePipeline({
  modality,
  reductionMethod,
  seed,
  nSamples,
  datasetId,
  idColumn,
  projectName,
  sourceType,
  excludeColumns,
  numericColumns,
  categoricalColumns,
}) {
  const body = {
    modality,
    reduction_method: reductionMethod,
  }
  if (seed != null) body.seed = seed
  if (nSamples != null) body.n_samples = nSamples
  if (datasetId) body.dataset_id = datasetId
  if (idColumn) body.id_column = idColumn
  if (projectName) body.project_name = projectName
  if (sourceType) body.source_type = sourceType
  if (excludeColumns?.length) body.exclude_columns = excludeColumns
  if (numericColumns?.length) body.numeric_columns = numericColumns
  if (categoricalColumns?.length) body.categorical_columns = categoricalColumns

  const run = await apiRequest('/api/runs', {
    method: 'POST',
    body,
    auth: true,
  })

  return { run, result: run.result }
}

export async function listRuns(limit = 50) {
  return apiRequest(`/api/runs?limit=${limit}`, { auth: true })
}

export async function clearAllRuns() {
  return apiRequest('/api/runs', { method: 'DELETE', auth: true })
}

export async function deleteRun(runId) {
  return apiRequest(`/api/runs/${runId}`, { method: 'DELETE', auth: true })
}

export async function fetchRun(runId) {
  return apiRequest(`/api/runs/${runId}`, { auth: true })
}

export async function checkApiHealth() {
  const response = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/health`)
  return response.ok
}
