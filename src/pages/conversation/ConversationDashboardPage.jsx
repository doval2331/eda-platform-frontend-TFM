import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnalysisFlowStrip, MetabaseFlowCTA } from '@/components/bi'
import {
  ConversationDashboardFooter,
  ConversationDashboardHero,
  ConversationClusterRiskChart,
  ConversationClusterVolumeChart,
  ConversationDimensionChart,
  ConversationDimensionTreemap,
  ConversationEvidenceChart,
  ConversationInsightImpactChart,
  ConversationInsightTable,
  ConversationMetricMixChart,
  ConversationPriorityChart,
  ConversationRankingChart,
  ConversationReadingPanel,
  ConversationRunLinkBar,
  ConversationScatterChart,
  ConversationDashboardToolbar,
} from '@/components/conversation'
import { InsightListPagination } from '@/components/agent'
import { useConversationDashboard, useRunsList } from '@/hooks/queries'
import { Card, Feedback, LoadingPanel, LoadingSlot, PageNavbar } from '@/ui'
import {
  buildDecisionReading,
  buildRunsForFilter,
  countInsightsByKind,
  DASHBOARD_PAGE_SIZE,
  formatMetric,
  hasClusterInsightData,
  hasDimensionEvidenceData,
  hasInsightImpactData,
  hasSegmentedDimensionData,
  insightKey,
  metricKind,
  paginateDashboardList,
  runOptionLabel,
  summarize,
  summarizeClusterCoverage,
} from '@/utils/conversationDashboard'
import '@/styles/llm-visual.css'

