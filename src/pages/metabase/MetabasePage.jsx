import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { Button, Feedback, PageNavbar } from '@/ui'
import { MetabaseReportsFooter } from './MetabaseReportsFooter'
import { MetabaseReportsHero } from './MetabaseReportsHero'
import { useMetabaseReportsPage } from './useMetabaseReportsPage'

export function MetabasePage({ embedded = false }) {
  const location = useLocation()
  const fromRunId = location.state?.fromRunId
  const {
    phase,
    embedUrl,
    error,
    message,
    setMessage,
    setError,
    loading,
    refreshing,
    syncing,
    refresh,
  } = useMetabaseReportsPage(fromRunId)

  const showInitialLoading = loading && !embedUrl
  const isBusy = loading || refreshing || syncing

  return (
    <div
      className={`metabase-page metabase-page--reports${
        showInitialLoading ? ' metabase-page--loading' : ''
      }${syncing ? ' metabase-page--refreshing' : ''}`}
    >
      {!embedded ? (
        <PageNavbar
          breadcrumbParent="Plataforma"
          breadcrumbCurrent="Informes"
          title="Informes de incidencias"
          description="Gráficos de SLA, riesgo y clusters con tus hallazgos guardados."
          rightSlot={
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={() => void refresh({ soft: true })}
            >
              {refreshing ? 'Actualizando…' : 'Actualizar informe'}
            </Button>
          }
        />
      ) : (
        <div className="metabase-toolbar metabase-toolbar--embedded">
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={() => void refresh({ soft: true })}
          >
            {refreshing ? 'Actualizando…' : 'Actualizar informe'}
          </Button>
        </div>
      )}

      <Feedback
        open={Boolean(message)}
        variant="success"
        message={message ?? ''}
        position="top-center"
        onClose={() => setMessage(null)}
      />
      <Feedback
        open={Boolean(error) && phase !== 'error' && phase !== 'empty'}
        variant="danger"
        message={error ?? ''}
        position="top-center"
        onClose={() => setError(null)}
      />

      <MetabaseReportsHero
        phase={phase}
        embedUrl={embedUrl}
        error={error}
        loading={loading}
        onRetry={() => void refresh()}
      />

      <MetabaseReportsFooter />
    </div>
  )
}

MetabasePage.propTypes = {
  embedded: PropTypes.bool,
}
