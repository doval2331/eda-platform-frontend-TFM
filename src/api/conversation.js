import { apiRequest } from './apiClient'

export async function askRunQuestion(runId, question) {
  return apiRequest(`/api/runs/${runId}/chat`, {
    method: 'POST',
    body: { question },
    auth: true,
  })
}

export async function fetchRunSuggestedQuestions(runId) {
  return apiRequest(`/api/runs/${runId}/chat/suggestions`, { auth: true })
}

export async function selectRunInsight(runId, insight) {
  return apiRequest(`/api/runs/${runId}/insights/select`, {
    method: 'POST',
    body: { insight },
    auth: true,
  })
}

export async function fetchConversationDashboard(runId) {
  const suffix = runId ? `?run_id=${encodeURIComponent(runId)}` : ''
  return apiRequest(`/api/conversation-dashboard${suffix}`, { auth: true })
}
