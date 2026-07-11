import PropTypes from 'prop-types'

export function DashboardOnboardingBanner({ onDismiss }) {
  return (
    <div className="onboarding-banner" role="region" aria-label="Guia rapida">
      <div className="onboarding-banner-body">
        <h2>¿Qué hace esta herramienta?</h2>
        <p className="onboarding-intro">
          Convierte fuentes de incidencias en grupos, evidencias, visualizaciones y publicación BI.
        </p>
        <ol className="onboarding-steps">
          <li>
            <strong>Preparar:</strong> selecciona fuentes, columnas y parámetros del análisis.
          </li>
          <li>
            <strong>Analizar:</strong> la app perfila datos, agrupa incidencias y guarda evidencias.
          </li>
          <li>
            <strong>Explorar:</strong> revisa grupos, selecciona hallazgos y consulta al agente.
          </li>
          <li>
            <strong>Consolidar:</strong> lleva hallazgos al dashboard conversacional y a Metabase.
          </li>
        </ol>
        <div className="onboarding-highlights" aria-label="Aclaraciones del flujo">
          <span>
            <strong>Evidencia real:</strong> tickets y hallazgos guardados respaldan dashboard e
            informes.
          </span>
          <span>
            <strong>LLM asistido:</strong> el agente explica y sugiere; el backend valida variables.
          </span>
          <span>
            <strong>Perfiles:</strong> funcional prioriza decisiones; experto muestra trazabilidad.
          </span>
        </div>
      </div>
      <button type="button" className="onboarding-dismiss" onClick={onDismiss}>
        Entendido
      </button>
    </div>
  )
}

DashboardOnboardingBanner.propTypes = {
  onDismiss: PropTypes.func.isRequired,
}
