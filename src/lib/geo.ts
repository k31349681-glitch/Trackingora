import type { LatLng } from "@/lib/types"

const R = 6371000

function rad(d: number) {
  return (d * Math.PI) / 180
}
function deg(r: number) {
  return (r * 180) / Math.PI
}

type Pair = { lat: number; lng: number } | [number, number]

function ll(p: Pair): [number, number] {
  return Array.isArray(p) ? p : [p.lat, p.lng]
}

export function haversine(a: Pair, b: Pair) {
  const [lat1, lng1] = ll(a)
  const [lat2, lng2] = ll(b)
  const φ1 = rad(lat1)
  const φ2 = rad(lat2)
  const Δφ = rad(lat2 - lat1)
  const Δλ = rad(lng2 - lng1)
  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function haversineKm(a: Pair, b: Pair) {
  return haversine(a, b) / 1000
}

export function bearing(a: Pair, b: Pair) {
  const [lat1, lng1] = ll(a)
  const [lat2, lng2] = ll(b)
  const φ1 = rad(lat1)
  const φ2 = rad(lat2)
  const Δλ = rad(lng2 - lng1)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export function interpolateGreatCircle(a: LatLng, b: LatLng, t: number) {
  const clamped = Math.min(1, Math.max(0, t))
  const φ1 = rad(a.lat)
  const λ1 = rad(a.lng)
  const φ2 = rad(b.lat)
  const λ2 = rad(b.lng)
  const Δφ = φ2 - φ1
  const Δλ = λ2 - λ1
  const d = 2 * Math.asin(
    Math.min(
      1,
      Math.sqrt(
        Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2,
      ),
    ),
  )
  if (d < 1e-8) return { lat: a.lat, lng: a.lng, bearing: 0 }
  const A = Math.sin((1 - clamped) * d) / Math.sin(d)
  const B = Math.sin(clamped * d) / Math.sin(d)
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)
  const φ = Math.atan2(z, Math.sqrt(x * x + y * y))
  const λ = Math.atan2(y, x)
  const ahead = interpolateRaw(a, b, Math.min(1, clamped + 0.01), d)
  const here = { lat: deg(φ), lng: deg(λ) }
  return { ...here, bearing: bearing(here, ahead) }
}

function interpolateRaw(a: LatLng, b: LatLng, t: number, d: number) {
  const φ1 = rad(a.lat)
  const λ1 = rad(a.lng)
  const φ2 = rad(b.lat)
  const λ2 = rad(b.lng)
  const A = Math.sin((1 - t) * d) / Math.sin(d)
  const B = Math.sin(t * d) / Math.sin(d)
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)
  return { lat: deg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: deg(Math.atan2(y, x)) }
}

export function geodesic(a: LatLng, b: LatLng, steps = 72): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = interpolateGreatCircle(a, b, i / steps)
    return [p.lat, p.lng] as [number, number]
  })
}

export function pointAlong(coords: [number, number][], t: number) {
  if (coords.length === 0) return { lat: 0, lng: 0, bearing: 0 }
  const clamped = Math.min(1, Math.max(0, t))
  if (coords.length === 1 || clamped === 0) {
    const nxt = coords[1] ?? coords[0]
    return { lat: coords[0][0], lng: coords[0][1], bearing: bearing(coords[0], nxt) }
  }
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i])
    seg.push(d)
    total += d
  }
  if (total < 1) {
    const last = coords[coords.length - 1]
    return { lat: last[0], lng: last[1], bearing: 0 }
  }
  let remain = clamped * total
  for (let i = 0; i < seg.length; i++) {
    const len = seg[i] ?? 0
    if (remain <= len || i === seg.length - 1) {
      const u = len === 0 ? 0 : Math.min(1, remain / len)
      const a = coords[i]!
      const b = coords[i + 1]!
      return {
        lat: a[0] + (b[0] - a[0]) * u,
        lng: a[1] + (b[1] - a[1]) * u,
        bearing: bearing(a, b),
      }
    }
    remain -= len
  }
  const last = coords[coords.length - 1]!
  return { lat: last[0], lng: last[1], bearing: 0 }
}

export function routeKey(a: LatLng, b: LatLng) {
  const r = (n: number) => n.toFixed(4)
  return `${r(a.lat)},${r(a.lng)}>${r(b.lat)},${r(b.lng)}`
}

export function samePoint(a: LatLng, b: LatLng) {
  return haversine(a, b) < 40
}

export function formatCoord(lat: number, lng: number) {
  const ns = lat >= 0 ? "N" : "S"
  const ew = lng >= 0 ? "E" : "W"
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lng).toFixed(4)}° ${ew}`
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
