import PropTypes from 'prop-types'
import { TextField as MuiTextField } from '@mui/material'

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  error = false,
  helperText,
  placeholder,
  multiline = false,
  minRows = 2,
  fullWidth = true,
  id,
  className = '',
  inputProps,
  sx,
  ...props
}) {
  return (
    <MuiTextField
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      placeholder={placeholder}
      multiline={multiline}
      minRows={multiline ? minRows : undefined}
      fullWidth={fullWidth}
      className={className}
      variant="outlined"
      size="small"
      InputLabelProps={{ shrink: true }}
      inputProps={inputProps}
      sx={{
        '& .MuiInputLabel-root': {
          backgroundColor: '#fff',
          px: 0.5,
        },
        ...sx,
      }}
      {...props}
    />
  )
}

TextField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func,
  type: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  multiline: PropTypes.bool,
  minRows: PropTypes.number,
  fullWidth: PropTypes.bool,
  id: PropTypes.string,
  className: PropTypes.string,
  inputProps: PropTypes.object,
  sx: PropTypes.object,
}
