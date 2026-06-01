export function StatChip({ label, value, icon, hint }) {
  const body = (
    <>
      <span title={hint}>{label}</span>
      <strong title={hint}>{value}</strong>
    </>
  )

  if (icon) {
    return (
      <div className="stat-card" title={hint}>
        <div className="stat-card-icon" aria-hidden>
          {icon}
        </div>
        <div className="stat-card-body">{body}</div>
      </div>
    )
  }

  return (
    <div className="stat-chip" title={hint}>
      <div className="stat-card-body">{body}</div>
    </div>
  )
}
