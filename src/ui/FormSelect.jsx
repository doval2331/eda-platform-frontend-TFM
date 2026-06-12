import PropTypes from 'prop-types'
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'

export function FormSelect({
  label,
  id,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = false,
  helperText,
  placeholder,
  fullWidth = true,
  className = '',
  sx,
}) {
  const labelId = id ? `${id}-label` : undefined

  return (
    <FormControl
      fullWidth={fullWidth}
      variant="outlined"
      size="small"
      required={required}
      disabled={disabled}
      error={error}
      className={className}
      sx={{
        '& .MuiInputLabel-root': {
          backgroundColor: '#fff',
          px: 0.5,
        },
        ...sx,
      }}
    >
      {label ? (
        <InputLabel id={labelId} shrink>
          {label}
        </InputLabel>
      ) : null}
      <Select
        labelId={labelId}
        id={id}
        value={value}
        label={label}
        onChange={onChange}
        notched
      >
        {placeholder ? (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        ) : null}
        {options.map((option) => (
          <MenuItem key={String(option.value)} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  )
}

FormSelect.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
    }),
  ),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  placeholder: PropTypes.string,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  sx: PropTypes.object,
}
