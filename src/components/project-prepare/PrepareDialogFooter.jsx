import PropTypes from 'prop-types'
import { Button } from '../../ui'
import { PREPARE_TAB } from './constants'

export function PrepareDialogFooter({
  activeTab,
  busy,
  isLastTab,
  canExecute,
  ejecutando,
  saving,
  onClose,
  onPrev,
  onNext,
  onAnalyze,
}) {
  return (
    <div className="project-dialog-footer">
      {activeTab !== PREPARE_TAB.origin ? (
        <Button type="button" variant="text" onClick={onPrev} disabled={busy}>
          Atrás
        </Button>
      ) : (
        <span className="project-dialog-footer__spacer" />
      )}
      <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
        Cancelar
      </Button>
      {isLastTab ? (
        <Button
          type="button"
          variant="primary"
          onClick={onAnalyze}
          disabled={!canExecute || busy}
          className="btn-analyze"
        >
          {ejecutando || saving ? 'Analizando incidencias…' : 'Analizar incidencias'}
        </Button>
      ) : (
        <Button type="button" variant="primary" onClick={onNext} disabled={busy}>
          Siguiente
        </Button>
      )}
    </div>
  )
}

PrepareDialogFooter.propTypes = {
  activeTab: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  isLastTab: PropTypes.bool.isRequired,
  canExecute: PropTypes.bool,
  ejecutando: PropTypes.bool,
  saving: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func.isRequired,
}
