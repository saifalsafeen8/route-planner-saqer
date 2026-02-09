import { useCallback, useEffect, useRef, useState } from 'react'
import MapView from './components/MapView'
import SearchInput from './components/SearchInput'
import StopsList from './components/StopsList'
import { useRoute } from './hooks/useRoute'
import { useSimulation } from './hooks/useSimulation'
import { Stop } from './types'
import { exportJSON } from './utils/exportRoute'
import { getDistanceMatrix, hasToken, reverseGeocode, snapToRoad } from './utils/mapbox'
import { makeId } from './utils/mock'
import { optimizeRoute } from './utils/optimize'

const MAX_STOPS = 25

export default function App() {
  const [stops, setStops] = useState<Stop[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [currentStopId, setCurrentStopId] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const { route } = useRoute(stops)
  const { sim, play, pause, reset, setSpeed, setProgress } = useSimulation(route)

  useEffect(() => {
    if (!route || stops.length === 0) return;

    // نحسب أي محطة هي التالية
    let nextStop: Stop | null = null
    const coords = route.geometry.coordinates

    // نحدد index أقرب نقطة بعد الـ progress
    const progressIndex = Math.floor(sim.progress * coords.length)
    for (let i = 0; i < stops.length; i++) {
      const stopCoord = [stops[i].lng, stops[i].lat]
      if (progressIndex <= coords.findIndex(c => c[0] === stopCoord[0] && c[1] === stopCoord[1])) {
        nextStop = stops[i]
        break
      }
    }

    setCurrentStopId(nextStop?.id || null)
  }, [sim.progress, route, stops])

  const addStop = useCallback(async (lng: number, lat: number, name?: string, address?: string) => {
    if (stops.length >= MAX_STOPS) return

    let snapped = { lng, lat }
    if (hasToken()) {
      try { snapped = await snapToRoad(lng, lat) } catch { }
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
    setStops(prev => {
      if (prev.length >= MAX_STOPS) return prev
      return [...prev, stop]
    })
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
    if (hasToken()) { try { snapped = await snapToRoad(lng, lat) } catch { } }
    const addr = hasToken()
      ? await reverseGeocode(snapped.lng, snapped.lat)
      : `${snapped.lat.toFixed(4)}, ${snapped.lng.toFixed(4)}`
    setStops(prev => prev.map(s => s.id === id ? { ...s, lng: snapped.lng, lat: snapped.lat, address: addr } : s))
  }, [])


  const handleOptimize = useCallback(async () => {
    if (stops.length < 3) return

    let matrix: number[][] | null = null
    if (hasToken()) {
      try {
        matrix = await getDistanceMatrix(stops)
      } catch { }
    }

    const result = optimizeRoute(stops, matrix)

    setStops(result.optimizedStops)
    reset()

  }, [stops, reset])
  console.log("🚀 ~ App ~ stops:", stops)

  const fmtDist = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)} km`
  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 text-gray-200 overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* top bar */}
      <div className="h-11 bg-[#16213f] backdrop-blur border-b border-dark-600 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold tracking-tight">Route Planner Tool</span>
          {stops.length !== 0 &&
            < button onClick={() => { setStops([]); reset() }} className="text-xs text-gray-500 hover:text-red-400">Clear all</button>
          }
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOptimize} disabled={stops.length < 3}
            className="px-3 py-1.5 rounded-md text-[#fff] bg-[#3b82f6] hover:bg-blue-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
          >

            Optimize
          </button>
          <div ref={exportRef} className="relative">
            <button
              onClick={() => exportJSON(stops, route)}
              disabled={!stops.length}
              className="px-3 py-1.5 rounded-md text-[#fff] bg-[#0fb981]  text-xs font-medium hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* main area */}
      <div className="flex-1 flex overflow-hidden">

        {/* sidebar */}
        <div className="w-[340px] bg-[#16213f] border-r border-dark-600 flex flex-col shrink-0 overflow-hidden">

          {/* search */}
          <div className="p-4 pb-2">
            <SearchInput
              onSelect={p => addStop(p.lng, p.lat, p.name, p.address)}
              disabled={stops.length >= MAX_STOPS}
            />
          </div>

          {/* stops header */}
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#fff] uppercase tracking-wider">Stops ({stops.length})</span>
            {stops.length < MAX_STOPS && <span className="text-[10px] text-[#3b82f6]">+ Add Stop</span>}
          </div>

          {/* stop list */}
          <div className="flex-1 overflow-y-auto px-1.5 scrollbar-thin">
            <StopsList stops={stops} onReorder={reorder} onRemove={removeStop}
              onSelect={id => setSelected(id === selected ? null : id)}
              selected={currentStopId}
            />
          </div>

          {/* route summary */}
          {route && (
            <div className="px-4 py-3 bg-[#1a1a2e] border border-[#3b82f6] rounded-lg shrink-0 m-1.5 mb-4">
              <div className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">Route Summary</div>
              <div >
                <div className="flex items-center gap-2 justify-between">
                  <span className="block text-[12px] text-gray-400">Total Distance :</span>
                  <span className="text-base ">{fmtDist(route.distance)}</span>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <span className="block text-[12px] text-gray-400">Duration :</span>
                  <span className="text-base">{fmtTime(route.duration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* simulation */}
          {route && (
            <div className="px-4 bg-[#1a1a2e] py-3 border border-[#8b5cf6] rounded-lg shrink-0 m-1.5">
              <div className="text-[13px] font-semibold  text-[#8b5cf6] uppercase tracking-wider mb-2">Simulation</div>
              <div className="flex items-center gap-2 mb-2.5">
                <button onClick={sim.status === 'playing' ? pause : play}
                  className="w-8 h-8 rounded-md bg-[#8b5cf6] hover: bg-[#5917f3]flex items-center justify-center text-white text-sm font-bold transition-colors">
                  {sim.status === 'playing' ? '⏸' : '▶'}
                </button>
                <button onClick={reset} disabled={sim.status === 'idle' && sim.progress === 0}
                  className="w-8 h-8 rounded-md bg-dark-700 border border-dark-600 flex items-center justify-center text-xs disabled:opacity-30 transition-colors">
                  ↺
                </button>
                <div className="flex gap-1 ml-2">
                  {[1, 2, 4].map(s => (
                    <button key={s} onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${sim.speed === s ? 'bg-[#8b5cf6] text-white' : 'bg-dark-700 border border-dark-600 text-gray-500'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                {sim.progress > 0 && <span className="ml-auto text-[11px] text-gray-200">{Math.round(sim.progress * 100)}%</span>}
              </div>
              <input type="range" min={0} max={100} value={sim.progress * 100}
                onChange={e => setProgress(+e.target.value / 100)}
                className="w-full h-1 accent-[#8b5cf6] cursor-pointer" />
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
      <div className="h-20 bg-[#16213f] border-t border-dark-600 flex items-center justify-center px-4 gap-5 text-[11px] shrink-0">
        <span className="flex flex-col items-center">
          <span className="text-gray-500 text-base ">Stops</span>
          <b className='text-base' >
            {stops.length}
          </b>
        </span>
        {route && <>
          <span className="text-dark-600">|</span>
          <span className="flex flex-col items-center">
            <span className="text-gray-500 text-base">Dist</span>
            <b className='text-base' >
              {fmtDist(route.distance)}
            </b>
          </span>
          <span className="flex flex-col items-center">
            <span className="text-gray-500 text-base">Time</span>
            <b className='text-base' >
              {fmtTime(route.duration)}
            </b>
          </span>
        </>}
        {sim.status !== 'idle' && <>
          <span className="flex items-center gap-1.5 py-3 border border-[#8b5cf6] p-4 rounded-lg text-[#8b5cf6]">
            <span className={`w-2 h-2 rounded-full ${sim.status === 'playing' ? 'bg-[#8b5cf6] animate-pulse' : ''}`} />
            <span className="text-[12px] font-bold">{sim.status === 'playing' ? 'Simulation' : 'sssss'} ....</span>
            <b className="text-[12px] w-8">{Math.round(sim.progress * 100)}%</b>
          </span>
        </>}
      </div>
    </div >
  )
}
