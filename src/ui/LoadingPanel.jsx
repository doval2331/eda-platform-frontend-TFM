import { SparkleIcon } from '@/components/LlmVisual'
import '@/styles/llm-visual.css'

function SpinnerRing({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
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

export function SpinnerDots({ size = 56, className = '' }) {
  return (
    <span
      className={`spinner-dots ${className}`.trim()}
      style={{ '--spinner-size': `${size}px` }}
      aria-hidden
    >
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className="spinner-dots__dot" style={{ '--dot-index': index }} />
      ))}
    </span>
  )
}

export function LoadingSlot({ children, className = '', variant = 'default' }) {
  return (
    <div className={`loading-slot loading-slot--${variant} ${className}`.trim()}>{children}</div>
  )
}

export function LoadingPanel({
  title = 'Cargando…',
  description = '',
  compact = false,
  embedded = false,
  bare = false,
  variant = 'default',
  spinnerSize: spinnerSizeProp,
  className = '',
}) {
  const isLlm = variant === 'llm'
  const isEmbedded = !bare && (embedded || compact)
  const ringSize = isEmbedded || bare ? 32 : 40
  const dotSize = spinnerSizeProp ?? (bare ? (compact ? 56 : 64) : 48)

  return (
    <div
      className={`loading-panel${bare ? ' loading-panel--bare' : ''}${
        isEmbedded ? ' loading-panel--embedded empty-state empty-state--loading' : ''
      }${!bare && !isEmbedded ? ' loading-panel--page empty-state empty-state--loading' : ''}${
        isLlm && !bare ? ' loading-panel--llm' : ''
      }${isLlm && bare ? ' loading-panel--llm-bare' : ''} ${className}`.trim()}
      aria-live="polite"
      aria-busy="true"
    >
      <div className={`loading-panel__content${isLlm ? ' loading-panel__content--llm' : ''}`}>
        {!bare && isLlm ? (
          <div
            className="plot-loader loading-panel__spinner plot-loader--llm loading-panel__spinner--sm"
            aria-hidden
          >
            <SparkleIcon size={18} />
            <SpinnerRing size={ringSize} />
          </div>
        ) : (
          <div
            className={`plot-loader loading-panel__spinner${
              isEmbedded || bare ? ' loading-panel__spinner--sm' : ''
            }${bare ? ' loading-panel__spinner--bare' : ''}`}
            aria-hidden
          >
            {bare ? <SpinnerDots size={dotSize} /> : <SpinnerRing size={ringSize} />}
          </div>
        )}
        <div className="loading-panel__copy">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
    </div>
  )
}
