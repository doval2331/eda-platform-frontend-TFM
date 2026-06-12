import { useEffect, useState } from 'react'
import { askRunQuestion, fetchRunSuggestedQuestions, selectRunInsight } from '../../api/conversation'
import { ChatBot } from './ChatBot'

const DEFAULT_SUGGESTIONS = [
  '¿Qué grupos incumplen más el SLA?',
  '¿Qué servicios concentran más incidencias?',
  '¿Cuáles son los casos más críticos?',
  '¿Qué grupos tardan más en resolverse?',
  '¿Cuántos casos atípicos hay?',
]

export function ExplorationChatBot({
  run,
  onClose,
  variant = 'embedded',
  llmReady = true,
  expanded = false,
  onToggleExpand,
  externalPrompt = null,
  onExternalPromptConsumed,
}) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    setError(null)
    setQuestion('')
    setSelectedIds(new Set())
    if (run?.id) {
      setMessages([
        {
          role: 'assistant',
          text: 'Hola. Puedo ayudarte a entender los grupos de incidencias: SLA, tiempos de resolución, servicios afectados y casos atípicos. Pregúntame en lenguaje natural.',
        },
      ])
      setSuggestions(DEFAULT_SUGGESTIONS)
      void fetchRunSuggestedQuestions(run.id)
        .then((response) => {
          if (response.suggested_questions?.length) {
            setSuggestions(response.suggested_questions)
          }
        })
        .catch(() => {
          setSuggestions(DEFAULT_SUGGESTIONS)
        })
    } else {
      setMessages([])
      setSuggestions(DEFAULT_SUGGESTIONS)
    }
  }, [run?.id])

  useEffect(() => {
    if (!externalPrompt?.text || !run?.id) return
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        text: 'Te traigo un resumen desde el análisis asistido. Voy a consultar Azure OpenAI con tu pregunta…',
      },
      { role: 'user', text: externalPrompt.text },
    ])
    void sendQuestion(externalPrompt.text, { fromBridge: true })
    onExternalPromptConsumed?.()
  }, [externalPrompt?.at, externalPrompt?.text, run?.id])

  async function sendQuestion(text, options = {}) {
    const clean = text.trim()
    if (!run?.id || !clean) return
    setLoading(true)
    setError(null)
    setQuestion('')
    if (!options.fromBridge) {
      setMessages((current) => [...current, { role: 'user', text: clean }])
    }

    try {
      const response = await askRunQuestion(run.id, clean)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: response.answer,
          insights: response.insights ?? [],
          llmUsed: Boolean(response.llm_used),
          llmDetail: response.llm_detail,
        },
      ])
      if (response.suggested_questions?.length) {
        setSuggestions(response.suggested_questions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el chat')
    } finally {
      setLoading(false)
    }
  }

  function pushAssistantNote(text) {
    setMessages((current) => [...current, { role: 'assistant', text }])
  }

  async function onInsightSelected(runId, insight) {
    if (!runId || selectedIds.has(insight.id)) return
    try {
      await selectRunInsight(runId, insight)
      setSelectedIds((current) => new Set([...current, insight.id]))
      pushAssistantNote(`Anotado: «${insight.title}». Quedó guardado para tu informe o dashboard.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  return (
    <ChatBot
      title="Asistente de incidencias"
      subtitle={run?.id ? 'Exploración del análisis activo' : null}
      active={Boolean(run?.id)}
      llmReady={llmReady}
      headerAction={<ChatBot.DashboardLink />}
      onClose={onClose}
      variant={variant}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      messages={messages}
      suggestions={suggestions}
      loading={loading}
      disabled={!run?.id}
      error={error}
      inputValue={question}
      onInputChange={setQuestion}
      onSubmit={sendQuestion}
      onSuggestionClick={sendQuestion}
      onInsightSelect={onInsightSelected}
      runId={run?.id}
      placeholder="Ej.: ¿Qué grupo tiene peor SLA?"
      emptyTitle="Sin análisis activo"
      emptyDescription="Ejecuta «Analizar incidencias» primero. Cuando termine, podrás hacer preguntas sobre los grupos detectados."
    />
  )
}
