import PropTypes from 'prop-types'
import { Box, Stack, Typography } from '@mui/material'

export function PrepareFormSection({ title, description, children, className = '' }) {
  return (
    <Box
      component="section"
      className={`prepare-form-section ${className}`.trim()}
    >
      <Typography variant="subtitle2" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      ) : null}
      <Stack spacing={2} sx={{ mt: 1.5 }}>
        {children}
      </Stack>
    </Box>
  )
}

PrepareFormSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
}
