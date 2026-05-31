import { useEffect, useState } from 'react'
import { createMetabaseDashboard, fetchMetabaseStatus, syncBiTables } from '../api/metabase'
import { Button, Card, Feedback, PageNavbar } from '../ui'

function StatusBadge({ value }) {
  const normalized = value || 'unknown'
  return (
    <span className={`metabase-status metabase-status--${normalized}`}>
      {normalized}
    </span>
  )
}

export function MetabasePage() {
  const [status, setStatus] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [dashboardResult, setDashboardResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [creatingDashboard, setCreatingDashboard] = useState(false)
  const [error, setError] = useState(null)

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
  const tableCounts = syncResult?.tables
    ? Object.entries(syncResult.tables).filter(([, count]) => count != null)
    : []

  return (
    <div className="metabase-page">
      <PageNavbar
        breadcrumbParent="Plataforma"
        breadcrumbCurrent="Metabase BI"
        title="Dashboards sobre PostgreSQL BI"
        description="DuckDB sigue siendo la base principal; PostgreSQL publica tablas curadas para Metabase."
        rightSlot={
          <Button type="button" variant="secondary" onClick={loadStatus}>
            Actualizar
          </Button>
        }
      />

      {error ? <Feedback variant="danger" message={error} /> : null}

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
              onClick={createDashboard}
              disabled={creatingDashboard || syncing || !status?.enabled}
            >
              {creatingDashboard ? 'Creando dashboard...' : 'Crear dashboard en Metabase'}
            </Button>
            {metabaseTarget ? (
              <a className="decision-link" href={metabaseTarget} target="_blank" rel="noreferrer">
                Abrir Metabase
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
