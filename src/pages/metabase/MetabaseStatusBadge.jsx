import PropTypes from 'prop-types'

export function MetabaseStatusBadge({ value }) {
  const normalized = value || 'unknown'
  return (
    <span className={`metabase-status metabase-status--${normalized}`}>
      {normalized}
    </span>
  )
}

MetabaseStatusBadge.propTypes = {
  value: PropTypes.string,
}
