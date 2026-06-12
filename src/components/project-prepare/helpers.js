import { TABULAR_SOURCE_TYPES, suggestSourceType, sourceKindLabel, sourceTypeLabel } from '../../utils/projectLabels'
import {
  detectSourceFileKind,
  formatLabelForKind,
  formatToneForKind,
} from '../../utils/sourceFileVisual'
import { AUTO_SOURCE_TYPE } from './constants'

export function isTabularSource(source) {
  return source?.normalized_kind === 'tabular' || TABULAR_SOURCE_TYPES.includes(source?.source_type)
}

export function sourceStatusLabel(status) {
  const map = {
    processed: 'Procesada',
    processing: 'Procesando',
    error: 'Error',
  }
  return map[status] ?? status ?? 'Procesada'
}

export function formatSpanishNumber(value) {
  return Number(value ?? 0).toLocaleString('es-ES')
}

export function resolveSourceTypeSelection(sourceType, file) {
  if (sourceType !== AUTO_SOURCE_TYPE) return sourceType
  return suggestSourceType(file).value || 'other'
}

export function buildSourceChips(source) {
  const fileKind = detectSourceFileKind({
    normalizedKind: source?.normalized_kind,
    originalFormat: source?.original_format,
    filename: source?.filename,
  })
  const chips = [
    {
      label: formatLabelForKind(fileKind, source?.original_format, source?.filename),
      tone: formatToneForKind(fileKind),
    },
  ]
  if (source?.n_rows != null) {
    chips.push({ label: `${formatSpanishNumber(source.n_rows)} filas`, tone: 'neutral' })
  } else if (source?.char_count != null) {
    chips.push({ label: `${formatSpanishNumber(source.char_count)} caracteres`, tone: 'neutral' })
  } else if (source?.normalized_kind && source.normalized_kind !== 'tabular') {
    chips.push({ label: sourceKindLabel(source.normalized_kind), tone: 'neutral' })
  }
  const category = sourceTypeLabel(source?.source_type)
  if (category) {
    chips.push({ label: category, tone: 'category' })
  }
  return chips
}

export function buildSourceDetail(source) {
  const columns = source.all_columns ?? []
  if (isTabularSource(source) && columns.length) {
    const visible = columns.slice(0, 12)
    const extra = columns.length > visible.length ? ` (+${columns.length - visible.length} más)` : ''
    return `Columnas: ${visible.join(', ')}${extra}`
  }
  if (!isTabularSource(source) && source.preview) {
    return `Texto extraído: ${source.preview}`
  }
  return ''
}
