import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createMetabaseDashboard, fetchMetabaseStatus, syncBiTables } from '@/api/metabase'
import { AnalysisFlowStrip, MetabaseFlowCTA } from '@/components/bi'
import { Button, Card, Feedback, PageNavbar } from '@/ui'

const BI_GUIDE_QUESTIONS = [
  'Ya publique las tablas, que reviso primero?',
  'Que preguntas conviene crear en Metabase?',
  'Como valido que la publicacion sirvio?',
  'Que hago con los insights seleccionados?',
  'Que tablero conviene usar para explicar resultados?',
]

function tableCount(tableCounts, tableName) {
  const found = tableCounts.find(([name]) => name === tableName)
  return found ? Number(found[1]) : 0
}

function buildBiGuideAnswer(question, { status, syncResult, dashboardResult, tableCounts }) {
  const normalized = question.toLowerCase()
  const metabaseReady = status?.postgres_status === 'ok'
  const selectedInsights = tableCount(tableCounts, 'bi_selected_insights')
  const evidences = tableCount(tableCounts, 'bi_evidences')
  const clusters = tableCount(tableCounts, 'bi_cluster_summary')
  const published = syncResult?.status === 'ok' || evidences > 0 || clusters > 0
  const dashboardUrl = dashboardResult?.dashboard_url || status?.dashboard_url

  if (!metabaseReady) {
    return 'Primero hay que dejar disponible PostgreSQL BI. Cuando el estado aparezca OK, publica las tablas y despues crea o abre el dashboard de Metabase.'
  }

  if (!published && normalized.includes('publique')) {
    return 'Todavia no veo una publicacion reciente en esta pantalla. Presiona Publicar tablas BI y luego revisa los conteos generados para confirmar que Metabase tenga datos disponibles.'
  }

  if (normalized.includes('preguntas') || normalized.includes('crear')) {
    return 'En Metabase conviene crear preguntas simples y filtrables: SLA por servicio, volumen por prioridad, clusters con mayor incumplimiento, servicios con mayor riesgo, causas raiz frecuentes e insights seleccionados por run_id. Usa filtros por run_id, cluster_label, affected_service y severity.'
  }

  if (normalized.includes('valido') || normalized.includes('sirvio')) {
    if (!published) {
      return 'Para validar la publicacion, primero ejecuta Publicar tablas BI. Despues confirma que bi_evidences, bi_cluster_summary y bi_selected_insights tengan registros.'
    }
    return `Validacion rapida: hay ${evidences} registros publicados en bi_evidences, ${clusters} resumenes de cluster y ${selectedInsights} insights seleccionados. Si bi_selected_insights esta bajo, vuelve al chat, selecciona hallazgos y publica nuevamente.`
  }

  if (normalized.includes('insights')) {
    if (!selectedInsights) {
      return 'Todavia no hay insights seleccionados publicados. Vuelve a la exploracion conversacional, pregunta por SLA, clusters o alternativas de decision, selecciona hallazgos y vuelve a publicar las tablas BI.'
    }
    return `Hay ${selectedInsights} insights seleccionados. Usalos como hilo conductor: primero explica que pregunto el usuario, luego que hallazgos eligio y finalmente que tablero de Metabase permite profundizar cada metrica.`
  }

  if (normalized.includes('tablero') || normalized.includes('explicar') || normalized.includes('dashboard')) {
    if (dashboardUrl) {
      return 'Para explicar resultados, usa dos vistas: el Dashboard conversacional para mostrar la seleccion del usuario y Metabase para profundizar con filtros BI. En la defensa, esa combinacion muestra exploracion guiada y visualizacion curada.'
    }
    return 'Todavia falta crear el dashboard de Metabase. Presiona Crear dashboard en Metabase y despues usa esa vista junto con el Dashboard conversacional para explicar los hallazgos seleccionados.'
  }

  if (!published) {
    return 'Siguiente paso recomendado: publica las tablas BI. Despues revisa conteos, crea el dashboard en Metabase y valida que los filtros por run_id, servicio, prioridad y cluster funcionen.'
  }

  return `Revisaria primero tres cosas: 1) si bi_selected_insights tiene hallazgos para contar la historia del usuario; 2) si bi_cluster_summary permite explicar clusters criticos; 3) si bi_sla_by_category y bi_service_risk muestran donde priorizar acciones. Hoy la publicacion tiene ${evidences} evidencias y ${selectedInsights} insights seleccionados.`
}

