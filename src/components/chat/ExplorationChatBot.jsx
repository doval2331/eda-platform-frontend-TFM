import { useEffect } from 'react'
import { selectRunInsight } from '@/api/conversation'
import { insightSavedMessage } from '@/utils/biFlow'
import { ChatBot } from './ChatBot'
import { useRunChatHistory } from './useRunChatHistory'

export function ExplorationChatBot({
  run,
  onClose,
  variant = 'embedded',
  llmReady = true,
  expanded = false,
  onToggleExpand,
  externalPrompt = null,
  onExternalPromptConsumed,
  enabled = true,
}) {
  const {
    question,
    setQuestion,
    messages,
    suggestions,
    historyLoading,
    loading,
    error,
    setError,
    selectedIds,
    sendQuestion,
    appendLocalAssistantNote,
    markInsightSelected,
  } = useRunChatHistory(run?.id, { enabled })

  useEffect(() => {
    if (!externalPrompt?.text || !run?.id) return
    setQuestion('')
    void sendQuestion(externalPrompt.text, { fromBridge: true })
    onExternalPromptConsumed?.()
  }, [externalPrompt?.at, externalPrompt?.text, run?.id, onExternalPromptConsumed, sendQuestion, setQuestion])

  async function onInsightSelected(runId, insight) {
    if (!runId || selectedIds.has(insight.id)) return
    try {
      await selectRunInsight(runId, insight)
      markInsightSelected(insight.id)
      appendLocalAssistantNote(insightSavedMessage(insight.title))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insight')
    }
  }

  const hasRun = Boolean(run?.id)
  const showStarterEmpty = hasRun && !historyLoading && messages.length === 0

  return (
    <ChatBot
      title="Asistente de incidencias"
      subtitle={hasRun ? 'Exploración del análisis activo' : null}
      active={hasRun}
      llmReady={llmReady}
      headerAction={
        <>
          <ChatBot.DashboardLink title="Ir al dashboard conversacional (paso 3)">
            Hallazgos
          </ChatBot.DashboardLink>
          <ChatBot.DashboardLink to="/metabase" title="Ir a informes Metabase (paso 4)">
            Informes
          </ChatBot.DashboardLink>
        </>
      }
      onClose={onClose}
      variant={variant}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      messages={messages}
      suggestions={suggestions}
      loading={historyLoading || loading}
      disabled={!hasRun || historyLoading}
      error={error}
      inputValue={question}
      onInputChange={setQuestion}
      onSubmit={sendQuestion}
      onSuggestionClick={sendQuestion}
      onInsightSelect={onInsightSelected}
      runId={run?.id}
      placeholder="Ej.: ¿Qué grupo tiene peor SLA?"
      emptyTitle={showStarterEmpty ? 'Empieza tu exploración' : 'Sin análisis activo'}
      emptyDescription={
        showStarterEmpty
          ? 'Haz tu primera pregunta sobre SLA, clusters, servicios o casos atípicos.'
          : 'Ejecuta «Analizar incidencias» primero. Cuando termine, podrás hacer preguntas sobre los grupos detectados.'
      }
    />
  )
}
