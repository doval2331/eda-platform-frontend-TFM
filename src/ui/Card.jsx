export function Card({ children, className = '', as = 'section' }) {
  const Tag = as
  return <Tag className={`card ${className}`.trim()}>{children}</Tag>
}
