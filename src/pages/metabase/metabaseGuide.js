export const BI_GUIDE_QUESTIONS = [
  'Ya publique las tablas, que reviso primero?',
  'Que preguntas conviene crear en Metabase?',
  'Como valido que la publicacion sirvio?',
  'Que hago con los insights seleccionados?',
  'Que tablero conviene usar para explicar resultados?',
]

export function tableCount(tableCounts, tableName) {
  const found = tableCounts.find(([name]) => name === tableName)
  return found ? Number(found[1]) : 0
}

export function buildBiGuideAnswer(question, { status, syncResult, dashboardResult, tableCounts }) {
  const normalized = question.toLowerCase()
  const metabaseReady = status?.postgres_status === 'ok'
  const selectedInsights = tableCount(tableCounts, 'bi_selected_insights')
  const evidences = tableCount(tableCounts, 'bi_evidences')
  const clusters = tableCount(tableCounts, 'bi_cluster_summary')
  const published = syncResult?.status === 'ok' || evidences > 0 || clusters > 0
  const dashboardUrl = dashboardResult?.dashboard_url || status?.dashboard_url

  if (!metabaseReady) {
    return 'Primero hay que dejar disponible PostgreSQL BI. Cuando el estado aparezca OK, publica las tablas y despues crea o abre el dashboard de Metabase.'
  }

  if (!published && normalized.includes('publique')) {
    return 'Todavia no veo una publicacion reciente en esta pantalla. Presiona Publicar tablas BI y luego revisa los conteos generados para confirmar que Metabase tenga datos disponibles.'
  }

  if (normalized.includes('preguntas') || normalized.includes('crear')) {
    return 'En Metabase conviene crear preguntas simples y filtrables: SLA por servicio, volumen por prioridad, clusters con mayor incumplimiento, servicios con mayor riesgo, causas raiz frecuentes e insights seleccionados por run_id. Usa filtros por run_id, cluster_label, affected_service y severity.'
  }

  if (normalized.includes('valido') || normalized.includes('sirvio')) {
    if (!published) {
      return 'Para validar la publicacion, primero ejecuta Publicar tablas BI. Despues confirma que bi_evidences, bi_cluster_summary y bi_selected_insights tengan registros.'
    }
    return `Validacion rapida: hay ${evidences} registros publicados en bi_evidences, ${clusters} resumenes de cluster y ${selectedInsights} insights seleccionados. Si bi_selected_insights esta bajo, vuelve al chat, selecciona hallazgos y publica nuevamente.`
  }

  if (normalized.includes('insights')) {
    if (!selectedInsights) {
      return 'Todavia no hay insights seleccionados publicados. Vuelve a la exploracion conversacional, pregunta por SLA, clusters o alternativas de decision, selecciona hallazgos y vuelve a publicar las tablas BI.'
    }
    return `Hay ${selectedInsights} insights seleccionados. Usalos como hilo conductor: primero explica que pregunto el usuario, luego que hallazgos eligio y finalmente que tablero de Metabase permite profundizar cada metrica.`
  }

  if (normalized.includes('tablero') || normalized.includes('explicar') || normalized.includes('dashboard')) {
    if (dashboardUrl) {
      return 'Para explicar resultados, usa dos vistas: el Dashboard conversacional para mostrar la seleccion del usuario y Metabase para profundizar con filtros BI. En la defensa, esa combinacion muestra exploracion guiada y visualizacion curada.'
    }
    return 'Todavia falta crear el dashboard de Metabase. Presiona Crear dashboard en Metabase y despues usa esa vista junto con el Dashboard conversacional para explicar los hallazgos seleccionados.'
  }

  if (!published) {
    return 'Siguiente paso recomendado: publica las tablas BI. Despues revisa conteos, crea el dashboard en Metabase y valida que los filtros por run_id, servicio, prioridad y cluster funcionen.'
  }

  return `Revisaria primero tres cosas: 1) si bi_selected_insights tiene hallazgos para contar la historia del usuario; 2) si bi_cluster_summary permite explicar clusters criticos; 3) si bi_sla_by_category y bi_service_risk muestran donde priorizar acciones. Hoy la publicacion tiene ${evidences} evidencias y ${selectedInsights} insights seleccionados.`
}
