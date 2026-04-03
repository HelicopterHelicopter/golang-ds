import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VizEnvelope } from '../types/trace'
import { VisualizationView } from '../visualizations/VisualizationView'

type Props = {
  trace: VizEnvelope
}

function skipListPhaseLabel(phase: string) {
  switch (phase) {
    case 'at_level':
      return 'Entered this level'
    case 'scan_forward':
      return 'Advanced along forward pointer'
    case 'end_of_level':
      return 'Finished scanning this level'
    case 'final_check':
      return 'Moved to level-0 successor'
    case 'done':
      return 'Done'
    default:
      return phase
  }
}

function quadtreePhaseLabel(phase: string) {
  switch (phase) {
    case 'after_insert':
      return 'After insert'
    default:
      return phase
  }
}

function TraceChrome({ trace }: { trace: VizEnvelope }) {
  if (trace.kind === 'skiplist-search') {
    return (
      <>
        <h1>Skip list · search</h1>
        <p className="trace-sub">
          Target <strong>{trace.meta.targetValue}</strong>
          {trace.meta.found ? (
            <span className="badge badge--ok"> found</span>
          ) : (
            <span className="badge badge--miss"> not found</span>
          )}
        </p>
      </>
    )
  }
  const b = trace.meta.bounds
  return (
    <>
      <h1>Quadtree · insert</h1>
      <p className="trace-sub">
        Capacity <strong>{trace.meta.capacity}</strong>
        <span className="muted">
          {' '}
          · bounds [{b.minX.toFixed(1)}, {b.minY.toFixed(1)}] — [
          {b.maxX.toFixed(1)}, {b.maxY.toFixed(1)}]
        </span>
      </p>
    </>
  )
}

function TraceAside({ trace, stepIndex }: { trace: VizEnvelope; stepIndex: number }) {
  if (trace.kind === 'skiplist-search') {
    const step = trace.steps[stepIndex]
    if (!step) return null
    return (
      <aside className="trace-aside" aria-live="polite">
        <strong>{skipListPhaseLabel(step.phase)}</strong>
        <span className="muted">
          {' '}
          — active level L{step.activeLevel}
        </span>
      </aside>
    )
  }
  const q = trace.steps[stepIndex]
  if (!q) return null
  return (
    <aside className="trace-aside" aria-live="polite">
      <strong>{quadtreePhaseLabel(q.phase)}</strong>
      <span className="muted">
        {' '}
        — point {q.insertIndex + 1} / {trace.meta.pointCount} ({q.lastPointId})
      </span>
    </aside>
  )
}

export function TracePlayer({ trace }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const steps = trace.steps
  const max = steps.length > 0 ? steps.length - 1 : 0
  const safeIndex = steps.length > 0 ? Math.min(Math.max(0, stepIndex), max) : 0

  const go = useCallback(
    (delta: number) => {
      setStepIndex((i) => Math.min(max, Math.max(0, i + delta)))
    },
    [max],
  )

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false)
      return
    }
    if (safeIndex >= max) {
      setStepIndex(0)
    }
    setPlaying(true)
  }, [playing, safeIndex, max])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= max) {
          queueMicrotask(() => setPlaying(false))
          return prev
        }
        const next = prev + 1
        if (next >= max) {
          queueMicrotask(() => setPlaying(false))
        }
        return next
      })
    }, 650)
    return () => window.clearInterval(id)
  }, [playing, max])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const canStep = steps.length > 0

  const noStepsMessage = useMemo(() => {
    if (trace.kind === 'quadtree-insert' && steps.length === 0) {
      return 'No insert steps (empty point set).'
    }
    return null
  }, [trace.kind, steps.length])

  return (
    <div className="trace-player">
      <header className="trace-header">
        <div>
          <TraceChrome trace={trace} />
        </div>
        <div className="trace-kinds">
          <span className="muted">kind:</span>{' '}
          <code>{trace.kind}</code>
          <span className="muted">schema:</span>{' '}
          <code>{trace.schemaVersion}</code>
        </div>
      </header>

      <div className="viz-panel">
        {noStepsMessage ? (
          <p className="banner">{noStepsMessage}</p>
        ) : (
          <VisualizationView trace={trace} stepIndex={safeIndex} />
        )}
      </div>

      <div className="trace-controls">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canStep || safeIndex <= 0}
        >
          Prev
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!canStep || max <= 0}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canStep || safeIndex >= max}
        >
          Next
        </button>
        <label className="step-slider">
          <span className="muted">
            Step {canStep ? safeIndex + 1 : 0} / {steps.length}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, max)}
            value={canStep ? safeIndex : 0}
            onChange={(e) => setStepIndex(Number(e.target.value))}
            disabled={!canStep}
          />
        </label>
      </div>

      {canStep ? <TraceAside trace={trace} stepIndex={safeIndex} /> : null}
    </div>
  )
}
