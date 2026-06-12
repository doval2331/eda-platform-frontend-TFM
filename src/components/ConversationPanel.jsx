import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { askRunQuestion, fetchRunSuggestedQuestions, selectRunInsight } from '../api/conversation'
import { Button, Feedback } from '../ui'

const DEFAULT_SUGGESTIONS = [
  'Que puedo analizar con estas incidencias?',
  'Que servicios incumplen mas SLA?',
  'Que prioridades tienen mas demoras?',
  'Que causas raiz se repiten?',
  'Que clusters son mas criticos?',
  'Que incidencias parecen anomalas?',
  'Que alternativas de decision conviene priorizar?',
  'Que acciones recomendadas puedo evaluar?',
]

function AssistantMessage({ message, runId, onInsightSelected }) {
  const insights = message.insights ?? []
  const showMode = Boolean(message.llmMode || message.llmDetail)
  const modeLabel = message.llmUsed ? 'Agente LLM activo' : 'Reglas locales'

  return (
    <div className="chat-message chat-message--assistant">
      <p>{message.text}</p>
      {showMode ? (
        <span
          className={message.llmUsed ? 'chat-mode chat-mode--llm' : 'chat-mode chat-mode--rules'}
          title={message.llmDetail || modeLabel}
        >
          {modeLabel}
          {message.llmDetail ? ` - ${message.llmDetail}` : ''}
        </span>
      ) : null}
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
          text: 'Ya puedo conversar sobre esta ejecucion. Proba con SLA, servicios afectados, prioridades, causas raiz, anomalias, clusters criticos o alternativas de decision.',
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
    }
  }, [run?.id])

  const canSend = Boolean(run?.id) && question.trim().length > 0 && !loading

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
          llmUsed: response.llm_used,
          llmMode: response.llm_mode,
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
              ? 'Consulta los grupos detectados en lenguaje natural.'
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
          placeholder="Pregunta sobre SLA, prioridad, servicios, causas raiz, anomalias, clusters o alternativas de decision"
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
export { ExplorationChatBot as ConversationPanel } from './chat/ExplorationChatBot'
export { ChatBot, ExplorationChatBot } from './chat'