export function ConversationDashboardPage({ embedded = false, toolbarHost = null }) {
  const location = useLocation()
  const [selectedRunId, setSelectedRunId] = useState('')
  const [metricFilter, setMetricFilter] = useState('all')
  const [activeInsightKey, setActiveInsightKey] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [listPage, setListPage] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const {
    data: dashboard = { total: 0, insights: [] },
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    isFetching: dashboardFetching,
  } = useConversationDashboard()

  const {
    data: runs = [],
    isLoading: runsLoading,
    refetch: refetchRuns,
    isFetching: runsFetching,
  } = useRunsList(50)

  const loading = dashboardLoading || runsLoading
  const isSoftLoading = refreshing || dashboardFetching || runsFetching
  const queryErrorMessage =
    dashboardError instanceof Error
      ? dashboardError.message
      : dashboardError
        ? 'No se pudo cargar el dashboard'
        : null
  const displayError = error ?? queryErrorMessage

  useEffect(() => {
    if (embedded) return
    setSelectedRunId('')
    setMetricFilter('all')
  }, [embedded, location.pathname])

  const allInsights = useMemo(() => dashboard.insights ?? [], [dashboard.insights])
  const insights = useMemo(() => {
    if (!selectedRunId) return allInsights
    return allInsights.filter((item) => item.run_id === selectedRunId)
  }, [allInsights, selectedRunId])
  const isPageLoading = loading || isSoftLoading
  const loadingTitle =
    refreshing || (isSoftLoading && allInsights.length > 0)
      ? 'Actualizando hallazgos guardados…'
      : 'Cargando hallazgos guardados'
  const runsForFilter = useMemo(
    () => buildRunsForFilter(runs, allInsights),
    [runs, allInsights],
  )
  const kindCounts = useMemo(() => countInsightsByKind(insights), [insights])
  const metricKinds = useMemo(() => {
    return Object.keys(kindCounts).sort((a, b) => kindCounts[b] - kindCounts[a])
  }, [kindCounts])
  const filteredInsights = useMemo(() => {
    if (metricFilter === 'all') return insights
    return insights.filter((item) => metricKind(item.metric_label) === metricFilter)
  }, [insights, metricFilter])
  const summary = useMemo(() => summarize(filteredInsights), [filteredInsights])
  const paginatedInsights = useMemo(
    () => paginateDashboardList(filteredInsights, listPage, DASHBOARD_PAGE_SIZE),
    [filteredInsights, listPage],
  )
  const activeInsight = useMemo(() => {
    return (
      filteredInsights.find((item) => insightKey(item) === activeInsightKey) ??
      filteredInsights[0] ??
      null
    )
  }, [filteredInsights, activeInsightKey])
  const reading = useMemo(
    () => buildDecisionReading(filteredInsights, activeInsight),
    [filteredInsights, activeInsight],
  )
  const selectedInsights = useMemo(() => {
    return filteredInsights.filter((item) => selectedKeys.has(insightKey(item)))
  }, [filteredInsights, selectedKeys])
  const avgSlaLabel = formatMetric('sla_breach_rate', summary.avgSla)
  const avgRiskLabel = formatMetric('avg_risk', summary.avgRisk)
  const activeChartKey = activeInsight ? insightKey(activeInsight) : activeInsightKey
  const activeRunId = selectedRunId || activeInsight?.run_id || ''
  const activeRun = useMemo(
    () => runsForFilter.find((run) => run.id === activeRunId) ?? null,
    [runsForFilter, activeRunId],
  )
  const clusterCoverage = useMemo(
    () => summarizeClusterCoverage(filteredInsights),
    [filteredInsights],
  )
  const showClusterCharts = useMemo(
    () => hasClusterInsightData(filteredInsights),
    [filteredInsights],
  )
  const showBusinessCharts = useMemo(
    () =>
      hasSegmentedDimensionData(filteredInsights) ||
      hasDimensionEvidenceData(filteredInsights) ||
      hasInsightImpactData(filteredInsights),
    [filteredInsights],
  )

  function onRunChange(event) {
    const nextRunId = event.target.value
    setSelectedRunId(nextRunId)
    setMetricFilter('all')
    setActiveInsightKey('')
    setSelectedKeys(new Set())
    setListPage(0)
  }

  function onMetricFilterChange(kind) {
    setMetricFilter(kind)
    setActiveInsightKey('')
    setSelectedKeys(new Set())
    setListPage(0)
  }

  function toggleInsightSelection(item) {
    const key = insightKey(item)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSelectAllOnPage(pageItems) {
    const keys = pageItems.map((item) => insightKey(item))
    const allSelected = keys.length > 0 && keys.every((key) => selectedKeys.has(key))
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        keys.forEach((key) => next.delete(key))
      } else {
        keys.forEach((key) => next.add(key))
      }
      return next
    })
  }

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      await Promise.all([refetchDashboard(), refetchRuns()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div
      className={`conversation-dashboard-page${
        isPageLoading ? ' conversation-dashboard-page--loading' : ''
      }`}
    >
      {!embedded ? (
        <PageNavbar
          breadcrumbParent="Plataforma"
          breadcrumbCurrent="Dashboard conversacional"
          title="Tus hallazgos guardados"
          rightSlot={
            <ConversationDashboardToolbar
              runId={selectedRunId || activeInsight?.run_id}
              isLoading={isPageLoading}
              onRefresh={() => void handleRefresh()}
            />
          }
        />
      ) : (
        <ConversationDashboardToolbar
          embedded
          toolbarHost={toolbarHost}
          runId={selectedRunId || activeInsight?.run_id}
          isLoading={isPageLoading}
          onRefresh={() => void handleRefresh()}
        />
      )}

      {displayError ? <Feedback variant="danger" message={displayError} /> : null}

      {!embedded ? (
        <>
          <AnalysisFlowStrip currentStepId="consolidate" compact />
          {!isPageLoading && allInsights.length > 0 ? (
            <MetabaseFlowCTA
              variant="consolidate"
              runId={selectedRunId || activeInsight?.run_id}
            />
          ) : null}
        </>
      ) : null}

      {isPageLoading ? (
        <Card className="conv-dashboard-loading-card">
          <LoadingSlot variant="card">
            <LoadingPanel bare compact title={loadingTitle} />
          </LoadingSlot>
        </Card>
      ) : allInsights.length === 0 ? (
        <Card className="decision-empty">
          Todav&iacute;a no hay insights seleccionados. Ejecuta el pipeline, pregunta en el chat y
          usa el bot&oacute;n Seleccionar sobre los hallazgos relevantes.
        </Card>
      ) : (
        <>
          <ConversationDashboardHero
            summary={summary}
            runsForFilter={runsForFilter}
            selectedRunId={selectedRunId}
            onRunChange={onRunChange}
            runOptionLabel={runOptionLabel}
            metricFilter={metricFilter}
            metricKinds={metricKinds}
            kindCounts={kindCounts}
            totalInsights={insights.length}
            onMetricFilterChange={onMetricFilterChange}
          />

          {insights.length === 0 ? (
            <Card className="decision-empty">
              No hay hallazgos guardados para esta ejecuci&oacute;n. Elige otra en el filtro superior.
            </Card>
          ) : filteredInsights.length === 0 ? (
            <Card className="decision-empty">No hay insights para el filtro seleccionado.</Card>
          ) : (
            <>
          <div className="decision-kpis decision-kpis--dashboard">
            <Card className="decision-kpi">
              <span>Insights</span>
              <strong>{summary.insightCount}</strong>
            </Card>
            <Card className="decision-kpi">
              <span>Ejecuciones</span>
              <strong>{summary.runCount}</strong>
            </Card>
            <Card className="decision-kpi">
              <span>Tipos de hallazgo</span>
              <strong>{summary.kindCount}</strong>
            </Card>
            {avgSlaLabel ? (
              <Card className="decision-kpi">
                <span>SLA promedio</span>
                <strong>{avgSlaLabel}</strong>
              </Card>
            ) : null}
            {avgRiskLabel ? (
              <Card className="decision-kpi">
                <span>Riesgo promedio</span>
                <strong>{avgRiskLabel}</strong>
              </Card>
            ) : null}
            {clusterCoverage.totalRecords ? (
              <Card className="decision-kpi">
                <span>Registros en grupos guardados</span>
                <strong>{clusterCoverage.totalRecords.toLocaleString('es-ES')}</strong>
              </Card>
            ) : null}
          </div>

          <div className="conv-dashboard-main">
            <section className="conv-dashboard-list-panel" aria-label="Lista de hallazgos">
              <ConversationInsightTable
                items={paginatedInsights}
                allItems={filteredInsights}
                activeKey={activeChartKey}
                selectedKeys={selectedKeys}
                onSelect={(next) => setActiveInsightKey(insightKey(next))}
                onToggleCheck={toggleInsightSelection}
                onToggleSelectAll={toggleSelectAllOnPage}
              />

              <InsightListPagination
                page={listPage}
                pageSize={DASHBOARD_PAGE_SIZE}
                totalCount={filteredInsights.length}
                onPageChange={setListPage}
                itemLabel="hallazgos"
              />

              <ConversationDashboardFooter
                selectedInsights={selectedInsights}
                activeRunId={selectedRunId || activeInsight?.run_id}
              />
            </section>

            <aside className="conv-dashboard-side">
              <ConversationReadingPanel reading={reading} allItems={filteredInsights} />
            </aside>
          </div>

          <section className="conv-dashboard-analytics" aria-label="Visualizaciones analiticas">
            <ConversationRunLinkBar run={activeRun} />

            {showClusterCharts ? (
              <div className="conv-dashboard-insight-charts">
                <ConversationClusterVolumeChart
                  insights={filteredInsights}
                  activeKey={activeChartKey}
                  onSelect={setActiveInsightKey}
                />
                <ConversationClusterRiskChart
                  insights={filteredInsights}
                  activeKey={activeChartKey}
                  onSelect={setActiveInsightKey}
                />
              </div>
            ) : null}

            <ConversationScatterChart
              insights={filteredInsights}
              activeKey={activeChartKey}
              onSelect={setActiveInsightKey}
            />

            {showBusinessCharts ? (
              <div className="conv-dashboard-insight-charts">
                <ConversationDimensionChart insights={filteredInsights} />
                <ConversationDimensionTreemap insights={filteredInsights} />
                <ConversationEvidenceChart
                  insights={filteredInsights}
                  activeKey={activeChartKey}
                  onSelect={setActiveInsightKey}
                />
                <ConversationInsightImpactChart
                  insights={filteredInsights}
                  activeKey={activeChartKey}
                  onSelect={setActiveInsightKey}
                />
              </div>
            ) : null}

            <div className="conv-dashboard-insight-charts">
              <ConversationPriorityChart insights={filteredInsights} />
              <ConversationRankingChart
                insights={filteredInsights}
                activeKey={activeChartKey}
                onSelect={setActiveInsightKey}
              />
            </div>

            <div className="conv-dashboard-metric-mix-full">
              <ConversationMetricMixChart insights={filteredInsights} />
            </div>
          </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

ConversationDashboardPage.propTypes = {
  embedded: PropTypes.bool,
  toolbarHost: PropTypes.object,
}
