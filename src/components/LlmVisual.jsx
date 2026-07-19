import '@/styles/llm-visual.css'

export function SparkleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2zM5 15l.8 2.6L8.4 18l-2.6.8L5 21.4l-.8-2.6L1.6 18l2.6-.8L5 15zM19 13l.6 2L21.6 15l-2 .6L19 17.6l-.6-2-2-.6 2-.6.6-2z"
        fill="currentColor"
      />
    </svg>
  )
}

export function LlmPulseDot({ active = true, label = 'Azure AI' }) {
  return (
    <span className={`llm-pulse-dot${active ? ' llm-pulse-dot--active' : ''}`} title={label}>
      <span className="llm-pulse-dot__core" aria-hidden />
      <span className="llm-pulse-dot__ring" aria-hidden />
      <span className="llm-pulse-dot__label">{label}</span>
    </span>
  )
}

export function LlmPowerBadge({ active, modelName, detail, size = 'md' }) {
  const isActive = Boolean(active)
  return (
    <span
      className={`llm-power-badge llm-power-badge--${size}${
        isActive ? ' llm-power-badge--active' : ' llm-power-badge--local'
      }`}
      title={detail || ''}
    >
      {isActive ? <SparkleIcon size={size === 'lg' ? 18 : 14} /> : null}
      <span>{isActive ? `Azure AI · ${modelName || 'LLM activo'}` : 'Modo local'}</span>
    </span>
  )
}

export function AgentLlmHero({
  used,
  modelName,
  detail,
  title,
  subtitle,
  stats = [],
  compact = false,
}) {
  return (
    <div
      className={`agent-llm-hero${used ? ' agent-llm-hero--active' : ' agent-llm-hero--idle'}${
        compact ? ' agent-llm-hero--compact' : ''
      }`}
      title={detail || ''}
    >
      {!compact ? <div className="agent-llm-hero__glow" aria-hidden /> : null}
      <div className="agent-llm-hero__content">
        <div className="agent-llm-hero__head">
          <LlmPulseDot active={used} label={used ? 'LLM ON' : 'Local'} />
          <LlmPowerBadge active={used} modelName={modelName} detail={detail} size="md" />
          {compact ? (
            <span className="agent-llm-hero__inline-title">{title}</span>
          ) : null}
        </div>
        {!compact ? (
          <>
            <h4>{title}</h4>
            <p>{subtitle}</p>
            {detail ? <p className="agent-llm-hero__detail">{detail}</p> : null}
          </>
        ) : (
          <p className="agent-llm-hero__compact-sub">{subtitle}</p>
        )}
        {stats.length ? (
          <div className="agent-llm-hero__stats">
            {stats.map((stat) => (
              <div className="agent-llm-hero__stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function LlmModeChip({ mode = 'deterministic' }) {
  const isLlm = mode === 'llm_active'
  return (
    <span className={`llm-mode-chip${isLlm ? ' llm-mode-chip--llm' : ' llm-mode-chip--local'}`}>
      {isLlm ? (
        <>
          <SparkleIcon size={12} />
          Azure AI
        </>
      ) : (
        'Local'
      )}
    </span>
  )
}
