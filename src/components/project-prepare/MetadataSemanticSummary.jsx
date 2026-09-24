import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { fetchConversationSemanticDictionary } from '@/api/conversation'
import { semanticMapFromList } from '@/components/conversation/dashboard/semanticDashboard'
import { formatSpanishNumber } from './helpers'

const EMPTY_ARRAY = []

function asList(value) {
  return Array.isArray(value) ? value : EMPTY_ARRAY
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

const ROLE_LABELS = {
  metric: 'Número',
  dimension: 'Categoría',
  excluded: 'Excluida',
  unknown: 'Sin tipo',
}

function roleLabel(role) {
  return ROLE_LABELS[role] || 'Sin tipo'
}

function reviewReason(variable) {
  if (variable.high_nulls) return 'Muchos valores vacíos'
  if (variable.high_cardinality) return 'Demasiados valores distintos'
  if (!variable.canChart) return 'No se puede graficar'
  if (variable.avoidAsMetric) return 'No usar como número'
  if (variable.avoidAsDimension) return 'No usar como categoría'
  return 'Revisar antes de usarla'
}

function VariableRow({ variable, reason }) {
  return (
    <article className="metadata-semantic-variable">
      <div className="metadata-semantic-variable__main">
        <strong>{variable.label}</strong>
        <span>{roleLabel(variable.role)}</span>
      </div>
      {reason ? <p>{reason}</p> : null}
    </article>
  )
}

VariableRow.propTypes = {
  variable: PropTypes.object.isRequired,
  reason: PropTypes.string,
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
          setDictionaryError('No se pudo completar la revisión de todas las variables.')
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
  const dataIssues = rows.filter((row) => row.high_nulls || row.high_cardinality)
  const visibleUseful = useful.slice(0, 4)
  const visibleRisks = notRecommended.slice(0, 4)

  return (
    <div className="metadata-semantic-summary">
      <div className="metadata-semantic-summary__header">
        <strong>Variables del dataset</strong>
      </div>

      <div className="metadata-semantic-summary__cards">
        <CountCard label="Útiles" value={useful.length} helper="Listas para el análisis" />
        <CountCard label="A revisar" value={notRecommended.length} helper="Conviene mirarlas antes" />
        {dataIssues.length ? (
          <CountCard
            label="Con problemas de datos"
            value={dataIssues.length}
            helper="Valores vacíos o demasiados distintos"
          />
        ) : null}
      </div>

      {dictionaryError ? (
        <div className="metadata-semantic-summary__notice">{dictionaryError}</div>
      ) : null}

      <div className="metadata-semantic-summary__columns">
        <div>
          <h4>Variables candidatas</h4>
          {visibleUseful.length ? (
            visibleUseful.map((variable) => (
              <VariableRow key={variable.name} variable={variable} />
            ))
          ) : (
            <p className="metadata-semantic-summary__empty">
              No hay variables listas para el análisis.
            </p>
          )}
        </div>
        <div>
          <h4>Variables a revisar</h4>
          {visibleRisks.length ? (
            visibleRisks.map((variable) => (
              <VariableRow key={variable.name} variable={variable} reason={reviewReason(variable)} />
            ))
          ) : (
            <p className="metadata-semantic-summary__empty">
              No hay variables que revisar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

MetadataSemanticSummary.propTypes = {
  datasetProfile: PropTypes.object,
  projectId: PropTypes.string,
}
