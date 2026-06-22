import PropTypes from 'prop-types'
import { Card } from '@/ui'
import { MetabaseStatusBadge } from './MetabaseStatusBadge'

export function MetabaseResultSections({ syncResult, dashboardResult, tableCounts }) {
  return (
    <>
      {syncResult ? (
        <Card className="metabase-sync-result">
          <div className="metabase-panel-head">
            <div>
              <h2>Resultado de publicaci&oacute;n</h2>
              <p>{syncResult.message}</p>
            </div>
            <MetabaseStatusBadge value={syncResult.status} />
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
            <MetabaseStatusBadge value={dashboardResult.status} />
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
    </>
  )
}

MetabaseResultSections.propTypes = {
  syncResult: PropTypes.object,
  dashboardResult: PropTypes.object,
  tableCounts: PropTypes.array,
}
