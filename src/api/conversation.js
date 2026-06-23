import { apiRequest } from './apiClient'

export async function askRunQuestion(runId, question, history = []) {
  return apiRequest(`/api/runs/${runId}/chat`, {
    method: 'POST',
    body: {
      question,
      history: history
        .filter((item) => item?.role && item?.text)
        .slice(-8)
        .map((item) => ({ role: item.role, text: item.text })),
    },
    auth: true,
  })
}

export async function fetchRunChatHistory(runId) {
  return apiRequest(`/api/runs/${runId}/chat/history`, { auth: true })
}

export async function appendRunChatMessage(runId, body) {
  return apiRequest(`/api/runs/${runId}/chat/messages`, {
    method: 'POST',
    body,
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

export async function selectRunInsights(runId, insights) {
  return apiRequest(`/api/runs/${runId}/insights/select/batch`, {
    method: 'POST',
    body: { insights },
    auth: true,
  })
}

export async function fetchConversationDashboard(runId) {
  const suffix = runId ? `?run_id=${encodeURIComponent(runId)}` : ''
  return apiRequest(`/api/conversation-dashboard${suffix}`, { auth: true })
}
