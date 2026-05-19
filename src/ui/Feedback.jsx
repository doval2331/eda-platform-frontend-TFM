import '../styles/ui.css'

const VARIANT_MAP = {
  danger: 'danger',
  error: 'danger',
  success: 'success',
  warning: 'warning',
  info: 'info',
}

const POSITION_CLASS = {
  'top-left': 'feedback-top-left',
  'top-center': 'feedback-top-center',
  'top-right': 'feedback-top-right',
  'bottom-left': 'feedback-bottom-left',
  'bottom-center': 'feedback-bottom-center',
  'bottom-right': 'feedback-bottom-right',
}

export default function Feedback({
  open = true,
  onClose,
  message = '',
  title,
  variant = 'info',
  severity,
  className = '',
  position = 'bottom-right',
  role = 'alert',
}) {
  const resolvedVariant = VARIANT_MAP[severity ?? variant] ?? 'info'

  if (!open || !message) return null

  const isToast = Boolean(onClose && position)
  const classes = [
    'feedback',
    `feedback-${resolvedVariant}`,
    isToast ? 'feedback-toast' : '',
    isToast ? POSITION_CLASS[position] || POSITION_CLASS['bottom-right'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role={role}>
      <div className="feedback-body">
        {title ? <strong>{title}</strong> : null}
        <p>{message}</p>
      </div>
      {onClose ? (
        <button type="button" className="feedback-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      ) : null}
    </div>
  )
}
