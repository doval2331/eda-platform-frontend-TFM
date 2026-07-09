import PropTypes from 'prop-types'
import { Card } from '@/ui'
import { ConversationSemanticDictionaryEditor } from './ConversationSemanticDictionaryEditor'

function ContractBanner({ contract, isExpertMode }) {
  const className = `dashboard-spec-contract-banner${
    contract.status === 'warning' ? ' dashboard-spec-contract-banner--warning' : ''
  }${contract.status === 'unsupported' ? ' dashboard-spec-contract-banner--danger' : ''}`

  return (
    <div className={className}>
      <strong>{contract.label}</strong>
      <span>{contract.message}</span>
      {isExpertMode ? <small>Schema: {contract.schemaVersion}</small> : null}
    </div>
  )
}

function EvidenceReadinessBanner({ readiness, isExpertMode }) {
  const hasEvidence = readiness.evidenceMaterialized
  const variant = hasEvidence
    ? 'operational'
    : readiness.statusClass === 'limited'
      ? 'limited'
      : 'interpretive'
  const title = hasEvidence
    ? isExpertMode
      ? 'Evidencia real materializada'
      : 'Casos reales disponibles'
    : isExpertMode
      ? 'Sin evidencia materializada suficiente'
      : 'Lectura orientativa, no decision final'
  const body = hasEvidence
    ? isExpertMode
      ? 'El dashboard puede conectar graficos, muestras y drill-down con evidencias reales de la ejecucion activa.'
      : 'Puedes abrir casos relacionados, revisar evidencias y pedir una accion concreta al agente.'
    : isExpertMode
      ? 'El dashboard puede explicar patrones, pero faltan tickets/evidencias reales para operar con trazabilidad completa.'
      : 'El analisis ayuda a orientar la revision, pero antes de decidir conviene guardar hallazgos o generar evidencias revisables.'

  return (
    <div className={`dashboard-spec-evidence-state dashboard-spec-evidence-state--${variant}`}>
      <div>
        <span>{title}</span>
        <strong>{readiness.evidenceLabel}</strong>
        <p>{body}</p>
      </div>
      <div className="dashboard-spec-evidence-state__meta">
        <span>{readiness.scopeLabel}</span>
        <span>{readiness.decisionLabel}</span>
      </div>
    </div>
  )
}

