import PropTypes from 'prop-types'
import { Box, LinearProgress, Typography } from '@mui/material'

function formatBytes(value) {
  if (!Number.isFinite(value) || value <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let amount = value
  let unitIndex = 0
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024
    unitIndex += 1
  }
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return ''
  return `${Math.round(value)}%`
}

function progressLabel(phase, current, total) {
  if (phase === 'uploading') return `Subiendo ${current} de ${total}`
  if (phase === 'queued') return `Subida completa. En cola ${current} de ${total}`
  if (phase === 'processing') return `Subida completa. Procesando ${current} de ${total}`
  if (phase === 'completed') return `Completado ${current} de ${total}`
  if (phase === 'failed') return `Error ${current} de ${total}`
  return `Procesando ${current} de ${total}`
}

export function UploadProgressBar({
  current = 0,
  total = 1,
  filename = '',
  phase = '',
  percent = null,
  loadedBytes = null,
  totalBytes = null,
  className = '',
}) {
  if (!total) return null
  const value =
    percent != null
      ? Math.min(100, Math.max(0, percent))
      : Math.min(100, (current / total) * 100)
  const processingAfterUpload = phase === 'queued' || phase === 'processing'
  const percentageText =
    percent != null
      ? ` - ${formatPercent(value)}${processingAfterUpload ? ' subido' : ''}`
      : ''
  const byteText =
    loadedBytes && totalBytes
      ? ` · ${formatBytes(loadedBytes)} / ${formatBytes(totalBytes)}`
      : ''
  const progressProps = processingAfterUpload
    ? { variant: 'indeterminate' }
    : { variant: 'determinate', value }

  return (
    <Box className={`upload-progress-bar ${className}`.trim()} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {progressLabel(phase, current, total)}
        {filename ? `: ${filename}` : ''}
        {byteText}
        {percentageText}
      </Typography>
      <LinearProgress {...progressProps} sx={{ borderRadius: 999, height: 6 }} />
    </Box>
  )
}

UploadProgressBar.propTypes = {
  current: PropTypes.number,
  total: PropTypes.number,
  filename: PropTypes.string,
  phase: PropTypes.string,
  percent: PropTypes.number,
  loadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  className: PropTypes.string,
}
