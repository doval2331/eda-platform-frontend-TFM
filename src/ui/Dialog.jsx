import PropTypes from 'prop-types'
import {
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

const SIZE_MAP = {
  default: 'sm',
  wide: 'md',
  xl: 'xl',
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
  ...props
}) {
  const open = openProp ?? Boolean(isOpen)
  const actions = actionsProp ?? footer
  const maxWidth = SIZE_MAP[size] ?? 'sm'

  function handleClose(event, reason) {
    if (disableBackdropClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return
    }
    onClose?.(event, reason)
  }

  return (
    <MuiDialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      className={panelClassName}
      aria-labelledby={title ? 'app-dialog-title' : undefined}
      aria-describedby={description ? 'app-dialog-description' : undefined}
      {...props}
    >
      {title ? (
        <DialogTitle
          id="app-dialog-title"
          sx={{ pr: showCloseButton ? 6 : 2, pb: description ? 1 : 2 }}
        >
          {title}
          {description ? (
            <Typography
              id="app-dialog-description"
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontWeight: 400 }}
            >
              {description}
            </Typography>
          ) : null}
          {showCloseButton ? (
            <IconButton
              aria-label="Cerrar"
              onClick={(event) => onClose?.(event, 'closeButton')}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          ) : null}
        </DialogTitle>
      ) : null}

      <DialogContent dividers={Boolean(title)} sx={{ pt: title ? 2 : 3 }}>
        {children}
      </DialogContent>

      {actions ? (
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>{actions}</DialogActions>
      ) : null}
    </MuiDialog>
  )
}

Dialog.propTypes = {
  open: PropTypes.bool,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.node,
  description: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['default', 'wide', 'xl']),
  showCloseButton: PropTypes.bool,
  disableBackdropClose: PropTypes.bool,
  panelClassName: PropTypes.string,
}
