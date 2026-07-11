export const DASHBOARD_SCHEMA_VERSION = 'conversation-dashboard/v1'

const BLOCKING_FLAGS = new Set([
  'missing_variable',
  'invalid_chart_type',
  'unlinked_chart',
  'requires_data',
])

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : [])

export function normalizeDashboardSpecContract(rawSpec) {
  const spec = rawSpec && typeof rawSpec === 'object' ? rawSpec : {}
  const schemaVersion = spec.schema_version || DASHBOARD_SCHEMA_VERSION
  const warnings = asList(spec.contract_warnings)
  const riskFlags = asList(spec.llm_risk_flags)
  const isSupported = schemaVersion === DASHBOARD_SCHEMA_VERSION
  const hasBlockingRisk = riskFlags.some((flag) => BLOCKING_FLAGS.has(flag))
  const status = !isSupported
    ? 'unsupported'
    : spec.contract_status || (hasBlockingRisk || warnings.length > 0 ? 'warning' : 'valid')

  const versionWarnings = isSupported
    ? warnings
    : [`Version de dashboard no soportada: ${schemaVersion}. Esperada: ${DASHBOARD_SCHEMA_VERSION}.`]

  return {
    spec: {
      ...spec,
      schema_version: schemaVersion,
      contract_status: status,
      contract_warnings: versionWarnings,
      llm_risk_flags: riskFlags,
    },
    status,
    warnings: versionWarnings,
    riskFlags,
    isSupported,
  }
}

export function dashboardContractLabel(contract, isExpertMode) {
  if (!contract?.isSupported) {
    return 'Contrato no compatible'
  }
  if (contract.status === 'warning') {
    return isExpertMode ? 'Contrato validado con advertencias' : 'Sugerencias ajustadas con datos disponibles'
  }
  return isExpertMode ? 'Contrato validado' : 'Listo para analizar'
}

export function dashboardContractMessage(contract, isExpertMode) {
  if (!contract?.isSupported) {
    return contract?.warnings?.[0] || 'La version del dashboard no es compatible.'
  }
  if (contract.status !== 'warning') {
    return isExpertMode
      ? 'El backend valido la especificacion analitica y las visualizaciones antes de renderizar.'
      : 'Las recomendaciones visibles usan datos disponibles y evidencia trazable.'
  }
  if (!isExpertMode) {
    return 'El sistema oculto o ajusto sugerencias que no tenian datos suficientes para evitar conclusiones confusas.'
  }
  return contract.warnings.slice(0, 3).join(' ')
}
