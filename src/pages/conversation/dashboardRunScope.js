export function buildChartRequestIdentity({ runId, requestKey, refreshKey }) {
  return [runId || 'no-run', requestKey || 'no-request', refreshKey ?? 0].join(':')
}

export function responseBelongsToRun(responseRunId, activeRunId) {
  if (!responseRunId || !activeRunId) return true
  return String(responseRunId) === String(activeRunId)
}

export function runMismatchMessage({ isExpertMode = false } = {}) {
  return isExpertMode
    ? 'La respuesta pertenece a otra ejecucion. Se descarto para evitar mezclar dataset, evidencias, graficos o tickets entre runs.'
    : 'La vista devolvio datos de otra ejecucion y fue bloqueada. Actualiza o selecciona nuevamente el analisis.'
}

export function resetTicketFilterState(setters) {
  setters.setTicketSearch('')
  setters.setTicketPriorityFilter('all')
  setters.setTicketServiceFilter('all')
  setters.setTicketCategoryFilter('all')
  setters.setTicketStatusFilter('all')
  setters.setSelectedBackendTicketKeys(new Set())
}

export function resetRunDerivedDashboardState(setters, options = {}) {
  setters.setMetricFilter('all')
  setters.setActiveInsightKey('')
  setters.setSelectedKeys(new Set())
  setters.setListPage(0)
  setters.setActiveVisualizationId('')
  setters.setActiveChartRendererId('')
  setters.setActiveRecommendationId('')
  setters.setActivePriorityLevel('')
  setters.setActiveConclusionId('')
  setters.setActiveChartConclusionId('')
  if (options.bumpChartRefresh !== false) {
    setters.setChartRefreshKey((current) => current + 1)
  }
  setters.setChartNotice('')
  setters.setChartEvidenceOpen(false)
  setters.setChartBackendData(null)
  setters.setChartBackendLoading(false)
  setters.setChartBackendError('')
  setters.setActiveBackendSegmentKey('')
  resetTicketFilterState(setters)
  setters.setFeedbackReasonState({})
  setters.setSavedOperationState({ status: 'idle', key: '' })
  setters.setDetailOpen(false)
  setters.setSavedInsightsOpen(false)
  setters.setChatExternalPrompt(null)
  setters.setSemanticDictionaryState?.(null)
  setters.setSemanticDraftRows?.([])
  setters.setSemanticDictionaryLoading?.(false)
  setters.setSemanticDictionarySaving?.(false)
  setters.setSemanticDictionaryError?.('')
}
