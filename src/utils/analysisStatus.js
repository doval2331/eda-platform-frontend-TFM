export function formatSpanishNumber(value) {
  return Number(value ?? 0).toLocaleString('es-ES')
}

export function buildAnalysisStatusMessage({ modalidad, datasetProfile, activeProject }) {
  if (modalidad === 'project' && activeProject) {
    const sourceCount =
      activeProject.source_count ||
      activeProject.csv_source_count ||
      (activeProject.sources ?? []).length ||
      0
    const sourceLabel = sourceCount === 1 ? 'fuente' : 'fuentes'
    return `Procesando ${sourceCount} ${sourceLabel} y ${formatSpanishNumber(activeProject.total_rows)} filas. Puede tardar varios minutos.`
  }
  if (modalidad === 'tabular' && datasetProfile?.n_rows) {
    return `Procesando 1 fuente y ${formatSpanishNumber(datasetProfile.n_rows)} filas. Puede tardar varios minutos.`
  }
  return 'Ejecutando reducción dimensional y clustering. Puede tardar varios minutos.'
}
