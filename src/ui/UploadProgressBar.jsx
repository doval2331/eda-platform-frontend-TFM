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

export function UploadProgressBar({
  current = 0,
  total = 1,
  filename = '',
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
  const byteText =
    loadedBytes && totalBytes
      ? ` · ${formatBytes(loadedBytes)} / ${formatBytes(totalBytes)}`
      : ''

  return (
    <Box className={`upload-progress-bar ${className}`.trim()} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Procesando {current} de {total}
        {filename ? `: ${filename}` : ''}
        {byteText}
      </Typography>
      <LinearProgress variant="determinate" value={value} sx={{ borderRadius: 999, height: 6 }} />
    </Box>
  )
}

UploadProgressBar.propTypes = {
  current: PropTypes.number,
  total: PropTypes.number,
  filename: PropTypes.string,
  percent: PropTypes.number,
  loadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  className: PropTypes.string,
}
