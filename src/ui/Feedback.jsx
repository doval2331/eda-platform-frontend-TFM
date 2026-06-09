import {
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Snackbar,
} from '@mui/material'
import {
  CheckCircle,
  Close,
  Error as ErrorIcon,
  ExpandLess,
  ExpandMore,
  Info,
  Warning,
} from '@mui/icons-material'

const LEGACY_SEVERITY = {
  danger: 'error',
  error: 'error',
  success: 'success',
  warning: 'warning',
  info: 'info',
}

const ALERT_VARIANTS = new Set(['filled', 'outlined', 'standard'])

const POSITIONS = {
  'top-left': { vertical: 'top', horizontal: 'left' },
  'top-center': { vertical: 'top', horizontal: 'center' },
  'top-right': { vertical: 'top', horizontal: 'right' },
  'bottom-left': { vertical: 'bottom', horizontal: 'left' },
  'bottom-center': { vertical: 'bottom', horizontal: 'center' },
  'bottom-right': { vertical: 'bottom', horizontal: 'right' },
}

function resolveSeverity(severity, variant) {
  if (severity) return severity
  if (variant && LEGACY_SEVERITY[variant]) return LEGACY_SEVERITY[variant]
  return 'info'
}

function resolveAlertVariant(variant) {
  if (variant && ALERT_VARIANTS.has(variant)) return variant
  return 'filled'
}

function getSeverityIcon(severity) {
  const icons = {
    success: <CheckCircle />,
    error: <ErrorIcon />,
    warning: <Warning />,
    info: <Info />,
  }
  return icons[severity] ?? icons.info
}

function getSeverityColor(severity) {
  const colors = {
    success: '#2e7d32',
    error: '#d32f2f',
    warning: '#ed6c02',
    info: '#0288d1',
  }
  return colors[severity] ?? colors.info
}

function AlertContent({
  title,
  message,
  expandedContent,
  showExpandButton,
  isExpanded,
  onToggleExpand,
}) {
  return (
    <>
      {title ? <AlertTitle sx={{ fontWeight: 600, mb: 0.5 }}>{title}</AlertTitle> : null}
      <div>
        <div style={{ marginBottom: expandedContent && isExpanded ? '8px' : '0' }}>{message}</div>
        {expandedContent ? (
          <Collapse in={isExpanded} timeout="auto">
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              {expandedContent}
            </div>
          </Collapse>
        ) : null}
      </div>
    </>
  )
}

export default function Feedback({
  open,
  onClose,
  message = '',
  title,
  severity,
  variant = 'info',
  autoHideDuration = 6000,
  showCloseButton = true,
  showExpandButton = false,
  expandedContent,
  isExpanded = false,
  onToggleExpand,
  position = 'bottom-right',
  maxWidth = '400px',
  className = '',
  ...props
}) {
  const resolvedSeverity = resolveSeverity(severity, variant)
  const alertVariant = resolveAlertVariant(variant)
  const isOpen = open ?? Boolean(message)
  const isToast = Boolean(onClose)

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return
    onClose?.(event, reason)
  }

  const alertSx = {
    width: '100%',
    '& .MuiAlert-icon': { fontSize: '24px' },
    '& .MuiAlert-message': { width: '100%' },
  }

  const alertAction =
    showExpandButton && expandedContent ? (
      <IconButton size="small" onClick={onToggleExpand} sx={{ color: 'inherit' }}>
        {isExpanded ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    ) : undefined

  if (!isOpen || !message) return null

  if (!isToast) {
    return (
      <Alert
        className={className}
        severity={resolvedSeverity}
        variant={alertVariant}
        icon={getSeverityIcon(resolvedSeverity)}
        action={alertAction}
        sx={{ ...alertSx, mb: 1 }}
        {...props}
      >
        <AlertContent
          title={title}
          message={message}
          expandedContent={expandedContent}
          showExpandButton={showExpandButton}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
        />
      </Alert>
    )
  }

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={POSITIONS[position] ?? POSITIONS['bottom-right']}
      className={className}
      sx={{
        maxWidth,
        '& .MuiAlert-root': {
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          border: `1px solid ${getSeverityColor(resolvedSeverity)}20`,
        },
      }}
      {...props}
    >
      <Alert
        onClose={showCloseButton ? handleClose : undefined}
        severity={resolvedSeverity}
        variant={alertVariant}
        icon={getSeverityIcon(resolvedSeverity)}
        action={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {alertAction}
            {showCloseButton ? (
              <IconButton size="small" onClick={handleClose} sx={{ color: 'inherit' }}>
                <Close />
              </IconButton>
            ) : null}
          </div>
        }
        sx={alertSx}
      >
        <AlertContent
          title={title}
          message={message}
          expandedContent={expandedContent}
          showExpandButton={showExpandButton}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
        />
      </Alert>
    </Snackbar>
  )
}
