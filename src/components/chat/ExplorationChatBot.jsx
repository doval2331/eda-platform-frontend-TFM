import { useEffect, useMemo, useState } from 'react'
import { askRunQuestion, selectRunInsight } from '../../api/conversation'
import { ChatBot } from './ChatBot'

const DEFAULT_SUGGESTIONS = [
  '¿Qué grupos incumplen más el SLA?',
  '¿Qué servicios concentran más incidencias?',
  '¿Cuáles son los casos más críticos?',
  '¿Qué grupos tardan más en resolverse?',
  '¿Cuántos casos atípicos hay?',
]

export function ExplorationChatBot({ run, onClose, variant = 'embedded' }) {
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
    } else {
      setMessages([])
      setSuggestions(DEFAULT_SUGGESTIONS)
    }
  }, [run?.id])

  const shortRunId = useMemo(() => (run?.id ? run.id.slice(0, 8) : ''), [run?.id])

  async function sendQuestion(text) {
    const clean = text.trim()
    if (!run?.id || !clean) return
    setLoading(true)
    setError(null)
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', text: clean }])

    try {
      const response = await askRunQuestion(run.id, clean)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: response.answer,
          insights: response.insights ?? [],
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

  async function onInsightSelected(runId, insight) {
    if (!runId || selectedIds.has(insight.id)) return
    try {
      await selectRunInsight(runId, insight)
      setSelectedIds((current) => new Set([...current, insight.id]))
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          text: `Anotado: «${insight.title}». Quedó guardado para tu informe o dashboard.`,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  return (
    <ChatBot
      title="Asistente de incidencias"
      subtitle={run?.id ? `Análisis ${shortRunId}` : null}
      active={Boolean(run?.id)}
      headerAction={<ChatBot.DashboardLink />}
      onClose={onClose}
      variant={variant}
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
