import { useState, useEffect, useRef, useCallback } from 'react'
import { Stop, RouteInfo } from '../types'
import { fetchRoute, hasToken } from '../utils/mapbox'
import { makeFallbackRoute } from '../utils/mock'

export function useRoute(stops: Stop[]) {
  const [route, setRoute] = useState<RouteInfo | null>(null)

  const timer = useRef<ReturnType<typeof setTimeout>>()
  const calc = useCallback(async (currentStops: Stop[]) => {

    if (currentStops.length < 2) {
      setRoute(null);
      return;
    }

    try {
      let fetchedRoute = hasToken() ? await fetchRoute(currentStops) : null
      if (!fetchedRoute) {
        fetchedRoute = makeFallbackRoute(currentStops)
      }
      setRoute(fetchedRoute)
    } catch {
      setRoute(makeFallbackRoute(currentStops))
    }
  }, [])

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => calc(stops), 500)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [stops, calc])

  return { route }
}
