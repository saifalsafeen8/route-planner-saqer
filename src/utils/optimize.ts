import { Stop } from '../types'

// haversine distance in km
function hav(a: Stop, b: Stop): number {
  const R = 6371
  const rad = (d: number) => d * Math.PI / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

// build NxN distance matrix
function buildMatrix(stops: Stop[]): number[][] {
  const n = stops.length
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const d = hav(stops[i], stops[j])
      m[i][j] = d
      m[j][i] = d
    }
  return m
}

function routeLength(order: number[], m: number[][]): number {
  let d = 0
  for (let i = 1; i < order.length; i++) d += m[order[i - 1]][order[i]]
  return d
}

// nearest neighbor heuristic - start from stop 0
function nearestNeighbor(m: number[][]): number[] {
  const n = m.length
  const visited = new Set([0])
  const order = [0]
  let cur = 0

  while (visited.size < n) {
    let next = -1, best = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && m[cur][j] < best) {
        best = m[cur][j]
        next = j
      }
    }
    if (next < 0) break
    order.push(next)
    visited.add(next)
    cur = next
  }
  return order
}

// 2-opt local search improvement
function twoOpt(order: number[], m: number[][]): number[] {
  const arr = [...order]
  let improved = true

  while (improved) {
    improved = false
    for (let i = 1; i < arr.length - 1; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const jn = j + 1 < arr.length ? j + 1 : j
        const before = m[arr[i - 1]][arr[i]] + m[arr[j]][arr[jn]]
        const after = m[arr[i - 1]][arr[j]] + m[arr[i]][arr[jn]]
        if (after < before - 0.001) {
          // reverse segment i..j
          const rev = arr.slice(i, j + 1).reverse()
          arr.splice(i, j - i + 1, ...rev)
          improved = true
        }
      }
    }
  }
  return arr
}

export function optimizeRoute(stops: Stop[], apiMatrix?: number[][] | null) {
  const t0 = performance.now()
  const m = apiMatrix || buildMatrix(stops)
  const original = stops.map((_, i) => i)
  const origDist = routeLength(original, m)

  // step 1: nearest neighbor
  const nn = nearestNeighbor(m)
  // step 2: improve with 2-opt
  const opt = twoOpt(nn, m)

  const optDist = routeLength(opt, m)
  const ms = performance.now() - t0

  return {
    order: opt,
    optimizedStops: opt.map(i => stops[i]),
    origDist,
    optDist,
    improvement: origDist > 0 ? ((origDist - optDist) / origDist) * 100 : 0,
    ms,
  }
}

export function getTotalDistance(stops: Stop[]): number {
  let d = 0
  for (let i = 1; i < stops.length; i++) d += hav(stops[i - 1], stops[i])
  return d
}
