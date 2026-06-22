import PropTypes from 'prop-types'
import { formatMetric, kindLabel, metricKind } from '@/utils/conversationDashboard'

export function ConversationInsightRow({
  item,
  active,
  selected,
  onSelect,
  onToggleCheck,
}) {
  if (!item) return null

  const kind = metricKind(item.metric_label)
  const metricText = formatMetric(item.metric_label, item.metric_value)

  return (
    <article
      className={`conv-insight-row${active ? ' conv-insight-row--active' : ''}${
        selected ? ' conv-insight-row--selected' : ''
      }`}
    >
      <label className="conv-insight-row__check" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleCheck?.(item)}
          aria-label={`Seleccionar ${item.title}`}
        />
      </label>
      <button type="button" className="conv-insight-row__body" onClick={() => onSelect?.(item)}>
        <span className="conv-insight-row__meta">
          <span className="conv-insight-row__kind">{kindLabel(kind)}</span>
          {metricText ? <strong className="conv-insight-row__metric">{metricText}</strong> : null}
        </span>
        <span className="conv-insight-row__title">{item.title}</span>
        {item.description ? (
          <span className="conv-insight-row__description">{item.description}</span>
        ) : null}
      </button>
    </article>
  )
}

ConversationInsightRow.propTypes = {
  item: PropTypes.object,
  active: PropTypes.bool,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  onToggleCheck: PropTypes.func,
}
