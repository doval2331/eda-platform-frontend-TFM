import PropTypes from 'prop-types'
import { kindLabel } from '@/utils/conversationDashboard'

export function ConversationDashboardHero({
  summary,
  runsForFilter,
  selectedRunId,
  onRunChange,
  runOptionLabel,
  metricFilter,
  metricKinds,
  kindCounts,
  totalInsights,
  onMetricFilterChange,
}) {
  return (
    <section className="conv-dashboard-hero" aria-label="Resumen de hallazgos guardados">
      <div className="conv-dashboard-hero__accent" aria-hidden />
      <div className="conv-dashboard-hero__shell">
        <div className="conv-dashboard-hero__top">
          <div className="conv-dashboard-hero__intro">
            <span className="conv-dashboard-hero__kicker">Dashboard conversacional</span>
            <h2 className="conv-dashboard-hero__title">Tus hallazgos guardados</h2>
            <div className="conv-dashboard-hero__metrics">
              <span className="conv-dashboard-hero__metric">
                <strong>{summary.insightCount}</strong> hallazgos
              </span>
              <span className="conv-dashboard-hero__metric">
                <strong>{summary.runCount}</strong> ejecuciones
              </span>
              <span className="conv-dashboard-hero__metric">
                <strong>{summary.kindCount}</strong> tipos
              </span>
            </div>
          </div>
          <label className="conv-dashboard-hero__filter">
            <span>Ejecuci&oacute;n</span>
            <select value={selectedRunId} onChange={onRunChange}>
              <option value="">Todas las ejecuciones</option>
              {runsForFilter.map((run) => (
                <option value={run.id} key={run.id}>
                  {runOptionLabel(run)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {totalInsights > 0 ? (
          <div className="conv-dashboard-hero__chips" aria-label="Filtrar por tipo de hallazgo">
            <button
              type="button"
              className={
                metricFilter === 'all'
                  ? 'conv-dashboard-chip conv-dashboard-chip--active'
                  : 'conv-dashboard-chip'
              }
              onClick={() => onMetricFilterChange('all')}
            >
              Todas ({totalInsights})
            </button>
            {metricKinds.map((kind) => (
              <button
                type="button"
                key={kind}
                className={
                  metricFilter === kind
                    ? 'conv-dashboard-chip conv-dashboard-chip--active'
                    : 'conv-dashboard-chip'
                }
                onClick={() => onMetricFilterChange(kind)}
              >
                {kindLabel(kind)} ({kindCounts[kind] ?? 0})
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

ConversationDashboardHero.propTypes = {
  summary: PropTypes.shape({
    insightCount: PropTypes.number,
    runCount: PropTypes.number,
    kindCount: PropTypes.number,
  }).isRequired,
  runsForFilter: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedRunId: PropTypes.string,
  onRunChange: PropTypes.func.isRequired,
  runOptionLabel: PropTypes.func.isRequired,
  metricFilter: PropTypes.string.isRequired,
  metricKinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  kindCounts: PropTypes.object.isRequired,
  totalInsights: PropTypes.number.isRequired,
  onMetricFilterChange: PropTypes.func.isRequired,
}
