import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { askRunQuestion, selectRunInsight } from '../api/conversation'
import { Button, Feedback } from '../ui'

const DEFAULT_SUGGESTIONS = [
  'Que puedo analizar con esta data?',
  'Que grupos incumplen SLA?',
  'Que servicios concentran mas volumen?',
  'Que clusters tienen mayor riesgo?',
]

function AssistantMessage({ message, runId, onInsightSelected }) {
  const insights = message.insights ?? []

  return (
    <div className="chat-message chat-message--assistant">
      <p>{message.text}</p>
      {insights.length ? (
        <div className="insight-list">
          {insights.map((insight) => (
            <div className="insight-item" key={insight.id}>
              <div>
                <strong>{insight.title}</strong>
                <span>{insight.description}</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="btn-sm"
                onClick={() => onInsightSelected(runId, insight)}
              >
                Seleccionar
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ConversationPanel({ run }) {
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
          text: 'Ya puedo conversar sobre esta ejecucion. Proba con SLA, servicios, tiempos de resolucion, severidad o clusters.',
        },
      ])
      setSuggestions(DEFAULT_SUGGESTIONS)
    } else {
      setMessages([])
    }
  }, [run?.id])

  const canSend = Boolean(run?.id) && question.trim().length > 0 && !loading
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
          text: `Insight seleccionado: ${insight.title}. Quedo guardado en DuckDB para filtrar o documentar el dashboard.`,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  function onSubmit(event) {
    event.preventDefault()
    sendQuestion(question)
  }

  return (
    <section className="card panel-chat">
      <div className="chat-header">
        <div>
          <h2>3. Exploracion conversacional</h2>
          <p className="note">
            {run?.id
              ? `Consultando evidencias materializadas en DuckDB. Run ${shortRunId}.`
              : 'Ejecuta el pipeline para habilitar preguntas sobre la corrida.'}
          </p>
        </div>
        <Link className="chat-dashboard-link" to="/dashboard-conversacional">
          Ver dashboard
        </Link>
      </div>

      {error ? <Feedback variant="danger" message={error} /> : null}

      <div className="chat-suggestions" aria-label="Preguntas sugeridas">
        {suggestions.map((item) => (
          <button
            type="button"
            key={item}
            className="suggestion-chip"
            disabled={!run?.id || loading}
            onClick={() => sendQuestion(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="chat-thread" aria-live="polite">
        {messages.length ? (
          messages.map((message, index) =>
            message.role === 'assistant' ? (
              <AssistantMessage
                key={`${message.role}-${index}`}
                message={message}
                runId={run?.id}
                onInsightSelected={onInsightSelected}
              />
            ) : (
              <div className="chat-message chat-message--user" key={`${message.role}-${index}`}>
                <p>{message.text}</p>
              </div>
            ),
          )
        ) : (
          <div className="chat-empty">
            <p>El chat se activa cuando existe una ejecucion guardada.</p>
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={onSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pregunta sobre SLA, severidad, servicios, tiempos o clusters"
          rows={3}
          disabled={!run?.id || loading}
        />
        <Button type="submit" variant="primary" disabled={!canSend}>
          {loading ? 'Consultando...' : 'Enviar'}
        </Button>
      </form>
    </section>
  )
}
