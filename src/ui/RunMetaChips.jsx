import PropTypes from 'prop-types'
import { Stack, Chip } from '@mui/material'

export function RunMetaChips({ items = [], className = '' }) {
  if (!items.length) return null

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={0.75}
      className={`run-meta-chips ${className}`.trim()}
      sx={{ mt: 1 }}
    >
      {items.map((item) => (
        <Chip
          key={item.label}
          label={item.label}
          size="small"
          variant="outlined"
          sx={{
            bgcolor: '#f8fafc',
            borderColor: '#e2e8f0',
            fontWeight: 500,
          }}
        />
      ))}
    </Stack>
  )
}

RunMetaChips.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
    }),
  ),
  className: PropTypes.string,
}
