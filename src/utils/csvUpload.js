const TABULAR_EXTENSIONS = new Set(['.csv', '.tsv', '.xlsx', '.xlsm', '.json', '.parquet'])
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.docx', '.pdf'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg', '.flac'])
const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ...TABULAR_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
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
