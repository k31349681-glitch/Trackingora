import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { BOOT_AT } from "@/lib/clock"
import { haversineKm, routeKey } from "@/lib/geo"
import { shipmentProgress } from "@/lib/position"
import { createSeed, emptyGps } from "@/lib/seed"
import type {
  Aircraft,
  CachedRoute,
  Camera,
  Flight,
  GpsState,
  Point,
  Service,
  Shipment,
  Status,
  ViewName,
} from "@/lib/types"

const GROUND: Status[] = ["booked", "picked-up", "at-hub", "out-for-delivery", "delivered"]
const AIR: Status[] = ["booked", "picked-up", "at-hub", "in-flight", "arrived", "out-for-delivery", "delivered"]

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function trackingCode(existing: string[]) {
  let code = "TRK-2026-001"
  do {
    code = `TRK-2026-${String(100 + Math.floor(Math.random() * 900)).padStart(3, "0")}`
  } while (existing.includes(code))
  return code
}

export type NewShipment = {
  consignee: string
  pieces: number
  weightKg: number
  service: Service
  origin: Point
  destination: Point
  originHubId: string
  destHubId: string
  driverId?: string
}

type Ops = {
  hydrated: boolean
  view: ViewName
  selectedId: string | null
  skyOn: boolean
  aircraft: Aircraft[]
  skyNote: string | null
  pinMode: boolean
  pendingDrop: Point | null
  gps: GpsState
  camera: Camera | null
  anchoredAt: number
  hubs: ReturnType<typeof createSeed>["hubs"]
  drivers: ReturnType<typeof createSeed>["drivers"]
  flights: Flight[]
  shipments: Shipment[]
  routes: Record<string, CachedRoute>
  setView: (view: ViewName) => void
  select: (id: string | null) => void
  setSky: (on: boolean) => void
  setSkyResult: (aircraft: Aircraft[], note: string | null) => void
  setPinMode: (on: boolean) => void
  setDrop: (point: Point | null) => void
  focusHub: (id: string) => void
  startGps: () => void
  stopGps: () => void
  setFollow: (follow: boolean) => void
  setGpsDriver: (id: string) => void
  setGpsFix: (pos: GeolocationPosition) => void
  setGpsError: (error: string) => void
  rememberRoute: (key: string, route: CachedRoute) => void
  advance: (id: string) => void
  flagException: (id: string, title: string) => void
  assignDriver: (id: string, driverId: string | undefined) => void
  createShipment: (input: NewShipment) => string
  reset: () => void
  rebase: (delta: number) => void
}

const seed = createSeed(BOOT_AT)

