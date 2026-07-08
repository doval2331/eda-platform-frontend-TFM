import { apiRequest } from './apiClient'

function appendPipelineTuning(body, pipelineTuning = {}) {
  const tuning = pipelineTuning ?? {}
  if (tuning.umapNNeighbors != null) body.umap_n_neighbors = tuning.umapNNeighbors
  if (tuning.umapMinDist != null) body.umap_min_dist = tuning.umapMinDist
  if (tuning.hdbscanMinClusterSize != null) {
    body.hdbscan_min_cluster_size = tuning.hdbscanMinClusterSize
  }
  if (tuning.hdbscanMinSamples != null) {
    body.hdbscan_min_samples = tuning.hdbscanMinSamples
  }
  if (tuning.dbscanEps != null) body.dbscan_eps = tuning.dbscanEps
}

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
  pipelineTuning,
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
  appendPipelineTuning(body, pipelineTuning)

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
  const base = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')
  const response = await fetch(`${base}/health`, { cache: 'no-store' })
  return response.ok
}
