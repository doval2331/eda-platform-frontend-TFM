import { apiRequest } from './apiClient'

const DEFAULT_STRATEGY_BODY = {
  sample_size: 30,
  sample_criteria: 'priority',
  model_name: 'auto',
}

const DEFAULT_INTERPRETATION_BODY = {
  sample_size: 30,
  sample_criteria: 'priority',
  random_state: 42,
  model_name: 'auto',
}

export async function runAgentStrategy(runId, body = {}) {
  return apiRequest(`/api/runs/${runId}/agents/strategy`, {
    method: 'POST',
    body: { ...DEFAULT_STRATEGY_BODY, ...body },
    auth: true,
  })
}

export async function runAgentInterpretation(runId, body = {}) {
  return apiRequest(`/api/runs/${runId}/agents/interpretation`, {
    method: 'POST',
    body: { ...DEFAULT_INTERPRETATION_BODY, ...body },
    auth: true,
  })
}

export async function fetchAgentResults(runId) {
  return apiRequest(`/api/runs/${runId}/agents/results`, { auth: true })
}

export async function fetchAgentTraces(runId) {
  return apiRequest(`/api/runs/${runId}/agents/traces`, { auth: true })
}
