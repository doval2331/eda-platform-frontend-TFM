import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Button } from '@/ui'
import { metabaseLinkState, nextFlowStep } from '@/utils/biFlow'

const COPY = {
  'after-analysis': {
    title: 'Siguiente: explorar y guardar hallazgos',
    body: 'Usa el chat o los agentes para entender los clusters. Pulsa «Seleccionar» en cada respuesta útil; esos hallazgos alimentan el dashboard conversacional y, después, Metabase BI.',
    primary: { to: '/dashboard-conversacional', label: 'Ver hallazgos guardados' },
    secondary: null,
  },
  explore: {
    title: 'Guarda hallazgos antes de informar',
    body: 'Cada insight que marques con «Seleccionar» aparece en el dashboard conversacional. Cuando tengas varios, consolídalos y pasa a Metabase para gráficos de SLA, riesgo y servicios.',
    primary: { to: '/dashboard-conversacional', label: 'Ir al dashboard conversacional' },
    secondary: { to: '/metabase', label: 'Metabase BI' },
  },
  consolidate: {
    title: 'Paso 4: informes con Metabase BI',
    body: 'Aquí ya tienes la historia de tus hallazgos. Publica las tablas BI y abre el dashboard en Metabase para profundizar con filtros (run, cluster, servicio, SLA). Ideal para informes y defensa del TFM.',
    primary: { to: '/metabase', label: 'Publicar y abrir Metabase' },
    secondary: { to: '/', label: 'Volver a analizar' },
  },
  metabase: {
    title: 'Estás en el paso de informes',
    body: 'Metabase consume las tablas publicadas desde DuckDB. Si acabas de guardar hallazgos en el chat, pulsa «Publicar tablas BI» y crea o actualiza el dashboard antes de presentar resultados.',
    primary: null,
    secondary: { to: '/dashboard-conversacional', label: 'Revisar hallazgos guardados' },
  },
}

export function MetabaseFlowCTA({ variant = 'after-analysis', runId }) {
  const copy = COPY[variant] ?? COPY['after-analysis']
  const linkState = metabaseLinkState({ runId, fromStep: variant })

  return (
    <aside className="metabase-flow-cta" aria-label="Siguiente paso del recorrido">
      <div className="metabase-flow-cta__copy">
        <strong>{copy.title}</strong>
        <p>{copy.body}</p>
      </div>
      <div className="metabase-flow-cta__actions">
        {copy.primary ? (
          <Button
            component={Link}
            to={copy.primary.to}
            state={copy.primary.to === '/metabase' ? linkState : undefined}
            variant="primary"
          >
            {copy.primary.label}
          </Button>
        ) : null}
        {copy.secondary ? (
          <Button
            component={Link}
            to={copy.secondary.to}
            state={copy.secondary.to === '/metabase' ? linkState : undefined}
            variant="secondary"
          >
            {copy.secondary.label}
          </Button>
        ) : null}
      </div>
    </aside>
  )
}

MetabaseFlowCTA.propTypes = {
  variant: PropTypes.oneOf(['after-analysis', 'explore', 'consolidate', 'metabase']),
  runId: PropTypes.string,
}

export function MetabaseFlowNextLink({ currentStepId, runId, className = 'decision-link' }) {
  const next = nextFlowStep(currentStepId)
  if (!next) return null
  return (
    <Link
      to={next.path}
      className={className}
      state={next.id === 'report' ? metabaseLinkState({ runId, fromStep: currentStepId }) : undefined}
    >
      Siguiente: {next.label} →
    </Link>
  )
}

MetabaseFlowNextLink.propTypes = {
  currentStepId: PropTypes.string.isRequired,
  runId: PropTypes.string,
  className: PropTypes.string,
}
