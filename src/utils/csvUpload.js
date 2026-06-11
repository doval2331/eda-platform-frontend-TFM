const TABULAR_EXTENSIONS = new Set(['.csv', '.tsv', '.xlsx', '.xlsm', '.json', '.parquet'])
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.docx', '.pdf'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'])
const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ...TABULAR_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
])

const TABULAR_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/json',
  'application/octet-stream',
  'application/x-parquet',
  'application/vnd.apache.parquet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
])

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateCsvUploadFile(file) {
  if (!file?.name) {
    return { ok: false, message: 'Selecciona un archivo tabular valido.' }
  }

  const name = file.name.trim()
  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : ''

  if (!TABULAR_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: 'Se admiten CSV, TSV, XLSX, XLSM, JSON o Parquet para fuentes tabulares.',
    }
  }

  if (file.type && !TABULAR_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: 'El tipo MIME no coincide con una fuente tabular soportada.',
    }
  }

  return { ok: true }
}

export function validateProjectSourceFile(file, sourceType) {
  if (!file?.name) {
    return { ok: false, message: 'Selecciona un archivo valido.' }
  }

  const name = file.name.trim()
  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : ''

  if (!SUPPORTED_SOURCE_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: 'Se admiten CSV, TSV, XLSX, XLSM, JSON, Parquet, TXT, MD, DOCX, PDF o audio.',
    }
  }

  if (['incidents', 'change_mgmt', 'software', 'hardware'].includes(sourceType)) {
    return validateCsvUploadFile(file)
  }

  if (['dictionary', 'notes'].includes(sourceType)) {
    const accepted = new Set([...TEXT_EXTENSIONS, ...AUDIO_EXTENSIONS])
    if (!accepted.has(ext)) {
      return {
        ok: false,
        message: 'Diccionario y notas aceptan TXT, MD, DOCX, PDF o audio.',
      }
    }
  }

  return { ok: true }
}
