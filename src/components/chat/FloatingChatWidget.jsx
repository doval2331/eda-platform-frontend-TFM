import { useState } from 'react'
import { ExplorationChatBot } from './ExplorationChatBot'
import '../../styles/chatbot.css'

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16v10H7l-3 3V5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FloatingChatWidget({ run }) {
  const [open, setOpen] = useState(false)
  const isReady = Boolean(run?.id)

  function toggleOpen() {
    setOpen((current) => !current)
  }

  return (
    <div className={`chat-widget${open ? ' chat-widget--open' : ''}`}>
      {open ? (
        <div className="chat-widget-panel" role="dialog" aria-label="Asistente EDA">
          <ExplorationChatBot run={run} onClose={() => setOpen(false)} variant="float" />
        </div>
      ) : null}

      <button
        type="button"
        className="chat-widget-fab"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente EDA'}
        title={open ? 'Cerrar chat' : 'Exploración conversacional'}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {!open && isReady ? (
          <span className="chat-widget-badge" aria-label="Ejecución lista para consultar" />
        ) : null}
      </button>
    </div>
  )
}
