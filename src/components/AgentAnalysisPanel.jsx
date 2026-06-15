import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAgentResults,
  fetchAgentTraces,
  fetchProjectAgentTraces,
  recordHumanAgentDecision,
  runAgentInterpretation,
  runAgentStrategy,
} from '../api/agents'
import { selectRunInsight } from '../api/conversation'
import {
  AgentLlmHero,
  isLlmEnrichedInsight,
  LlmModeChip,
  SparkleIcon,
} from './LlmVisual'
import { Button, Card, Dialog, Feedback, LoadingPanel } from '../ui'
import '../styles/llm-visual.css'

const TRACE_DISPLAY_LIMIT = 100

function parseJsonList(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function insightIdentity(runId, item) {
  return item.cluster_insight_id ?? `agent-${runId}-${item.cluster_label}`
}

function insightFromAgent(runId, item) {
  const riskMap = { high: 85, medium: 55, low: 25 }
  const riskKey = String(item.risk_level ?? '').toLowerCase()
  return {
    id: insightIdentity(runId, item),
    title: businessInsightTitle(item),
    description: [businessInsightLead(item), businessInsightAction(item)].filter(Boolean).join(' '),
    metric_label: 'cluster_agent_risk',
    metric_value: riskMap[riskKey] ?? item.sample_size ?? 0,
    dimension: 'cluster_label',
    filter_kind: 'cluster_label',
    filter_value: String(item.cluster_label),
  }
}

function formatStrategyTitle(id) {
  return String(id ?? 'Recomendación')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function strategyKey(item) {
  return String(item?.strategy_id ?? item?.strategy_type ?? '').toLowerCase()
}

function businessStrategyTitle(item) {
  const key = strategyKey(item)
  if (key.includes('feature_mix')) return 'Como formar los grupos'
  if (key.includes('explanation')) return 'Que mirar para explicar cada grupo'
  if (key.includes('sampling')) return 'Que ejemplos revisar'
  if (key.includes('algorithm')) return 'Como comprobar la calidad del agrupamiento'
  if (key.includes('validation')) return 'Que debe validar el analista'
  return formatStrategyTitle(item.strategy_id)
}

function normalizeStrategyVariableName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function businessVariableLabel(variableName) {
  const text = normalizeStrategyVariableName(variableName)
  if (/preview|descripcion|description|texto|summary|observacion|detalle/.test(text)) {
    return 'texto o descripcion del ticket'
  }
  if (/categoria|category|catalogo|subcategoria/.test(text)) return 'categoria'
  if (/urgencia|urgency/.test(text)) return 'urgencia'
  if (/prioridad|priority/.test(text)) return 'prioridad'
  if (/severity|severidad/.test(text)) return 'severidad'
  if (/affected_service|servicio_afectado|service|business_service/.test(text)) {
    return 'servicio afectado'
  }
  if (/assignment_group|grupo|responsable|assigned/.test(text)) return 'grupo responsable'
  if (/sla|breach|incumpl/.test(text)) return 'SLA'
  if (/resolution|resolucion|duracion|duration|tiempo|time|hours|minutes/.test(text)) {
    return 'tiempos de atencion'
  }
  if (/risk|riesgo|impact|impacto|valor|score/.test(text)) return 'impacto o riesgo'
  if (/cluster_label/.test(text)) return 'grupo detectado'
  if (/evidence_id|incident|numero|id/.test(text)) return 'identificador del ticket'
  return String(variableName ?? '')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function uniqueBusinessVariables(variables) {
  const seen = new Set()
  return (variables ?? [])
    .map(businessVariableLabel)
    .filter(Boolean)
    .filter((label) => {
      const key = normalizeStrategyVariableName(label)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function businessVariableList(variables, fallback = 'las variables detectadas') {
  const labels = uniqueBusinessVariables(variables)
  if (!labels.length) return fallback
  const visible = labels.slice(0, 5)
  const rest = labels.length - visible.length
  const suffix = rest > 0 ? ` y ${rest} mas` : ''
  if (visible.length === 1) return `${visible[0]}${suffix}`
  if (visible.length === 2) return `${visible[0]} y ${visible[1]}${suffix}`
  return `${visible.slice(0, -1).join(', ')} y ${visible.at(-1)}${suffix}`
}

function strategyVariables(item, selectedVariables = null) {
  return selectedVariables?.length ? selectedVariables : parseVariables(item.variables_used)
}

function businessStrategySummary(item, selectedVariables = null) {
  const key = strategyKey(item)
  const variableText = businessVariableList(strategyVariables(item, selectedVariables))
  if (key.includes('feature_mix')) {
    return `La app propone formar grupos usando ${variableText}. Estas variables salen de las columnas reales detectadas en esta ejecucion.`
  }
  if (key.includes('explanation')) {
    return `Para explicar cada grupo, la app recomienda mirar ${variableText}, porque son variables que ayudan a convertir el resultado tecnico en una lectura de negocio.`
  }
  if (key.includes('sampling')) {
    return `La app recomienda revisar ejemplos usando ${variableText}, para comprobar que el patron detectado coincide con tickets reales.`
  }
  if (key.includes('algorithm')) {
    return `La app recomienda comprobar la calidad del agrupamiento con ${variableText}, antes de tomar decisiones sobre los grupos.`
  }
  return item.recommendation ?? 'La app propone una pauta metodologica para continuar el analisis.'
}

function businessStrategyAction(item, selectedVariables = null) {
  const key = strategyKey(item)
  const variableText = businessVariableList(strategyVariables(item, selectedVariables))
  if (key.includes('feature_mix')) {
    return `Siguiente paso: deja marcadas solo las variables que quieres aceptar. Ahora la seleccion es: ${variableText}.`
  }
  if (key.includes('explanation')) {
    return `Siguiente paso: usa ${variableText} para responder que tienen en comun las incidencias de cada grupo.`
  }
  if (key.includes('sampling')) {
    return `Siguiente paso: revisa tickets de muestra usando ${variableText} para confirmar la explicacion del grupo.`
  }
  if (key.includes('algorithm')) {
    return `Siguiente paso: revisa estas metricas (${variableText}) y, si la calidad es baja, ajusta los datos o prueba otra vista.`
  }
  return 'Siguiente paso: revisa el detalle tecnico y valida si esta recomendacion aplica al escenario.'
}

function parseVariables(value) {
  if (Array.isArray(value)) return value.map(String)
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function strategyItemKey(item) {
  return String(item?.strategy_id ?? item?.trace_id ?? item?.strategy_type ?? 'strategy')
}

function buildStrategyVariableSelection(items) {
  return Object.fromEntries(
    (items ?? []).map((item) => [strategyItemKey(item), parseVariables(item.variables_used)]),
  )
}

function PriorityChip({ level }) {
  const key = normalizeStrategyVariableName(level)
  const className =
    /alto|alta|high/.test(key)
      ? 'high'
      : /medio|media|medium/.test(key)
        ? 'medium'
        : /bajo|baja|low/.test(key)
          ? 'low'
          : 'neutral'
  const label =
    className === 'high'
      ? 'Alta'
      : className === 'medium'
        ? 'Media'
        : className === 'low'
          ? 'Baja'
          : 'Por revisar'
  return <span className={`agent-priority agent-priority--${className}`}>{label}</span>
}

function VariableChips({ variables, max = 5, selectedVariables = null, onToggleVariable = null }) {
  const items = variables.slice(0, max)
  const rest = variables.length - items.length
  if (!items.length) return null
  const selectable = typeof onToggleVariable === 'function'
  const selectedSet = new Set(selectedVariables ?? variables)
  return (
    <div className="agent-var-chips" aria-label="Variables sugeridas">
      {items.map((name) =>
        selectable ? (
          <button
            className={`agent-var-chip agent-var-chip--button${selectedSet.has(name) ? ' agent-var-chip--selected' : ''}`}
            key={name}
            type="button"
            aria-pressed={selectedSet.has(name)}
            onClick={() => onToggleVariable(name)}
          >
            {selectedSet.has(name) ? '✓ ' : ''}{name}
          </button>
        ) : (
          <span className="agent-var-chip" key={name}>
            {name}
          </span>
        ),
      )}
      {rest > 0 ? <span className="agent-var-chip agent-var-chip--more">+{rest}</span> : null}
    </div>
  )
}

function StrategyCard({ item, llmActive, selectedVariables, onToggleVariable }) {
  const variables = parseVariables(item.variables_used)
  const selectedCount = selectedVariables?.length ?? variables.length
  const confirmedVariables = selectedVariables ?? variables
  return (
    <article className={`agent-compact-card${llmActive ? ' agent-compact-card--llm' : ''}`}>
      <div className="agent-compact-card__head">
        <div className="agent-compact-card__meta">
          <span className="agent-compact-card__type">Paso de estrategia</span>
          <h5 className="agent-compact-card__title">{businessStrategyTitle(item)}</h5>
        </div>
        <PriorityChip level={item.priority} />
      </div>
      <p className="agent-compact-card__lead">{businessStrategySummary(item, confirmedVariables)}</p>
      <p className="agent-compact-card__next">{businessStrategyAction(item, confirmedVariables)}</p>
      {variables.length ? (
        <p className="agent-variable-help">
          Variables a confirmar: {selectedCount} de {variables.length}. Desmarca las que no quieres incluir en la validacion.
        </p>
      ) : null}
      <VariableChips
        variables={variables}
        max={12}
        selectedVariables={selectedVariables}
        onToggleVariable={onToggleVariable}
      />
      <details className="agent-compact-details">
        {item.summary ? <p><strong>Resumen original:</strong> {item.summary}</p> : null}
        <summary>Más detalle</summary>
        {item.recommendation ? <p><strong>Salida original:</strong> {item.recommendation}</p> : null}
        {item.justification ? <p>{item.justification}</p> : null}
        {variables.length > 5 ? (
          <div className="agent-var-chips agent-var-chips--full">
            {variables.map((name) => (
              <span className="agent-var-chip" key={name}>
                {name}
              </span>
            ))}
          </div>
        ) : null}
      </details>
    </article>
  )
}

function cleanInsightText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function titleCase(value) {
  const text = cleanInsightText(value)
  if (!text) return ''
  return text
    .split(' ')
    .map((word) => (word.length <= 3 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(' ')
}

function isWeakInsightValue(value) {
  const text = normalizeStrategyVariableName(value)
  return (
    !text ||
    /^0(\.0+)?$/.test(text) ||
    /sin .*dominante|sin dato|no disponible|none|null|undefined|nan/.test(text)
  )
}

function parseCharacteristicsText(value) {
  const facts = {}
  const rawItems = cleanInsightText(value)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  rawItems.forEach((part) => {
    const [rawKey, ...rest] = part.split(':')
    if (rest.length) {
      facts[normalizeStrategyVariableName(rawKey)] = cleanInsightText(rest.join(':'))
      return
    }
    const count = part.match(/(\d[\d.,]*)\s+(evidencias|registros|tickets|incidencias)/i)
    if (count) facts.count = count[1]
  })
  return facts
}

function firstUsefulFact(facts, patterns) {
  for (const [key, value] of Object.entries(facts)) {
    if (patterns.some((pattern) => pattern.test(key)) && !isWeakInsightValue(value)) return value
  }
  return ''
}

function insightFacts(item) {
  const facts = parseCharacteristicsText(item.main_characteristics)
  const summary = cleanInsightText(item.summary)
  if (!facts.count) {
    const count = summary.match(/con\s+(\d[\d.,]*)\s+(evidencias|registros|tickets|incidencias)/i)
    if (count) facts.count = count[1]
  }
  return {
    count: facts.count || item.sample_size || '',
    category: firstUsefulFact(facts, [/categoria/, /category/, /catalogo/, /sector/]),
    service: firstUsefulFact(facts, [/servicio/, /service/, /aplicacion/, /sistema/]),
    criticality: firstUsefulFact(facts, [/urgencia/, /prioridad/, /severity/, /severidad/, /critic/]),
    assignmentGroup: firstUsefulFact(facts, [/assignment/, /responsable/, /grupo/]),
    sla: firstUsefulFact(facts, [/sla/]),
    resolution: firstUsefulFact(facts, [/resolucion/, /duracion/, /tiempo/]),
    risk: firstUsefulFact(facts, [/riesgo/, /risk/, /impacto/, /impact/]),
  }
}

function insightRiskText(level) {
  const key = normalizeStrategyVariableName(level)
  if (/alto|alta|high/.test(key)) return 'prioridad alta'
  if (/medio|media|medium/.test(key)) return 'prioridad media'
  if (/bajo|baja|low/.test(key)) return 'prioridad baja'
  return 'prioridad por revisar'
}

function friendlyCriticality(value) {
  const text = cleanInsightText(value)
  const key = normalizeStrategyVariableName(text)
  if (!text || isWeakInsightValue(text)) return ''
  if (/critica|critico|critical/.test(key)) return 'criticidad critica'
  if (/alto|alta|high/.test(key)) return 'urgencia alta'
  if (/medio|media|medium/.test(key)) return 'urgencia media'
  if (/bajo|baja|low/.test(key)) return 'urgencia baja'
  return text.toLowerCase()
}

function businessInsightTitle(item) {
  const facts = insightFacts(item)
  const isOutlier =
    Number(item.cluster_label) === -1 || normalizeStrategyVariableName(item.cluster_name).includes('outlier')
  if (isOutlier) return 'Casos atipicos para revisar'

  const category = titleCase(facts.category)
  const service = titleCase(facts.service)
  const criticality = friendlyCriticality(facts.criticality)

  if (category && criticality) return `Grupo de incidencias de ${category} con ${criticality}`
  if (category && service) return `Grupo de incidencias de ${category} en ${service}`
  if (service) return `Grupo de incidencias en ${service}`
  if (category) return `Grupo de incidencias de ${category}`
  return facts.count
    ? `Grupo de incidencias similares (${facts.count} registros)`
    : 'Grupo de incidencias similares sin etiqueta clara'
}

function businessInsightLead(item) {
  const facts = insightFacts(item)
  const countText = facts.count ? `${facts.count} registros` : 'varios registros'
  const anchor = [facts.category, facts.service].filter(Boolean).join(' / ')
  const riskText = insightRiskText(item.risk_level)
  if (anchor) {
    return `Este grupo reune ${countText} con un patron parecido. La senal principal detectada es ${anchor}. La app lo marca como ${riskText}.`
  }
  return `La app encontro ${countText} que se parecen entre si. Todavia no hay una etiqueta de negocio clara, por eso conviene revisar algunos ejemplos antes de sacar conclusiones.`
}

function businessInsightWhy(item) {
  const facts = insightFacts(item)
  const riskText = insightRiskText(item.risk_level)
  const timeText = facts.resolution && !isWeakInsightValue(facts.resolution) ? ` Tiempo medio: ${facts.resolution}.` : ''
  const slaText = facts.sla && !isWeakInsightValue(facts.sla) ? ` SLA: ${facts.sla}.` : ''
  if (/alta/.test(riskText)) {
    return `Por que importa: puede concentrar casos urgentes o de mayor impacto.${slaText}${timeText}`
  }
  if (/media/.test(riskText)) {
    return `Por que importa: ayuda a detectar recurrencias que conviene monitorear.${slaText}${timeText}`
  }
  if (facts.category || facts.service) {
    return `Por que importa: sirve como perfil de referencia y para comparar contra grupos mas criticos.${slaText}${timeText}`
  }
  return `Por que importa: puede revelar un patron que las columnas actuales no nombran bien. Es buen candidato para revisar calidad de datos o crear una etiqueta de negocio.${slaText}${timeText}`
}

function businessInsightAction(item) {
  const facts = insightFacts(item)
  const genericRecommendation = cleanInsightText(item.recommendations)
  const weakRecommendation = /sin categoria dominante|sin servicio dominante/i.test(genericRecommendation)
  if (genericRecommendation && !weakRecommendation) return genericRecommendation
  const anchor = [facts.category, facts.service].filter(Boolean).join(' / ')
  if (anchor) {
    return `Accion sugerida: revisar una muestra de tickets de ${anchor}, confirmar si comparten causa y decidir si requiere accion operativa.`
  }
  return 'Accion sugerida: abrir los ejemplos del grupo, leer 3 a 5 tickets y ponerle un nombre de negocio si el patron tiene sentido.'
}

function businessInsightMetrics(item) {
  const facts = insightFacts(item)
  return [
    { label: 'Tickets en el grupo', value: facts.count },
    { label: 'Tema detectado', value: [facts.category, facts.service].filter(Boolean).join(' / ') },
    { label: 'Urgencia/prioridad', value: friendlyCriticality(facts.criticality) || insightRiskText(item.risk_level) },
    { label: 'SLA', value: facts.sla },
    { label: 'Tiempo medio', value: facts.resolution },
    { label: 'Impacto/riesgo', value: facts.risk },
  ].filter((metric) => metric.value && !isWeakInsightValue(metric.value))
}

function businessInsightVariables(item) {
  return uniqueBusinessVariables(parseJsonList(item.highlighted_variables)).slice(0, 8)
}

function numericInsightValue(value) {
  const match = cleanInsightText(value).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : 0
}

function insightRiskRank(item) {
  const key = normalizeStrategyVariableName(item?.risk_level)
  if (/alto|alta|high/.test(key)) return 3
  if (/medio|media|medium/.test(key)) return 2
  if (/bajo|baja|low/.test(key)) return 1
  return 0
}

function insightRecordCount(item) {
  const facts = insightFacts(item)
  return numericInsightValue(facts.count) || Number(item.sample_size ?? 0) || 0
}

function insightHasClearSignal(item) {
  const facts = insightFacts(item)
  return Boolean(facts.category || facts.service || facts.criticality || facts.risk)
}

function insightPriorityScore(item) {
  const facts = insightFacts(item)
  return (
    insightRiskRank(item) * 100000 +
    (insightHasClearSignal(item) ? 10000 : 0) +
    numericInsightValue(facts.risk) * 100 +
    numericInsightValue(facts.sla) * 10 +
    numericInsightValue(facts.resolution) +
    insightRecordCount(item)
  )
}

function sortInsightsByBusinessPriority(items) {
  return [...items].sort((a, b) => {
    const scoreDiff = insightPriorityScore(b) - insightPriorityScore(a)
    if (scoreDiff !== 0) return scoreDiff
    return Number(a.cluster_label ?? 0) - Number(b.cluster_label ?? 0)
  })
}

function chatPromptForInsight(item) {
  return [
    `Analiza este grupo de incidencias: ${businessInsightTitle(item)}.`,
    businessInsightLead(item),
    businessInsightWhy(item),
    businessInsightAction(item),
    `Grupo tecnico: ${item.cluster_label}.`,
    'Explicamelo en lenguaje de negocio, dime que patron puede representar, que ejemplos conviene revisar y que accion recomiendas.',
  ]
    .filter(Boolean)
    .join(' ')
}

function InsightCard({ item, added, selected, onAdd, onAskChat, onToggleSelect }) {
  const llmEnriched = isLlmEnrichedInsight(item)
  const sampleIds = parseJsonList(item.sample_evidence_ids)
  const metrics = businessInsightMetrics(item)
  const variables = businessInsightVariables(item)
  return (
    <article className={`agent-compact-card agent-compact-card--insight${llmEnriched ? ' agent-compact-card--llm' : ''}${selected ? ' agent-compact-card--selected' : ''}`}>
      <div className="agent-compact-card__head">
        <label className="agent-insight-select">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item)}
            aria-label={`Seleccionar ${businessInsightTitle(item)}`}
          />
          <span>Seleccionar</span>
        </label>
        <div className="agent-compact-card__meta">
          <span className="agent-compact-card__type">
            Grupo {item.cluster_label}{' '}
            <LlmModeChip mode={llmEnriched ? 'llm_active' : 'deterministic'} />
          </span>
          <h5 className="agent-compact-card__title">{businessInsightTitle(item)}</h5>
        </div>
        <PriorityChip level={item.risk_level} />
      </div>
      <p className="agent-compact-card__lead">{businessInsightLead(item)}</p>
      <p className="agent-compact-card__next">{businessInsightWhy(item)}</p>
      {metrics.length ? (
        <div className="agent-insight-metrics" aria-label="Datos clave del grupo">
          {metrics.map((metric) => (
            <span className="agent-insight-metric" key={metric.label}>
              <small>{metric.label}</small>
              <strong>{metric.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      <p className="agent-insight-action">{businessInsightAction(item)}</p>
      {variables.length ? (
        <div className="agent-insight-vars">
          <span>Columnas usadas para explicar este grupo:</span>
          <VariableChips variables={variables} max={8} />
        </div>
      ) : null}
      <details className="agent-compact-details">
        <summary>Ver ejemplos y detalle tecnico</summary>
        {item.main_characteristics ? <p>{item.main_characteristics}</p> : null}
        {item.possible_causes ? <p><strong>Causas:</strong> {item.possible_causes}</p> : null}
        {item.recommendations ? <p><strong>Acción:</strong> {item.recommendations}</p> : null}
        {item.business_conclusion ? <p>{item.business_conclusion}</p> : null}
        {sampleIds.length ? (
          <p className="agent-compact-sample">
            Muestra ({item.sample_size ?? sampleIds.length}): {sampleIds.slice(0, 8).join(', ')}
            {sampleIds.length > 8 ? ` +${sampleIds.length - 8} más` : ''}
          </p>
        ) : null}
      </details>
      <div className="agent-compact-card__foot">
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          onClick={() => onAskChat(item)}
        >
          Preguntar en chat
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={added}
          onClick={() => onAdd(item)}
        >
          {added ? 'Agregado' : 'Agregar al dashboard'}
        </Button>
      </div>
    </article>
  )
}

function StrategyGuide({ recommendations, insights }) {
  if (!recommendations.length) return null
  const hasInsights = insights.length > 0
  return (
    <Card className="agent-guidance-card">
      <div>
        <span className="agent-guidance-kicker">Lectura para negocio</span>
        <h4>Que significa esta estrategia</h4>
        <p>
          La app esta proponiendo una forma de leer las incidencias: que columnas mirar, que
          grupos revisar primero y como convertir los resultados en conclusiones comprensibles.
          Los pasos de abajo no ejecutan acciones separadas; son criterios que quedan registrados
          como guia de analisis. Las variables salen de las columnas detectadas en la fuente o
          ejecucion seleccionada.
        </p>
      </div>
      <ol className="agent-guidance-steps">
        <li>
          <strong>Revisa las variables sugeridas.</strong>
          <span>Marca solo las columnas que quieres confirmar. Puedes dejar dos variables si son las unicas que te parecen utiles.</span>
        </li>
        <li>
          <strong>Valida la estrategia.</strong>
          <span>Si las variables parecen utiles, pulsa validar. Esto deja trazabilidad de que aceptas esa forma de interpretar el analisis.</span>
        </li>
        <li>
          <strong>{hasInsights ? 'Revisa los hallazgos por grupo.' : 'Despues interpreta los grupos.'}</strong>
          <span>
            {hasInsights
              ? 'Prioriza los grupos con riesgo alto y abre el detalle para ver causas, muestras y acciones.'
              : 'El agente convertira los grupos tecnicos en explicaciones y recomendaciones de negocio.'}
          </span>
        </li>
      </ol>
    </Card>
  )
}

function AgentNextStepHint({ recommendations, insights }) {
  const hasStrategy = recommendations.length > 0
  const hasInsights = insights.length > 0
  const title = hasInsights
    ? 'Siguiente paso: revisar hallazgos'
    : hasStrategy
      ? 'Siguiente paso: confirmar seleccion'
      : 'Siguiente paso: pedir una estrategia'
  const text = hasInsights
    ? 'Ya puedes revisar los grupos interpretados, agregar hallazgos al dashboard o llevarlos al chat.'
    : hasStrategy
      ? 'Desmarca variables que no quieras usar, pulsa Confirmar y continuar, y luego interpreta los grupos.'
      : 'Pulsa Sugerir estrategia para que la app proponga que variables mirar y como leer los grupos.'
  return (
    <div className="agent-next-step">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function traceTimestamp(record) {
  const value = traceField(record, ['created_at', 'createdAt', 'timestamp'], '')
  if (!value) return 0
  const date = new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? 0 : time
}

function parseTraceRecord(trace) {
  if (!trace) return {}
  if (typeof trace === 'string') {
    try {
      return JSON.parse(trace)
    } catch {
      return { response: trace }
    }
  }
  return trace
}

function traceField(record, keys, fallback = 'No registrado') {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== null && value !== undefined && String(value).trim()) return String(value)
  }
  return fallback
}

function traceBlockValue(value) {
  if (value === null || value === undefined || value === '') return 'No registrado'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const text = String(value)
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'object') return JSON.stringify(parsed, null, 2)
  } catch {
    // Keep plain text as-is when it is not JSON.
  }
  return text
}

function tracePreview(value, maxLength = 180) {
  const text = traceBlockValue(value).replace(/\s+/g, ' ').trim()
  if (!text || text === 'No registrado') return 'Sin detalle registrado'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function hasTraceContent(record) {
  if (!record || typeof record !== 'object') return false
  return [
    'trace_id',
    'agent_name',
    'decision_type',
    'model_name',
    'parameters',
    'variables_used',
    'input_artifacts',
    'prompt',
    'response',
    'created_at',
  ].some((key) => {
    const value = record[key]
    return value !== null && value !== undefined && String(value).trim() !== ''
  })
}

function normalizeTraceList(data) {
  if (!Array.isArray(data?.traces)) return []
  return data.traces
    .map(parseTraceRecord)
    .filter(hasTraceContent)
    .sort((a, b) => traceTimestamp(b) - traceTimestamp(a))
}

function TraceRow({ trace, index }) {
  const [open, setOpen] = useState(false)
  const record = parseTraceRecord(trace)
  const agentName = traceField(record, ['agent_name', 'agentName', 'agent'], 'Agente')
  const decisionType = traceField(record, ['decision_type', 'decisionType', 'type'], 'Decision registrada')
  const modelName = traceField(record, ['model_name', 'modelName'], 'Modelo no informado')
  const createdAt = traceField(record, ['created_at', 'createdAt', 'timestamp'], '')
  const traceId = traceField(record, ['trace_id', 'traceId'], '')

  return (
    <article className={`agent-trace-card${open ? ' agent-trace-card--open' : ''}`}>
      <div className="agent-trace-head">
        <div className="agent-trace-main">
          <span className="agent-trace-number">#{index + 1}</span>
          <div>
            <strong>{agentName}</strong>
            <span>{decisionType}</span>
            {traceId ? <code className="agent-trace-id">{traceId}</code> : null}
          </div>
        </div>
        <div className="agent-trace-meta">
          {record.scope ? <span>{record.scope}</span> : null}
          {record.source_run_id ? <span>Run origen: {record.source_run_id}</span> : null}
          <span>{modelName}</span>
          <span>{formatDate(createdAt)}</span>
          <button
            type="button"
            className="agent-trace-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        </div>
      </div>
      <div className="agent-trace-preview">
        <strong>Resumen:</strong> {tracePreview(record.response || record.prompt || record.parameters)}
      </div>
      {open ? (
        <div className="agent-trace-body">
          <div>
            <h4>Variables y parametros</h4>
            <pre>
              {[
                `Variables: ${traceBlockValue(record.variables_used)}`,
                `Parametros: ${traceBlockValue(record.parameters)}`,
                `Artefactos: ${traceBlockValue(record.input_artifacts)}`,
              ].join('\n\n')}
            </pre>
          </div>
          <div>
            <h4>Prompt</h4>
            <pre>{traceBlockValue(record.prompt)}</pre>
          </div>
          <div>
            <h4>Respuesta</h4>
            <pre>{traceBlockValue(record.response)}</pre>
          </div>
        </div>
      ) : null}
    </article>
  )
}

async function fetchOptionalTraces(loader) {
  try {
    const data = await loader()
    return normalizeTraceList(data)
  } catch (err) {
    if (err?.status === 404) return []
    throw err
  }
}

export function AgentAnalysisPanel({ run, projectId: projectIdProp, onOpenChatWithPrompt }) {
  const runId = run?.id
  const projectId = projectIdProp ?? run?.project_id ?? null
  const [recommendations, setRecommendations] = useState([])
  const [insights, setInsights] = useState([])
  const [hasTraces, setHasTraces] = useState(false)
  const [traces, setTraces] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedInsightIds, setSelectedInsightIds] = useState(new Set())
  const [initialLoading, setInitialLoading] = useState(false)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [interpretationLoading, setInterpretationLoading] = useState(false)
  const [bulkDashboardLoading, setBulkDashboardLoading] = useState(false)
  const [validationLoading, setValidationLoading] = useState(false)
  const [tracesLoading, setTracesLoading] = useState(false)
  const [tracesOpen, setTracesOpen] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [llmStatus, setLlmStatus] = useState(null)
  const [insightFilter, setInsightFilter] = useState('recommended')
  const [selectedStrategyVariables, setSelectedStrategyVariables] = useState({})

  const loadResults = useCallback(async () => {
    if (!runId) return
    setInitialLoading(true)
    setError(null)
    try {
      const data = await fetchAgentResults(runId)
      const loadedRecommendations = data.recommendations ?? []
      setRecommendations(loadedRecommendations)
      setSelectedStrategyVariables(buildStrategyVariableSelection(loadedRecommendations))
      setInsights(data.insights ?? [])
      setHasTraces(Boolean(data.has_traces))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados del agente')
    } finally {
      setInitialLoading(false)
    }
  }, [runId])

  useEffect(() => {
    setRecommendations([])
    setInsights([])
    setHasTraces(false)
    setTraces([])
    setSelectedIds(new Set())
    setSelectedInsightIds(new Set())
    setMessage(null)
    setLlmStatus(null)
    setInsightFilter('recommended')
    setSelectedStrategyVariables({})
    setError(null)
    if (runId) void loadResults()
  }, [runId, loadResults])

  const llmInsightCount = useMemo(
    () => insights.filter((item) => isLlmEnrichedInsight(item)).length,
    [insights],
  )

  const sortedInsights = useMemo(() => sortInsightsByBusinessPriority(insights), [insights])

  const insightCounts = useMemo(
    () => ({
      recommended: Math.min(sortedInsights.length, 30),
      mediumHigh: sortedInsights.filter((item) => insightRiskRank(item) >= 2).length,
      clearSignal: sortedInsights.filter((item) => insightHasClearSignal(item)).length,
      low: sortedInsights.filter((item) => insightRiskRank(item) === 1).length,
      llm: sortedInsights.filter((item) => isLlmEnrichedInsight(item)).length,
      all: sortedInsights.length,
    }),
    [sortedInsights],
  )

  const visibleInsights = useMemo(() => {
    if (insightFilter === 'llm') {
      return sortedInsights.filter((item) => isLlmEnrichedInsight(item))
    }
    if (insightFilter === 'medium_high') {
      return sortedInsights.filter((item) => insightRiskRank(item) >= 2)
    }
    if (insightFilter === 'clear_signal') {
      return sortedInsights.filter((item) => insightHasClearSignal(item))
    }
    if (insightFilter === 'low') {
      return sortedInsights.filter((item) => insightRiskRank(item) === 1)
    }
    if (insightFilter === 'all') {
      return sortedInsights
    }
    return sortedInsights.slice(0, 30)
  }, [insightFilter, sortedInsights])

  const visibleTraces = useMemo(
    () => traces.slice(0, TRACE_DISPLAY_LIMIT),
    [traces],
  )

  const visibleInsightIds = useMemo(
    () => visibleInsights.map((item) => insightIdentity(runId, item)),
    [runId, visibleInsights],
  )

  const selectedVisibleCount = useMemo(
    () => visibleInsightIds.filter((id) => selectedInsightIds.has(id)).length,
    [selectedInsightIds, visibleInsightIds],
  )

  const topLlmInsight = useMemo(
    () => insights.find((item) => isLlmEnrichedInsight(item)),
    [insights],
  )

  async function onRunStrategy() {
    if (!runId) return
    setStrategyLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runAgentStrategy(runId)
      const strategyItems = response.items ?? []
      setRecommendations(strategyItems)
      setSelectedStrategyVariables(buildStrategyVariableSelection(strategyItems))
      setHasTraces((response.trace_ids?.length ?? 0) > 0 || hasTraces)
      setLlmStatus({
        used: Boolean(response.llm_used),
        mode: response.llm_mode,
        detail: response.llm_detail,
        modelName: response.model_name,
      })
      setMessage(
        response.llm_used
          ? 'Estrategia generada con agente LLM y guardada.'
          : 'Estrategia generada en modo local y guardada.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el agente de estrategia')
    } finally {
      setStrategyLoading(false)
    }
  }

  async function onRunInterpretation() {
    if (!runId) return
    setInterpretationLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await runAgentInterpretation(runId)
      setInsights(response.items ?? [])
      setHasTraces((response.trace_ids?.length ?? 0) > 0 || hasTraces)
      setLlmStatus({
        used: Boolean(response.llm_used),
        mode: response.llm_mode,
        detail: response.llm_detail,
        modelName: response.model_name,
      })
      setMessage(
        response.llm_used
          ? 'Interpretación por cluster generada con agente LLM y guardada.'
          : 'Interpretación por cluster generada en modo local y guardada.',
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo ejecutar el agente de interpretación',
      )
    } finally {
      setInterpretationLoading(false)
    }
  }

  function onToggleStrategyVariable(item, variableName) {
    const key = strategyItemKey(item)
    setSelectedStrategyVariables((current) => {
      const fallback = parseVariables(item.variables_used)
      const existing = current[key] ?? fallback
      const next = existing.includes(variableName)
        ? existing.filter((name) => name !== variableName)
        : [...existing, variableName]
      return { ...current, [key]: next }
    })
  }

  async function onValidateStrategy() {
    if (!runId || !recommendations.length) return
    setValidationLoading(true)
    setError(null)
    setMessage(null)
    try {
      const approvedStrategyIds = recommendations
        .map((item) => item.strategy_id)
        .filter(Boolean)
        .map(String)
      const variablesByStrategy = Object.fromEntries(
        recommendations.map((item) => {
          const key = strategyItemKey(item)
          return [key, selectedStrategyVariables[key] ?? parseVariables(item.variables_used)]
        }),
      )
      const response = await recordHumanAgentDecision(runId, {
        decision_type: 'strategy_approval',
        status: 'approved',
        summary:
          'El analista confirma la estrategia propuesta por el agente y las variables seleccionadas para continuar con la interpretacion de grupos.',
        approved_strategy_ids: approvedStrategyIds,
        parameters: {
          recommendation_count: recommendations.length,
          insight_count: insights.length,
          selected_variables_by_strategy: variablesByStrategy,
        },
      })
      setHasTraces(true)
      setMessage(`Confirmacion registrada. Traza: ${response.trace_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la validacion humana')
    } finally {
      setValidationLoading(false)
    }
  }

  async function onOpenTraces() {
    if (!runId) return
    setTracesLoading(true)
    setError(null)
    try {
      const [runResult, projectResult] = await Promise.allSettled([
        fetchOptionalTraces(() => fetchAgentTraces(runId, TRACE_DISPLAY_LIMIT)),
        projectId
          ? fetchOptionalTraces(() => fetchProjectAgentTraces(projectId, TRACE_DISPLAY_LIMIT))
          : Promise.resolve([]),
      ])
      const failures = [runResult, projectResult].filter((result) => result.status === 'rejected')
      const runTraces = runResult.status === 'fulfilled' ? runResult.value : []
      const projectTraces = projectResult.status === 'fulfilled' ? projectResult.value : []
      const traceKeys = new Set()
      const combinedTraces = [
        ...projectTraces.map((trace) => ({ ...trace, scope: 'Proyecto' })),
        ...runTraces.map((trace) => ({ ...trace, scope: 'Ejecucion' })),
      ].filter((trace, index) => {
        const record = parseTraceRecord(trace)
        const key = traceField(record, ['trace_id', 'traceId'], '') || `trace-${index}`
        if (traceKeys.has(key)) return false
        traceKeys.add(key)
        return true
      })
      if (!combinedTraces.length && failures.length) {
        throw failures[0].reason
      }
      setTraces(combinedTraces)
      setTracesOpen(true)
      if (failures.length) {
        setMessage('Se muestran las trazas disponibles; una parte de la trazabilidad no respondió.')
      }
    } catch (err) {
      if (err?.status === 404) {
        setError('Todavía no hay trazas. Ejecuta primero estrategia o interpretación.')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las trazas')
      }
    } finally {
      setTracesLoading(false)
    }
  }

  async function onAddToDashboard(item) {
    if (!runId) return
    const insight = insightFromAgent(runId, item)
    if (selectedIds.has(insight.id)) return
    try {
      await selectRunInsight(runId, insight)
      setSelectedIds((current) => new Set([...current, insight.id]))
      setSelectedInsightIds((current) => {
        const next = new Set(current)
        next.delete(insight.id)
        return next
      })
      setMessage(`«${insight.title}» agregado al dashboard conversacional.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  function onToggleInsightSelection(item) {
    const id = insightIdentity(runId, item)
    setSelectedInsightIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function onSelectVisibleInsights() {
    setSelectedInsightIds((current) => {
      const next = new Set(current)
      visibleInsightIds.forEach((id) => {
        if (!selectedIds.has(id)) next.add(id)
      })
      return next
    })
  }

  function onClearInsightSelection() {
    setSelectedInsightIds(new Set())
  }

  async function onAddSelectedToDashboard() {
    if (!runId || !selectedInsightIds.size) return
    const items = sortedInsights.filter((item) => selectedInsightIds.has(insightIdentity(runId, item)))
    const pending = items.filter((item) => !selectedIds.has(insightIdentity(runId, item)))
    if (!pending.length) {
      setMessage('Los hallazgos seleccionados ya estaban agregados al dashboard.')
      setSelectedInsightIds(new Set())
      return
    }
    setBulkDashboardLoading(true)
    setError(null)
    try {
      const savedIds = []
      for (const item of pending) {
        const insight = insightFromAgent(runId, item)
        await selectRunInsight(runId, insight)
        savedIds.push(insight.id)
      }
      setSelectedIds((current) => new Set([...current, ...savedIds]))
      setSelectedInsightIds((current) => {
        const next = new Set(current)
        savedIds.forEach((id) => next.delete(id))
        return next
      })
      setMessage(`${savedIds.length} hallazgos agregados al dashboard conversacional.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los hallazgos seleccionados')
    } finally {
      setBulkDashboardLoading(false)
    }
  }

  function onSummarizeInChat() {
    if (!insights.length) return
    const llmItems = insights.filter((item) => isLlmEnrichedInsight(item))
    const focus = llmItems[0] ?? insights[0]
    const prompt = focus
      ? `Resume el cluster ${focus.cluster_label} (${focus.cluster_name}): ${focus.summary} ¿Qué acciones recomiendas?`
      : 'Resume los clusters más críticos de este análisis y sugiere próximos pasos.'
    onOpenChatWithPrompt?.(prompt)
    setMessage('Abriendo el chat con un resumen del análisis asistido…')
  }

  function onAskInsightInChat(item) {
    onOpenChatWithPrompt?.(chatPromptForInsight(item))
    setMessage(`Abriendo el chat para revisar: ${businessInsightTitle(item)}`)
  }

  if (!runId) {
    return (
      <section className="agent-panel agent-panel--empty">
        <p>Ejecuta el pipeline para habilitar el análisis asistido por agentes.</p>
      </section>
    )
  }

  const busy =
    strategyLoading || interpretationLoading || validationLoading || bulkDashboardLoading || initialLoading
  const agentHeroTitle = insights.length
    ? 'Grupos interpretados'
    : recommendations.length
      ? 'Estrategia sugerida'
      : 'Listo para asistir el analisis'
  const agentHeroSubtitle = llmStatus?.used
    ? llmStatus.detail ?? 'La app ya uso IA para apoyar la lectura del analisis.'
    : insights.length
      ? 'Ya hay hallazgos por grupo. Revisa los mas criticos y llevalos al dashboard o al chat.'
      : recommendations.length
        ? 'La estrategia esta lista. Desmarca variables si hace falta, confirma y continua con la interpretacion.'
        : 'Primero genera una estrategia: la app sugerira que variables mirar y como explicar los grupos.'

  return (
    <section className="agent-panel cluster-insights">
      <div className="cluster-insights-header">
        <div>
          <h3>Análisis asistido por agentes</h3>
          <p className="note">
            Estrategia + interpretación por cluster. Etiqueta <LlmModeChip mode="llm_active" /> =
            texto enriquecido por Azure.
          </p>
        </div>
      </div>

      <AgentLlmHero
        compact
        used={llmStatus?.used ?? Boolean(recommendations.length || llmInsightCount)}
        modelName={llmStatus?.modelName ?? 'gpt-4.1-mini'}
        detail={llmStatus?.detail}
        title={agentHeroTitle}
        subtitle={
          llmStatus?.used
            ? llmStatus.detail ?? 'Estrategia e interpretación con LLM.'
            : agentHeroSubtitle
        }
        stats={[
          { label: 'Estrategias', value: recommendations.length || '—' },
          { label: 'Clusters', value: insights.length || '—' },
          { label: 'Azure AI', value: llmInsightCount || '—' },
        ]}
      />

      <AgentNextStepHint recommendations={recommendations} insights={insights} />

      <div className="agent-panel-actions">
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={busy}
          onClick={onRunStrategy}
        >
          {strategyLoading ? (
            <>
              <SparkleIcon size={14} /> Generando con Azure AI…
            </>
          ) : (
            'Sugerir estrategia'
          )}
        </Button>
        {recommendations.length ? (
          <Button
            type="button"
            variant="secondary"
            className="btn-sm"
            disabled={busy}
            onClick={onValidateStrategy}
          >
            {validationLoading ? 'Registrando confirmacion...' : 'Confirmar y continuar'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={busy}
          onClick={onRunInterpretation}
        >
          {interpretationLoading ? (
            <>
              <SparkleIcon size={14} /> Interpretando con Azure AI…
            </>
          ) : (
            'Interpretar grupos'
          )}
        </Button>
        {insights.length ? (
          <Button
            type="button"
            className="btn-sm agent-summarize-btn"
            disabled={busy}
            onClick={onSummarizeInChat}
          >
            <SparkleIcon size={14} /> Llevar al chat
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="btn-sm"
          disabled={
            tracesLoading ||
            (!projectId && !hasTraces && !recommendations.length && !insights.length)
          }
          onClick={onOpenTraces}
        >
          {tracesLoading ? 'Cargando trazas…' : 'Ver trazas'}
        </Button>
      </div>

      {message ? <Feedback variant="success" message={message} /> : null}
      {error ? <Feedback variant="danger" message={error} /> : null}

      {initialLoading ? (
        <LoadingPanel
          title="Cargando análisis asistido…"
          description="Recuperando estrategias e insights guardados para esta ejecución."
        />
      ) : strategyLoading ? (
        <LoadingPanel
          variant="llm"
          title="Generando estrategia…"
          description="Consultando Azure AI y definiendo variables, métricas y criterios de lectura."
        />
      ) : interpretationLoading ? (
        <LoadingPanel
          variant="llm"
          title="Interpretando clusters…"
          description="Generando insights por grupo con Azure AI. Los clusters prioritarios se enriquecen primero."
        />
      ) : null}

      {!initialLoading &&
      !strategyLoading &&
      !interpretationLoading &&
      !recommendations.length &&
      !insights.length ? (
        <Card className="agent-panel-empty">
          Todavía no hay análisis asistido para esta ejecución. Pulsa «Generar estrategia» o
          «Interpretar clusters».
        </Card>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && recommendations.length ? (
        <div className="agent-panel-section">
          <StrategyGuide recommendations={recommendations} insights={insights} />
          <h4 className="agent-section-title">
            Estrategia sugerida por la app
            {llmStatus?.used ? <LlmModeChip mode="llm_active" /> : null}
          </h4>
          <div className="agent-compact-list">
            {recommendations.map((item) => (
              <StrategyCard
                key={item.strategy_id ?? item.trace_id}
                item={item}
                llmActive={Boolean(llmStatus?.used)}
                selectedVariables={
                  selectedStrategyVariables[strategyItemKey(item)] ?? parseVariables(item.variables_used)
                }
                onToggleVariable={(variableName) => onToggleStrategyVariable(item, variableName)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!initialLoading && !strategyLoading && !interpretationLoading && insights.length ? (
        <div className="agent-panel-section">
          <div className="agent-filter-bar">
            <h4>Hallazgos por grupo</h4>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'recommended' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('recommended')}
            >
              Recomendados ({insightCounts.recommended})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'medium_high' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('medium_high')}
            >
              Alta/Media ({insightCounts.mediumHigh})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'clear_signal' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('clear_signal')}
            >
              Con tema claro ({insightCounts.clearSignal})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'low' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('low')}
            >
              Baja prioridad ({insightCounts.low})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'all' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('all')}
            >
              Todos ({insightCounts.all})
            </button>
            <button
              type="button"
              className={`agent-filter-chip${insightFilter === 'llm' ? ' agent-filter-chip--active' : ''}`}
              onClick={() => setInsightFilter('llm')}
            >
              <SparkleIcon size={12} /> Solo Azure AI ({llmInsightCount})
            </button>
          </div>
          <p className="note agent-compact-hint agent-compact-hint--business">
            La vista recomendada muestra primero los grupos con mayor prioridad, senal de negocio
            mas clara o mayor volumen. Lee cada grupo como una hipotesis: que tickets se parecen,
            que senal detecto la app y que conviene revisar antes de tomar una decision.
          </p>
          <div className="agent-bulk-actions">
            <span>
              {visibleInsights.length} visibles · {selectedVisibleCount} seleccionados en esta vista · {selectedInsightIds.size} seleccionados en total
            </span>
            <Button
              type="button"
              variant="secondary"
              className="btn-sm"
              disabled={!visibleInsights.length || selectedVisibleCount === visibleInsights.length}
              onClick={onSelectVisibleInsights}
            >
              Seleccionar visibles
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="btn-sm"
              disabled={!selectedInsightIds.size}
              onClick={onClearInsightSelection}
            >
              Deseleccionar todo
            </Button>
            <Button
              type="button"
              className="btn-sm"
              disabled={!selectedInsightIds.size || bulkDashboardLoading}
              onClick={onAddSelectedToDashboard}
            >
              {bulkDashboardLoading ? 'Agregando...' : 'Agregar seleccionados al dashboard'}
            </Button>
          </div>
          {topLlmInsight && insightFilter === 'llm' ? (
            <p className="note agent-compact-hint">
              Destacado: cluster {topLlmInsight.cluster_label} (ideal para la demo).
            </p>
          ) : null}
          {visibleInsights.length ? (
            <div className="agent-compact-list agent-compact-list--insights">
              {visibleInsights.map((item) => {
                const insightId = item.cluster_insight_id ?? `agent-${runId}-${item.cluster_label}`
                return (
                  <InsightCard
                  key={insightId}
                  item={item}
                  added={selectedIds.has(insightId)}
                  selected={selectedInsightIds.has(insightId)}
                  onAdd={onAddToDashboard}
                  onAskChat={onAskInsightInChat}
                  onToggleSelect={onToggleInsightSelection}
                />
                )
              })}
            </div>
          ) : (
            <Card className="agent-trace-empty">
              No hay grupos para este filtro. Cambia a Recomendados o Todos para continuar.
            </Card>
          )}
        </div>
      ) : null}

      <Dialog
        open={tracesOpen}
        onClose={() => setTracesOpen(false)}
        title="Trazabilidad de agentes"
        description="Prompts, respuestas, variables y parámetros registrados para esta ejecución."
        size="xl"
        panelClassName="agent-trace-dialog"
      >
        {traces.length ? (
          <p className="agent-trace-count">
            {traces.length} trazas registradas para este proyecto o ejecucion. Mostrando las
            {' '}
            {visibleTraces.length}
            {' '}
            mas recientes.
          </p>
        ) : null}
        <div className="agent-trace-list">
          {visibleTraces.length ? (
            visibleTraces.map((trace, index) => (
              <TraceRow
                key={parseTraceRecord(trace).trace_id ?? `trace-${index}`}
                trace={trace}
                index={index}
              />
            ))
          ) : (
            <Card className="agent-trace-empty">
              Todavia no hay trazas registradas para este proyecto o ejecucion. Ejecuta primero
              el agente de estrategia, la interpretacion de clusters o registra una validacion
              humana.
            </Card>
          )}
        </div>
      </Dialog>
    </section>
  )
}
