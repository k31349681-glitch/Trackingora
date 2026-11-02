import { createServerFn } from "@tanstack/react-start"
import type { Aircraft } from "@/lib/types"

type RoutePoint = { lat: number; lng: number }

function asPoints(input: unknown): RoutePoint[] {
  if (!input || typeof input !== "object" || !("points" in input)) {
    throw new Error("Route needs two points")
  }
  const points = (input as { points: unknown }).points
  if (!Array.isArray(points) || points.length < 2 || points.length > 6) {
    throw new Error("Route needs two points")
  }
  return points.map((p) => {
    if (!p || typeof p !== "object") throw new Error("Bad point")
    const lat = Number((p as { lat: unknown }).lat)
    const lng = Number((p as { lng: unknown }).lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Bad point")
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Bad point")
    return { lat, lng }
  })
}

export const getDrivingRoute = createServerFn({ method: "GET" })
  .validator(asPoints)
  .handler(async ({ data }) => {
    const path = data.map((p) => `${p.lng},${p.lat}`).join(";")
    const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error("Roads unavailable")
    const json = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] }; duration?: number; distance?: number }[]
    }
    const route = json.routes?.[0]
    const raw = route?.geometry?.coordinates
    if (!raw?.length) throw new Error("No road geometry")
    const coords = raw.map(([lng, lat]) => [lat, lng] as [number, number])
    return {
      coords,
      durationS: route?.duration ?? 0,
      distanceM: route?.distance ?? 0,
    }
  })

function asBbox(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Bad sky box")
  const box = input as Record<string, unknown>
  const lamin = Number(box.lamin)
  const lomin = Number(box.lomin)
  const lamax = Number(box.lamax)
  const lomax = Number(box.lomax)
  if (![lamin, lomin, lamax, lomax].every(Number.isFinite)) throw new Error("Bad sky box")
  if (lamax - lamin > 12 || lomax - lomin > 14) throw new Error("Zoom in for live ADS-B")
  return { lamin, lomin, lamax, lomax }
}

export const getSky = createServerFn({ method: "GET" })
  .validator(asBbox)
  .handler(async ({ data }) => {
    const q = `lamin=${data.lamin}&lomin=${data.lomin}&lamax=${data.lamax}&lomax=${data.lomax}`
    const res = await fetch(`https://opensky-network.org/api/states/all?${q}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return { aircraft: [] as Aircraft[], error: "Sky feed unavailable" }
    const json = (await res.json()) as { states?: unknown[][] | null }
    const aircraft: Aircraft[] = []
    for (const row of json.states ?? []) {
      if (!Array.isArray(row)) continue
      const lng = Number(row[5])
      const lat = Number(row[6])
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      if (row[8] === true) continue
      const callsign = String(row[1] ?? "").trim()
      aircraft.push({
        icao: String(row[0] ?? ""),
        callsign: callsign || String(row[0] ?? "—"),
        lat,
        lng,
        altM: Number.isFinite(Number(row[7])) ? Number(row[7]) : null,
        track: Number.isFinite(Number(row[10])) ? Number(row[10]) : 0,
        velocity: Number.isFinite(Number(row[9])) ? Number(row[9]) : null,
      })
      if (aircraft.length >= 60) break
    }
    return { aircraft, error: aircraft.length ? null : "No airborne traffic in view" }
  })