function DetailPanel({
  detail,
  isExpertMode,
  semanticEditor,
  onQuestionClick,
  onTechnicalVisualizationClick,
}) {
  if (!detail.open) return null

  return (
    <div className="dashboard-spec-detail-panel">
      <div className="dashboard-spec-detail-grid">
        <Card>
          <h3 className="dashboard-spec-panel-title dashboard-spec-panel-title--evidence">
            {detail.evidenceTitle}
          </h3>
          <ol className="dashboard-spec-evidence-list">
            {detail.evidenceItems.length ? (
              detail.evidenceItems.map((step) => (
                <li key={step.id}>
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                  {isExpertMode && step.sourceLabel ? <small>{step.sourceLabel}</small> : null}
                </li>
              ))
            ) : (
              <li>
                <strong>Sin detalle</strong>
                <span>El endpoint no devolvio pasos de evidencia.</span>
              </li>
            )}
          </ol>
        </Card>

        <Card>
          <h3 className="dashboard-spec-panel-title">{detail.questionsTitle}</h3>
          <div className="dashboard-spec-question-list">
            {detail.questions.length ? (
              detail.questions.map((question) => (
                <button type="button" key={question} onClick={() => onQuestionClick(question)}>
                  {question}
                </button>
              ))
            ) : (
              <span>No hay preguntas sugeridas para este modo.</span>
            )}
          </div>
        </Card>

        <Card className="dashboard-spec-technical-card">
          <h3 className="dashboard-spec-panel-title">{detail.semanticTitle}</h3>
          {isExpertMode && detail.semanticDescription ? (
            <p className="dashboard-spec-muted">{detail.semanticDescription}</p>
          ) : null}
          {isExpertMode && semanticEditor ? (
            <ConversationSemanticDictionaryEditor {...semanticEditor} />
          ) : detail.semanticItems.length ? (
            <div className="dashboard-spec-technical-list">
              {detail.semanticItems.map((item) => (
                <div key={item.id} className="dashboard-spec-technical-item dashboard-spec-semantic-item">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                    {item.warning ? <small>{item.warning}</small> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-spec-muted">No hay diccionario semantico para este run.</p>
          )}
        </Card>

        {isExpertMode ? (
          <Card className="dashboard-spec-technical-card">
            <h3 className="dashboard-spec-panel-title">{detail.technicalVisualizationsTitle}</h3>
            {detail.technicalVisualizations.length ? (
              <div className="dashboard-spec-technical-list">
                {detail.technicalVisualizations.map((visualization) => (
                  <div key={visualization.id} className="dashboard-spec-technical-item">
                    <div>
                      <strong>{visualization.title}</strong>
                      <span>{visualization.meta}</span>
                    </div>
                    <button
                      type="button"
                      disabled={visualization.disabled}
                      onClick={() => onTechnicalVisualizationClick(visualization.source)}
                    >
                      Crear grafico
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-spec-muted">
                El agente no devolvio visualizaciones tecnicas para este dashboard.
              </p>
            )}
          </Card>
        ) : null}

        {isExpertMode && detail.usageItems.length ? (
          <Card className="dashboard-spec-technical-card dashboard-spec-usage-card">
            <h3 className="dashboard-spec-panel-title">{detail.usageTitle}</h3>
            {detail.usageDescription ? (
              <p className="dashboard-spec-muted">{detail.usageDescription}</p>
            ) : null}
            <div className="dashboard-spec-usage-grid">
              {detail.usageItems.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            {detail.usageRecent.length ? (
              <div className="dashboard-spec-usage-recent">
                {detail.usageRecent.map((event) => (
                  <span key={event.id}>{event.label}</span>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export function ConversationExecutiveSummary({
  isExpertMode = false,
  title,
  description,
  profileLabel,
  evidenceCount,
  detailOpen,
  contract,
  context,
  readiness,
  detail,
  semanticEditor,
  onOpenEvidenceBase,
  onToggleDetail,
  onQuestionClick,
  onTechnicalVisualizationClick,
}) {
  return (
    <section className="dashboard-spec-shell">
      <div className="dashboard-spec-section-head dashboard-spec-section-head--split">
        <div>
          <span className="dashboard-spec-eyebrow">Dashboard generado por agente</span>
          <h2>{title}</h2>
          <p className="dashboard-spec-muted dashboard-spec-agent-bridge">{description}</p>
        </div>
        <div className="dashboard-spec-actions">
          <span
            className={`dashboard-spec-profile-badge${
              isExpertMode ? ' dashboard-spec-profile-badge--expert' : ''
            }`}
          >
            {profileLabel}
          </span>
          <button type="button" className="dashboard-spec-outline-button" onClick={onOpenEvidenceBase}>
            Base de evidencia ({evidenceCount})
          </button>
          <button type="button" className="dashboard-spec-outline-button" onClick={onToggleDetail}>
            {detailOpen ? 'Cerrar detalle' : 'Ver detalle'}
          </button>
        </div>
      </div>

      <ContractBanner contract={contract} isExpertMode={isExpertMode} />
      <EvidenceReadinessBanner readiness={readiness} isExpertMode={isExpertMode} />

      <Card className="dashboard-spec-context-panel">
        <h3 className="dashboard-spec-panel-title">{context.title}</h3>
        <div className="dashboard-spec-context-metrics">
          {context.metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>

        <div className={`dashboard-spec-readiness dashboard-spec-readiness--${readiness.statusClass}`}>
          <div className="dashboard-spec-readiness__copy">
            <span>{readiness.title}</span>
            <strong>{readiness.label}</strong>
            <p>{readiness.summary}</p>
            {readiness.nextStep ? <em>{readiness.nextStep}</em> : null}
          </div>
          <div className="dashboard-spec-readiness__signals">
            {readiness.signals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          {readiness.warnings.length ? (
            <ul className="dashboard-spec-readiness__warnings">
              {readiness.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <ol className="dashboard-spec-context-list">
          <li>
            <strong>{context.objective}</strong>
            <span>{context.summary}</span>
          </li>
        </ol>
        {context.tags.length ? (
          <div className="dashboard-spec-chip-row">
            {context.tags.map((item) => (
              <span key={item.name} title={item.title}>
                {item.label}
                {isExpertMode && item.role ? <small>{item.role}</small> : null}
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      <DetailPanel
        detail={detail}
        isExpertMode={isExpertMode}
        semanticEditor={semanticEditor}
        onQuestionClick={onQuestionClick}
        onTechnicalVisualizationClick={onTechnicalVisualizationClick}
      />
    </section>
  )
}

ContractBanner.propTypes = {
  contract: PropTypes.shape({
    status: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    schemaVersion: PropTypes.string.isRequired,
  }).isRequired,
  isExpertMode: PropTypes.bool,
}

EvidenceReadinessBanner.propTypes = {
  readiness: PropTypes.shape({
    statusClass: PropTypes.string.isRequired,
    evidenceMaterialized: PropTypes.bool,
    evidenceLabel: PropTypes.string.isRequired,
    scopeLabel: PropTypes.string.isRequired,
    decisionLabel: PropTypes.string.isRequired,
  }).isRequired,
  isExpertMode: PropTypes.bool,
}

DetailPanel.propTypes = {
  detail: PropTypes.shape({
    open: PropTypes.bool.isRequired,
    evidenceTitle: PropTypes.string.isRequired,
    evidenceItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    questionsTitle: PropTypes.string.isRequired,
    questions: PropTypes.arrayOf(PropTypes.string).isRequired,
    semanticTitle: PropTypes.string.isRequired,
    semanticDescription: PropTypes.string,
    semanticItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    technicalVisualizationsTitle: PropTypes.string.isRequired,
    technicalVisualizations: PropTypes.arrayOf(PropTypes.object).isRequired,
    usageTitle: PropTypes.string.isRequired,
    usageDescription: PropTypes.string,
    usageItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    usageRecent: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  isExpertMode: PropTypes.bool,
  semanticEditor: PropTypes.object,
  onQuestionClick: PropTypes.func.isRequired,
  onTechnicalVisualizationClick: PropTypes.func.isRequired,
}

ConversationExecutiveSummary.propTypes = {
  isExpertMode: PropTypes.bool,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  profileLabel: PropTypes.string.isRequired,
  evidenceCount: PropTypes.number.isRequired,
  detailOpen: PropTypes.bool.isRequired,
  contract: ContractBanner.propTypes.contract,
  context: PropTypes.shape({
    title: PropTypes.string.isRequired,
    metrics: PropTypes.arrayOf(PropTypes.object).isRequired,
    objective: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    tags: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
  readiness: PropTypes.shape({
    statusClass: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    evidenceMaterialized: PropTypes.bool,
    evidenceLabel: PropTypes.string.isRequired,
    scopeLabel: PropTypes.string.isRequired,
    decisionLabel: PropTypes.string.isRequired,
    nextStep: PropTypes.string,
    signals: PropTypes.arrayOf(PropTypes.string).isRequired,
    warnings: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  detail: DetailPanel.propTypes.detail,
  semanticEditor: PropTypes.object,
  onOpenEvidenceBase: PropTypes.func.isRequired,
  onToggleDetail: PropTypes.func.isRequired,
  onQuestionClick: PropTypes.func.isRequired,
  onTechnicalVisualizationClick: PropTypes.func.isRequired,
}
