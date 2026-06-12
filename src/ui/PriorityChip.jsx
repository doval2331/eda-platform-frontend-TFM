import PropTypes from 'prop-types'
import { Chip } from '@mui/material'

const PRIORITY_COLORS = {
  Alta: 'error',
  Media: 'warning',
  Baja: 'success',
}

export function PriorityChip({ label, className = '' }) {
  return (
    <Chip
      label={label}
      size="small"
      color={PRIORITY_COLORS[label] ?? 'default'}
      variant="outlined"
      className={className}
      sx={{ fontWeight: 700 }}
    />
  )
}

PriorityChip.propTypes = {
  label: PropTypes.oneOf(['Alta', 'Media', 'Baja']).isRequired,
  className: PropTypes.string,
}
