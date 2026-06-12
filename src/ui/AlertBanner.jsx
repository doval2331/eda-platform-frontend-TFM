import PropTypes from 'prop-types'
import { Alert } from '@mui/material'

export function AlertBanner({ children, severity = 'info', className = '' }) {
  return (
    <Alert
      severity={severity}
      variant="outlined"
      className={className}
      sx={{
        borderRadius: 2,
        py: 0.75,
        '& .MuiAlert-message': { width: '100%' },
      }}
    >
      {children}
    </Alert>
  )
}

AlertBanner.propTypes = {
  children: PropTypes.node.isRequired,
  severity: PropTypes.oneOf(['error', 'info', 'success', 'warning']),
  className: PropTypes.string,
}
