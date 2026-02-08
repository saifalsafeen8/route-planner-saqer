import { Stop, RouteInfo } from '../types'

export const DEMO_STOPS: Stop[] = [
  { id: 'demo-1', name: 'Warehouse HQ', address: '123 Industrial Blvd', lng: 35.9106, lat: 31.9539 },
  { id: 'demo-2', name: 'Metro Shopping Center', address: '456 Main Street', lng: 35.8797, lat: 31.9632 },
  { id: 'demo-3', name: 'City Hospital', address: '789 Health Ave', lng: 35.9301, lat: 31.9285 },
  { id: 'demo-4', name: 'Tech Campus', address: '555 Innovation Dr', lng: 35.8562, lat: 31.9344 },
  { id: 'demo-5', name: 'Distribution Center', address: '999 Logistics Way', lng: 35.8950, lat: 31.9125 },
]

// fallback route when API is unavailable
export function makeFallbackRoute(stops: Stop[]): RouteInfo | null {
  if (stops.length < 2) return null

  const coords: number[][] = []
  let totalDist = 0

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1]
    // interpolate with slight curve
    for (let t = (i === 0 ? 0 : 0.05); t <= 1; t += 0.05) {
      const offset = Math.sin(t * Math.PI) * 0.003
      coords.push([
        a.lng + (b.lng - a.lng) * t + offset,
        a.lat + (b.lat - a.lat) * t + offset * 0.5,
      ])
    }
    // rough distance
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180)
      * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    totalDist += 2 * R * Math.asin(Math.sqrt(x))
  }

  return {
    geometry: { type: 'LineString', coordinates: coords },
    distance: totalDist,
    duration: (totalDist / 1000 / 40) * 3600, // ~40km/h
  }
}

let counter = 0
export const makeId = () => `stop-${++counter}-${Date.now().toString(36)}`
