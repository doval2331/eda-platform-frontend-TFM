import PropTypes from 'prop-types'
import { Stack, Typography } from '@mui/material'
import { useDatasetFullProfile } from '@/hooks/queries'
import { Card, Feedback, LoadingSlot } from '@/ui'

function alertVariant(level = '') {
  const clean = String(level).toLowerCase()
  if (clean.includes('warn') || clean.includes('high')) return 'warning'
  if (clean.includes('danger') || clean.includes('critical')) return 'danger'
  return 'info'
}

export function DatasetQualitySummary({ datasetId, className = '' }) {
  const { data, isLoading, error } = useDatasetFullProfile(datasetId, {
    enabled: Boolean(datasetId),
  })

  if (!datasetId) return null

  if (isLoading) {
    return (
      <Card className={`dataset-quality-summary ${className}`.trim()}>
        <LoadingSlot variant="card">
          <Typography variant="body2" color="text.secondary">
            Revisando calidad del dataset…
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
            : 'No se pudo cargar el resumen de calidad.'
        }
      />
    )
  }

  const alerts = (data?.alerts ?? []).slice(0, 3)

  return (
    <Card className={`dataset-quality-summary ${className}`.trim()}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={700}>
          Calidad del dataset
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data?.duplicate_rows_pct != null
            ? `Duplicados: ${data.duplicate_rows_pct.toFixed(1)}%`
            : 'Resumen automático de la muestra analizada.'}
        </Typography>
        {alerts.length ? (
          <Stack spacing={1}>
            {alerts.map((alert, index) => (
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
      </Stack>
    </Card>
  )
}

DatasetQualitySummary.propTypes = {
  datasetId: PropTypes.string,
  className: PropTypes.string,
}
