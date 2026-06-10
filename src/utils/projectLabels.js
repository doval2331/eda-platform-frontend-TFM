export const PROJECT_STRATEGY_OPTIONS = [
  {
    value: 'per_source',
    label: 'Un analisis por fuente',
    helper:
      'Ejecuta clustering separado para cada fuente tabular. Recomendado para comparar patrones.',
  },
  {
    value: 'unified',
    label: 'Un solo analisis (fuente principal)',
    helper:
      'Analiza solo la fuente principal de incidencias. Util para una vista consolidada rapida.',
  },
]

export const TABULAR_ACCEPT = '.csv,.tsv,.xlsx,.xlsm,.json,.parquet'
export const TEXT_ACCEPT = '.txt,.md,.docx,.pdf'
export const AUDIO_ACCEPT = '.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac'
export const ALL_SOURCE_ACCEPT = `${TABULAR_ACCEPT},${TEXT_ACCEPT},${AUDIO_ACCEPT}`

export const TABULAR_SOURCE_TYPES = ['incidents', 'change_mgmt', 'software', 'hardware']
export const TEXT_SOURCE_TYPES = ['dictionary', 'notes']

export const SOURCE_TYPE_OPTIONS = [
  { value: 'incidents', label: 'Incidencias' },
  { value: 'change_mgmt', label: 'Cambios' },
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'dictionary', label: 'Diccionario' },
  { value: 'notes', label: 'Notas' },
  { value: 'other', label: 'Otro' },
]

export const CSV_SOURCE_SLOTS = [
  {
    type: 'incidents',
    label: 'Incidencias principales',
    required: true,
    accept: TABULAR_ACCEPT,
    helper: 'Archivo tabular con el registro principal de incidencias IT.',
  },
  {
    type: 'change_mgmt',
    label: 'Gestion del cambio',
    required: false,
    accept: TABULAR_ACCEPT,
    helper: 'Cambios, despliegues o ventanas de mantenimiento en formato tabular.',
  },
  {
    type: 'software',
    label: 'Problemas software',
    required: false,
    accept: TABULAR_ACCEPT,
    helper: 'Errores de aplicacion, bugs o degradaciones de servicio en formato tabular.',
  },
  {
    type: 'hardware',
    label: 'Problemas hardware',
    required: false,
    accept: TABULAR_ACCEPT,
    helper: 'Infraestructura, red, servidores o dispositivos en formato tabular.',
  },
]

export const TEXT_SOURCE_SLOTS = [
  {
    type: 'dictionary',
    label: 'Diccionario de datos',
    accept: TEXT_ACCEPT,
    helper: 'Glosario de columnas o definiciones del escenario.',
  },
  {
    type: 'notes',
    label: 'Notas / transcripcion',
    accept: `${TEXT_ACCEPT},${AUDIO_ACCEPT}`,
    helper: 'Resumen, documento o audio de reunion para convertir en contexto.',
  },
]

export function sourceTypeLabel(sourceType) {
  const map = {
    incidents: 'Incidencias',
    change_mgmt: 'Cambios',
    software: 'Software',
    hardware: 'Hardware',
    dictionary: 'Diccionario',
    notes: 'Notas',
    other: 'Otro',
  }
  return map[sourceType] ?? sourceType
}

export function sourceKindLabel(kind) {
  const map = {
    tabular: 'tabular',
    text: 'texto',
  }
  return map[kind] ?? kind
}

export function detectedFileFormat(fileOrName) {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name
  if (!name || !name.includes('.')) return 'desconocido'
  return name.slice(name.lastIndexOf('.') + 1).toUpperCase()
}

export function defaultSourceName(fileOrName) {
  const name = typeof fileOrName === 'string' ? fileOrName : fileOrName?.name
  if (!name) return ''
  const clean = name.split(/[\\/]/).pop() ?? name
  return clean.includes('.') ? clean.slice(0, clean.lastIndexOf('.')) : clean
}

export function suggestSourceType(fileOrName) {
  const name = (typeof fileOrName === 'string' ? fileOrName : fileOrName?.name ?? '').toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const audio = AUDIO_ACCEPT.split(',').includes(ext)
  const document = TEXT_ACCEPT.split(',').includes(ext)

  if (/diccionario|dictionary|glosario|catalogo|catálogo|campos|columnas/.test(name)) {
    return { value: 'dictionary', reason: 'el nombre parece un diccionario o glosario' }
  }
  if (/cambio|change|deploy|despliegue|release|mantenimiento/.test(name)) {
    return { value: 'change_mgmt', reason: 'el nombre menciona cambios o despliegues' }
  }
  if (/hardware|infra|servidor|server|red|network|device|dispositivo/.test(name)) {
    return { value: 'hardware', reason: 'el nombre menciona infraestructura o dispositivos' }
  }
  if (/software|bug|app|aplicacion|aplicación|error|degradacion|degradación/.test(name)) {
    return { value: 'software', reason: 'el nombre menciona aplicaciones o errores software' }
  }
  if (/incidencia|incident|ticket|caso|case|ats/.test(name)) {
    return { value: 'incidents', reason: 'el nombre parece un registro de incidencias o tickets' }
  }
  if (/nota|note|reunion|reunión|transcrip|audio|minuta/.test(name) || audio || document) {
    return { value: 'notes', reason: 'el formato o nombre parece contexto documental' }
  }
  return { value: 'other', reason: 'no hay señales suficientes para clasificarla' }
}

export function strategyLabel(strategy) {
  const found = PROJECT_STRATEGY_OPTIONS.find((o) => o.value === strategy)
  return found?.label ?? strategy
}

export const ACTIVE_PROJECT_KEY = 'eda-active-project-id'
export const TABULAR_SCENARIO_KEY = 'eda-tabular-scenario'

export function loadTabularScenario() {
  try {
    const raw = localStorage.getItem(TABULAR_SCENARIO_KEY)
    if (!raw) return { name: '', description: '' }
    const parsed = JSON.parse(raw)
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
    }
  } catch {
    return { name: '', description: '' }
  }
}

export function saveTabularScenario({ name, description }) {
  localStorage.setItem(
    TABULAR_SCENARIO_KEY,
    JSON.stringify({
      name: name?.trim() ?? '',
      description: description?.trim() ?? '',
    }),
  )
}
