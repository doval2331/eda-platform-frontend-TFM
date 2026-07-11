import { ApiHttpError, apiRequest } from './apiClient'

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

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

function buildPipelineBody({
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
  return body
}

export async function fetchRunJob(jobId) {
  return apiRequest(`/api/runs/jobs/${jobId}`, { auth: true })
}

export async function waitForRunJob(
  jobId,
  { intervalMs = 1500, timeoutMs = 30 * 60 * 1000, onProgress } = {},
) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const job = await fetchRunJob(jobId)
    onProgress?.(job)
    if (job.status === 'completed') return job
    if (job.status === 'failed') {
      throw new Error(job.error || job.message || 'No se pudo completar el analisis')
    }
    await delay(intervalMs)
  }
  throw new Error('El analisis sigue procesando luego del tiempo maximo de espera.')
}

async function executePipelineSync(body) {
  const run = await apiRequest('/api/runs', {
    method: 'POST',
    body,
    auth: true,
  })
  return { run, result: run.result }
}

export async function executePipeline(options) {
  const body = buildPipelineBody(options)
  try {
    const job = await apiRequest('/api/runs/jobs', {
      method: 'POST',
      body,
      auth: true,
    })
    options.onProgress?.(job)
    const completed = await waitForRunJob(job.job_id, { onProgress: options.onProgress })
    const run = completed.result
    return { run, result: run?.result }
  } catch (err) {
    if (err instanceof ApiHttpError && err.status === 404) {
      return executePipelineSync(body)
    }
    throw err
  }
}

export async function listRuns(limit = 50) {
  return apiRequest(`/api/runs?limit=${limit}`, { auth: true, timeoutMs: 20_000 })
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
