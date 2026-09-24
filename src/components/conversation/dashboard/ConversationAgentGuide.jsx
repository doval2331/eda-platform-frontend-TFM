import PropTypes from 'prop-types'
import { Card } from '@/ui'

export function ConversationAgentGuide({
  items = [],
  isExpertMode = false,
  onApply,
  onGraph,
  onChat,
  onAdd,
}) {
  if (!items.length) return null

  return (
    <section className="dashboard-spec-section dashboard-spec-guide-section">
      <div className="dashboard-spec-section-head">
        <div>
          <span className="dashboard-spec-eyebrow">
            {isExpertMode ? 'Guia del agente' : 'Ruta recomendada'}
          </span>
          <h2>Qué revisar primero</h2>
        </div>
      </div>
      <div className="dashboard-spec-list">
        {items.map((item) => (
          <Card
            key={item.id}
            className={`dashboard-spec-list-item${
              item.isActive ? ' dashboard-spec-list-item--active' : ''
            }`}
          >
            <span className="dashboard-spec-list-number">{item.number}</span>
            <div className="dashboard-spec-list-copy">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              {isExpertMode && item.nextStep ? <small>{item.nextStep}</small> : null}
            </div>
            <div className="dashboard-spec-list-actions">
              {isExpertMode ? (
                <button type="button" onClick={() => onApply(item)}>
                  {item.applyLabel}
                </button>
              ) : null}
              {item.graphReady ? (
                <button type="button" onClick={() => onGraph(item)}>
                  Ver grafico
                </button>
              ) : null}
              <button type="button" onClick={() => onChat(item)}>
                Preguntar al agente
              </button>
              {isExpertMode ? (
                <button type="button" onClick={() => onAdd(item)}>
                  Agregar
                </button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

ConversationAgentGuide.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      number: PropTypes.string.isRequired,
      isActive: PropTypes.bool,
      title: PropTypes.string.isRequired,
      body: PropTypes.string,
      nextStep: PropTypes.string,
      graphReady: PropTypes.bool,
      applyLabel: PropTypes.string,
    }),
  ),
  isExpertMode: PropTypes.bool,
  onApply: PropTypes.func.isRequired,
  onGraph: PropTypes.func.isRequired,
  onChat: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
}
