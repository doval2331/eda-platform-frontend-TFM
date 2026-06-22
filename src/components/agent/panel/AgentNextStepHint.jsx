import PropTypes from 'prop-types'

export function AgentNextStepHint({ recommendations, insights, phase }) {
  const hasStrategy = recommendations.length > 0
  const hasInsights = insights.length > 0
  const title = hasInsights
    ? 'Siguiente paso: revisar hallazgos'
    : phase === 'interpret'
      ? 'Siguiente paso: interpretar grupos'
      : hasStrategy
        ? 'Siguiente paso: confirmar variables'
        : 'Siguiente paso: pedir una estrategia'
  const text = hasInsights
    ? 'Ya puedes revisar los grupos interpretados, agregar hallazgos al dashboard o llevarlos al chat.'
    : phase === 'interpret'
      ? 'Las variables ya estan confirmadas. Pulsa Interpretar grupos para generar los hallazgos.'
      : hasStrategy
        ? 'Marca las variables que aceptas y pulsa Confirmar variables. Despues podras interpretar los grupos.'
        : 'Pulsa Sugerir estrategia para que la app proponga que variables mirar y como leer los grupos.'
  return (
    <div className="agent-next-step">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

AgentNextStepHint.propTypes = {
  recommendations: PropTypes.array,
  insights: PropTypes.array,
  phase: PropTypes.string,
}
