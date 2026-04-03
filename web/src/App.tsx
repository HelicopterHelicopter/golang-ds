import { useMemo, useState } from 'react'
import { TracePlayer } from './components/TracePlayer'
import type { VizEnvelope } from './types/trace'
import { parseVizEnvelope } from './types/trace'
import {
  buildQuadtreeInsertTrace,
  parsePointList,
} from './quadtree/simulate'
import { buildSkipListSearchTrace, parseIntegerList } from './skiplist/simulate'
import './App.css'

type Mode = 'skiplist' | 'quadtree'

const DEFAULT_SKIPLIST_FORM = {
  values:
    '3, 1, 10, 5, 20, 15, 8, 25, 30, 12, 35, 18, 40, 22, 45, 50, 28, 55, 38, 60, 42, 48, 65, 52, 70, 58, 75, 2, 4, 7, 9, 11, 13, 16, 19, 21, 23, 26, 27, 29, 31, 32, 34, 36, 39, 41, 43, 46, 49, 51, 53, 56, 57, 59, 61, 62, 63, 64, 66, 67, 69, 71, 73, 74, 76, 77, 79, 80, 81, 82, 83, 84, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100',
  target: '48',
  seed: '42',
}

const DEFAULT_QUADTREE_FORM = {
  points: `10, 15
45, 20
30, 60
70, 55
25, 40
50, 10
80, 80
15, 70
60, 35
40, 85
20, 25
55, 65
75, 30
35, 50
90, 40
5, 50
12, 45
88, 18
42, 72
68, 12
33, 28
52, 58
8, 88
72, 88
28, 8
62, 48
18, 62
95, 72
48, 95
38, 18
58, 22
22, 38
85, 55
7, 22
92, 28
44, 44
66, 70
14, 8
78, 42
32, 78
54, 35
24, 52
64, 25
46, 62
8, 35
86, 92
50, 75
36, 55`,
  capacity: '4',
}

const PAD_FRACTION = 0.05

