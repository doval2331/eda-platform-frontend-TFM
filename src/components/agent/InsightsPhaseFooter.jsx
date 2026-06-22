import PropTypes from 'prop-types'
import { SparkleIcon } from '@/components/LlmVisual'

export function InsightsPhaseFooter({
  selectedCount = 0,
  onAddSelected,
  onSummarizeInChat,
  addDisabled = false,
  addLoading = false,
  chatDisabled = false,
}) {
  return (
    <footer className="insights-phase-footer">
      <div className="insights-phase-footer__copy">
        <strong>
          {selectedCount > 0
            ? `${selectedCount} grupo${selectedCount === 1 ? '' : 's'} seleccionado${selectedCount === 1 ? '' : 's'}`
            : 'Selecciona grupos para actuar'}
        </strong>
        <span>
          {selectedCount > 0
            ? 'Agregalos al dashboard conversacional o lleva un resumen al chat.'
            : 'Marca uno o varios grupos de la lista antes de continuar.'}
        </span>
      </div>
      <div className="insights-phase-footer__actions">
        <button
          type="button"
          className="insights-phase-footer__cta insights-phase-footer__cta--secondary"
          disabled={chatDisabled}
          onClick={onSummarizeInChat}
        >
          <SparkleIcon size={14} /> Llevar al chat
        </button>
        <button
          type="button"
          className="insights-phase-footer__cta"
          disabled={addDisabled || addLoading || selectedCount === 0}
          onClick={onAddSelected}
        >
          {addLoading ? 'Agregando...' : `Agregar seleccionados (${selectedCount})`}
        </button>
      </div>
    </footer>
  )
}

InsightsPhaseFooter.propTypes = {
  selectedCount: PropTypes.number,
  onAddSelected: PropTypes.func,
  onSummarizeInChat: PropTypes.func,
  addDisabled: PropTypes.bool,
  addLoading: PropTypes.bool,
  chatDisabled: PropTypes.bool,
}
