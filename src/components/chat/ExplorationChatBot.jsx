import { useEffect, useMemo, useState } from 'react'
import { askRunQuestion, selectRunInsight } from '../../api/conversation'
import { ChatBot } from './ChatBot'

const DEFAULT_SUGGESTIONS = [
  '¿Qué puedo analizar con esta data?',
  '¿Qué grupos incumplen SLA?',
  '¿Qué servicios concentran más volumen?',
  '¿Qué clusters tienen mayor riesgo?',
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
          text: 'Hola, soy tu asistente de exploración. Puedo ayudarte con SLA, servicios, tiempos de resolución, severidad y clusters de esta ejecución.',
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
          text: `Insight seleccionado: ${insight.title}. Quedó guardado en DuckDB para filtrar o documentar el dashboard.`,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  return (
    <ChatBot
      title="Asistente EDA"
      subtitle={run?.id ? `Run ${shortRunId}` : null}
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
      placeholder="Pregunta sobre SLA, severidad, servicios, tiempos o clusters…"
      emptyTitle="Sin ejecución activa"
      emptyDescription="Configura y ejecuta el pipeline. Cuando se guarde la corrida, podrás conversar aquí sobre los resultados."
    />
  )
}
