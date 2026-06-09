import { Button, Dialog } from '../ui'

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  busy = false,
  danger = false,
}) {
  async function handleConfirm() {
    await onConfirm?.()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      disableBackdropClose={busy}
      footer={
        <div className="confirm-dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={danger ? 'btn-danger' : ''}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </Button>
        </div>
      }
    >
      {children ? <div className="confirm-dialog-body">{children}</div> : null}
    </Dialog>
  )
}
