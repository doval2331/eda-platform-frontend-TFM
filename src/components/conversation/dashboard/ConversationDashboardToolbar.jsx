import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { MetabaseFlowNextLink } from '@/components/bi'
import { Button } from '@/ui'

export function ConversationDashboardToolbar({
  embedded = false,
  toolbarHost = null,
  runId = '',
  isLoading = false,
  onRefresh,
}) {
  const toolbar = (
    <div
      className={`conv-dashboard-toolbar${
        embedded ? ' conv-dashboard-toolbar--embedded' : ''
      }`}
    >
      {!embedded ? (
        <Link to="/" className="decision-link">
          Volver a explorar
        </Link>
      ) : null}
      <MetabaseFlowNextLink currentStepId="consolidate" runId={runId} />
      <Button
        type="button"
        variant="secondary"
        disabled={isLoading}
        onClick={onRefresh}
      >
        {isLoading ? 'Actualizando…' : 'Actualizar'}
      </Button>
    </div>
  )

  if (embedded && toolbarHost) {
    return createPortal(toolbar, toolbarHost)
  }

  return toolbar
}

ConversationDashboardToolbar.propTypes = {
  embedded: PropTypes.bool,
  toolbarHost: PropTypes.object,
  runId: PropTypes.string,
  isLoading: PropTypes.bool,
  onRefresh: PropTypes.func.isRequired,
}
