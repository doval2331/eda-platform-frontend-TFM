import PropTypes from 'prop-types'
import { Button as MuiButton } from '@mui/material'
import {
  Add,
  Delete,
  Edit,
  ExpandLess,
  ExpandMore,
  Search,
  Send,
} from '@mui/icons-material'

const ICONS = {
  Add: <Add fontSize="small" />,
  Delete: <Delete fontSize="small" />,
  Edit: <Edit fontSize="small" />,
  ExpandLess: <ExpandLess fontSize="small" />,
  ExpandMore: <ExpandMore fontSize="small" />,
  Search: <Search fontSize="small" />,
  Send: <Send fontSize="small" />,
}

const LEGACY_VARIANTS = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'primary' },
  danger: { variant: 'outlined', color: 'error' },
}

function resolveIcon(icon) {
  if (typeof icon === 'string' && ICONS[icon]) return ICONS[icon]
  return icon
}

export function Button({
  children,
  variant = 'primary',
  color,
  size = 'medium',
  startIcon,
  endIcon,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const legacy = LEGACY_VARIANTS[variant]
  const muiVariant = legacy?.variant ?? variant
  const muiColor = color ?? legacy?.color ?? 'primary'

  return (
    <MuiButton
      variant={muiVariant}
      color={muiColor}
      size={size}
      startIcon={resolveIcon(startIcon)}
      endIcon={resolveIcon(endIcon)}
      disabled={disabled}
      fullWidth={fullWidth}
      onClick={onClick}
      type={type}
      className={className}
      {...props}
    >
      {children}
    </MuiButton>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'text',
    'outlined',
    'contained',
    'primary',
    'secondary',
    'danger',
  ]),
  color: PropTypes.oneOf(['primary', 'secondary', 'error', 'info', 'success', 'warning']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  startIcon: PropTypes.oneOfType([PropTypes.oneOf(Object.keys(ICONS)), PropTypes.node]),
  endIcon: PropTypes.oneOfType([PropTypes.oneOf(Object.keys(ICONS)), PropTypes.node]),
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
}
