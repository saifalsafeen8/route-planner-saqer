import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { Stop, RouteInfo, SimStatus } from '../types'
import { getToken } from '../utils/mapbox'
import { stopColor } from './StopsList'
import { pointAlong, sliceLine } from '../utils/geo'

interface Props {
  stops: Stop[]
  route: RouteInfo | null
  simProgress: number
  simStatus: SimStatus
  onMapClick: (lng: number, lat: number) => void
  onMarkerDrag: (id: string, lng: number, lat: number) => void
}

export default function MapView({ stops, route, simProgress, simStatus, onMapClick, onMarkerDrag }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const vehicle = useRef<mapboxgl.Marker | null>(null)
  const popup = useRef<mapboxgl.Popup | null>(null)

  // init map once
  useEffect(() => {
    if (!container.current) return
    mapboxgl.accessToken = getToken()

    const m = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/saifalsafeen8/cmlexb0m5004501sgethcc3zo',
      center: [35.91, 31.95],
      zoom: 12,
    })

    m.addControl(new mapboxgl.NavigationControl(), 'top-right')

    m.on('load', () => {
      // route layers
      m.addSource('route', { type: 'geojson', data: emptyLine() })
      m.addSource('completed', { type: 'geojson', data: emptyLine() })

      m.addLayer({
        id: 'route-glow', type: 'line', source: 'route',
        paint: { 'line-color': '#3b82f6', 'line-width': 8, 'line-opacity': 0.2, 'line-blur': 3 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      })
      m.addLayer({
        id: 'route-main', type: 'line', source: 'route',
        paint: { 'line-color': '#3b82f6', 'line-width': 3.5, 'line-opacity': 0.75 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      })
      m.addLayer({
        id: 'route-done', type: 'line', source: 'completed',
        paint: { 'line-color': '#10b981', 'line-width': 3.5, 'line-opacity': 0.85 },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      })
      // direction arrows
      m.addLayer({
        id: 'route-arrows', type: 'symbol', source: 'route',
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 80,
          'text-field': '▸', 'text-size': 14, 'text-keep-upright': false,
          'text-rotation-alignment': 'map',
        },
        paint: { 'text-color': '#60a5fa', 'text-halo-color': '#000', 'text-halo-width': 0.5 },
      })
    })

    m.on('click', e => onMapClick(e.lngLat.lng, e.lngLat.lat))
    map.current = m

    return () => { m.remove(); map.current = null }
  }, []) // eslint-disable-line

  // sync markers
  useEffect(() => {
    const m = map.current
    if (!m) return

    const existing = new Set(markers.current.keys())
    const needed = new Set(stops.map(s => s.id))

    // remove old
    existing.forEach(id => {
      if (!needed.has(id)) { markers.current.get(id)?.remove(); markers.current.delete(id) }
    })

    // add/update
    stops.forEach((stop, i) => {
      const color = stopColor(i)
      const label = i === 0 ? 'S' : i === stops.length - 1 && stops.length > 1 ? 'E' : String(i)

      if (markers.current.has(stop.id)) {
        const mk = markers.current.get(stop.id)!
        mk.setLngLat([stop.lng, stop.lat])
        const inner = mk.getElement().querySelector('.dot') as HTMLElement
        if (inner) { inner.style.background = color; inner.textContent = label }
      } else {
        const el = document.createElement('div')
        el.style.cssText = 'cursor:grab;'
        const dot = document.createElement('div')
        dot.className = 'dot'
        dot.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font:bold 11px/1 'DM Sans',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.15);transition:transform .15s;`
        dot.textContent = label
        el.appendChild(dot)
        el.onmouseenter = () => { dot.style.transform = 'scale(1.15)' }
        el.onmouseleave = () => { dot.style.transform = '' }
        el.onclick = e => e.stopPropagation()

        const mk = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'center' })
          .setLngLat([stop.lng, stop.lat])
          .addTo(m)
        mk.on('dragend', () => {
          const ll = mk.getLngLat()
          onMarkerDrag(stop.id, ll.lng, ll.lat)
        })
        markers.current.set(stop.id, mk)
      }
    })

    // fit bounds
    if (stops.length > 0) {
      const b = new mapboxgl.LngLatBounds()
      stops.forEach(s => b.extend([s.lng, s.lat]))
      m.fitBounds(b, { padding: 80, maxZoom: 14, duration: 400 })
    }
  }, [stops]) // eslint-disable-line

  // update route line
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const src = m.getSource('route') as mapboxgl.GeoJSONSource
    if (!src) return
    src.setData(route ? { type: 'Feature', properties: {}, geometry: route.geometry } : emptyLine())
  }, [route])

  // simulation overlay
  useEffect(() => {
    const m = map.current
    if (!m || !m.isStyleLoaded() || !route) return
    const src = m.getSource('completed') as mapboxgl.GeoJSONSource
    if (!src) return

    const coords = route.geometry.coordinates

    if (simStatus === 'idle' && simProgress === 0) {
      src.setData(emptyLine())
      vehicle.current?.remove(); vehicle.current = null
      popup.current?.remove(); popup.current = null
      return
    }

    // completed portion
    src.setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: sliceLine(coords, simProgress) },
    })

    // vehicle marker
    const pos = pointAlong(coords, simProgress)
    if (!vehicle.current) {
      const el = document.createElement('div')
      el.innerHTML = `<div style="width:30px;height:30px;background:#e67e22;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(230,126,34,.5),0 3px 8px rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.25)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
      </div>`
      vehicle.current = new mapboxgl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' })
        .setLngLat([pos.lng, pos.lat]).setRotation(pos.bearing).addTo(m)
    } else {
      vehicle.current.setLngLat([pos.lng, pos.lat]).setRotation(pos.bearing)
    }

    // en-route popup
    if (simStatus === 'playing') {
      if (!popup.current) {
        popup.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: [0, -22], className: 'sim-popup' })
      }
      popup.current.setLngLat([pos.lng, pos.lat])
        .setHTML(`<div style="background:#1a2332;color:#ccc;padding:6px 10px;border-radius:6px;font:11px 'DM Sans',sans-serif;border:1px solid #2a3444">
          <span style="color:#e67e22;font-weight:600">En Route</span>
          <span style="margin-left:6px;color:#888">${Math.round(simProgress * 100)}%</span></div>`)
        .addTo(m)
    } else {
      popup.current?.remove(); popup.current = null
    }
  }, [simProgress, simStatus, route])

  return <div ref={container} className="w-full h-full" />
}

const emptyLine = (): GeoJSON.Feature => ({
  type: 'Feature', properties: {},
  geometry: { type: 'LineString', coordinates: [] },
})
