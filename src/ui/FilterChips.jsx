import PropTypes from 'prop-types'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export function FilterChips({ options, value, onChange, className = '', ariaLabel }) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, next) => {
        if (next != null) onChange?.(next)
      }}
      aria-label={ariaLabel ?? 'Filtros'}
      className={className}
      sx={{
        flexWrap: 'wrap',
        gap: 1,
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid #cbd5e1 !important',
          borderRadius: '999px !important',
          mx: 0,
          px: 1.5,
          py: 0.5,
          textTransform: 'none',
          fontSize: '0.8125rem',
        },
        '& .Mui-selected': {
          bgcolor: '#eff6ff !important',
          color: '#1d4ed8 !important',
          borderColor: '#2563eb !important',
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

FilterChips.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
}
