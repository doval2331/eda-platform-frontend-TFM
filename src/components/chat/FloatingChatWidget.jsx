import { useEffect, useState } from 'react'
import { ExplorationChatBot } from './ExplorationChatBot'
import { SparkleIcon } from '@/components/LlmVisual'
import '@/styles/chatbot.css'
import '@/styles/llm-visual.css'

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

export function FloatingChatWidget({
  run,
  llmReady = true,
  forceOpen = false,
  externalPrompt = null,
  onExternalPromptConsumed,
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)
  const isReady = Boolean(run?.id)

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      setHasOpenedOnce(true)
    }
  }, [forceOpen])

  function toggleOpen() {
    setOpen((current) => {
      const next = !current
      if (next) setHasOpenedOnce(true)
      if (!next) setExpanded(false)
      return next
    })
  }

  const shouldMountChat = open || hasOpenedOnce

  return (
    <div
      className={`chat-widget${open ? ' chat-widget--open' : ''}${
        expanded ? ' chat-widget--expanded' : ''
      }`}
    >
      <div
        className={`chat-widget-panel${open ? '' : ' chat-widget-panel--hidden'}`}
        role="dialog"
        aria-label="Asistente de incidencias"
        aria-hidden={!open}
        hidden={!open}
      >
        {shouldMountChat ? (
          <ExplorationChatBot
            run={run}
            onClose={() => {
              setExpanded(false)
              setOpen(false)
            }}
            variant="float"
            llmReady={llmReady}
            expanded={expanded}
            onToggleExpand={() => setExpanded((current) => !current)}
            externalPrompt={externalPrompt}
            onExternalPromptConsumed={onExternalPromptConsumed}
            enabled={open}
          />
        ) : null}
      </div>

      <button
        type="button"
        className={`chat-widget-fab${isReady && llmReady ? ' chat-widget-fab--llm-ready' : ''}`}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de incidencias'}
        title={open ? 'Cerrar chat' : 'Preguntar con Azure AI sobre los grupos detectados'}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {!open && isReady && llmReady ? (
          <span className="chat-widget-fab__llm-tag">
            <SparkleIcon size={8} /> AI
          </span>
        ) : null}
        {!open && isReady ? (
          <span className="chat-widget-badge" aria-label="Ejecución lista para consultar" />
        ) : null}
      </button>
    </div>
  )
}
