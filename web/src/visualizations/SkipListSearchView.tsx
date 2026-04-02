import { useId, useLayoutEffect, useMemo, useRef } from 'react'
import { buildSearchPathKeys } from '../skiplist/path'
import type { SearchStep, SkipListSearchTrace } from '../types/trace'

const BOX_W = 64
const BOX_H = 42

type Props = {
  step: SearchStep
  trace: SkipListSearchTrace
  stepIndex: number
}

function nodeCaption(n: { id: string; value: string }) {
  if (n.id === 'head') return 'HEAD'
  return n.value || n.id
}

export function SkipListSearchView({ step, trace, stepIndex }: Props) {
  const uid = useId().replace(/:/g, '')
  const arrowRef = `arrow-${uid}`
  const arrowPathRef = `arrow-path-${uid}`

  const { graph, activeLevel, cursorNodeId, phase } = step
  const { nodes, edges, listLevel } = graph

  const colW = 92
  const rowH = 96
  const padX = 64
  const padY = 56
  const labelColW = 118

  const w =
    padX + labelColW + Math.max(1, nodes.length) * colW + padX
  const h = padY * 2 + listLevel * rowH + 64

  const colCenter = (id: string) => {
    const i = nodes.findIndex((n) => n.id === id)
    const idx = i < 0 ? 0 : i
    return padX + labelColW + colW / 2 + idx * colW
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const cxForId = (id: string) => {
      const i = nodes.findIndex((n) => n.id === id)
      const idx = i < 0 ? 0 : i
      return padX + labelColW + colW / 2 + idx * colW
    }

    const scrollActiveIntoFrame = () => {
      const focusId = cursorNodeId || 'head'
      const cx = cxForId(focusId)
      const vw = el.clientWidth
      const maxScroll = Math.max(0, el.scrollWidth - vw)
      const target = Math.round(cx - vw / 2)
      const left = Math.max(0, Math.min(target, maxScroll))
      el.scrollTo({ left, behavior: 'auto' })
    }

    scrollActiveIntoFrame()

    const ro = new ResizeObserver(scrollActiveIntoFrame)
    ro.observe(el)
    return () => ro.disconnect()
  }, [stepIndex, cursorNodeId, activeLevel, w, nodes, padX, labelColW, colW])

  const rowYlevel = (level: number) =>
    padY + rowH / 2 + (listLevel - 1 - level) * rowH

  const { horiz: pathH, vert: pathV } = useMemo(
    () => buildSearchPathKeys(trace.steps, stepIndex),
    [trace.steps, stepIndex],
  )

  const targetId =
    trace.meta.found &&
    nodes.find((n) => n.value === trace.meta.targetValue)?.id

  const rightCenter = (cx: number, cy: number) => ({
    x: cx + BOX_W / 2,
    y: cy,
  })
  const leftCenter = (cx: number, cy: number) => ({
    x: cx - BOX_W / 2,
    y: cy,
  })
  const bottomMid = (cx: number, cy: number) => ({
    x: cx,
    y: cy + BOX_H / 2,
  })
  const topMid = (cx: number, cy: number) => ({
    x: cx,
    y: cy - BOX_H / 2,
  })

  const horizKey = (level: number, from: string, to: string) =>
    `${level}:${from}:${to}`

  return (
    <div className="skiplist-wrap skiplist-wrap--paper">
      <div className="skiplist-scroll" tabIndex={0} ref={scrollRef}>
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="skiplist-svg"
          role="img"
          aria-label={`Skip list: ${phase} on level ${activeLevel}`}
        >
          <defs>
            <marker
              id={arrowRef}
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 Z" className="sl-marker" />
            </marker>
            <marker
              id={arrowPathRef}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 Z" className="sl-marker sl-marker--path" />
            </marker>
          </defs>

          {Array.from({ length: listLevel }, (_, L) => (
            <text
              key={`lvlname-${L}`}
              x={padX}
              y={rowYlevel(L)}
              dominantBaseline="middle"
              className="sl-row-label"
            >
              {L === 0 ? 'Base (L0)' : `Level ${L}`}
            </text>
          ))}

          {nodes.flatMap((n) => {
            const levels = Math.min(n.height, listLevel)
            const out: React.ReactNode[] = []
            for (let l = 1; l < levels; l++) {
              const up = l
              const lo = l - 1
              const cx = colCenter(n.id)
              const yU = rowYlevel(up)
              const yL = rowYlevel(lo)
              const a = bottomMid(cx, yU)
              const b = topMid(cx, yL)
              const vk = `${n.id}:${up}:${lo}`
              const onPath = pathV.has(vk)
              out.push(
                <line
                  key={`v-${n.id}-${up}-${lo}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={onPath ? 'sl-vert sl-vert--path' : 'sl-vert'}
                  markerEnd={onPath ? `url(#${arrowPathRef})` : undefined}
                />,
              )
            }
            return out
          })}

          {edges.map((e, i) => {
            const cx1 = colCenter(e.from)
            const cx2 = colCenter(e.to)
            const y = rowYlevel(e.level)
            const p1 = rightCenter(cx1, y)
            const p2 = leftCenter(cx2, y)
            const onPath = pathH.has(horizKey(e.level, e.from, e.to))
            return (
              <line
                key={`h-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                className={onPath ? 'sl-edge sl-edge--path' : 'sl-edge'}
                markerEnd={onPath ? `url(#${arrowPathRef})` : `url(#${arrowRef})`}
              />
            )
          })}

          {nodes.flatMap((n) =>
            Array.from(
              { length: Math.min(n.height, listLevel) },
              (_, l) => {
                const cx = colCenter(n.id)
                const cy = rowYlevel(l)
                const isCursor = n.id === cursorNodeId && l === activeLevel
                const isTarget = targetId === n.id
                return (
                  <g key={`${n.id}-${l}`}>
                    <rect
                      x={cx - BOX_W / 2}
                      y={cy - BOX_H / 2}
                      width={BOX_W}
                      height={BOX_H}
                      rx={4}
                      className={[
                        'sl-node',
                        isTarget ? 'sl-node--target' : '',
                        isCursor ? 'sl-node--cursor' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                    <text
                      x={cx}
                      y={cy}
                      dominantBaseline="central"
                      textAnchor="middle"
                      className="sl-node-text"
                    >
                      {nodeCaption(n)}
                    </text>
                  </g>
                )
              },
            ),
          )}
        </svg>
      </div>
      <p className="step-caption">
        <span className="step-phase">{phase}</span>
        <span className="step-meta">
          {' '}
          · L{activeLevel}
          {cursorNodeId ? ` · ${cursorNodeId}` : ''}
        </span>
      </p>
    </div>
  )
}
