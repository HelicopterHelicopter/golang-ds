import type { QuadtreeInsertStep, QuadtreeInsertTrace } from '../types/trace'

type Props = {
  step: QuadtreeInsertStep
  trace: QuadtreeInsertTrace
}

export function QuadtreeInsertView({ step, trace }: Props) {
  const { graph, insertIndex, lastPointId } = step
  const { bounds, nodes, points } = graph
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY
  const pad = Math.max(w, h) * 0.02 || 8
  const vbMinX = bounds.minX - pad
  const vbMinY = bounds.minY - pad
  const vbW = w + pad * 2
  const vbH = h + pad * 2

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  const strokeForDepth = (d: number) => {
    if (maxDepth <= 0) return 'var(--qt-stroke, #64748b)'
    const t = d / maxDepth
    const a = 0.35 + t * 0.55
    return `color-mix(in srgb, var(--qt-stroke, #64748b) ${Math.round(a * 100)}%, transparent)`
  }

  const r = Math.max(w, h) * 0.012 || 3

  return (
    <div className="quadtree-viz">
      <svg
        className="quadtree-svg"
        viewBox={`${vbMinX} ${vbMinY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Quadtree after ${insertIndex + 1} inserts`}
      >
        <title>
          Capacity {trace.meta.capacity} · {points.length} point
          {points.length !== 1 ? 's' : ''}
        </title>
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={w}
          height={h}
          fill="var(--qt-world-fill, rgba(148, 163, 184, 0.08))"
          stroke="var(--qt-world-edge, #475569)"
          strokeWidth={Math.max(w, h) * 0.002 || 1}
        />
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={n.minX}
            y={n.minY}
            width={n.maxX - n.minX}
            height={n.maxY - n.minY}
            fill="none"
            stroke={strokeForDepth(n.depth)}
            strokeWidth={
              n.depth === 0
                ? Math.max(w, h) * 0.003
                : Math.max(w, h) * 0.0015
            }
          />
        ))}
        {points.map((p) => {
          const active = p.id === lastPointId
          return (
            <g key={p.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={active ? r * 1.35 : r}
                fill={
                  active
                    ? 'var(--qt-point-hi, #f97316)'
                    : 'var(--qt-point, #0ea5e9)'
                }
                stroke={active ? '#c2410c' : '#0369a1'}
                strokeWidth={active ? r * 0.35 : r * 0.2}
              />
            </g>
          )
        })}
      </svg>
      <p className="quadtree-caption muted">
        Last inserted: <strong>{lastPointId}</strong>
        {points[insertIndex] != null && (
          <>
            {' '}
            ({points[insertIndex].x.toFixed(1)},{' '}
            {points[insertIndex].y.toFixed(1)})
          </>
        )}
      </p>
    </div>
  )
}
