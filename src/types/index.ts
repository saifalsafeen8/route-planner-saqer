export interface Stop {
  id: string
  name: string
  address: string
  lng: number
  lat: number
}

export interface RouteInfo {
  geometry: GeoJSON.LineString
  distance: number
  duration: number
}

export type SimStatus = 'idle' | 'playing' | 'paused'
