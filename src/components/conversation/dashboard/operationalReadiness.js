function asList(value) {
  return Array.isArray(value) ? value : []
}

export function readinessStatusLabel(status, isExpertMode) {
  const text = String(status || 'limited').toLowerCase()
  if (text === 'operational') return isExpertMode ? 'Operativo con evidencia' : 'Listo para decidir'
  if (text === 'interpretive') return isExpertMode ? 'Soporte parcial' : 'Revisar antes de decidir'
  return isExpertMode ? 'Contexto limitado' : 'Falta evidencia'
}

export function readinessStatusClass(status) {
  const text = String(status || 'limited').toLowerCase()
  if (text === 'operational' || text === 'interpretive' || text === 'limited') return text
  return 'limited'
}

export function runScopeLabel(readiness, isExpertMode) {
  const scope = String(readiness?.run_scope || '').toLowerCase()
  const count = asList(readiness?.run_ids).length
  if (scope === 'single_run') {
    return isExpertMode ? `Ejecucion aislada: ${readiness.active_run_id || 'actual'}` : 'Una ejecucion activa'
  }
  if (scope === 'multi_run') {
    return isExpertMode
      ? `${count || readiness?.evidence_runs || 0} ejecuciones combinadas`
      : 'Varias ejecuciones combinadas'
  }
  return isExpertMode ? 'Sin ejecucion activa' : 'Sin ejecucion seleccionada'
}

export function evidenceModeLabel(mode, isExpertMode) {
  const text = String(mode || 'interpretive').toLowerCase()
  if (text === 'materialized') {
    return isExpertMode ? 'Evidencia materializada' : 'Casos reales listos'
  }
  if (text === 'partial') {
    return isExpertMode ? 'Evidencia parcial' : 'Base incompleta'
  }
  return isExpertMode ? 'Lectura interpretativa' : 'Solo orientativo'
}

export function trustLevelLabel(level, isExpertMode) {
  const text = String(level || 'baja').toLowerCase()
  if (text === 'alta') return 'Confianza alta'
  if (text === 'media') return isExpertMode ? 'Confianza media' : 'Revisar evidencia'
  return isExpertMode ? 'Confianza baja' : 'No usar sin revisar'
}

export function normalizeOperationalReadiness(readinessPayload, { selectedRunId = '', fallbackInsightsCount = 0 } = {}) {
  const readiness = readinessPayload ?? {}
  return {
    status: readiness.status || 'limited',
    run_scope: readiness.run_scope || (selectedRunId ? 'single_run' : 'multi_run'),
    active_run_id: readiness.active_run_id || '',
    run_ids: asList(readiness.run_ids),
    decision_level: readiness.decision_level || 'interpretive',
    evidence_mode: readiness.evidence_mode || 'interpretive',
    trust_level: readiness.trust_level || 'baja',
    evidence_materialized: Boolean(readiness.evidence_materialized),
    evidence_records: Number(readiness.evidence_records || 0),
    evidence_runs: Number(readiness.evidence_runs || 0),
    selected_insights: Number(readiness.selected_insights || fallbackInsightsCount || 0),
    semantic_dictionary_configured: Boolean(readiness.semantic_dictionary_configured),
    semantic_dictionary_source: readiness.semantic_dictionary_source || '',
    semantic_dictionary_total: Number(readiness.semantic_dictionary_total || 0),
    semantic_dictionary_configured_count: Number(readiness.semantic_dictionary_configured_count || 0),
    semantic_dictionary_active_count: Number(readiness.semantic_dictionary_active_count || 0),
    semantic_dictionary_inactive_count: Number(readiness.semantic_dictionary_inactive_count || 0),
    llm_validated: Boolean(readiness.llm_validated),
    summary: readiness.summary || '',
    functional_message: readiness.functional_message || '',
    expert_message: readiness.expert_message || '',
    recommended_next_step: readiness.recommended_next_step || '',
    warnings: asList(readiness.warnings),
    blocking_reasons: asList(readiness.blocking_reasons),
    required_actions: asList(readiness.required_actions),
  }
}

export function visibleReadinessWarnings(readiness, { isExpertMode, runScopeMismatch, textForProfile }) {
  const warnings = runScopeMismatch
    ? [
        'La respuesta recibida no coincide con la ejecucion seleccionada; actualiza antes de decidir.',
        ...readiness.warnings,
      ]
    : readiness.warnings

  return warnings
    .map((warning) => textForProfile(warning, isExpertMode))
    .filter(Boolean)
    .slice(0, isExpertMode ? 5 : 2)
}

export function visibleReadinessActions(readiness, { isExpertMode, textForProfile }) {
  return readiness.required_actions
    .map((action) => textForProfile(action, isExpertMode))
    .filter(Boolean)
    .slice(0, isExpertMode ? 5 : 2)
}