function tryBuildSkipList(fields: typeof DEFAULT_SKIPLIST_FORM): {
  trace: VizEnvelope | null
  error: string | null
} {
  try {
    const values = parseIntegerList(fields.values)
    if (values.length === 0) {
      return { trace: null, error: 'Add at least one integer to insert.' }
    }
    const target = Number(fields.target.trim())
    if (!Number.isFinite(target) || !Number.isInteger(target)) {
      return { trace: null, error: 'Search target must be an integer.' }
    }
    const seed = Number(fields.seed.trim())
    if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
      return { trace: null, error: 'RNG seed must be an integer.' }
    }
    return {
      trace: buildSkipListSearchTrace(values, target, seed),
      error: null,
    }
  } catch (e) {
    return {
      trace: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function tryBuildQuadtree(fields: typeof DEFAULT_QUADTREE_FORM): {
  trace: VizEnvelope | null
  error: string | null
} {
  try {
    const pts = parsePointList(fields.points)
    const cap = Number(fields.capacity.trim())
    if (!Number.isFinite(cap) || !Number.isInteger(cap) || cap < 1) {
      return { trace: null, error: 'Capacity must be an integer ≥ 1.' }
    }
    return {
      trace: buildQuadtreeInsertTrace(pts, cap, PAD_FRACTION),
      error: null,
    }
  } catch (e) {
    return {
      trace: null,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

function App() {
  const [mode, setMode] = useState<Mode>('skiplist')
  const [skipForm, setSkipForm] = useState(DEFAULT_SKIPLIST_FORM)
  const [skipApplied, setSkipApplied] = useState(DEFAULT_SKIPLIST_FORM)
  const [qtForm, setQtForm] = useState(DEFAULT_QUADTREE_FORM)
  const [qtApplied, setQtApplied] = useState(DEFAULT_QUADTREE_FORM)

  const [source, setSource] = useState<'sim' | 'fixture'>('sim')
  const [fixtureTrace, setFixtureTrace] = useState<VizEnvelope | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const skipSim = useMemo(() => tryBuildSkipList(skipApplied), [skipApplied])
  const qtSim = useMemo(() => tryBuildQuadtree(qtApplied), [qtApplied])

  const trace: VizEnvelope | null = useMemo(() => {
    if (source === 'fixture' && fixtureTrace) return fixtureTrace
    if (mode === 'skiplist') return skipSim.trace
    return qtSim.trace
  }, [source, fixtureTrace, mode, skipSim.trace, qtSim.trace])

  const buildError =
    source === 'sim'
      ? mode === 'skiplist'
        ? skipSim.error
        : qtSim.error
      : null

  const applySkip = () => {
    setBanner(null)
    setSource('sim')
    setFixtureTrace(null)
    const v = tryBuildSkipList(skipForm)
    if (v.error) {
      setBanner(v.error)
      return
    }
    setSkipApplied({ ...skipForm })
  }

  const applyQt = () => {
    setBanner(null)
    setSource('sim')
    setFixtureTrace(null)
    const v = tryBuildQuadtree(qtForm)
    if (v.error) {
      setBanner(v.error)
      return
    }
    setQtApplied({ ...qtForm })
  }

  const loadSkipFixture = async () => {
    setBanner(null)
    try {
      const res = await fetch('/fixtures/example-skiplist-search.json')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const parsed = parseVizEnvelope(await res.json())
      setFixtureTrace(parsed)
      setSource('fixture')
      setMode('skiplist')
      if (parsed.kind === 'skiplist-search') {
        const nodes = parsed.steps[0]?.graph.nodes ?? []
        const vals = nodes
          .filter((n) => n.id !== 'head')
          .map((n) => n.value)
        setSkipForm((f) => ({
          ...f,
          values: vals.join(', '),
          target: parsed.meta.targetValue,
        }))
      }
      setBanner('Showing trace from checked-in JSON (Go-generated steps).')
    } catch (e) {
      setBanner(e instanceof Error ? e.message : String(e))
    }
  }

  const loadQtFixture = async () => {
    setBanner(null)
    try {
      const res = await fetch('/fixtures/example-quadtree-insert.json')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const parsed = parseVizEnvelope(await res.json())
      setFixtureTrace(parsed)
      setSource('fixture')
      setMode('quadtree')
      if (parsed.kind === 'quadtree-insert') {
        const last = parsed.steps[parsed.steps.length - 1]
        const lines =
          last?.graph.points.map((p) => `${p.x}, ${p.y}`).join('\n') ?? ''
        setQtForm((f) => ({
          ...f,
          points: lines,
          capacity: String(parsed.meta.capacity),
        }))
      }
      setBanner('Showing trace from checked-in JSON (Go-generated steps).')
    } catch (e) {
      setBanner(e instanceof Error ? e.message : String(e))
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setBanner(null)
    setSource('sim')
    setFixtureTrace(null)
  }

  const vizKey =
    source === 'fixture' && fixtureTrace
      ? `fixture-${fixtureTrace.kind}-${fixtureTrace.steps.length}`
      : mode === 'skiplist'
        ? `sim-skip-${skipApplied.values}|${skipApplied.target}|${skipApplied.seed}`
        : `sim-qt-${qtApplied.points}|${qtApplied.capacity}`

  return (
    <div className="app">
      <div className="mode-toggle" role="tablist" aria-label="Visualization mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'skiplist'}
          className={mode === 'skiplist' ? 'mode-toggle__btn mode-toggle__btn--on' : 'mode-toggle__btn'}
          onClick={() => switchMode('skiplist')}
        >
          Skip list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'quadtree'}
          className={mode === 'quadtree' ? 'mode-toggle__btn mode-toggle__btn--on' : 'mode-toggle__btn'}
          onClick={() => switchMode('quadtree')}
        >
          Quadtree
        </button>
      </div>

      {mode === 'skiplist' ? (
        <section className="editor-panel" aria-label="Skip list input">
          <h2 className="panel-title">Build a skip list</h2>
          <p className="panel-hint">
            Enter integers in <strong>insertion order</strong>, a search target,
            and an RNG seed for tower heights (p = 0.5, max level 32). The preview
            uses the same insert/search rules as the Go package; only the random
            draws differ from Go unless you match generators.
          </p>
          <div className="form-grid">
            <label className="field">
              <span>Values (insert order)</span>
              <textarea
                rows={3}
                value={skipForm.values}
                onChange={(e) =>
                  setSkipForm((f) => ({ ...f, values: e.target.value }))
                }
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="field field--inline">
              <span>Search target</span>
              <input
                value={skipForm.target}
                onChange={(e) =>
                  setSkipForm((f) => ({ ...f, target: e.target.value }))
                }
                autoComplete="off"
              />
            </label>
            <label className="field field--inline">
              <span>RNG seed</span>
              <input
                value={skipForm.seed}
                onChange={(e) =>
                  setSkipForm((f) => ({ ...f, seed: e.target.value }))
                }
                autoComplete="off"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={applySkip}>
              Visualize search
            </button>
            <button type="button" className="btn-secondary" onClick={loadSkipFixture}>
              Load sample JSON
            </button>
          </div>
        </section>
      ) : (
        <section className="editor-panel" aria-label="Quadtree input">
          <h2 className="panel-title">Build a point quadtree</h2>
          <p className="panel-hint">
            Enter <strong>x,y</strong> pairs (one per line or separated by
            semicolons). World bounds are computed from all points with{' '}
            {Math.round(PAD_FRACTION * 100)}% padding; points are inserted in
            order (bucket capacity before splitting). Matches the Go{' '}
            <code>quadtree</code> package and <code>quadtreetracegen</code>{' '}
            fixture.
          </p>
          <div className="form-grid form-grid--quad">
            <label className="field field--wide">
              <span>Points (insert order)</span>
              <textarea
                rows={8}
                value={qtForm.points}
                onChange={(e) =>
                  setQtForm((f) => ({ ...f, points: e.target.value }))
                }
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="field field--inline">
              <span>Bucket capacity</span>
              <input
                value={qtForm.capacity}
                onChange={(e) =>
                  setQtForm((f) => ({ ...f, capacity: e.target.value }))
                }
                autoComplete="off"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={applyQt}>
              Visualize inserts
            </button>
            <button type="button" className="btn-secondary" onClick={loadQtFixture}>
              Load sample JSON
            </button>
          </div>
        </section>
      )}

      {(banner || buildError) && (
        <p
          className={buildError ? 'error' : 'banner'}
          role={buildError ? 'alert' : 'status'}
        >
          {buildError || banner}
        </p>
      )}

      {trace && <TracePlayer key={vizKey} trace={trace} />}
    </div>
  )
}

export default App
