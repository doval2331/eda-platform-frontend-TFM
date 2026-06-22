import PropTypes from 'prop-types'
import { priorityClassName, priorityLabel } from '@/utils/strategyPresentation'

export function PriorityChip({ level }) {
  const className = priorityClassName(level)
  return <span className={`agent-priority agent-priority--${className}`}>{priorityLabel(level)}</span>
}

PriorityChip.propTypes = {
  level: PropTypes.string,
}
