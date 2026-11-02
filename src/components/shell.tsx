import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ChevronDown, ChevronUp } from "lucide-react"
import { routeKey, samePoint } from "@/lib/geo"
import { clock, etaLabel, STATUS_LABEL } from "@/lib/format"
import { arrivalOf, needsRoad } from "@/lib/position"
import { getDrivingRoute } from "@/lib/remote"
import { createSeed, emptyGps } from "@/lib/seed"
import { useOps } from "@/lib/store"
import type { ViewName } from "@/lib/types"
import { DeskPanel } from "@/components/desk-panel"
import { DrivePanel } from "@/components/drive-panel"
import { NowProvider, useNow } from "@/components/now"
import { OpsMap } from "@/components/ops-map"
import { TrackPanel } from "@/components/track-panel"
import { cn } from "@/lib/cn"

type Search = { view?: ViewName; track?: string }

export function Shell({ search }: { search: Search }) {
  useEffect(() => {
    let dead = false
    void Promise.resolve(useOps.persist.rehydrate()).finally(() => {
      if (dead) return
      const state = useOps.getState()
      const now = Date.now()
      if (!state.anchoredAt || state.anchoredAt < 1_700_000_000_000) {
        const fresh = createSeed(now)
        useOps.setState({
          ...fresh,
          routes: {},
          gps: emptyGps(),
          aircraft: [],
          skyNote: null,
          pinMode: false,
          pendingDrop: null,
          camera: null,
          skyOn: true,
          hydrated: true,
        })
        return
      }
      if (now - state.anchoredAt > 20_000) state.rebase(now - state.anchoredAt)
      useOps.setState({ hydrated: true })
    })
    return () => {
      dead = true
    }
  }, [])

  return (
    <NowProvider>
      <App search={search} />
    </NowProvider>
  )
}

function App({ search }: { search: Search }) {
  const navigate = useNavigate({ from: "/" })
  const view = useOps((s) => s.view)
  const setView = useOps((s) => s.setView)
  const selectedId = useOps((s) => s.selectedId)
  const shipments = useOps((s) => s.shipments)
  const flights = useOps((s) => s.flights)
  const skyOn = useOps((s) => s.skyOn)
  const setSky = useOps((s) => s.setSky)
  const pinMode = useOps((s) => s.pinMode)
  const gpsOn = useOps((s) => s.gps.on)
  const [expanded, setExpanded] = useState(true)
  const now = useNow()
  const code = shipments.find((s) => s.id === selectedId)?.code
  const armed = useRef(false)

  useEffect(() => {
    const state = useOps.getState()
    if (search.view) state.setView(search.view)
    if (search.track) {
      const found = state.shipments.find((s) => s.code.toLowerCase() === search.track!.toLowerCase())
      if (found) state.select(found.id)
    }
    const id = window.setTimeout(() => {
      armed.current = true
    }, 0)
    return () => window.clearTimeout(id)
    // Apply the incoming link once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!armed.current) return
    if (search.view === view && search.track === code) return
    void navigate({ search: { view, track: code }, replace: true })
  }, [view, code, navigate, search.view, search.track])

  const selected = shipments.find((s) => s.id === selectedId)

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg lg:flex-row">
      <RouteLoader />
      <GpsEngine />
      <section className="relative min-h-0 flex-1 lg:order-2">
        <OpsMap expanded={expanded} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 pr-16">
          <button
            type="button"
            onClick={() => setSky(!skyOn)}
            className={cn(
              "pointer-events-auto h-11 rounded-full border border-border px-3 text-sm",
              skyOn ? "bg-primary text-primary-fg" : "bg-surface text-fg",
            )}
          >
            {skyOn ? "Sky on" : "Sky off"}
          </button>
          {gpsOn ? (
            <span className="pointer-events-none rounded-full bg-primary px-3 py-2 font-mono text-xs text-primary-fg">
              GPS
            </span>
          ) : null}
        </div>
        {pinMode ? (
          <p className="absolute top-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-2 text-sm text-primary-fg">
            Tap the map to set the drop
          </p>
        ) : null}
      </section>

      <section className={cn("sheet lg:order-1", !expanded && "is-peek")}>
        <header className="flex items-center justify-between gap-3 px-4 pt-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">T</span>
              <h1 className="text-lg font-semibold tracking-[0.18em]">TRACKORA</h1>
            </div>
            <p className="mt-1 text-[11px] text-muted">Everything moves. Track everything.</p>
            <p className="font-mono text-[10px] text-muted tabular-nums">{clock(now)} · GLOBAL CONTROL</p>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border lg:hidden"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Show more map" : "Show shipment details"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </header>

        {expanded ? (
          <>
            <div className="grid grid-cols-3 gap-1 px-4 pt-3">
              {(
                [
                  ["track", "Track"],
                  ["desk", "Desk"],
                  ["drive", "Drive"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => {
                    setView(id)
                    if (id !== "drive") return
                    const state = useOps.getState()
                    const job = state.shipments.find(
                      (s) =>
                        s.driverId === state.gps.driverId &&
                        s.status !== "delivered" &&
                        s.status !== "in-flight",
                    )
                    if (job) state.select(job.id)
                  }}
                  className={cn(
                    "h-11 rounded-full text-sm font-medium",
                    view === id ? "bg-primary text-primary-fg" : "text-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
              {view === "track" ? <TrackPanel /> : null}
              {view === "desk" ? <DeskPanel /> : null}
              {view === "drive" ? <DrivePanel /> : null}
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setExpanded(true)} className="px-4 py-3 text-left">
            {selected ? (
              <>
                <span className="font-mono text-sm">{selected.code}</span>
                <span className="mt-1 block text-sm text-muted">
                  {STATUS_LABEL[selected.status]} · {etaLabel(selected.status, arrivalOf(selected, flights), now)}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted">Open the board</span>
            )}
          </button>
        )}
      </section>
    </div>
  )
}

function RouteLoader() {
  const missing = useOps((s) => {
    const keys: string[] = []
    for (const shipment of s.shipments) {
      if (!needsRoad(shipment)) continue
      if (samePoint(shipment.origin, shipment.destination)) continue
      const key = routeKey(shipment.origin, shipment.destination)
      if (!s.routes[key] && !keys.includes(key)) keys.push(key)
    }
    return keys.join("|")
  })
  const tried = useRef(new Set<string>())

  useEffect(() => {
    if (!missing) return
    let cancel = false
    ;(async () => {
      for (const key of missing.split("|")) {
        if (cancel || tried.current.has(key)) continue
        tried.current.add(key)
        const [a, b] = key.split(">")
        if (!a || !b) continue
        const [alat, alng] = a.split(",").map(Number)
        const [blat, blng] = b.split(",").map(Number)
        if (![alat, alng, blat, blng].every((n) => Number.isFinite(n))) continue
        try {
          const route = await getDrivingRoute({
            data: {
              points: [
                { lat: alat!, lng: alng! },
                { lat: blat!, lng: blng! },
              ],
            },
          })
          if (!cancel) useOps.getState().rememberRoute(key, route)
        } catch {
          /* straight segment until a later visit */
        }
      }
    })()
    return () => {
      cancel = true
    }
  }, [missing])

  return null
}

function GpsEngine() {
  const on = useOps((s) => s.gps.on)
  useEffect(() => {
    if (!on) return
    if (!navigator.geolocation) {
      useOps.getState().setGpsError("This device has no GPS")
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => useOps.getState().setGpsFix(pos),
      (err) => useOps.getState().setGpsError(err.message || "GPS blocked"),
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 12000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [on])
  return null
}
