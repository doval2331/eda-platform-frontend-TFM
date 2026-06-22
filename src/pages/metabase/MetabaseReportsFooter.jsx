import { Link } from 'react-router-dom'

export function MetabaseReportsFooter() {
  return (
    <footer className="metabase-reports-footer">
      <Link to="/" className="decision-link">
        ← Volver a explorar
      </Link>
      <Link to="/dashboard-conversacional" className="decision-link">
        Dashboard conversacional
      </Link>
    </footer>
  )
}
