import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchConversationDashboard } from '@/api/conversation'
import { listRuns } from '@/api/pipeline'
import { AnalysisFlowStrip, MetabaseFlowCTA, MetabaseFlowNextLink } from '@/components/bi'
import { ConversationDashboardFooter } from '@/components/conversation/ConversationDashboardFooter'
import { ConversationDashboardHero } from '@/components/conversation/ConversationDashboardHero'
import { ConversationInsightTable } from '@/components/conversation/ConversationInsightTable'
import { ConversationMetricMixChart } from '@/components/conversation/ConversationMetricMixChart'
import { ConversationRankingChart } from '@/components/conversation/ConversationRankingChart'
import { ConversationReadingPanel } from '@/components/conversation/ConversationReadingPanel'
import { ConversationScatterChart } from '@/components/conversation/ConversationScatterChart'
import { InsightListPagination } from '@/components/agent/InsightListPagination'
import { Button, Card, Feedback, LoadingPanel, LoadingSlot, PageNavbar } from '@/ui'
import {
  buildDecisionReading,
  buildRunsForFilter,
  countInsightsByKind,
  DASHBOARD_PAGE_SIZE,
  formatMetric,
  insightKey,
  metricKind,
  paginateDashboardList,
  runOptionLabel,
  summarize,
} from '@/utils/conversationDashboard'
import '@/styles/llm-visual.css'

export function ConversationDashboardPage() {
  const location = useLocation()
  const [selectedRunId, setSelectedRunId] = useState('')
  const [metricFilter, setMetricFilter] = useState('all')
  const [activeInsightKey, setActiveInsightKey] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [listPage, setListPage] = useState(0)
  const [runs, setRuns] = useState([])
  const [dashboard, setDashboard] = useState({ total: 0, insights: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async (runId = '', { soft = false } = {}) => {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [dashboardData, runsData] = await Promise.all([
        fetchConversationDashboard(runId || undefined),
        listRuns(50),
      ])
      setDashboard(dashboardData ?? { total: 0, insights: [] })
      setRuns(runsData)
      setActiveInsightKey('')
      setSelectedKeys(new Set())
      setListPage(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard')
      setDashboard({ total: 0, insights: [] })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setSelectedRunId('')
    setMetricFilter('all')
    void loadDashboard('')
  }, [location.pathname, location.key, loadDashboard])

  const insights = useMemo(() => dashboard.insights ?? [], [dashboard.insights])
  const runsForFilter = useMemo(() => buildRunsForFilter(runs, insights), [runs, insights])
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

  function onRunChange(event) {
    const nextRunId = event.target.value
    setSelectedRunId(nextRunId)
    setMetricFilter('all')
    void loadDashboard(nextRunId, { soft: true })
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

  return (
    <div
      className={`conversation-dashboard-page${
        loading && insights.length === 0 ? ' conversation-dashboard-page--loading' : ''
      }${refreshing ? ' conversation-dashboard-page--refreshing' : ''}`}
    >
      <PageNavbar
        breadcrumbParent="Plataforma"
        breadcrumbCurrent="Dashboard conversacional"
        title="Tus hallazgos guardados"
        rightSlot={
          <div className="conv-dashboard-toolbar">
            <Link to="/" className="decision-link">
              Volver a explorar
            </Link>
            <MetabaseFlowNextLink
              currentStepId="consolidate"
              runId={selectedRunId || activeInsight?.run_id}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={loading || refreshing}
              onClick={() => loadDashboard(selectedRunId, { soft: true })}
            >
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </div>
        }
      />

      {error ? <Feedback variant="danger" message={error} /> : null}

      <AnalysisFlowStrip currentStepId="consolidate" compact />
      {insights.length > 0 ? (
        <MetabaseFlowCTA
          variant="consolidate"
          runId={selectedRunId || activeInsight?.run_id}
        />
      ) : null}

      {refreshing ? (
        <div className="conv-reload-toast" role="status" aria-live="polite">
          <LoadingPanel
            bare
            compact
            spinnerSize={64}
            title="Actualizando hallazgos guardados…"
          />
        </div>
      ) : null}

      {!loading && insights.length > 0 ? (
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
      ) : null}

      {loading && insights.length === 0 ? (
        <Card className="decision-empty decision-empty--loading">
          <LoadingSlot variant="card">
            <LoadingPanel bare compact title="Cargando hallazgos guardados" />
          </LoadingSlot>
        </Card>
      ) : insights.length === 0 ? (
        <Card className="decision-empty">
          Todav&iacute;a no hay insights seleccionados. Ejecuta el pipeline, pregunta en el chat y
          usa el bot&oacute;n Seleccionar sobre los hallazgos relevantes.
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
          </div>

          <div className="conv-dashboard-main">
            <section className="conv-dashboard-list-panel" aria-label="Lista de hallazgos">
              <ConversationInsightTable
                items={paginatedInsights}
                allItems={filteredInsights}
                activeKey={activeChartKey}
                selectedKeys={selectedKeys}
                refreshing={refreshing}
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
            <ConversationScatterChart
              insights={filteredInsights}
              activeKey={activeChartKey}
              onSelect={setActiveInsightKey}
            />

            <div className="decision-secondary-grid">
              <ConversationRankingChart
                insights={filteredInsights}
                activeKey={activeChartKey}
                onSelect={setActiveInsightKey}
              />
              <ConversationMetricMixChart insights={filteredInsights} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
