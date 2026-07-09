import PropTypes from 'prop-types'
import { Card } from '@/ui'

export function ConversationTicketDrilldownPanel({
  isExpertMode = false,
  segmentLabel = '',
  visualizationTitle = '',
  visibleCount = 0,
  segmentCount = 0,
  loadedCount = 0,
  priorityOptions = [],
  serviceOptions = [],
  categoryOptions = [],
  statusOptions = [],
  filters,
  selectedCount = 0,
  allVisibleSelected = false,
  savedStatus = 'idle',
  rows = [],
  onFilterChange,
  onToggleVisible,
  onClearFilters,
  onAnalyzeSelection,
  onPrepareReport,
  onSaveSelection,
  onExportCsv,
  onClose,
  onToggleRow,
  onAnalyzeRow,
}) {
  const title = segmentLabel || visualizationTitle || 'la seleccion'
  const visibleText = visibleCount.toLocaleString('es-ES')
  const segmentText = segmentCount.toLocaleString('es-ES')
  const loadedText = loadedCount.toLocaleString('es-ES')
  const panelTitle = isExpertMode
    ? `Tabla de evidencias de ${title}`
    : `Casos relacionados con ${title}`
  const selectionLabel = isExpertMode ? 'tickets/evidencias del segmento' : 'casos de esta vista'
  const analyzeLabel = isExpertMode ? 'Analizar seleccion con agente' : 'Analizar seleccion'
  const reportLabel = isExpertMode ? 'Preparar para informe' : 'Preparar resumen'
  const exportLabel = isExpertMode ? 'Exportar CSV' : 'Exportar'

  return (
    <Card className="dashboard-spec-priority-drilldown dashboard-spec-real-evidence">
      <div className="dashboard-spec-priority-drilldown__head">
        <div>
          <span className="dashboard-spec-eyebrow">
            {isExpertMode ? 'Drill-down real de tickets' : 'Tickets relacionados'}
          </span>
          <h3>{panelTitle}</h3>
          {isExpertMode ? (
            <p>
              Esta tabla complementa el grafico activo; no reemplaza la visualizacion. {visibleText} de{' '}
              {segmentText} {selectionLabel}.
              {loadedCount < segmentCount
                ? ` Mostrando las primeras ${loadedText} recuperadas desde DuckDB.`
                : ' Vista completa recuperada desde DuckDB.'}
            </p>
          ) : (
            <p>
              Pasa del grafico a los casos concretos que explican esta vista. Mostrando {visibleText} de{' '}
              {segmentText} {selectionLabel}. Usa filtros, selecciona casos y pide una lectura accionable
              al agente.
            </p>
          )}
        </div>
        <div className="dashboard-spec-drilldown-actions">
          <button type="button" onClick={onAnalyzeSelection}>
            {analyzeLabel}
          </button>
          <button type="button" onClick={onPrepareReport}>
            {reportLabel}
          </button>
          <button type="button" onClick={onSaveSelection} disabled={savedStatus === 'saving'}>
            {savedStatus === 'saving' ? 'Guardando...' : 'Guardar seleccion'}
          </button>
          <button type="button" onClick={onExportCsv}>
            {exportLabel}
          </button>
          <button type="button" onClick={onClose}>
            Ocultar
          </button>
        </div>
      </div>

      <div className="dashboard-spec-ticket-toolbar">
        <label>
          <span>Buscar ticket o texto</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Servicio, prioridad, numero, descripcion..."
          />
        </label>
        <TicketFilter
          label="Prioridad"
          value={filters.priority}
          options={priorityOptions}
          emptyLabel="Todas"
          onChange={(value) => onFilterChange('priority', value)}
        />
        <TicketFilter
          label="Servicio"
          value={filters.service}
          options={serviceOptions}
          emptyLabel="Todos"
          onChange={(value) => onFilterChange('service', value)}
        />
        <TicketFilter
          label="Categoria"
          value={filters.category}
          options={categoryOptions}
          emptyLabel="Todas"
          onChange={(value) => onFilterChange('category', value)}
        />
        <TicketFilter
          label="Estado"
          value={filters.status}
          options={statusOptions}
          emptyLabel="Todos"
          onChange={(value) => onFilterChange('status', value)}
        />
        <div className="dashboard-spec-ticket-selection">
          <strong>{selectedCount} seleccionados</strong>
          <button type="button" onClick={onToggleVisible}>
            {allVisibleSelected ? 'Quitar visibles' : `Seleccionar visibles (${visibleCount})`}
          </button>
          <button type="button" onClick={onClearFilters}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {savedStatus === 'saved' ? (
        <div className="dashboard-spec-operation-saved">
          {isExpertMode
            ? 'Seleccion operativa guardada. Puedes enviarla al agente, preparar informe o exportarla.'
            : 'Seleccion guardada para analizarla con el agente o preparar un resumen.'}
        </div>
      ) : null}

      <div className="dashboard-spec-ticket-table-wrap">
        <table className="dashboard-spec-ticket-table">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Seleccion</span>
              </th>
              <th>Ticket</th>
              <th>{isExpertMode ? 'Servicio / Categoria' : 'Contexto'}</th>
              <th>Prioridad</th>
              {isExpertMode ? <th>Grupo</th> : null}
              {isExpertMode ? <th>Reasig.</th> : null}
              <th>Descripcion</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => onToggleRow(row)}
                    aria-label={`Seleccionar ${row.ticket}`}
                  />
                </td>
                <td>
                  <strong>{row.ticket}</strong>
                  {isExpertMode ? <small>{row.meta}</small> : null}
                </td>
                <td>
                  <span>{row.service}</span>
                  <small>{row.category}</small>
                </td>
                <td>{row.priority}</td>
                {isExpertMode ? <td>{row.group}</td> : null}
                {isExpertMode ? <td>{row.reassignments}</td> : null}
                <td>
                  <span>{row.description}</span>
                </td>
                <td>
                  <button type="button" onClick={() => onAnalyzeRow(row)}>
                    Analizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length ? (
        <p className="dashboard-spec-muted">No hay tickets que coincidan con los filtros actuales.</p>
      ) : null}
    </Card>
  )
}