export const useOps = create<Ops>()(
  persist(
    (set, get) => ({
      hydrated: false,
      view: seed.view,
      selectedId: seed.selectedId,
      skyOn: true,
      aircraft: [],
      skyNote: null,
      pinMode: false,
      pendingDrop: null,
      gps: emptyGps(),
      camera: null,
      hubs: seed.hubs,
      drivers: seed.drivers,
      flights: seed.flights,
      shipments: seed.shipments,
      routes: {},
      anchoredAt: seed.anchoredAt,
      setView: (view) => set({ view }),
      select: (id) => set({ selectedId: id, pinMode: false }),
      setSky: (skyOn) => set({ skyOn, skyNote: skyOn ? null : "Sky hidden" }),
      setSkyResult: (aircraft, skyNote) => set({ aircraft, skyNote }),
      setPinMode: (pinMode) => set({ pinMode }),
      setDrop: (pendingDrop) => set({ pendingDrop, pinMode: false }),
      focusHub: (id) => {
        const hub = get().hubs.find((h) => h.id === id)
        if (!hub) return
        set({
          camera: {
            lat: hub.lat,
            lng: hub.lng,
            zoom: hub.kind === "airport" ? 12 : 14,
            token: Date.now(),
          },
        })
      },
      startGps: () =>
        set((s) => ({
          gps: { ...s.gps, on: true, error: null, startedAt: Date.now(), lat: null, lng: null },
        })),
      stopGps: () => set((s) => ({ gps: { ...emptyGps(s.gps.driverId), follow: false } })),
      setFollow: (follow) => set((s) => ({ gps: { ...s.gps, follow } })),
      setGpsDriver: (driverId) => set((s) => ({ gps: { ...s.gps, driverId } })),
      setGpsFix: (pos) =>
        set((s) => ({
          gps: {
            ...s.gps,
            on: true,
            error: null,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : s.gps.heading,
          },
        })),
      setGpsError: (error) => set((s) => ({ gps: { ...s.gps, on: false, error } })),
      rememberRoute: (key, route) => set((s) => ({ routes: { ...s.routes, [key]: route } })),
      advance: (id) => {
        const now = Date.now()
        const state = get()
        set({
          flights: state.flights.map((f) => f),
          shipments: state.shipments.map((s) => {
            if (s.id !== id) return s
            if (s.status === "exception") {
              return {
                ...s,
                status: "out-for-delivery" as const,
                frozenProgress: undefined,
                movingSince: now,
                eta: now + 20 * 60 * 1000,
                scans: [{ id: uid(), at: now, title: "Hold released", place: s.destination.label }, ...s.scans],
              }
            }
            const flow = s.service === "air" ? AIR : GROUND
            const idx = Math.max(0, flow.indexOf(s.status))
            const next = flow[Math.min(flow.length - 1, idx + 1)] ?? s.status
            if (next === s.status) return s
            let origin = s.origin
            let destination = s.destination
            if (next === "out-for-delivery" && s.door && (s.status === "arrived" || s.status === "at-hub")) {
              origin = s.destination
              destination = s.door
            }
            const moving =
              next === "out-for-delivery" ||
              (next === "picked-up" && s.service === "ground") ||
              next === "in-flight"
            let eta = s.eta
            if (next === "picked-up") eta = now + 25 * 60 * 1000
            if (next === "at-hub" || next === "arrived" || next === "delivered") eta = now
            if (next === "out-for-delivery") {
              const cached = state.routes[routeKey(origin, destination)]
              const secs = cached && cached.durationS > 60 ? cached.durationS : 20 * 60
              eta = now + secs * 1000
            }
            if (next === "in-flight") {
              const hours = Math.max(0.45, haversineKm(origin, destination) / 780)
              eta = now + hours * 3600 * 1000
            }
            const titles: Partial<Record<Status, string>> = {
              "picked-up": "Picked up",
              "at-hub": s.service === "air" ? "Tendered to ramp" : "At hub",
              "in-flight": "Departed",
              arrived: "Landed",
              "out-for-delivery": "Out for delivery",
              delivered: "Delivered",
            }
            return {
              ...s,
              origin,
              destination,
              status: next,
              eta,
              movingSince: moving ? now : undefined,
              frozenProgress: undefined,
              scans: [
                {
                  id: uid(),
                  at: now,
                  title: titles[next] ?? "Updated",
                  place: moving ? origin.label : destination.label,
                },
                ...s.scans,
              ],
            }
          }),
        })
        const updated = get().shipments.find((s) => s.id === id)
        if (updated?.status === "in-flight" && updated.flightId) {
          const hours = Math.max(0.45, haversineKm(updated.origin, updated.destination) / 780)
          set({
            flights: get().flights.map((f) =>
              f.id === updated.flightId
                ? { ...f, departAt: now, arriveAt: now + hours * 3600 * 1000 }
                : f,
            ),
          })
        }
      },
      flagException: (id, title) => {
        const now = Date.now()
        set({
          shipments: get().shipments.map((s) => {
            if (s.id !== id || s.status === "delivered") return s
            return {
              ...s,
              status: "exception" as const,
              frozenProgress: shipmentProgress(s, now),
              scans: [{ id: uid(), at: now, title, place: s.destination.label }, ...s.scans],
            }
          }),
        })
      },
      assignDriver: (id, driverId) =>
        set({
          shipments: get().shipments.map((s) => (s.id === id ? { ...s, driverId } : s)),
        }),
      createShipment: (input) => {
        const now = Date.now()
        const state = get()
        const code = trackingCode(state.shipments.map((s) => s.code))
        const id = uid()
        let flightId: string | undefined
        let flights = state.flights
        let eta = now + 2 * 3600 * 1000
        if (input.service === "air") {
          flightId = uid()
          const hours = Math.max(0.75, haversineKm(input.origin, input.destination) / 780)
          const departAt = now + 40 * 60 * 1000
          const arriveAt = departAt + hours * 3600 * 1000
          eta = arriveAt
          const number = `MN ${100 + Math.floor(Math.random() * 800)}`
          flights = [
            ...flights,
            {
              id: flightId,
              number,
              aircraft: haversineKm(input.origin, input.destination) > 2500 ? "B738" : "E190",
              fromHubId: input.originHubId,
              toHubId: input.destHubId,
              departAt,
              arriveAt,
            },
          ]
        }
        const shipment: Shipment = {
          id,
          code,
          consignee: input.consignee.trim(),
          pieces: input.pieces,
          weightKg: input.weightKg,
          service: input.service,
          status: "booked",
          origin: input.origin,
          destination: input.destination,
          originHubId: input.originHubId,
          destHubId: input.destHubId,
          driverId: input.driverId,
          flightId,
          eta,
          scans: [{ id: uid(), at: now, title: "Booked", place: input.origin.label }],
        }
        set({ shipments: [shipment, ...state.shipments], flights, selectedId: id, view: "desk" })
        return code
      },
      reset: () => {
        const fresh = createSeed(Date.now())
        set({
          ...fresh,
          routes: {},
          gps: emptyGps(),
          aircraft: [],
          skyNote: null,
          pinMode: false,
          pendingDrop: null,
          camera: null,
          skyOn: true,
        })
      },
      rebase: (delta: number) => {
        const now = Date.now()
        set((s) => ({
          anchoredAt: now,
          flights: s.flights.map((f) => ({
            ...f,
            departAt: f.departAt + delta,
            arriveAt: f.arriveAt + delta,
          })),
          shipments: s.shipments.map((sh) => ({
            ...sh,
            eta: sh.eta + delta,
            movingSince: sh.movingSince == null ? undefined : sh.movingSince + delta,
            scans: sh.scans.map((c) => ({ ...c, at: c.at + delta })),
          })),
        }))
      },
    }),
    {
      name: "trackora-ops-v2",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        view: s.view,
        selectedId: s.selectedId,
        skyOn: s.skyOn,
        pendingDrop: s.pendingDrop,
        hubs: s.hubs,
        drivers: s.drivers,
        flights: s.flights,
        shipments: s.shipments,
        routes: s.routes,
        anchoredAt: s.anchoredAt,
      }),
    },
  ),
)
