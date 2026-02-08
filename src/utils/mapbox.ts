import { Stop, RouteInfo } from '../types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const API = 'https://api.mapbox.com'

export const getToken = () => TOKEN
export const hasToken = () => TOKEN.length > 0

// reverse geocode a point to get address
export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  try {
    const res = await fetch(
      `${API}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&types=address,poi`
    )
    const data = await res.json()
    return data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

// geocoding search with autocomplete
export async function searchPlaces(query: string) {
  if (query.length < 2) return []
  try {
    const res = await fetch(
      `${API}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&limit=5&types=address,poi,place`
    )
    const data = await res.json()
    return (data.features || []).map((f: any) => ({
      name: f.text,
      address: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
    }))
  } catch {
    return []
  }
}

// snap point to nearest road
export async function snapToRoad(lng: number, lat: number) {
  try {
    const url = `${API}/directions/v5/mapbox/driving/${lng},${lat};${lng + 0.0001},${lat + 0.0001}?geometries=geojson&access_token=${TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.routes?.[0]) {
      const c = data.routes[0].geometry.coordinates[0]
      return { lng: c[0], lat: c[1] }
    }
  } catch {}
  return { lng, lat }
}

// fetch route between stops
export async function fetchRoute(stops: Stop[]): Promise<RouteInfo | null> {
  if (stops.length < 2) return null

  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';')
  try {
    const res = await fetch(
      `${API}/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${TOKEN}`
    )
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) return null

    const r = data.routes[0]
    return {
      geometry: r.geometry,
      distance: r.distance,
      duration: r.duration,
    }
  } catch {
    return null
  }
}

// get distance matrix for optimization
export async function getDistanceMatrix(stops: Stop[]): Promise<number[][] | null> {
  if (stops.length < 2) return null
  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';')
  try {
    const res = await fetch(
      `${API}/directions-matrix/v1/mapbox/driving/${coords}?access_token=${TOKEN}`
    )
    const data = await res.json()
    return data.code === 'Ok' ? data.distances : null
  } catch {
    return null
  }
}