function TicketFilter({ label, value, options, emptyLabel, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

TicketFilter.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.string),
  emptyLabel: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

ConversationTicketDrilldownPanel.propTypes = {
  isExpertMode: PropTypes.bool,
  segmentLabel: PropTypes.string,
  visualizationTitle: PropTypes.string,
  visibleCount: PropTypes.number,
  segmentCount: PropTypes.number,
  loadedCount: PropTypes.number,
  priorityOptions: PropTypes.arrayOf(PropTypes.string),
  serviceOptions: PropTypes.arrayOf(PropTypes.string),
  categoryOptions: PropTypes.arrayOf(PropTypes.string),
  statusOptions: PropTypes.arrayOf(PropTypes.string),
  filters: PropTypes.shape({
    search: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    service: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  selectedCount: PropTypes.number,
  allVisibleSelected: PropTypes.bool,
  savedStatus: PropTypes.string,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      ticket: PropTypes.string.isRequired,
      selected: PropTypes.bool.isRequired,
      meta: PropTypes.string,
      service: PropTypes.string,
      category: PropTypes.string,
      priority: PropTypes.string,
      group: PropTypes.string,
      reassignments: PropTypes.string,
      description: PropTypes.string,
    }),
  ),
  onFilterChange: PropTypes.func.isRequired,
  onToggleVisible: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onAnalyzeSelection: PropTypes.func.isRequired,
  onPrepareReport: PropTypes.func.isRequired,
  onSaveSelection: PropTypes.func.isRequired,
  onExportCsv: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggleRow: PropTypes.func.isRequired,
  onAnalyzeRow: PropTypes.func.isRequired,
}
