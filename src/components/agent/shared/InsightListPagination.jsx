import PropTypes from 'prop-types'

export const INSIGHT_PAGE_SIZE = 40

export function InsightListPagination({
  page = 0,
  pageSize = INSIGHT_PAGE_SIZE,
  totalCount = 0,
  onPageChange,
  className = '',
  itemLabel = 'grupos',
}) {
  if (totalCount <= pageSize) return null

  const totalPages = Math.ceil(totalCount / pageSize)
  const safePage = Math.min(Math.max(page, 0), totalPages - 1)
  const rangeStart = safePage * pageSize + 1
  const rangeEnd = Math.min(totalCount, (safePage + 1) * pageSize)

  return (
    <nav
      className={`insight-list-pagination ${className}`.trim()}
      aria-label="Paginacion de hallazgos"
    >
      <p className="insight-list-pagination__summary">
        Mostrando <strong>{rangeStart}-{rangeEnd}</strong> de <strong>{totalCount}</strong>{' '}
        {itemLabel}
      </p>
      <div className="insight-list-pagination__controls">
        <button
          type="button"
          className="insight-list-pagination__btn"
          disabled={safePage <= 0}
          onClick={() => onPageChange?.(safePage - 1)}
        >
          Anterior
        </button>
        <span className="insight-list-pagination__status">
          Pagina {safePage + 1} de {totalPages}
        </span>
        <button
          type="button"
          className="insight-list-pagination__btn"
          disabled={safePage >= totalPages - 1}
          onClick={() => onPageChange?.(safePage + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}

InsightListPagination.propTypes = {
  page: PropTypes.number,
  pageSize: PropTypes.number,
  totalCount: PropTypes.number,
  onPageChange: PropTypes.func,
  className: PropTypes.string,
  itemLabel: PropTypes.string,
}
