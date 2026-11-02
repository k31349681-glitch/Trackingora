import { clamp, geodesic, interpolateGreatCircle, pointAlong, routeKey } from "@/lib/geo"
import type { CachedRoute, Driver, Flight, GpsState, Hub, Shipment, Status } from "@/lib/types"

export function flightProgress(f: Flight, now: number) {
  const span = f.arriveAt - f.departAt
  if (span <= 0) return now >= f.arriveAt ? 1 : 0
  return clamp((now - f.departAt) / span, 0, 1)
}

export function flightAirborne(f: Flight, now: number) {
  return now >= f.departAt && now <= f.arriveAt
}

export function shipmentProgress(s: Shipment, now: number) {
  if (s.status === "delivered" || s.status === "arrived") return 1
  if (s.status === "booked" || s.status === "at-hub" || s.status === "exception") {
    return s.status === "exception" ? (s.frozenProgress ?? 0) : 0
  }
  if (!s.movingSince) return 0.2
  const end = Math.max(s.eta, s.movingSince + 1000)
  return clamp((now - s.movingSince) / (end - s.movingSince), 0, 1)
}

export function movementProgress(s: Shipment, flights: Flight[], now: number) {
  if (s.status === "in-flight" && s.flightId) {
    const f = flights.find((x) => x.id === s.flightId)
    if (f) return flightProgress(f, now)
  }
  if (s.status === "exception" && s.frozenProgress != null) return s.frozenProgress
  return shipmentProgress(s, now)
}

export function arrivalOf(s: Shipment, flights: Flight[]) {
  if (s.flightId && (s.status === "in-flight" || s.status === "booked")) {
    const f = flights.find((x) => x.id === s.flightId)
    if (f && s.status === "in-flight") return f.arriveAt
  }
  return s.eta
}

export function legCoords(
  s: Shipment,
  routes: Record<string, CachedRoute>,
  flights: Flight[],
  hubs: Hub[],
): [number, number][] {
  if (s.status === "in-flight" && s.flightId) {
    const f = flights.find((x) => x.id === s.flightId)
    const a = hubs.find((h) => h.id === f?.fromHubId)
    const b = hubs.find((h) => h.id === f?.toHubId)
    if (a && b) return geodesic(a, b)
  }
  if (s.service === "air" && s.status !== "out-for-delivery" && s.status !== "picked-up") {
    return geodesic(s.origin, s.destination)
  }
  const key = routeKey(s.origin, s.destination)
  return routes[key]?.coords ?? [
    [s.origin.lat, s.origin.lng],
    [s.destination.lat, s.destination.lng],
  ]
}

export function shipmentPoint(
  s: Shipment,
  now: number,
  routes: Record<string, CachedRoute>,
  flights: Flight[],
  hubs: Hub[],
) {
  if (s.status === "in-flight" && s.flightId) {
    const f = flights.find((x) => x.id === s.flightId)
    const a = hubs.find((h) => h.id === f?.fromHubId)
    const b = hubs.find((h) => h.id === f?.toHubId)
    if (f && a && b) return interpolateGreatCircle(a, b, flightProgress(f, now))
  }
  if (s.status === "delivered" || s.status === "arrived") {
    return { lat: s.destination.lat, lng: s.destination.lng, bearing: 0 }
  }
  if (
    s.status === "booked" ||
    s.status === "at-hub" ||
    (s.service === "air" && s.status === "picked-up")
  ) {
    return { lat: s.origin.lat, lng: s.origin.lng, bearing: 0 }
  }
  if (s.status === "exception" && s.frozenProgress == null) {
    return { lat: s.origin.lat, lng: s.origin.lng, bearing: 0 }
  }
  const t =
    s.status === "exception" && s.frozenProgress != null
      ? s.frozenProgress
      : shipmentProgress(s, now)
  return pointAlong(legCoords(s, routes, flights, hubs), t)
}

const MOVING: Status[] = ["picked-up", "out-for-delivery", "exception"]

export function activeJob(driver: Driver, shipments: Shipment[]) {
  const mine = shipments.filter(
    (s) => s.driverId === driver.id && s.status !== "delivered" && s.status !== "in-flight",
  )
  return (
    mine.find((s) => MOVING.includes(s.status)) ??
    mine.find((s) => s.status !== "booked") ??
    mine[0]
  )
}

export function driverPoint(
  driver: Driver,
  index: number,
  shipments: Shipment[],
  hubs: Hub[],
  now: number,
  routes: Record<string, CachedRoute>,
  flights: Flight[],
  gps: GpsState,
) {
  if (gps.on && gps.follow && gps.driverId === driver.id && gps.lat != null && gps.lng != null) {
    return {
      lat: gps.lat,
      lng: gps.lng,
      bearing: gps.heading ?? 0,
      live: true,
    }
  }
  const job = activeJob(driver, shipments)
  if (job && job.status !== "booked" && job.status !== "at-hub") {
    const p = shipmentPoint(job, now, routes, flights, hubs)
    return { ...p, live: false }
  }
  const hub = hubs.find((h) => h.id === driver.hubId) ?? hubs[0]
  if (!hub) return { lat: 6.5, lng: 3.35, bearing: 0, live: false }
  const angle = index * 1.35
  const r = 0.0035
  return {
    lat: hub.lat + Math.cos(angle) * r,
    lng: hub.lng + Math.sin(angle) * r * 1.15,
    bearing: 0,
    live: false,
  }
}

export function needsRoad(s: Shipment) {
  if (s.service === "air" && s.status !== "out-for-delivery") return false
  if (s.status === "in-flight") return false
  return true
}
