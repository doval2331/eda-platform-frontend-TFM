import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { SparkleIcon } from '@/components/LlmVisual'
import { buildChatPrompt } from '@/utils/conversationDashboard'
import { metabaseLinkState } from '@/utils/biFlow'

export function ConversationDashboardFooter({
  selectedInsights = [],
  activeRunId = '',
}) {
  const navigate = useNavigate()
  const selectedCount = selectedInsights.length
  const targetRunId = activeRunId || selectedInsights[0]?.run_id || ''

  function handleOpenChat() {
    if (!targetRunId) return
    navigate(`/historial/${targetRunId}`, {
      state: {
        openChat: true,
        chatPrompt: buildChatPrompt(selectedInsights),
      },
    })
  }

  return (
    <footer className="insights-phase-footer conv-dashboard-footer">
      <div className="insights-phase-footer__copy">
        <strong>
          {selectedCount > 0
            ? `${selectedCount} evidencia${selectedCount === 1 ? '' : 's'} seleccionada${selectedCount === 1 ? '' : 's'}`
            : 'Selecciona evidencias para profundizar'}
        </strong>
        <span>
          {selectedCount > 0
            ? 'Lleva un resumen al chat de la ejecuci\u00f3n para investigar causas y servicios afectados.'
            : 'Marca una o varias evidencias de la lista antes de continuar.'}
        </span>
      </div>
      <div className="insights-phase-footer__actions">
        <button
          type="button"
          className="insights-phase-footer__cta insights-phase-footer__cta--secondary"
          disabled={selectedCount === 0}
          onClick={() =>
            navigate('/metabase', {
              state: metabaseLinkState({ runId: targetRunId, fromStep: 'consolidate' }),
            })
          }
        >
          Paso 4: Metabase BI
        </button>
        <button
          type="button"
          className="insights-phase-footer__cta"
          disabled={selectedCount === 0 || !targetRunId}
          onClick={handleOpenChat}
        >
          <SparkleIcon size={14} /> Llevar al chat
        </button>
      </div>
    </footer>
  )
}

ConversationDashboardFooter.propTypes = {
  selectedInsights: PropTypes.arrayOf(PropTypes.object),
  activeRunId: PropTypes.string,
}
