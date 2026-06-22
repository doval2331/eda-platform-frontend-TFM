import PropTypes from 'prop-types'
import { Button, Dialog } from '@/ui'
import { LlmModeChip } from '@/components/LlmVisual'
import { PriorityChip } from '../shared/PriorityChip'

export function InsightDetailDialog({
  open,
  step,
  selected = false,
  added = false,
  onClose,
  onToggleSelect,
  onAskChat,
  onAdd,
}) {
  if (!step) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={step.title}
      description={step.ticketLabel}
      size="wide"
      panelClassName="insight-detail-dialog"
      footer={
        <>
          <label className="insight-detail-dialog__select">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(step.raw)}
            />
            Seleccionar grupo
          </label>
          <div className="insight-detail-dialog__actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" variant="secondary" onClick={() => onAskChat?.(step.raw)}>
              Preguntar en chat
            </Button>
            <Button type="button" variant="primary" disabled={added} onClick={() => onAdd?.(step.raw)}>
              {added ? 'Agregado' : 'Agregar al dashboard'}
            </Button>
          </div>
        </>
      }
    >
      <div className="insight-detail-dialog__content">
        <div className="insight-detail-dialog__meta">
          <PriorityChip level={step.risk} />
          {step.llmEnriched ? <LlmModeChip mode="llm_active" /> : null}
        </div>

        {step.lead ? (
          <section className="insight-detail-dialog__section">
            <h5>Resumen</h5>
            <p>{step.lead}</p>
          </section>
        ) : null}

        <section className="insight-detail-dialog__section">
          <h5>Accion recomendada</h5>
          <p>{step.actionLine}</p>
        </section>

        {step.metrics.length ? (
          <section className="insight-detail-dialog__section">
            <h5>Datos clave</h5>
            <div className="insight-detail-dialog__metrics">
              {step.metrics.map((metric) => (
                <span className="agent-var-chip" key={metric.label}>
                  {metric.label}: {metric.value}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {step.variables.length ? (
          <section className="insight-detail-dialog__section">
            <h5>Columnas usadas</h5>
            <div className="insight-detail-dialog__metrics">
              {step.variables.map((name) => (
                <span className="agent-var-chip" key={name}>
                  {name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {step.why ? (
          <section className="insight-detail-dialog__section">
            <h5>Por que importa</h5>
            <p>{step.why}</p>
          </section>
        ) : null}

        {(step.mainCharacteristics || step.possibleCauses || step.recommendations || step.businessConclusion) ? (
          <section className="insight-detail-dialog__section insight-detail-dialog__section--technical">
            <h5>Detalle tecnico</h5>
            {step.mainCharacteristics ? <p>{step.mainCharacteristics}</p> : null}
            {step.possibleCauses ? (
              <p>
                <strong>Causas:</strong> {step.possibleCauses}
              </p>
            ) : null}
            {step.recommendations ? (
              <p>
                <strong>Recomendacion:</strong> {step.recommendations}
              </p>
            ) : null}
            {step.businessConclusion ? <p>{step.businessConclusion}</p> : null}
          </section>
        ) : null}
      </div>
    </Dialog>
  )
}

InsightDetailDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  step: PropTypes.object,
  selected: PropTypes.bool,
  added: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onToggleSelect: PropTypes.func,
  onAskChat: PropTypes.func,
  onAdd: PropTypes.func,
}