function StatusBadge({ value }) {
  const normalized = value || 'unknown'
  return (
    <span className={`metabase-status metabase-status--${normalized}`}>
      {normalized}
    </span>
  )
}

export function MetabasePage() {
  const location = useLocation()
  const fromRunId = location.state?.fromRunId
  const [status, setStatus] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [dashboardResult, setDashboardResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [creatingDashboard, setCreatingDashboard] = useState(false)
  const [error, setError] = useState(null)
  const [guideMessages, setGuideMessages] = useState([
    {
      role: 'assistant',
      text: 'Puedo ayudarte a decidir que hacer despues de publicar las tablas BI: validar datos, crear preguntas en Metabase, explicar los insights seleccionados o preparar la defensa.',
    },
  ])

  async function loadStatus() {
    setLoading(true)
    setError(null)
    try {
      setStatus(await fetchMetabaseStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar Metabase')
    } finally {
      setLoading(false)
    }
  }

  async function publishAll() {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const result = await syncBiTables()
      setSyncResult(result)
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sincronizar BI')
    } finally {
      setSyncing(false)
    }
  }

  async function createDashboard() {
    setCreatingDashboard(true)
    setError(null)
    setDashboardResult(null)
    try {
      const result = await createMetabaseDashboard()
      setDashboardResult(result)
      await loadStatus()
      if (result.status === 'ok' && result.dashboard_url) {
        setStatus((previous) => ({
          ...(previous || {}),
          dashboard_url: result.dashboard_url,
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el dashboard')
    } finally {
      setCreatingDashboard(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadStatus)
  }, [])

  const metabaseTarget = status?.dashboard_url || status?.metabase_url
  const biReady = status?.enabled && status?.postgres_status === 'ok'
  const dashboardUrl = dashboardResult?.dashboard_url || status?.dashboard_url
  const canCreateDashboard = biReady && !syncing && !creatingDashboard
  const dashboardButtonLabel = dashboardUrl
    ? 'Actualizar dashboard en Metabase'
    : 'Crear dashboard en Metabase'
  const tableCounts = syncResult?.tables
    ? Object.entries(syncResult.tables).filter(([, count]) => count != null)
    : status?.tables
      ? Object.entries(status.tables).filter(([, count]) => count != null)
    : []

  function askBiGuide(question) {
    const answer = buildBiGuideAnswer(question, {
      status,
      syncResult,
      dashboardResult,
      tableCounts,
    })
    setGuideMessages((current) => [
      ...current,
      { role: 'user', text: question },
      { role: 'assistant', text: answer },
    ])
  }

  return (
    <div className="metabase-page">
      <PageNavbar
        breadcrumbParent="Plataforma"
        breadcrumbCurrent="Metabase BI"
        title="Paso 4 · Informes con Metabase"
        description="Publica datos analíticos en PostgreSQL y explora SLA, riesgo y clusters en un dashboard externo."
        rightSlot={
          <Button type="button" variant="secondary" onClick={loadStatus}>
            Actualizar
          </Button>
        }
      />

      {error ? <Feedback variant="danger" message={error} /> : null}

      <AnalysisFlowStrip currentStepId="report" />
      <MetabaseFlowCTA variant="metabase" runId={fromRunId} />
      {fromRunId ? (
        <Feedback
          variant="info"
          message={`Llegaste desde una ejecución con hallazgos. Tras publicar tablas BI, el dashboard usará la última ejecución sincronizada (referencia: ${fromRunId.slice(0, 8)}…).`}
        />
      ) : null}

      <div className="metabase-grid">
        <Card className="metabase-panel">
          <div className="metabase-panel-head">
            <div>
              <h2>Estado de integraci&oacute;n</h2>
              <p>
                La app consulta si la capa PostgreSQL para BI est&aacute; disponible y si la
                sincronizaci&oacute;n est&aacute; activa.
              </p>
            </div>
            <StatusBadge value={status?.postgres_status || (loading ? 'loading' : 'unknown')} />
          </div>

          <dl className="metabase-facts">
            <div>
              <dt>Sincronizaci&oacute;n BI</dt>
              <dd>{status?.enabled ? 'Activada' : 'Desactivada'}</dd>
            </div>
            <div>
              <dt>Metabase</dt>
              <dd>{status?.metabase_url || 'Sin configurar'}</dd>
            </div>
            <div>
              <dt>Dashboard configurado</dt>
              <dd>{status?.dashboard_url || 'Pendiente de crear en Metabase'}</dd>
            </div>
            <div>
              <dt>Detalle</dt>
              <dd>{status?.detail || 'Sin detalle'}</dd>
            </div>
          </dl>

          <div className="metabase-actions">
            <Button type="button" variant="primary" onClick={publishAll} disabled={syncing}>
              {syncing ? 'Sincronizando...' : 'Publicar tablas BI'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="metabase-dashboard-button"
              onClick={createDashboard}
              disabled={!canCreateDashboard}
              title={
                biReady
                  ? dashboardButtonLabel
                  : 'Primero publica las tablas BI y confirma que PostgreSQL aparezca en OK.'
              }
            >
              {creatingDashboard ? 'Creando dashboard...' : dashboardButtonLabel}
            </Button>
            {metabaseTarget ? (
              <a className="decision-link" href={metabaseTarget} target="_blank" rel="noreferrer">
                {status?.dashboard_url ? 'Abrir dashboard' : 'Abrir Metabase'}
              </a>
            ) : null}
          </div>
        </Card>

        <Card className="metabase-panel metabase-panel--guide">
          <h2>Tablas que debe usar Metabase</h2>
          <p>
            Conect&aacute; Metabase a PostgreSQL y cre&aacute; preguntas sobre estas tablas. Los
            filtros principales son <strong>run_id</strong>, <strong>cluster_label</strong>,{' '}
            <strong>category</strong>, <strong>severity</strong> y{' '}
            <strong>affected_service</strong>.
          </p>
          <ul className="metabase-table-list">
            <li>bi_runs</li>
            <li>bi_evidences</li>
            <li>bi_cluster_summary</li>
            <li>bi_sla_by_category</li>
            <li>bi_service_risk</li>
            <li>bi_selected_insights</li>
          </ul>
        </Card>
      </div>

      <Card className="metabase-bi-guide">
        <div className="metabase-panel-head">
          <div>
            <h2>Exploraci&oacute;n guiada de BI</h2>
            <p>
              Usa esta gu&iacute;a para transformar la publicaci&oacute;n t&eacute;cnica en pasos
              concretos: qu&eacute; validar, qu&eacute; preguntar en Metabase y c&oacute;mo explicar los
              resultados.
            </p>
          </div>
          <StatusBadge value={status?.postgres_status === 'ok' ? 'ok' : 'unknown'} />
        </div>

        <div className="metabase-guide-suggestions" aria-label="Preguntas guiadas sobre BI">
          {BI_GUIDE_QUESTIONS.map((question) => (
            <button type="button" key={question} onClick={() => askBiGuide(question)}>
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

      {syncResult ? (
        <Card className="metabase-sync-result">
          <div className="metabase-panel-head">
            <div>
              <h2>Resultado de publicaci&oacute;n</h2>
              <p>{syncResult.message}</p>
            </div>
            <StatusBadge value={syncResult.status} />
          </div>
          {tableCounts.length ? (
            <div className="metabase-counts">
              {tableCounts.map(([table, count]) => (
                <div key={table}>
                  <span>{table}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {dashboardResult ? (
        <Card className="metabase-sync-result">
          <div className="metabase-panel-head">
            <div>
              <h2>Dashboard de Metabase</h2>
              <p>{dashboardResult.message}</p>
            </div>
            <StatusBadge value={dashboardResult.status} />
          </div>
          {dashboardResult.dashboard_url ? (
            <a
              className="decision-link metabase-dashboard-link"
              href={dashboardResult.dashboard_url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir dashboard creado
            </a>
          ) : null}
          {dashboardResult.cards?.length ? (
            <div className="metabase-card-list">
              {dashboardResult.cards.map((card) => (
                <a key={card.id} href={card.url} target="_blank" rel="noreferrer">
                  <span>{card.name}</span>
                  <strong>#{card.id}</strong>
                </a>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
