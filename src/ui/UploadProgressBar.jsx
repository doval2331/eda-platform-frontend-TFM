import PropTypes from 'prop-types'
import { Box, LinearProgress, Typography } from '@mui/material'

export function UploadProgressBar({ current = 0, total = 1, filename = '', className = '' }) {
  if (!total) return null
  const value = Math.min(100, (current / total) * 100)

  return (
    <Box className={`upload-progress-bar ${className}`.trim()} sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Procesando {current} de {total}
        {filename ? `: ${filename}` : ''}
      </Typography>
      <LinearProgress variant="determinate" value={value} sx={{ borderRadius: 999, height: 6 }} />
    </Box>
  )
}

UploadProgressBar.propTypes = {
  current: PropTypes.number,
  total: PropTypes.number,
  filename: PropTypes.string,
  className: PropTypes.string,
}
