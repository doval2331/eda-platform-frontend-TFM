import { useId } from 'react'

export default function Select({
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
  className = '',
  fullWidth = true,
  ...props
}) {
  const autoId = useId()
  const selectId = id || autoId

  return (
    <div
      className={`field ${fullWidth ? 'field--full' : ''} ${error ? 'field--error' : ''} ${className}`.trim()}
    >
      {label ? (
        <label htmlFor={selectId}>
          {label}
          {required ? ' *' : null}
        </label>
      ) : null}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={error || undefined}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="field-help">{helperText}</p> : null}
    </div>
  )
}
