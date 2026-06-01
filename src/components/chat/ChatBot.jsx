import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button, Feedback } from '../../ui'
import '../../styles/chatbot.css'

function BotAvatar() {
  return (
    <div className="chatbot-avatar" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3v2M8 5h8M7 10h10M9 14h1M14 14h1M6 8h12v10a2 2 0 01-2 2H8a2 2 0 01-2-2V8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="chatbot-avatar chatbot-avatar--user" aria-hidden>
      Tú
    </div>
  )
}

function ChatBotMessage({ role, text, insights, runId, onInsightSelect }) {
  const isUser = role === 'user'

  return (
    <div className={`chatbot-row chatbot-row--${isUser ? 'user' : 'assistant'}`}>
      {isUser ? <UserAvatar /> : <BotAvatar />}
      <div className="chatbot-bubble">
        <p className="chatbot-bubble-text">{text}</p>
        {!isUser && insights?.length ? (
          <div className="chatbot-insights">
            {insights.map((insight) => (
              <div className="chatbot-insight" key={insight.id}>
                <div>
                  <strong>{insight.title}</strong>
                  <span>{insight.description}</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="btn-sm"
                  onClick={() => onInsightSelect?.(runId, insight)}
                >
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="chatbot-row chatbot-row--assistant">
      <BotAvatar />
      <div className="chatbot-typing" aria-label="El asistente está escribiendo">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function ChatBot({
  title = 'Asistente EDA',
  subtitle,
  active = false,
  headerAction,
  onClose,
  variant = 'embedded',
  messages = [],
  suggestions = [],
  loading = false,
  disabled = false,
  error,
  inputValue,
  onInputChange,
  onSubmit,
  onSuggestionClick,
  onInsightSelect,
  runId,
  placeholder = 'Escribe tu pregunta…',
  emptyTitle = 'Chat inactivo',
  emptyDescription = 'Ejecuta el pipeline para habilitar la exploración conversacional.',
}) {
  const bodyRef = useRef(null)
  const canSend = !disabled && !loading && inputValue.trim().length > 0

  useEffect(() => {
    const node = bodyRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, loading])

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSend) return
    onSubmit?.(inputValue.trim())
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSubmit?.(inputValue.trim())
    }
  }

  return (
    <section
      className={`card chatbot${variant === 'float' ? ' chatbot--float' : ''}`}
      aria-label="Exploración conversacional"
    >
      <header className="chatbot-header">
        <div className="chatbot-header-main">
          <BotAvatar />
          <div className="chatbot-header-text">
            <h2>{title}</h2>
            <div className="chatbot-header-status">
              <span
                className={`chatbot-status-dot${active ? '' : ' chatbot-status-dot--offline'}`}
                aria-hidden
              />
              <span>{active ? 'En línea' : 'Esperando ejecución'}</span>
              {subtitle ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{subtitle}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="chatbot-header-actions">
          {headerAction}
          {onClose ? (
            <button
              type="button"
              className="chatbot-close"
              onClick={onClose}
              aria-label="Cerrar chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="chatbot-error">
          <Feedback variant="danger" message={error} />
        </div>
      ) : null}

      <div className="chatbot-body" ref={bodyRef} aria-live="polite">
        {!messages.length && !loading ? (
          <div className="chatbot-empty">
            <div className="chatbot-empty-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 5h16v10H7l-3 3V5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatBotMessage
                key={`${message.role}-${index}`}
                role={message.role}
                text={message.text}
                insights={message.insights}
                runId={runId}
                onInsightSelect={onInsightSelect}
              />
            ))}
            {loading ? <TypingIndicator /> : null}
          </>
        )}
      </div>

      <footer className="chatbot-footer">
        {suggestions.length ? (
          <div className="chatbot-suggestions" aria-label="Preguntas sugeridas">
            {suggestions.map((item) => (
              <button
                type="button"
                key={item}
                className="chatbot-suggestion"
                disabled={disabled || loading}
                onClick={() => onSuggestionClick?.(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}

        <form className="chatbot-composer" onSubmit={handleSubmit}>
          <textarea
            className="chatbot-composer-input"
            value={inputValue}
            onChange={(event) => onInputChange?.(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled || loading}
            aria-label="Mensaje para el asistente"
          />
          <button
            type="submit"
            className="chatbot-send"
            disabled={!canSend}
            aria-label={loading ? 'Consultando' : 'Enviar mensaje'}
          >
            {loading ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="28"
                  strokeLinecap="round"
                  style={{ animation: 'chatbot-spin 0.8s linear infinite' }}
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h12M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </form>
      </footer>
    </section>
  )
}

ChatBot.DashboardLink = function ChatBotDashboardLink({ to = '/dashboard-conversacional', children = 'Ver dashboard' }) {
  return (
    <Link className="chatbot-header-action" to={to}>
      {children}
    </Link>
  )
}
