import { useCallback, useEffect, useState } from 'react'
import type { VizEnvelope } from '../types/trace'
import { VisualizationView } from '../visualizations/VisualizationView'

type Props = {
  trace: VizEnvelope
}

function phaseLabel(phase: string) {
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

export function TracePlayer({ trace }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const max = trace.steps.length - 1
  const safeIndex = Math.min(Math.max(0, stepIndex), max)
  const step = trace.steps[safeIndex]

  const go = useCallback(
    (delta: number) => {
      setStepIndex((i) => Math.min(max, Math.max(0, i + delta)))
    },
    [max],
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setStepIndex((i) => {
        if (i >= max) {
          window.clearInterval(id)
          return i
        }
        return i + 1
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

  const meta =
    trace.kind === 'skiplist-search'
      ? {
          target: trace.meta.targetValue,
          found: trace.meta.found,
        }
      : { target: '', found: false }

  return (
    <div className="trace-player">
      <header className="trace-header">
        <div>
          <h1>Skip list · search</h1>
          <p className="trace-sub">
            Target <strong>{meta.target}</strong>
            {meta.found ? (
              <span className="badge badge--ok"> found</span>
            ) : (
              <span className="badge badge--miss"> not found</span>
            )}
          </p>
        </div>
        <div className="trace-kinds">
          <span className="muted">kind:</span>{' '}
          <code>{trace.kind}</code>
          <span className="muted">schema:</span>{' '}
          <code>{trace.schemaVersion}</code>
        </div>
      </header>

      <div className="viz-panel">
        <VisualizationView trace={trace} stepIndex={safeIndex} />
      </div>

      <div className="trace-controls">
        <button type="button" onClick={() => go(-1)} disabled={safeIndex <= 0}>
          Prev
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={max <= 0}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={safeIndex >= max}
        >
          Next
        </button>
        <label className="step-slider">
          <span className="muted">
            Step {safeIndex + 1} / {trace.steps.length}
          </span>
          <input
            type="range"
            min={0}
            max={max}
            value={safeIndex}
            onChange={(e) => setStepIndex(Number(e.target.value))}
          />
        </label>
      </div>

      {step && (
        <aside className="trace-aside" aria-live="polite">
          <strong>{phaseLabel(step.phase)}</strong>
          <span className="muted">
            {' '}
            — active level L{step.activeLevel}
          </span>
        </aside>
      )}
    </div>
  )
}
