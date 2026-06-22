import PropTypes from 'prop-types'
import { Button, Card } from '@/ui'
import { MetabaseStatusBadge } from './MetabaseStatusBadge'

export function MetabaseIntegrationCards({
  status,
  loading,
  metabaseTarget,
  biReady,
  canCreateDashboard,
  syncing,
  creatingDashboard,
  dashboardButtonLabel,
  onPublish,
  onCreateDashboard,
}) {
  return (
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
          <MetabaseStatusBadge value={status?.postgres_status || (loading ? 'loading' : 'unknown')} />
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
            <dt>Incrustaci&oacute;n</dt>
            <dd>{status?.embedding_configured ? 'Lista' : 'Pendiente de configurar'}</dd>
          </div>
          <div>
            <dt>Detalle</dt>
            <dd>{status?.detail || 'Sin detalle'}</dd>
          </div>
        </dl>

        <div className="metabase-actions">
          <Button type="button" variant="primary" onClick={onPublish} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Publicar tablas BI'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="metabase-dashboard-button"
            onClick={onCreateDashboard}
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
              {status?.dashboard_url ? 'Abrir en Metabase' : 'Abrir Metabase'}
            </a>
          ) : null}
        </div>
      </Card>

      <Card className="metabase-panel metabase-panel--guide">
        <h2>Tablas que debe usar Metabase</h2>
        <p>
          Conect&aacute; Metabase a PostgreSQL y cre&aacute; preguntas sobre estas tablas. Los filtros
          principales son <strong>run_id</strong>, <strong>cluster_label</strong>,{' '}
          <strong>category</strong>, <strong>severity</strong> y <strong>affected_service</strong>.
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
  )
}

MetabaseIntegrationCards.propTypes = {
  status: PropTypes.object,
  loading: PropTypes.bool,
  metabaseTarget: PropTypes.string,
  biReady: PropTypes.bool,
  canCreateDashboard: PropTypes.bool,
  syncing: PropTypes.bool,
  creatingDashboard: PropTypes.bool,
  dashboardButtonLabel: PropTypes.string,
  onPublish: PropTypes.func.isRequired,
  onCreateDashboard: PropTypes.func.isRequired,
}
