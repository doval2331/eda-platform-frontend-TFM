import { useId } from 'react'

export default function Input({
  label,
  id,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  error = false,
  helperText,
  placeholder,
  className = '',
  fullWidth = true,
  ...props
}) {
  const autoId = useId()
  const inputId = id || autoId

  return (
    <div
      className={`field ${fullWidth ? 'field--full' : ''} ${error ? 'field--error' : ''} ${className}`.trim()}
    >
      {label ? (
        <label htmlFor={inputId}>
          {label}
          {required ? ' *' : null}
        </label>
      ) : null}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={error || undefined}
        {...props}
      />
      {helperText ? <p className="field-help">{helperText}</p> : null}
    </div>
  )
}
