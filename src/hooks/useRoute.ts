import { useState, useEffect, useRef, useCallback } from 'react'
import { Stop, RouteInfo } from '../types'
import { fetchRoute, hasToken } from '../utils/mapbox'
import { makeFallbackRoute } from '../utils/mock'

export function useRoute(stops: Stop[]) {
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const calc = useCallback(async (s: Stop[]) => {
    if (s.length < 2) { setRoute(null); return }
    setLoading(true)
    try {
      let r = hasToken() ? await fetchRoute(s) : null
      if (!r) r = makeFallbackRoute(s)
      setRoute(r)
    } catch {
      setRoute(makeFallbackRoute(s))
    }
    setLoading(false)
  }, [])

  // debounce 500ms
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => calc(stops), 500)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [stops, calc])

  return { route, loading }
}
