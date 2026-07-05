import PropTypes from 'prop-types'
import { useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { downloadDatasetProfileReport } from '@/api/datasets'
import { ConversationCorrelationChart } from '@/components/conversation/charts/ConversationCorrelationChart'
import { useDatasetFullProfile } from '@/hooks/queries'
import { Button, Card, Feedback, LoadingSlot } from '@/ui'

function alertVariant(level = '') {
  const clean = String(level).toLowerCase()
  if (clean.includes('warn') || clean.includes('high')) return 'warning'
  if (clean.includes('danger') || clean.includes('critical')) return 'danger'
  return 'info'
}

export function ConversationDataQualityPanel({ datasetId, className = '' }) {
  const [reportError, setReportError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const { data, isLoading, error } = useDatasetFullProfile(datasetId, {
    enabled: Boolean(datasetId),
  })

  if (!datasetId) return null

  if (isLoading) {
    return (
      <Card className={`conv-data-quality ${className}`.trim()}>
        <LoadingSlot variant="card">
          <Typography variant="body2" color="text.secondary">
            Analizando calidad del dataset…
          </Typography>
        </LoadingSlot>
      </Card>
    )
  }

  if (error) {
    return (
      <Feedback
        variant="warning"
        message={
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el perfil de calidad del dataset.'
        }
      />
    )
  }

  const alerts = data?.alerts ?? []
  const correlations = data?.correlations ?? []

  return (
    <Stack spacing={2} className={`conv-data-quality ${className}`.trim()}>
      <Card className="conv-data-quality__summary">
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={700}>
            Calidad del dataset
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Motor: {data?.profiler ?? 'lightweight'}
            {data?.duplicate_rows_pct != null
              ? ` · Duplicados: ${data.duplicate_rows_pct.toFixed(1)}%`
              : ''}
          </Typography>
          {alerts.length ? (
            <Stack spacing={1}>
              {alerts.slice(0, 6).map((alert, index) => (
                <Feedback
                  key={`${alert.message}-${index}`}
                  variant={alertVariant(alert.level)}
                  message={alert.message}
                />
              ))}
            </Stack>
          ) : (
            <Feedback variant="info" message="No se detectaron alertas relevantes en la muestra." />
          )}
          <Button
            variant="secondary"
            size="small"
            disabled={downloading}
            onClick={() => {
              setReportError(null)
              setDownloading(true)
              downloadDatasetProfileReport(datasetId)
                .catch((err) => {
                  setReportError(
                    err instanceof Error ? err.message : 'No se pudo abrir el informe HTML.',
                  )
                })
                .finally(() => setDownloading(false))
            }}
          >
            {downloading ? 'Generando informe…' : 'Abrir informe HTML (ydata-profiling)'}
          </Button>
          {reportError ? <Feedback variant="warning" message={reportError} /> : null}
        </Stack>
      </Card>

      <ConversationCorrelationChart correlations={correlations} />
    </Stack>
  )
}

ConversationDataQualityPanel.propTypes = {
  datasetId: PropTypes.string,
  className: PropTypes.string,
}
