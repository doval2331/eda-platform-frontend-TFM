import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Card } from '@/ui'
import { BI_GUIDE_QUESTIONS } from './metabaseGuide'
import { MetabaseStatusBadge } from './MetabaseStatusBadge'

export function MetabaseBiGuidePanel({ guideMessages, metabaseTarget, postgresOk, onAsk }) {
  return (
    <Card className="metabase-bi-guide">
      <div className="metabase-panel-head">
        <div>
          <h2>Exploraci&oacute;n guiada de BI</h2>
          <p>
            Usa esta gu&iacute;a para transformar la publicaci&oacute;n t&eacute;cnica en pasos concretos:
            qu&eacute; validar, qu&eacute; preguntar en Metabase y c&oacute;mo explicar los resultados.
          </p>
        </div>
        <MetabaseStatusBadge value={postgresOk ? 'ok' : 'unknown'} />
      </div>

      <div className="metabase-guide-suggestions" aria-label="Preguntas guiadas sobre BI">
        {BI_GUIDE_QUESTIONS.map((question) => (
          <button type="button" key={question} onClick={() => onAsk(question)}>
            {question}
          </button>
        ))}
      </div>

      <div className="metabase-guide-thread" aria-live="polite">
        {guideMessages.map((message, index) => (
          <div
            className={
              message.role === 'assistant'
                ? 'metabase-guide-message metabase-guide-message--assistant'
                : 'metabase-guide-message metabase-guide-message--user'
            }
            key={`${message.role}-${index}`}
          >
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      <div className="metabase-guide-actions">
        <Link to="/" className="decision-link">
          Volver a explorar
        </Link>
        <Link to="/dashboard-conversacional" className="decision-link">
          Ver dashboard conversacional
        </Link>
        {metabaseTarget ? (
          <a className="decision-link" href={metabaseTarget} target="_blank" rel="noreferrer">
            Abrir Metabase
          </a>
        ) : null}
      </div>
    </Card>
  )
}

MetabaseBiGuidePanel.propTypes = {
  guideMessages: PropTypes.arrayOf(
    PropTypes.shape({
      role: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
  ).isRequired,
  metabaseTarget: PropTypes.string,
  postgresOk: PropTypes.bool,
  onAsk: PropTypes.func.isRequired,
}
