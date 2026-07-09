import PropTypes from 'prop-types'

const ROLE_OPTIONS = [
  { value: 'business', label: 'Negocio' },
  { value: 'metric', label: 'Metrica' },
  { value: 'identifier', label: 'Identificador' },
  { value: 'technical', label: 'Tecnica' },
  { value: 'unknown', label: 'Sin clasificar' },
]

const CONFIDENCE_OPTIONS = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Sin tipo' },
  { value: 'categorical', label: 'Categorica' },
  { value: 'numeric', label: 'Numerica' },
  { value: 'boolean', label: 'Booleana' },
  { value: 'date', label: 'Fecha' },
  { value: 'text', label: 'Texto' },
]

export function ConversationSemanticDictionaryEditor({
  rows = [],
  status = null,
  loading = false,
  saving = false,
  error = '',
  onChange,
  onRefresh,
  onSave,
}) {
  const governed = Boolean(status?.governed || status?.configured_total)
  const source = status?.source || ''
  const scope = String(status?.scope || '').replaceAll('_', ' ')
  const writable = status?.writable !== false
  const governanceItems = [
    scope ? `Ambito: ${scope}` : '',
    status?.project_id ? `Proyecto: ${status.project_id}` : '',
    writable ? 'Editable desde la app' : 'Solo lectura',
    status?.project_scope_enabled ? 'Gobierno por proyecto activo' : '',
    Number.isFinite(Number(status?.base_total)) ? `Base: ${Number(status.base_total).toLocaleString('es-ES')}` : '',
    Number.isFinite(Number(status?.configured_total))
      ? `Configuradas: ${Number(status.configured_total).toLocaleString('es-ES')}`
      : '',
    Number.isFinite(Number(status?.active_configured_total))
      ? `Activas: ${Number(status.active_configured_total).toLocaleString('es-ES')}`
      : '',
    Number.isFinite(Number(status?.inactive_configured_total))
      ? `Inactivas: ${Number(status.inactive_configured_total).toLocaleString('es-ES')}`
      : '',
  ].filter(Boolean)

  return (
    <div className="dashboard-spec-semantic-editor">
      <div className="dashboard-spec-semantic-editor__head">
        <div>
          <strong>Gobierno del diccionario</strong>
          <span>
            {governed
              ? `${status.configured_total || rows.length} variables configuradas`
              : 'Usando diccionario base; conviene gobernarlo por proyecto.'}
          </span>
          {source ? <small>{source}</small> : null}
        </div>
        <div className="dashboard-spec-semantic-editor__actions">
          <button type="button" disabled={loading || saving} onClick={onRefresh}>
            Actualizar
          </button>
          <button type="button" disabled={loading || saving || !rows.length} onClick={onSave}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      {governanceItems.length ? (
        <div className="dashboard-spec-semantic-editor__governance">
          {governanceItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {!writable ? (
        <div className="dashboard-spec-semantic-editor__warning">
          El diccionario actual no se puede guardar desde la app. Configura una ruta writable o un
          diccionario por proyecto.
        </div>
      ) : null}

      {error ? <div className="dashboard-spec-semantic-editor__error">{error}</div> : null}
      {loading ? (
        <div className="dashboard-spec-semantic-editor__empty">Cargando diccionario...</div>
      ) : rows.length ? (
        <div className="dashboard-spec-semantic-editor__table-wrap">
          <table className="dashboard-spec-semantic-editor__table">
            <thead>
              <tr>
                <th>Variable tecnica</th>
                <th>Nombre funcional</th>
                <th>Rol</th>
                <th>Tipo</th>
                <th>Gobierno</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.description ? <small>{row.description}</small> : null}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(event) => onChange(row.name, 'label', event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.role}
                      onChange={(event) => onChange(row.name, 'role', event.target.value)}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.semantic_type}
                      onChange={(event) =>
                        onChange(row.name, 'semantic_type', event.target.value)
                      }
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="dashboard-spec-semantic-editor__governance-cell">
                    <label>
                      <input
                        type="checkbox"
                        checked={row.active !== false}
                        onChange={(event) => onChange(row.name, 'active', event.target.checked)}
                      />
                      Activa
                    </label>
                    <select
                      value={row.confidence || 'media'}
                      onChange={(event) => onChange(row.name, 'confidence', event.target.value)}
                    >
                      {CONFIDENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.source || ''}
                      placeholder="Fuente"
                      onChange={(event) => onChange(row.name, 'source', event.target.value)}
                    />
                  </td>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.can_chart}
                        onChange={(event) => onChange(row.name, 'can_chart', event.target.checked)}
                      />
                      Graficable
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.avoid_as_metric}
                        onChange={(event) =>
                          onChange(row.name, 'avoid_as_metric', event.target.checked)
                        }
                      />
                      Evitar como metrica
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-spec-semantic-editor__empty">
          No hay variables detectadas para configurar en este run.
        </div>
      )}
    </div>
  )
}

ConversationSemanticDictionaryEditor.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string,
      role: PropTypes.string,
      semantic_type: PropTypes.string,
      can_chart: PropTypes.bool,
      avoid_as_metric: PropTypes.bool,
      description: PropTypes.string,
      active: PropTypes.bool,
      confidence: PropTypes.string,
      source: PropTypes.string,
    }),
  ),
  status: PropTypes.object,
  loading: PropTypes.bool,
  saving: PropTypes.bool,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}
