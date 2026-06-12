import PropTypes from 'prop-types'
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material'

export function MetricCard({ label, value, icon, hint, className = '' }) {
  const content = (
    <Paper
      variant="outlined"
      className={`metric-card ${className}`.trim()}
      sx={{
        p: 2,
        height: '100%',
        borderColor: '#e2e8f0',
        bgcolor: '#ffffff',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {icon ? (
          <Box
            sx={{
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )

  if (hint) {
    return (
      <Tooltip title={hint} arrow placement="top">
        {content}
      </Tooltip>
    )
  }

  return content
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  icon: PropTypes.node,
  hint: PropTypes.string,
  className: PropTypes.string,
}
