function asList(value) {
  return Array.isArray(value) ? value : []
}

function configuredLookupKeys(item) {
  return [item?.name, item?.lookup_key, ...(Array.isArray(item?.aliases) ? item.aliases : [])]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

export function semanticMapFromList(items) {
  return asList(items).reduce((acc, item) => {
    if (!item?.name && !item?.lookup_key) return acc
    const normalized = {
      ...item,
      name: item.name || item.lookup_key,
      active: item.active !== false,
      confidence: item.confidence || 'media',
      source: item.source || 'base',
      aliases: asList(item.aliases),
      enabled_profiles: asList(item.enabled_profiles),
      avoid_as_dimension: Boolean(item.avoid_as_dimension),
      domain: item.domain || '',
      owner: item.owner || '',
      version: item.version || '',
      max_cardinality: item.max_cardinality ?? null,
      max_null_ratio: item.max_null_ratio ?? null,
    }
    configuredLookupKeys(normalized).forEach((key) => acc.set(key, normalized))
    return acc
  }, new Map())
}

export function buildSemanticDraftRows(dictionaryPayload, semanticVariables) {
  const configuredItems = asList(dictionaryPayload?.configured_variables).length
    ? asList(dictionaryPayload?.configured_variables)
    : asList(dictionaryPayload?.variables)
  const configuredByName = configuredItems.reduce((acc, item) => {
    configuredLookupKeys(item).forEach((key) => acc.set(key, item))
    return acc
  }, new Map())

  return asList(semanticVariables)
    .slice(0, 40)
    .map((item) => {
      const configured = configuredByName.get(item.name) || configuredByName.get(item.lookup_key) || {}
      return {
        name: item.name,
        label: configured.label || item.label || item.name,
        role: configured.role || item.role || 'unknown',
        semantic_type: configured.semantic_type || configured.type || item.semantic_type || '',
        can_chart: configured.can_chart ?? item.can_chart ?? true,
        avoid_as_metric: configured.avoid_as_metric ?? item.avoid_as_metric ?? false,
        avoid_as_dimension: configured.avoid_as_dimension ?? item.avoid_as_dimension ?? false,
        active: configured.active ?? item.active ?? true,
        confidence: configured.confidence || item.confidence || 'media',
        source: configured.source || item.source || 'project',
        description: configured.description || item.description || '',
        recommended_use: configured.recommended_use || item.recommended_use || '',
        aliases: asList(configured.aliases?.length ? configured.aliases : item.aliases),
        enabled_profiles: asList(configured.enabled_profiles?.length ? configured.enabled_profiles : item.enabled_profiles),
        domain: configured.domain || item.domain || '',
        owner: configured.owner || item.owner || '',
        version: configured.version || item.version || '',
        max_cardinality: configured.max_cardinality ?? item.max_cardinality ?? null,
        max_null_ratio: configured.max_null_ratio ?? item.max_null_ratio ?? null,
      }
    })
}

export function normalizeSemanticDraftForSave(rows) {
  return asList(rows)
    .filter((row) => row?.name)
    .map((row) => ({
      name: row.name,
      label: row.label || row.name,
      role: row.role || 'unknown',
      type: row.semantic_type || '',
      can_chart: row.can_chart !== false,
      avoid_as_metric: Boolean(row.avoid_as_metric),
      avoid_as_dimension: Boolean(row.avoid_as_dimension),
      active: row.active !== false,
      confidence: row.confidence || 'media',
      source: row.source || 'project',
      description: row.description || '',
      recommended_use: row.recommended_use || '',
      aliases: asList(row.aliases),
      enabled_profiles: asList(row.enabled_profiles),
      domain: row.domain || '',
      owner: row.owner || '',
      version: row.version || '',
      max_cardinality: row.max_cardinality === '' ? null : row.max_cardinality,
      max_null_ratio: row.max_null_ratio === '' ? null : row.max_null_ratio,
    }))
}

export function semanticLabel(semanticMap, value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return semanticMap.get(text)?.label || text.replace(/_/g, ' ')
}

export function semanticRole(semanticMap, value) {
  return semanticMap.get(String(value || ''))?.role || ''
}

export function semanticItem(semanticMap, value) {
  return semanticMap.get(String(value || '')) || null
}
