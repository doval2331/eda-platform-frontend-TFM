import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { SparkleIcon } from '@/components/LlmVisual'
import { PriorityChip } from '@/components/agent'
import {
  buildChatPrompt,
  buildMaxByKind,
  formatMetric,
  insightPriorityLevel,
  insightSharePercent,
  insightTicketCount,
  kindLabel,
  metricKind,
} from '@/utils/conversationDashboard'

function recommendationCopy(kind) {
  if (kind === 'Decision') {
    return 'Trata esta alternativa como hipótesis de priorización y valídala con el equipo operativo antes de actuar.'
  }
  return 'Usa este hallazgo como punto de partida: pide en el chat causas probables, servicios afectados o clusters relacionados.'
}

export function ConversationReadingPanel({ reading, allItems = [] }) {
  if (!reading?.focused) return null

  const focused = reading.focused
  const focusedKind = metricKind(focused.metric_label)
  const chatPrompt = buildChatPrompt(focused)
  const runId = focused.run_id
  const maxByKind = buildMaxByKind(allItems.length ? allItems : [focused])
  const priority = insightPriorityLevel(focused, maxByKind)
  const tickets = insightTicketCount(focused)
  const sharePercent = insightSharePercent(focused, allItems)
  const metricText = formatMetric(focused.metric_label, focused.metric_value)

  const highlights = [
    {
      key: 'top-score',
      label: 'Mayor intensidad',
      value: reading.topByScore?.title,
    },
    reading.topSla
      ? { key: 'top-sla', label: 'Mayor SLA', value: reading.topSla.title }
      : null,
    reading.topRisk
      ? { key: 'top-risk', label: 'Mayor riesgo', value: reading.topRisk.title }
      : null,
  ].filter(Boolean)

  return (
    <aside className="conv-reading-panel" aria-live="polite">
      <div className="conv-reading-panel__accent" aria-hidden />
      <div className="conv-reading-panel__shell">
        <div className="conv-reading-panel__body">
          <header className="conv-reading-panel__header">
            <span className="conv-reading-panel__kicker">Lectura guiada</span>
            <div className="conv-reading-panel__badges">
              <PriorityChip level={priority} />
              <span className="conv-reading-panel__kind">{kindLabel(focusedKind)}</span>
            </div>
            <h2 className="conv-reading-panel__title">{focused.title}</h2>
            {focused.description ? (
              <p className="conv-reading-panel__description">{focused.description}</p>
            ) : null}
          </header>

          <div className="conv-reading-panel__stats">
            {tickets != null ? (
              <div className="conv-reading-panel__stat">
                <strong>{tickets.toLocaleString('es-ES')}</strong>
                <span>Tickets afectados</span>
              </div>
            ) : null}
            {sharePercent != null ? (
              <div className="conv-reading-panel__stat conv-reading-panel__stat--accent">
                <strong>{sharePercent.toFixed(1)}%</strong>
                <span>Del total filtrado</span>
              </div>
            ) : null}
            {metricText ? (
              <div className="conv-reading-panel__stat">
                <strong>{metricText}</strong>
                <span>Métrica consultada</span>
              </div>
            ) : null}
            {reading.focusRisk != null ? (
              <div className="conv-reading-panel__stat">
                <strong>
                  {reading.focusRisk.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                </strong>
                <span>Riesgo / impacto</span>
              </div>
            ) : null}
            {reading.focusSla != null ? (
              <div className="conv-reading-panel__stat">
                <strong>{reading.focusSla.toFixed(1)}%</strong>
                <span>SLA estimado</span>
              </div>
            ) : null}
          </div>

          {highlights.length ? (
            <section className="conv-reading-panel__context">
              <h3>Contexto del conjunto</h3>
              <ul>
                {highlights.map((item) => (
                  <li key={item.key}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="conv-reading-panel__recommendation">
          <span className="conv-reading-panel__recommendation-label">Recomendación principal</span>
          <p>{recommendationCopy(focusedKind)}</p>
        </div>

        {runId ? (
          <Link
            to={`/historial/${runId}`}
            state={{ openChat: true, chatPrompt }}
            className="conv-reading-panel__cta"
          >
            <SparkleIcon size={16} />
            Ir al chat con este hallazgo
          </Link>
        ) : null}
      </div>
    </aside>
  )
}

ConversationReadingPanel.propTypes = {
  reading: PropTypes.object,
  allItems: PropTypes.arrayOf(PropTypes.object),
}
