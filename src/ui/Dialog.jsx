import { useEffect } from 'react'
import '../styles/ui.css'

const SIZE_CLASS = {
  default: '',
  wide: 'dialog-panel--wide',
  xl: 'dialog-panel--xl',
}

export function Dialog({
  open: openProp,
  isOpen,
  onClose,
  title,
  description,
  children,
  actions: actionsProp,
  footer,
  size = 'default',
  showCloseButton = true,
  disableBackdropClose = false,
  panelClassName = '',
  ...rest
}) {
  const open = openProp ?? Boolean(isOpen)
  const actions = actionsProp ?? footer
  const panelSizeClass = SIZE_CLASS[size] ?? ''

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.(event, 'escapeKey')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleBackdropClick = (event) => {
    if (disableBackdropClose) return
    onClose?.(event, 'backdropClick')
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
      {...rest}
    >
      <div
        className={`dialog-panel ${panelSizeClass} ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <header className="dialog-header">
            <div>
              <h2 className="dialog-title" id="dialog-title">
                {title}
              </h2>
              {description ? <p className="dialog-description">{description}</p> : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                className="dialog-close"
                aria-label="Cerrar"
                onClick={(event) => onClose?.(event, 'closeButton')}
              >
                ×
              </button>
            ) : null}
          </header>
        ) : null}

        <div className="dialog-body">{children}</div>

        {actions ? <footer className="dialog-footer">{actions}</footer> : null}
      </div>
    </div>
  )
}
