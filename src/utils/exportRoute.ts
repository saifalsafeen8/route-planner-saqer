import { Stop, RouteInfo } from '../types'

function download(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function exportJSON(stops: Stop[], route: RouteInfo | null) {
  const payload = {
    exported: new Date().toISOString(),
    stops: stops.map((s, i) => ({
      order: i + 1,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
    })),
    route: route ? {
      distanceKm: +(route.distance / 1000).toFixed(2),
      duration: fmtDuration(route.duration),
    } : null,
    geometry: route?.geometry || null,
  }
  download(JSON.stringify(payload, null, 2), 'route-plan.json', 'application/json')
}
