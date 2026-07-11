import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { fetchConversationSemanticDictionary } from '@/api/conversation'
import { semanticMapFromList } from '@/components/conversation/dashboard/semanticDashboard'
import { formatSpanishNumber } from './helpers'

const EMPTY_ARRAY = []

function asList(value) {
  return Array.isArray(value) ? value : EMPTY_ARRAY
}

function asPercent(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0%'
  return `${Math.round(number)}%`
}

function buildFallbackColumnSummaries(profile) {
  const allColumns = asList(profile?.all_columns)
  const numeric = new Set(asList(profile?.numeric_columns))
  const categorical = new Set(asList(profile?.categorical_columns))
  const excluded = new Set(asList(profile?.excluded_columns))

  return allColumns.map((name) => {
    const isNumeric = numeric.has(name)
    const isCategorical = categorical.has(name)
    const isExcluded = excluded.has(name)
    return {
      name,
      role: isNumeric ? 'metric' : isCategorical ? 'dimension' : isExcluded ? 'excluded' : 'unknown',
      kind: isNumeric ? 'numeric' : isCategorical ? 'categorical' : 'unknown',
      included_in_analysis: !isExcluded,
      useful_for_analysis: !isExcluded,
      can_chart: !isExcluded,
      avoid_as_metric: isCategorical || isExcluded,
      avoid_as_dimension: false,
      high_nulls: false,
      high_cardinality: false,
      not_recommended_reason: isExcluded
        ? 'El backend la excluyo del analisis principal.'
        : '',
      source: 'backend_profile',
    }
  })
}

function dictionaryItems(payload) {
  const configured = asList(payload?.configured_variables)
  return configured.length ? configured : asList(payload?.variables)
}

function semanticAliases(item) {
  return asList(item?.aliases).filter(Boolean)
}

function semanticKeyMap(payload) {
  return semanticMapFromList(dictionaryItems(payload))
}

function getSemanticItem(semanticMap, columnName) {
  return semanticMap.get(columnName) || semanticMap.get(String(columnName || '').trim()) || null
}

function semanticLabel(item, fallback) {
  return item?.label || String(fallback || '').replace(/_/g, ' ')
}

function buildRows(profile, dictionaryPayload) {
  const summaries = asList(profile?.column_summaries).length
    ? asList(profile?.column_summaries)
    : buildFallbackColumnSummaries(profile)
  const semanticMap = semanticKeyMap(dictionaryPayload)

  return summaries.map((column) => {
    const semantic = getSemanticItem(semanticMap, column.name)
    const active = semantic ? semantic.active !== false : false
    const canChart = column.can_chart !== false && (!semantic || semantic.can_chart !== false)
    const avoidAsMetric = Boolean(column.avoid_as_metric || semantic?.avoid_as_metric)
    const avoidAsDimension = Boolean(column.avoid_as_dimension || semantic?.avoid_as_dimension)
    const semanticUnavailableReason = semantic
      ? ''
      : 'Aun no tiene entrada activa en el diccionario semantico.'
    const semanticReason = semantic?.active === false
      ? 'Esta inactiva en el diccionario semantico.'
      : semanticUnavailableReason
    const riskReasons = [
      column.not_recommended_reason,
      semanticReason,
      semantic?.can_chart === false ? 'El diccionario no la habilita para graficos.' : '',
      semantic?.avoid_as_metric ? 'No debe usarse como metrica.' : '',
      semantic?.avoid_as_dimension ? 'No debe usarse como dimension.' : '',
    ].filter(Boolean)

    return {
      ...column,
      semantic,
      label: semanticLabel(semantic, column.name),
      aliases: semanticAliases(semantic),
      semanticActive: active,
      canChart,
      llmUsable: active,
      avoidAsMetric,
      avoidAsDimension,
      useful: Boolean(column.useful_for_analysis && (!semantic || active) && canChart),
      riskReasons,
    }
  })
}

function CountCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <div className={`metadata-semantic-card metadata-semantic-card--${tone}`}>
      <span>{label}</span>
      <strong>{formatSpanishNumber(value)}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  )
}

CountCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  helper: PropTypes.string,
  tone: PropTypes.string,
}

function StatusChip({ children, tone = 'neutral' }) {
  return <span className={`metadata-semantic-chip metadata-semantic-chip--${tone}`}>{children}</span>
}

StatusChip.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.string,
}

function VariableRow({ variable }) {
  const chips = [
    variable.useful ? ['Candidata dashboard', 'success'] : null,
    variable.semanticActive ? ['Habilitada', 'success'] : ['Sin validar', 'warning'],
    variable.aliases.length ? ['Alias funcional', 'info'] : null,
    variable.llmUsable ? ['Disponible para LLM', 'success'] : ['No usar por LLM', 'warning'],
    variable.canChart ? ['Graficable', 'success'] : ['No graficable', 'warning'],
    variable.high_nulls ? ['Muchos nulos', 'warning'] : null,
    variable.high_cardinality ? ['Cardinalidad alta', 'warning'] : null,
    variable.avoidAsMetric ? ['No metrica', 'neutral'] : null,
    variable.avoidAsDimension ? ['No dimension', 'neutral'] : null,
    ['Metadata calculada', 'info'],
  ].filter(Boolean)

  return (
    <article className="metadata-semantic-variable">
      <div className="metadata-semantic-variable__main">
        <strong>{variable.label}</strong>
        <span>{variable.name}</span>
      </div>
      <div className="metadata-semantic-variable__chips">
        {chips.map(([label, tone]) => (
          <StatusChip key={`${variable.name}-${label}`} tone={tone}>
            {label}
          </StatusChip>
        ))}
      </div>
      <div className="metadata-semantic-variable__meta">
        <span>{variable.role || 'sin rol'}</span>
        {Number.isFinite(Number(variable.null_pct)) ? (
          <span>{asPercent(variable.null_pct)} nulos</span>
        ) : null}
        {Number.isFinite(Number(variable.unique_count)) ? (
          <span>{formatSpanishNumber(Number(variable.unique_count))} valores</span>
        ) : null}
      </div>
      {variable.riskReasons.length ? (
        <p>{variable.riskReasons.slice(0, 2).join(' ')}</p>
      ) : null}
    </article>
  )
}

