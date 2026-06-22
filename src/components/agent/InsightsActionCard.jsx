import PropTypes from 'prop-types'
import { INSIGHT_FILTER_OPTIONS } from '@/utils/insightPresentation'
import { SparkleIcon } from '@/components/LlmVisual'

export function InsightsActionCard({
  overview,
  insightFilter,
  onFilterChange,
  filterCounts = {},
  className = '',
}) {
  if (!overview) return null

  return (
    <article className={`insights-action-card insights-action-card--hero ${className}`.trim()}>
      <div className="insights-action-card__accent" aria-hidden />

      <div className="insights-action-card__shell">
        <header className="insights-action-card__top">
          <div className="insights-action-card__intro">
            <span className="insights-action-card__kicker">Paso 3 · Hallazgos</span>
            <h4 className="insights-action-card__title">Hallazgos por grupo</h4>
            <div className="insights-action-card__metrics" aria-label="Resumen de hallazgos">
              <span className="insights-action-card__metric">
                <strong>{overview.groupCount}</strong> grupos
              </span>
              <span className="insights-action-card__metric insights-action-card__metric--high">
                <strong>{overview.highPriorityCount}</strong> alta prioridad
              </span>
              <span className="insights-action-card__metric insights-action-card__metric--selected">
                <strong>{overview.selectedCount}</strong> seleccionados
              </span>
            </div>
          </div>

          <div className="insights-action-card__filters">
            <label className="insights-action-card__filter-label" htmlFor="insight-filter-select">
              Filtro
            </label>
            <select
              id="insight-filter-select"
              className="insights-action-card__filter-select"
              value={insightFilter}
              onChange={(event) => onFilterChange?.(event.target.value)}
            >
              {INSIGHT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {filterCounts[option.value] != null ? ` (${filterCounts[option.value]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="insights-action-card__lead">
          <span className="insights-action-card__lead-icon" aria-hidden>
            <SparkleIcon size={16} />
          </span>
          <p>
            Marca los grupos relevantes, revisa el detalle en el dialogo y confirma al final de la
            lista.
          </p>
        </div>

      </div>
    </article>
  )
}

InsightsActionCard.propTypes = {
  overview: PropTypes.object,
  insightFilter: PropTypes.string,
  onFilterChange: PropTypes.func,
  filterCounts: PropTypes.object,
  className: PropTypes.string,
}
