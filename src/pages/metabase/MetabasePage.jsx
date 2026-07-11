import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Feedback, PageNavbar } from '@/ui'
import { MetabaseReportsFooter } from './MetabaseReportsFooter'
import { MetabaseReportsHero } from './MetabaseReportsHero'
import { useMetabaseReportsPage } from './useMetabaseReportsPage'

const REPORT_RUN_STORAGE_KEY = 'eda-metabase-report-run-id'

function safeSessionGet(key) {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function safeSessionSet(key, value) {
  if (typeof window === 'undefined' || !value) return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // No-op: informes puede funcionar sin sessionStorage.
  }
}

function resolveReportRunId(location, runId) {
  const params = new URLSearchParams(location.search)
  return (
    runId ||
    location.state?.fromRunId ||
    params.get('runId') ||
    params.get('run_id') ||
    params.get('fromRunId') ||
    safeSessionGet(REPORT_RUN_STORAGE_KEY)
  )
}

export function MetabasePage({ embedded = false, runId = '' }) {
  const location = useLocation()
  const fromRunId = useMemo(
    () => resolveReportRunId(location, runId),
    [location, runId],
  )

  useEffect(() => {
    safeSessionSet(REPORT_RUN_STORAGE_KEY, fromRunId)
  }, [fromRunId])

  const {
    phase,
    embedUrl,
    dashboardUrl,
    error,
    emptyDetail,
    message,
    setMessage,
    setError,
    loading,
    refreshing,
    syncing,
    progress,
    progressLabel,
    progressDetail,
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
        dashboardUrl={dashboardUrl}
        error={error}
        emptyDetail={emptyDetail}
        loading={loading}
        progress={progress}
        progressLabel={progressLabel}
        progressDetail={progressDetail}
        onRetry={() => void refresh()}
      />

      <MetabaseReportsFooter />
    </div>
  )
}

MetabasePage.propTypes = {
  embedded: PropTypes.bool,
  runId: PropTypes.string,
}