VariableRow.propTypes = {
  variable: PropTypes.object.isRequired,
}

export function MetadataSemanticSummary({ datasetProfile, projectId }) {
  const [dictionaryPayload, setDictionaryPayload] = useState(null)
  const [dictionaryError, setDictionaryError] = useState('')
  const datasetId = datasetProfile?.dataset_id || ''
  const columnCount = datasetProfile?.all_columns?.length || 0

  useEffect(() => {
    let cancelled = false
    if (!columnCount) {
      return undefined
    }

    fetchConversationSemanticDictionary({ projectId })
      .then((payload) => {
        if (!cancelled) {
          setDictionaryPayload(payload)
          setDictionaryError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDictionaryPayload(null)
          setDictionaryError('No se pudo cargar el diccionario semantico. Se muestra solo metadata calculada.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [datasetId, columnCount, projectId])

  const rows = useMemo(
    () => buildRows(datasetProfile, dictionaryPayload),
    [datasetProfile, dictionaryPayload],
  )

  if (!datasetProfile) return null

  const useful = rows.filter((row) => row.useful)
  const notRecommended = rows.filter((row) => !row.useful)
  const activeSemantic = rows.filter((row) => row.semanticActive)
  const inactiveSemantic = rows.filter((row) => row.semantic && !row.semanticActive)
  const nonChartable = rows.filter((row) => !row.canChart)
  const highNulls = rows.filter((row) => row.high_nulls)
  const highCardinality = rows.filter((row) => row.high_cardinality)
  const blocked = rows.filter((row) => row.avoidAsMetric || row.avoidAsDimension)
  const visibleUseful = useful.slice(0, 4)
  const visibleRisks = notRecommended.slice(0, 4)

  return (
    <div className="metadata-semantic-summary">
      <div className="metadata-semantic-summary__header">
        <div>
          <strong>Lectura funcional de Metadata</strong>
          <p>
            El dashboard conversacional trabaja con variables calculadas y validadas por reglas
            semanticas; el LLM solo puede explicarlas, no activarlas ni inventarlas.
          </p>
        </div>
        <StatusChip tone={dictionaryPayload ? 'success' : 'warning'}>
          {dictionaryPayload ? 'Diccionario conectado' : 'Solo metadata backend'}
        </StatusChip>
      </div>

      <div className="metadata-semantic-summary__cards">
        <CountCard label="Variables utiles" value={useful.length} helper="Candidatas para analisis" tone="success" />
        <CountCard label="No recomendadas" value={notRecommended.length} helper="Revisar antes de usar" tone="warning" />
        <CountCard label="Activas en diccionario" value={activeSemantic.length} helper="Validadas semanticamente" tone="success" />
        <CountCard label="Inactivas" value={inactiveSemantic.length} helper="No deben usarse por LLM" tone="warning" />
        <CountCard label="No graficables" value={nonChartable.length} helper="Tabla/filtro, no grafico" tone="neutral" />
        <CountCard label="Muchos nulos" value={highNulls.length} helper="Menor confianza" tone="warning" />
        <CountCard label="Cardinalidad alta" value={highCardinality.length} helper="Puede saturar graficos" tone="warning" />
        <CountCard label="Bloqueos metrica/dimension" value={blocked.length} helper="Reglas semanticas" tone="neutral" />
      </div>

      {dictionaryError ? (
        <div className="metadata-semantic-summary__notice">{dictionaryError}</div>
      ) : null}

      <div className="metadata-semantic-summary__columns">
        <div>
          <h4>Variables candidatas</h4>
          {visibleUseful.length ? (
            visibleUseful.map((variable) => <VariableRow key={variable.name} variable={variable} />)
          ) : (
            <p className="metadata-semantic-summary__empty">
              No hay informacion suficiente para recomendar variables utiles.
            </p>
          )}
        </div>
        <div>
          <h4>Variables a revisar</h4>
          {visibleRisks.length ? (
            visibleRisks.map((variable) => <VariableRow key={variable.name} variable={variable} />)
          ) : (
            <p className="metadata-semantic-summary__empty">
              No se detectaron restricciones relevantes en el perfil calculado.
            </p>
          )}
        </div>
      </div>

      <div className="metadata-semantic-summary__llm-note">
        <strong>Rol del LLM en Metadata</strong>
        <span>
          El LLM explica metadatos ya calculados por backend y diccionario semantico. Si una variable
          no existe, esta inactiva o no es interpretable, no debe mostrarse como valida ni como evidencia real.
        </span>
      </div>
    </div>
  )
}

MetadataSemanticSummary.propTypes = {
  datasetProfile: PropTypes.object,
  projectId: PropTypes.string,
}
