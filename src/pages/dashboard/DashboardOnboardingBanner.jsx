import PropTypes from 'prop-types'

export function DashboardOnboardingBanner({ onDismiss }) {
  return (
    <div className="onboarding-banner" role="region" aria-label="Guía rápida">
      <div className="onboarding-banner-body">
        <h2>¿Qué hace esta herramienta?</h2>
        <ol className="onboarding-steps">
          <li>Pulsa «Preparar datos» y ejecuta el análisis (paso 1).</li>
          <li>Explora con chat y agentes; guarda hallazgos con «Seleccionar» (paso 2).</li>
          <li>Consolida en el dashboard conversacional (paso 3).</li>
          <li>Publica en Metabase BI para informes y gráficos de SLA/riesgo (paso 4).</li>
        </ol>
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
