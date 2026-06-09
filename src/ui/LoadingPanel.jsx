import { SparkleIcon } from '../components/LlmVisual'
import '../styles/llm-visual.css'

function SpinnerRing() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path
        d="M24 4a20 20 0 0120 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LoadingPanel({
  title = 'Cargando…',
  description = '',
  compact = false,
  variant = 'default',
  className = '',
}) {
  const isLlm = variant === 'llm'

  return (
    <div
      className={`empty-state empty-state--loading loading-panel${
        compact ? ' loading-panel--compact' : ''
      }${isLlm ? ' loading-panel--llm' : ''} ${className}`.trim()}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`plot-loader${isLlm ? ' plot-loader--llm' : ''}`}
        aria-hidden
      >
        {isLlm ? <SparkleIcon size={22} /> : null}
        <SpinnerRing />
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
