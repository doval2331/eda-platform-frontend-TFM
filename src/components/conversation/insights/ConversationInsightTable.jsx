import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { PriorityChip } from '@/components/agent'
import {
  buildMaxByKind,
  insightKey,
  insightPriorityLevel,
  insightSubtitle,
  insightTicketCount,
} from '@/utils/conversationDashboard'

function SelectAllCheckbox({ checked, indeterminate, onChange, label }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
    />
  )
}

SelectAllCheckbox.propTypes = {
  checked: PropTypes.bool,
  indeterminate: PropTypes.bool,
  onChange: PropTypes.func,
  label: PropTypes.string,
}

export function ConversationInsightTable({
  items = [],
  allItems = [],
  activeKey = '',
  selectedKeys,
  refreshing = false,
  onSelect,
  onToggleCheck,
  onToggleSelectAll,
}) {
  const maxByKind = buildMaxByKind(allItems.length ? allItems : items)
  const pageKeys = items.map((item) => insightKey(item))
  const selectedOnPageCount = pageKeys.filter((key) => selectedKeys?.has(key)).length
  const allPageSelected = items.length > 0 && selectedOnPageCount === items.length
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected

  return (
    <div
      className={`conv-insight-table-wrap${refreshing ? ' conv-insight-table-wrap--refreshing' : ''}`}
    >
      <div className="conv-insight-table__scroll" tabIndex={0} role="region" aria-label="Tabla de evidencias guardadas">
        <table className="conv-insight-table__table">
          <thead>
            <tr>
              <th scope="col" className="conv-insight-table__col-check">
                <label className="conv-insight-table__select-all">
                  <SelectAllCheckbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected}
                    onChange={() => onToggleSelectAll?.(items)}
                    label="Seleccionar todas las evidencias de esta pagina"
                  />
                </label>
              </th>
              <th scope="col">Evidencia</th>
              <th scope="col" className="conv-insight-table__col-priority">
                Prioridad
              </th>
              <th scope="col" className="conv-insight-table__col-tickets">
                Tickets
              </th>
              <th scope="col" className="conv-insight-table__col-action">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const key = insightKey(item)
              const active = activeKey === key
              const selected = selectedKeys?.has(key)
              const priority = insightPriorityLevel(item, maxByKind)
              const tickets = insightTicketCount(item)
              const subtitle = insightSubtitle(item)

              return (
                <tr
                  key={key}
                  className={`conv-insight-table__row${active ? ' conv-insight-table__row--active' : ''}${
                    selected ? ' conv-insight-table__row--selected' : ''
                  }`}
                >
                  <td className="conv-insight-table__cell-check">
                    <label onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => onToggleCheck?.(item)}
                        aria-label={`Seleccionar ${item.title}`}
                      />
                    </label>
                  </td>
                  <td className="conv-insight-table__cell-title">
                    <button
                      type="button"
                      className="conv-insight-table__title-btn"
                      onClick={() => onSelect?.(item)}
                    >
                      <span className="conv-insight-table__title">{item.title}</span>
                      {subtitle ? (
                        <span className="conv-insight-table__subtitle">{subtitle}</span>
                      ) : null}
                    </button>
                  </td>
                  <td className="conv-insight-table__cell-priority">
                    <PriorityChip level={priority} />
                  </td>
                  <td className="conv-insight-table__cell-tickets">
                    {tickets != null ? tickets.toLocaleString('es-ES') : '—'}
                  </td>
                  <td className="conv-insight-table__cell-action">
                    <button
                      type="button"
                      className="conv-insight-table__open"
                      aria-label={`Ver ${item.title}`}
                      onClick={() => onSelect?.(item)}
                    >
                      ▸
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

ConversationInsightTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  allItems: PropTypes.arrayOf(PropTypes.object),
  activeKey: PropTypes.string,
  selectedKeys: PropTypes.instanceOf(Set),
  refreshing: PropTypes.bool,
  onSelect: PropTypes.func,
  onToggleCheck: PropTypes.func,
  onToggleSelectAll: PropTypes.func,
}
