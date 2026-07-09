import { apiRequest } from './apiClient'

const CHAT_QUESTION_MAX_CHARS = 4800
const CHAT_DISPLAY_MAX_CHARS = 1100
const CHAT_HISTORY_MAX_CHARS = 1800

function limitChatPayloadText(value, max) {
  const text = String(value || '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 3))}...`
}

export async function askRunQuestion(runId, question, history = [], options = {}) {
  const safeQuestion = limitChatPayloadText(question, CHAT_QUESTION_MAX_CHARS)
  const safeDisplayQuestion = limitChatPayloadText(
    options.displayQuestion || question,
    CHAT_DISPLAY_MAX_CHARS,
  )

  return apiRequest(`/api/runs/${runId}/chat`, {
    method: 'POST',
    body: {
      question: safeQuestion,
      display_question: safeDisplayQuestion,
      history: history
        .filter((item) => item?.role && item?.text)
        .slice(-8)
        .map((item) => ({
          role: item.role,
          text: limitChatPayloadText(item.text, CHAT_HISTORY_MAX_CHARS),
        })),
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

export async function sendConversationFeedback(runId, feedback) {
  const label = feedback?.helpful ? 'util' : 'no util'
  return appendRunChatMessage(runId, {
    text: `Feedback del dashboard conversacional: recomendacion ${label}.`,
    metadata: {
      kind: 'conversation_dashboard_feedback',
      ...feedback,
    },
  })
}

export async function saveOperationalSelection(runId, selection) {
  const count = Number(selection?.ticket_count || 0)
  return appendRunChatMessage(runId, {
    text: `Seleccion operativa guardada: ${selection?.title || 'tickets seleccionados'} (${count} tickets).`,
    metadata: {
      kind: 'conversation_dashboard_operational_selection',
      ...selection,
    },
  })
}

export async function trackConversationDashboardEvent(runId, event) {
  return appendRunChatMessage(runId, {
    text: `Evento del dashboard conversacional: ${event?.event_type || 'accion'}.`,
    metadata: {
      kind: 'conversation_dashboard_event',
      ...event,
    },
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

export async function fetchRunSelectedInsights(runId) {
  return apiRequest(`/api/runs/${runId}/insights/selected`, { auth: true })
}

export async function fetchConversationDashboard(runId) {
  const suffix = runId ? `?run_id=${encodeURIComponent(runId)}` : ''
  return apiRequest(`/api/conversation-dashboard${suffix}`, { auth: true })
}

export async function fetchConversationSemanticDictionary({ refresh = false, runId = '', projectId = '' } = {}) {
  const params = new URLSearchParams()
  if (refresh) params.set('refresh', 'true')
  if (runId) params.set('run_id', runId)
  if (projectId) params.set('project_id', projectId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest(`/api/conversation/semantic-dictionary${suffix}`, { auth: true })
}

export async function updateConversationSemanticDictionary(variables, { runId = '', projectId = '' } = {}) {
  const params = new URLSearchParams()
  if (runId) params.set('run_id', runId)
  if (projectId) params.set('project_id', projectId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest(`/api/conversation/semantic-dictionary${suffix}`, {
    method: 'PUT',
    body: { variables },
    auth: true,
  })
}

export async function fetchConversationChartData(runId, visualization, options = {}) {
  return apiRequest(`/api/runs/${runId}/conversation-chart-data`, {
    method: 'POST',
    body: {
      visualization,
      limit: options.limit ?? 12,
      evidence_limit: options.evidenceLimit ?? 12,
    },
    auth: true,
  })
}
