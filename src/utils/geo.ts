// distance between two coord points in meters
function segDist(a: number[], b: number[]): number {
  const R = 6371000
  const rad = (d: number) => d * Math.PI / 180
  const dLat = rad(b[1] - a[1])
  const dLon = rad(b[0] - a[0])
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function lineLength(coords: number[][]): number {
  let len = 0
  for (let i = 1; i < coords.length; i++) len += segDist(coords[i - 1], coords[i])
  return len
}

export function pointAlong(coords: number[][], fraction: number) {
  if (!coords.length) return { lng: 0, lat: 0, bearing: 0 }
  if (fraction <= 0) {
    const b = coords.length > 1 ? getBearing(coords[0], coords[1]) : 0
    return { lng: coords[0][0], lat: coords[0][1], bearing: b }
  }
  if (fraction >= 1) {
    const last = coords[coords.length - 1]
    const prev = coords[coords.length - 2] || last
    return { lng: last[0], lat: last[1], bearing: getBearing(prev, last) }
  }

  const total = lineLength(coords)
  const target = total * fraction
  let acc = 0

  for (let i = 1; i < coords.length; i++) {
    const seg = segDist(coords[i - 1], coords[i])
    if (acc + seg >= target) {
      const t = (target - acc) / seg
      return {
        lng: coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        lat: coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
        bearing: getBearing(coords[i - 1], coords[i]),
      }
    }
    acc += seg
  }
  const last = coords[coords.length - 1]
  return { lng: last[0], lat: last[1], bearing: 0 }
}

export function sliceLine(coords: number[][], fraction: number): number[][] {
  if (fraction <= 0) return [coords[0]]
  if (fraction >= 1) return coords

  const total = lineLength(coords)
  const target = total * fraction
  let acc = 0
  const result = [coords[0]]

  for (let i = 1; i < coords.length; i++) {
    const seg = segDist(coords[i - 1], coords[i])
    if (acc + seg >= target) {
      const t = (target - acc) / seg
      result.push([
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ])
      return result
    }
    result.push(coords[i])
    acc += seg
  }
  return result
}

function getBearing(a: number[], b: number[]): number {
  const rad = (d: number) => d * Math.PI / 180
  const dLng = rad(b[0] - a[0])
  const lat1 = rad(a[1]), lat2 = rad(b[1])
  const x = Math.sin(dLng) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360
}
