import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Card } from '@/ui'
import { runDisplayName } from '@/utils/conversationDashboard'

export function ConversationRunLinkBar({ run, className = '' }) {
  if (!run?.id) return null

  return (
    <Card className={`conv-run-link-bar ${className}`.trim()}>
      <p className="conv-run-link-bar__text">
        Análisis técnico completo en el historial
        {runDisplayName(run) ? ` · ${runDisplayName(run)}` : ''}.
      </p>
      <Link to={`/historial/${run.id}`} className="conv-run-link-bar__link">
        Ver análisis técnico de esta ejecución →
      </Link>
    </Card>
  )
}

ConversationRunLinkBar.propTypes = {
  run: PropTypes.shape({
    id: PropTypes.string,
    project_name: PropTypes.string,
    source_name: PropTypes.string,
    modality: PropTypes.string,
  }),
  className: PropTypes.string,
}
