export type LatLng = { lat: number; lng: number }

export type Point = LatLng & { label: string }

export type HubKind = "warehouse" | "sort" | "airport"

export type Hub = {
  id: string
  name: string
  code: string
  kind: HubKind
  city: string
  lat: number
  lng: number
}

export type Vehicle = "bike" | "van" | "truck"

export type Driver = {
  id: string
  name: string
  callsign: string
  vehicle: Vehicle
  hubId: string
}

export type Flight = {
  id: string
  number: string
  aircraft: string
  fromHubId: string
  toHubId: string
  departAt: number
  arriveAt: number
}

export type Status =
  | "booked"
  | "picked-up"
  | "at-hub"
  | "in-flight"
  | "arrived"
  | "out-for-delivery"
  | "delivered"
  | "exception"

export type Service = "ground" | "air"

export type Scan = {
  id: string
  at: number
  title: string
  place: string
}

export type Shipment = {
  id: string
  code: string
  consignee: string
  pieces: number
  weightKg: number
  service: Service
  status: Status
  origin: Point
  destination: Point
  /** Final door, used when an air leg lands and goes out for delivery. */
  door?: Point
  originHubId: string
  destHubId: string
  driverId?: string
  flightId?: string
  eta: number
  movingSince?: number
  frozenProgress?: number
  scans: Scan[]
}

export type CachedRoute = {
  coords: [number, number][]
  durationS: number
  distanceM: number
}

export type Aircraft = {
  icao: string
  callsign: string
  lat: number
  lng: number
  altM: number | null
  track: number
  velocity: number | null
}

export type ViewName = "track" | "desk" | "drive"

export type GpsState = {
  on: boolean
  follow: boolean
  driverId: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  heading: number | null
  error: string | null
  startedAt: number | null
}

export type Camera = {
  lat: number
  lng: number
  zoom: number
  token: number
}
