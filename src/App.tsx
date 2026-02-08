import { useState, useCallback, useRef, useEffect } from 'react'
import { Stop } from './types'
import { useRoute } from './hooks/useRoute'
import { useSimulation } from './hooks/useSimulation'
import { reverseGeocode, snapToRoad, hasToken, getDistanceMatrix } from './utils/mapbox'
import { optimizeRoute } from './utils/optimize'
import { exportJSON, exportCSV, exportPDF } from './utils/exportRoute'
import { DEMO_STOPS, makeId } from './utils/mock'
import SearchInput from './components/SearchInput'
import StopsList from './components/StopsList'
import MapView from './components/MapView'

const MAX_STOPS = 25

export default function App() {
  const [stops, setStops] = useState<Stop[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [optModal, setOptModal] = useState<any>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const { route, loading } = useRoute(stops)
  const { sim, play, pause, reset, setSpeed, setProgress } = useSimulation(route)

  // close export dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const addStop = useCallback(async (lng: number, lat: number, name?: string, address?: string) => {
    if (stops.length >= MAX_STOPS) return

    let snapped = { lng, lat }
    if (hasToken()) {
      try { snapped = await snapToRoad(lng, lat) } catch {}
    }

    const addr = address || (hasToken()
      ? await reverseGeocode(snapped.lng, snapped.lat)
      : `${snapped.lat.toFixed(4)}, ${snapped.lng.toFixed(4)}`)

    const stop: Stop = {
      id: makeId(),
      name: name || `Stop ${stops.length + 1}`,
      address: addr,
      lng: snapped.lng,
      lat: snapped.lat,
    }
    setStops(prev => [...prev, stop])
    reset()
  }, [stops.length, reset])

  const removeStop = useCallback((id: string) => {
    setStops(prev => prev.filter(s => s.id !== id))
    reset()
  }, [reset])

  const reorder = useCallback((from: number, to: number) => {
    setStops(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
    reset()
  }, [reset])

  const onMarkerDrag = useCallback(async (id: string, lng: number, lat: number) => {
    let snapped = { lng, lat }
    if (hasToken()) { try { snapped = await snapToRoad(lng, lat) } catch {} }
    const addr = hasToken()
      ? await reverseGeocode(snapped.lng, snapped.lat)
      : `${snapped.lat.toFixed(4)}, ${snapped.lng.toFixed(4)}`
    setStops(prev => prev.map(s => s.id === id ? { ...s, lng: snapped.lng, lat: snapped.lat, address: addr } : s))
  }, [])

  const handleOptimize = useCallback(async () => {
    if (stops.length < 3) return
    let matrix: number[][] | null = null
    if (hasToken()) { try { matrix = await getDistanceMatrix(stops) } catch {} }

    const result = optimizeRoute(stops, matrix)
    setOptModal({
      ...result,
      origDuration: route?.duration || 0,
    })
  }, [stops, route])

  const acceptOpt = () => {
    if (optModal) setStops(optModal.optimizedStops)
    setOptModal(null)
    reset()
  }

  const fmtDist = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)} km`
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 text-gray-200 overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* top bar */}
      <div className="h-11 bg-dark-800/90 backdrop-blur border-b border-dark-600 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight">Route Planner</span>
          <span className="text-[10px] text-gray-600">|</span>
          {stops.length === 0
            ? <button onClick={() => { setStops(DEMO_STOPS); reset() }} className="text-xs text-amber-500 hover:text-amber-400">Load demo</button>
            : <button onClick={() => { setStops([]); reset() }} className="text-xs text-gray-500 hover:text-red-400">Clear all</button>
          }
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOptimize} disabled={stops.length < 3}
            className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-dark-900 text-xs font-semibold transition-colors">
            Optimize
          </button>
          <div ref={exportRef} className="relative">
            <button onClick={() => setExportOpen(!exportOpen)} disabled={!stops.length}
              className="px-3 py-1.5 rounded-md bg-dark-700 border border-dark-600 text-xs font-medium hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-dark-700 border border-dark-600 rounded-md shadow-xl overflow-hidden z-50">
                {[
                  { label: 'JSON', fn: () => exportJSON(stops, route) },
                  { label: 'CSV', fn: () => exportCSV(stops, route) },
                  { label: 'PDF (Print)', fn: () => exportPDF(stops, route) },
                ].map(opt => (
                  <button key={opt.label} onClick={() => { opt.fn(); setExportOpen(false) }}
                    className="w-full px-3 py-2.5 text-left text-xs hover:bg-amber-500/10 border-b border-dark-600/50 last:border-0">
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* main area */}
      <div className="flex-1 flex overflow-hidden">

        {/* sidebar */}
        <div className="w-[340px] bg-dark-800 border-r border-dark-600 flex flex-col shrink-0 overflow-hidden">

          {/* search */}
          <div className="p-4 pb-2">
            <SearchInput
              onSelect={p => addStop(p.lng, p.lat, p.name, p.address)}
              disabled={stops.length >= MAX_STOPS}
            />
          </div>

          {/* stops header */}
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stops ({stops.length})</span>
            {stops.length < MAX_STOPS && <span className="text-[10px] text-amber-500/70">Click map to add</span>}
          </div>

          {/* stop list */}
          <div className="flex-1 overflow-y-auto px-1.5 scrollbar-thin">
            <StopsList stops={stops} onReorder={reorder} onRemove={removeStop}
              onSelect={id => setSelected(id === selected ? null : id)} selected={selected} />
          </div>

          {/* route summary */}
          {route && (
            <div className="px-4 py-3 border-t border-dark-600 shrink-0">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Route</div>
              <div className="flex gap-6">
                <div>
                  <span className="text-base font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtDist(route.distance)}</span>
                  <span className="block text-[10px] text-gray-500">Distance</span>
                </div>
                <div>
                  <span className="text-base font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>{fmtTime(route.duration)}</span>
                  <span className="block text-[10px] text-gray-500">Duration</span>
                </div>
              </div>
              {loading && <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1.5"><span className="w-2.5 h-2.5 border border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />Recalculating...</div>}
            </div>
          )}

          {/* simulation */}
          {route && (
            <div className="px-4 py-3 border-t border-dark-600 shrink-0">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Simulation</div>
              <div className="flex items-center gap-2 mb-2.5">
                <button onClick={sim.status === 'playing' ? pause : play}
                  className="w-8 h-8 rounded-md bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-dark-900 text-sm font-bold transition-colors">
                  {sim.status === 'playing' ? '⏸' : '▶'}
                </button>
                <button onClick={reset} disabled={sim.status === 'idle' && sim.progress === 0}
                  className="w-8 h-8 rounded-md bg-dark-700 border border-dark-600 flex items-center justify-center text-xs disabled:opacity-30 transition-colors">
                  ↺
                </button>
                <div className="flex gap-1 ml-2">
                  {[1, 2, 4].map(s => (
                    <button key={s} onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${sim.speed === s ? 'bg-amber-500 text-dark-900' : 'bg-dark-700 border border-dark-600 text-gray-500'}`}
                      style={{ fontFamily: "'DM Mono', monospace" }}>
                      {s}x
                    </button>
                  ))}
                </div>
                {sim.progress > 0 && <span className="ml-auto text-[11px] text-amber-500" style={{ fontFamily: "'DM Mono', monospace" }}>{Math.round(sim.progress * 100)}%</span>}
              </div>
              <input type="range" min={0} max={100} value={sim.progress * 100}
                onChange={e => setProgress(+e.target.value / 100)}
                className="w-full h-1 accent-amber-500 cursor-pointer" />
            </div>
          )}
        </div>

        {/* map */}
        <div className="flex-1 relative">
          <MapView stops={stops} route={route} simProgress={sim.progress} simStatus={sim.status}
            onMapClick={(lng, lat) => addStop(lng, lat)} onMarkerDrag={onMarkerDrag} />
        </div>
      </div>

      {/* status bar */}
      <div className="h-8 bg-dark-800/90 border-t border-dark-600 flex items-center px-4 gap-5 text-[11px] shrink-0">
        <span><span className="text-gray-500">Stops</span> <b style={{ fontFamily: "'DM Mono'" }}>{stops.length}</b></span>
        {route && <>
          <span className="text-dark-600">|</span>
          <span><span className="text-gray-500">Dist</span> <b style={{ fontFamily: "'DM Mono'" }}>{fmtDist(route.distance)}</b></span>
          <span className="text-dark-600">|</span>
          <span><span className="text-gray-500">Time</span> <b style={{ fontFamily: "'DM Mono'" }}>{fmtTime(route.duration)}</b></span>
        </>}
        {sim.status !== 'idle' && <>
          <span className="text-dark-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${sim.status === 'playing' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-gray-500">{sim.status === 'playing' ? 'Running' : 'Paused'}</span>
            <b className="text-amber-500" style={{ fontFamily: "'DM Mono'" }}>{Math.round(sim.progress * 100)}%</b>
          </span>
        </>}
      </div>

      {/* optimization modal */}
      {optModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOptModal(null)} />
          <div className="relative bg-dark-800 border border-dark-600 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-base font-bold">Route Optimized</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {optModal.ms.toFixed(0)}ms — Nearest Neighbor + 2-opt
              </p>
            </div>
            <div className="px-5 pb-4 grid grid-cols-2 gap-3">
              <div className="bg-dark-700 rounded-lg p-3.5 border border-dark-600">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Original</div>
                <div className="text-xl font-bold" style={{ fontFamily: "'DM Mono'" }}>{optModal.origDist.toFixed(1)} km</div>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-3.5 border border-amber-500/25">
                <div className="text-[10px] text-amber-500 uppercase tracking-wider mb-1">Optimized</div>
                <div className="text-xl font-bold text-amber-500" style={{ fontFamily: "'DM Mono'" }}>{optModal.optDist.toFixed(1)} km</div>
              </div>
            </div>
            {optModal.improvement > 0 && (
              <div className="px-5 pb-4 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold">
                  ↑ {optModal.improvement.toFixed(1)}% shorter
                </span>
              </div>
            )}
            <div className="px-5 pb-5 flex gap-2.5">
              <button onClick={() => setOptModal(null)}
                className="flex-1 py-2 rounded-md border border-dark-600 text-sm hover:bg-white/[0.03] transition-colors">
                Keep Original
              </button>
              <button onClick={acceptOpt}
                className="flex-1 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-dark-900 text-sm font-semibold transition-colors">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
