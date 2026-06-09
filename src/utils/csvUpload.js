const SPREADSHEET_EXTENSIONS = new Set([
  '.xls',
  '.xlsx',
  '.xlsm',
  '.xlsb',
  '.ods',
  '.tsv',
  '.json',
  '.parquet',
])

const CSV_MIME_TYPES = new Set(['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'])

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateCsvUploadFile(file) {
  if (!file?.name) {
    return { ok: false, message: 'Selecciona un archivo CSV válido.' }
  }

  const name = file.name.trim()
  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : ''

  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    const label = ext.replace('.', '').toUpperCase()
    return {
      ok: false,
      message: `No se admite ${label}. Exporta el archivo como CSV (UTF-8) desde Excel o tu herramienta y vuelve a subirlo.`,
    }
  }

  if (!lower.endsWith('.csv')) {
    return {
      ok: false,
      message: 'Solo se admiten archivos .csv. Si tienes Excel, guárdalo como «CSV UTF-8 (delimitado por comas)».',
    }
  }

  if (file.type && !CSV_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: 'El tipo de archivo no es CSV. Exporta los datos como .csv antes de subirlos.',
    }
  }

  return { ok: true }
}
