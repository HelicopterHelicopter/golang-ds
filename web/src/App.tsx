import { useMemo, useState } from 'react'
import { TracePlayer } from './components/TracePlayer'
import type { VizEnvelope } from './types/trace'
import { parseVizEnvelope } from './types/trace'
import { buildSkipListSearchTrace, parseIntegerList } from './skiplist/simulate'
import './App.css'

const DEFAULT_FORM = {
  values:
    '3, 1, 10, 5, 20, 15, 8, 25, 30, 12, 35, 18, 40, 22, 45, 50, 28, 55, 38, 60, 42, 48, 65, 52, 70, 58, 75, 2, 4, 7, 9, 11, 13, 16, 19, 21, 23, 26, 27, 29, 31, 32, 34, 36, 39, 41, 43, 46, 49, 51, 53, 56, 57, 59, 61, 62, 63, 64, 66, 67, 69, 71, 73, 74, 76, 77, 79, 80, 81, 82, 83, 84, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100',
  target: '48',
  seed: '42',
}

function tryBuild(fields: typeof DEFAULT_FORM): {
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

function App() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [applied, setApplied] = useState(DEFAULT_FORM)
  const [source, setSource] = useState<'sim' | 'fixture'>('sim')
  const [fixtureTrace, setFixtureTrace] = useState<VizEnvelope | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const sim = useMemo(() => tryBuild(applied), [applied])
  const trace: VizEnvelope | null =
    source === 'fixture' && fixtureTrace ? fixtureTrace : sim.trace
  const buildError = source === 'sim' ? sim.error : null

  const apply = () => {
    setBanner(null)
    setSource('sim')
    setFixtureTrace(null)
    const v = tryBuild(form)
    if (v.error) {
      setBanner(v.error)
      return
    }
    setApplied({ ...form })
  }

  const loadFixture = async () => {
    setBanner(null)
    try {
      const res = await fetch('/fixtures/example-skiplist-search.json')
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const parsed = parseVizEnvelope(await res.json())
      setFixtureTrace(parsed)
      setSource('fixture')
      if (parsed.kind === 'skiplist-search') {
        const nodes = parsed.steps[0]?.graph.nodes ?? []
        const vals = nodes
          .filter((n) => n.id !== 'head')
          .map((n) => n.value)
        setForm((f) => ({
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

  const vizKey =
    source === 'fixture' && fixtureTrace
      ? `fixture-${fixtureTrace.steps.length}-${fixtureTrace.meta.targetValue}`
      : `sim-${applied.values}|${applied.target}|${applied.seed}`

  return (
    <div className="app">
      <section className="editor-panel" aria-label="Skip list input">
        <h2 className="panel-title">Build a skip list</h2>
        <p className="panel-hint">
          Enter integers in <strong>insertion order</strong>, a search target, and
          an RNG seed for tower heights (p = 0.5, max level 32). The preview uses
          the same insert/search rules as the Go package; only the random draws
          differ from Go unless you match generators.
        </p>
        <div className="form-grid">
          <label className="field">
            <span>Values (insert order)</span>
            <textarea
              rows={3}
              value={form.values}
              onChange={(e) => setForm((f) => ({ ...f, values: e.target.value }))}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="field field--inline">
            <span>Search target</span>
            <input
              value={form.target}
              onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
              autoComplete="off"
            />
          </label>
          <label className="field field--inline">
            <span>RNG seed</span>
            <input
              value={form.seed}
              onChange={(e) => setForm((f) => ({ ...f, seed: e.target.value }))}
              autoComplete="off"
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={apply}>
            Visualize search
          </button>
          <button type="button" className="btn-secondary" onClick={loadFixture}>
            Load sample JSON
          </button>
        </div>
        {(banner || buildError) && (
          <p
            className={buildError ? 'error' : 'banner'}
            role={buildError ? 'alert' : 'status'}
          >
            {buildError || banner}
          </p>
        )}
      </section>

      {trace && <TracePlayer key={vizKey} trace={trace} />}
    </div>
  )
}

export default App
