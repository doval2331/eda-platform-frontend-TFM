import { useCallback, useEffect, useRef, useState } from 'react'
import {
  appendRunChatMessage,
  askRunQuestion,
  fetchConversationDashboard,
  fetchRunChatHistory,
  fetchRunSuggestedQuestions,
} from '@/api/conversation'

const DEFAULT_SUGGESTIONS = [
  '¿Qué grupos incumplen más el SLA?',
  '¿Qué servicios concentran más incidencias?',
  '¿Cuáles son los casos más críticos?',
  '¿Qué grupos tardan más en resolverse?',
  '¿Cuántos casos atípicos hay?',
]

function mapHistoryMessage(item) {
  return {
    id: item.id,
    role: item.role,
    text: item.text,
    insights: item.insights ?? [],
    llmUsed: item.llm_used ?? undefined,
    llmDetail: item.llm_detail ?? undefined,
  }
}

function mapAssistantResponse(response) {
  return {
    role: 'assistant',
    text: response.answer,
    insights: response.insights ?? [],
    llmUsed: Boolean(response.llm_used),
    llmDetail: response.llm_detail,
  }
}

export function useRunChatHistory(runId, { enabled = true } = {}) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const requestRef = useRef(0)

  const loadSuggestions = useCallback(async (targetRunId) => {
    if (!targetRunId) {
      setSuggestions(DEFAULT_SUGGESTIONS)
      return
    }
    try {
      const response = await fetchRunSuggestedQuestions(targetRunId)
      if (response.suggested_questions?.length) {
        setSuggestions(response.suggested_questions)
      } else {
        setSuggestions(DEFAULT_SUGGESTIONS)
      }
    } catch {
      setSuggestions(DEFAULT_SUGGESTIONS)
    }
  }, [])

  const loadSelectedInsights = useCallback(async (targetRunId) => {
    if (!targetRunId) {
      setSelectedIds(new Set())
      return
    }
    try {
      const dashboard = await fetchConversationDashboard(targetRunId)
      const ids = new Set((dashboard.insights ?? []).map((item) => item.id).filter(Boolean))
      setSelectedIds(ids)
    } catch {
      setSelectedIds(new Set())
    }
  }, [])

  const loadHistory = useCallback(async (targetRunId) => {
    if (!targetRunId) {
      setMessages([])
      setSuggestions(DEFAULT_SUGGESTIONS)
      setSelectedIds(new Set())
      return
    }

    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setHistoryLoading(true)
    setError(null)

    try {
      const [historyResult] = await Promise.all([
        fetchRunChatHistory(targetRunId),
        loadSuggestions(targetRunId),
        loadSelectedInsights(targetRunId),
      ])

      if (requestRef.current !== requestId) return

      const restored = (historyResult.messages ?? []).map(mapHistoryMessage)
      setMessages(restored)
    } catch (err) {
      if (requestRef.current !== requestId) return
      setMessages([])
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial del chat')
    } finally {
      if (requestRef.current === requestId) {
        setHistoryLoading(false)
      }
    }
  }, [loadSelectedInsights, loadSuggestions])

  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => {
      void loadHistory(runId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [runId, loadHistory, enabled])

  const sendQuestion = useCallback(
    async (text, options = {}) => {
      const clean = text.trim()
      if (!runId || !clean) return
      const backendText = (options.backendText || clean).trim()

      setLoading(true)
      setError(null)
      setQuestion('')

      const historySnapshot = options.fromBridge
        ? [...messages, { role: 'user', text: clean }]
        : [...messages, { role: 'user', text: clean }]

      setMessages(historySnapshot)

      try {
        const response = await askRunQuestion(runId, backendText, historySnapshot, {
          displayQuestion: clean,
        })
        setMessages((current) => [...current, mapAssistantResponse(response)])
        if (response.suggested_questions?.length) {
          setSuggestions(response.suggested_questions)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo consultar el chat')
        setMessages((current) =>
          current.filter((item, index) => {
            if (index !== current.length - 1 || item.role !== 'user' || item.text !== clean) {
              return true
            }
            return false
          }),
        )
      } finally {
        setLoading(false)
      }
    },
    [messages, runId],
  )

  const appendLocalAssistantNote = useCallback((text) => {
    const clean = text.trim()
    if (!clean) return
    setMessages((current) => [...current, { role: 'assistant', text: clean }])
  }, [])

  const appendAssistantNote = useCallback(
    async (text) => {
      if (!runId || !text.trim()) return
      try {
        const saved = await appendRunChatMessage(runId, { role: 'assistant', text: text.trim() })
        setMessages((current) => [...current, mapHistoryMessage(saved)])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el mensaje')
      }
    },
    [runId],
  )

  const markInsightSelected = useCallback((insightId) => {
    if (!insightId) return
    setSelectedIds((current) => new Set([...current, insightId]))
  }, [])

  return {
    question,
    setQuestion,
    messages,
    suggestions,
    historyLoading,
    loading,
    error,
    setError,
    selectedIds,
    sendQuestion,
    appendAssistantNote,
    appendLocalAssistantNote,
    markInsightSelected,
    reloadHistory: () => loadHistory(runId),
  }
}
