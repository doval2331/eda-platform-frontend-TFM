import PropTypes from 'prop-types'
import { SparkleIcon } from '@/components/LlmVisual'

export function StrategyPhaseFooter({
  phase,
  onConfirm,
  onInterpret,
  confirmLoading = false,
  interpretLoading = false,
  disabled = false,
}) {
  if (phase === 'strategy') {
    return (
      <footer className="strategy-phase-footer strategy-phase-footer--confirm">
        <div className="strategy-phase-footer__copy">
          <strong>Revisa los pasos y confirma</strong>
          <span>Marca las variables que aceptas en cada paso antes de continuar.</span>
        </div>
        <button
          type="button"
          className="strategy-phase-footer__cta"
          disabled={disabled || confirmLoading}
          onClick={onConfirm}
        >
          {confirmLoading ? 'Registrando...' : 'Confirmar variables'}
        </button>
      </footer>
    )
  }

  if (phase === 'interpret') {
    return (
      <footer className="strategy-phase-footer strategy-phase-footer--interpret">
        <div className="strategy-phase-footer__copy">
          <strong>Variables confirmadas</strong>
          <span>Genera los hallazgos de negocio para cada grupo detectado.</span>
        </div>
        <button
          type="button"
          className="strategy-phase-footer__cta strategy-phase-footer__cta--interpret"
          disabled={disabled || interpretLoading}
          onClick={onInterpret}
        >
          {interpretLoading ? (
            <>
              <SparkleIcon size={14} /> Interpretando…
            </>
          ) : (
            <>
              <SparkleIcon size={14} /> Interpretar grupos
            </>
          )}
        </button>
      </footer>
    )
  }

  return null
}

StrategyPhaseFooter.propTypes = {
  phase: PropTypes.oneOf(['strategy', 'interpret']),
  onConfirm: PropTypes.func,
  onInterpret: PropTypes.func,
  confirmLoading: PropTypes.bool,
  interpretLoading: PropTypes.bool,
  disabled: PropTypes.bool,
}
