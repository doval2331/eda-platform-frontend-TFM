export function SectionHeader({
  eyebrow,
  title,
  description,
  rightSlot,
  titleAs: TitleTag = 'h2',
  className = '',
}) {
  return (
    <div className={`page-head ${className}`.trim()}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <TitleTag>{title}</TitleTag>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {rightSlot}
    </div>
  )
}
