export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
