export const PROJECT_STRATEGY_OPTIONS = [
  {
    value: 'per_source',
    label: 'Un análisis por fuente',
    helper:
      'Ejecuta clustering separado para cada CSV (software, hardware, incidencias…). Recomendado para comparar patrones.',
  },
  {
    value: 'unified',
    label: 'Un solo análisis (fuente principal)',
    helper:
      'Analiza solo la fuente principal de incidencias. Útil para una vista consolidada rápida.',
  },
]

export const CSV_SOURCE_SLOTS = [
  {
    type: 'incidents',
    label: 'Incidencias principales',
    required: true,
    helper: 'CSV con el registro principal de incidencias IT.',
  },
  {
    type: 'change_mgmt',
    label: 'Gestión del cambio',
    required: false,
    helper: 'Cambios, despliegues o ventanas de mantenimiento.',
  },
  {
    type: 'software',
    label: 'Problemas software',
    required: false,
    helper: 'Errores de aplicación, bugs o degradaciones de servicio.',
  },
  {
    type: 'hardware',
    label: 'Problemas hardware',
    required: false,
    helper: 'Infraestructura, red, servidores o dispositivos.',
  },
]

export const TEXT_SOURCE_SLOTS = [
  {
    type: 'dictionary',
    label: 'Diccionario de datos',
    accept: '.txt,.md',
    helper: 'Glosario de columnas o definiciones del escenario (.txt / .md).',
  },
  {
    type: 'notes',
    label: 'Notas / transcripción',
    accept: '.txt,.md',
    helper: 'Resumen de reunión o transcripción de audio ya convertida a texto.',
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
  }
  return map[sourceType] ?? sourceType
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
