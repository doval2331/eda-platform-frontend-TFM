export function StatChip({ label, value, icon }) {
  if (icon) {
    return (
      <div className="stat-card">
        <div className="stat-card-icon" aria-hidden>
          {icon}
        </div>
        <div className="stat-card-body">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    )
  }

  return (
    <div className="stat-chip">
      <div className="stat-card-body">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}
