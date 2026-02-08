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

export function exportCSV(stops: Stop[], route: RouteInfo | null) {
  let csv = 'Order,Name,Address,Latitude,Longitude\n'
  stops.forEach((s, i) => {
    csv += `${i + 1},"${s.name}","${s.address}",${s.lat.toFixed(6)},${s.lng.toFixed(6)}\n`
  })
  if (route) {
    csv += `\nTotal Distance,${(route.distance / 1000).toFixed(2)} km\n`
    csv += `Est. Duration,${fmtDuration(route.duration)}\n`
  }
  download(csv, 'route-plan.csv', 'text/csv')
}

export function exportPDF(stops: Stop[], route: RouteInfo | null) {
  const html = `<!DOCTYPE html><html><head><title>Route Plan</title>
<style>
  body{font-family:system-ui,sans-serif;padding:40px;color:#222}
  h1{font-size:22px;border-bottom:2px solid #e67e22;padding-bottom:10px}
  .meta{color:#888;font-size:13px}
  .stats{display:flex;gap:40px;margin:20px 0;font-size:14px}
  .stats b{font-size:22px;display:block;color:#e67e22}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th{background:#222;color:#fff;padding:10px 14px;text-align:left;font-size:12px}
  td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}
  tr:nth-child(even){background:#f9f9f9}
</style></head><body>
  <h1>Route Plan</h1>
  <p class="meta">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  ${route ? `<div class="stats">
    <div><b>${stops.length}</b>Stops</div>
    <div><b>${(route.distance / 1000).toFixed(1)} km</b>Distance</div>
    <div><b>${fmtDuration(route.duration)}</b>Duration</div>
  </div>` : ''}
  <table><thead><tr><th>#</th><th>Name</th><th>Address</th><th>Coordinates</th></tr></thead>
  <tbody>${stops.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.address}</td><td>${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</td></tr>`).join('')}</tbody></table>
  <script>window.onload=()=>window.print()</script>
</body></html>`
  const w = window.open()
  if (w) { w.document.write(html); w.document.close() }
}
