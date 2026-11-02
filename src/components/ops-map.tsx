import { useEffect, useRef, useState } from "react"
import { flightAirborne, legCoords, shipmentPoint, driverPoint } from "@/lib/position"
import { getSky } from "@/lib/remote"
import { useOps } from "@/lib/store"
import { useNow } from "@/components/now"
import { LocateFixed } from "lucide-react"

type LeafletNS = typeof import("leaflet")

function leafletOf(mod: LeafletNS): LeafletNS {
  const maybe = mod as LeafletNS & { default?: LeafletNS }
  return typeof maybe.map === "function" ? maybe : (maybe.default ?? mod)
}

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const ARROW =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2 L19 20 L12 16 L5 20 Z"/></svg>'

export function OpsMap({ expanded }: { expanded: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const libRef = useRef<LeafletNS | null>(null)
  const groupRef = useRef<import("leaflet").LayerGroup | null>(null)
  const fitKey = useRef("")
  const camKey = useRef(0)
  const gpsKey = useRef<number | null>(null)
  const forceFit = useRef(false)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(11)
  const [nonce, setNonce] = useState(0)
  const now = useNow()

  const hubs = useOps((s) => s.hubs)
  const drivers = useOps((s) => s.drivers)
  const flights = useOps((s) => s.flights)
  const shipments = useOps((s) => s.shipments)
  const routes = useOps((s) => s.routes)
  const selectedId = useOps((s) => s.selectedId)
  const view = useOps((s) => s.view)
  const gps = useOps((s) => s.gps)
  const aircraft = useOps((s) => s.aircraft)
  const skyOn = useOps((s) => s.skyOn)
  const pendingDrop = useOps((s) => s.pendingDrop)
  const camera = useOps((s) => s.camera)
  const select = useOps((s) => s.select)

  useEffect(() => {
    let dead = false
    let map: import("leaflet").Map | null = null
    ;(async () => {
      const lib = leafletOf(await import("leaflet"))
      if (dead || !el.current) return
      map = lib.map(el.current, { zoomControl: true, attributionControl: true }).setView([6.52, 3.39], 11)
      lib
        .tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        })
        .addTo(map)
      map.zoomControl.setPosition("topright")
      const group = lib.layerGroup().addTo(map)
      map.on("click", (event) => {
        const st = useOps.getState()
        if (!st.pinMode) return
        st.setDrop({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
          label: "Pinned drop",
        })
      })
      map.on("zoomend", () => setZoom(map!.getZoom()))
      libRef.current = lib
      mapRef.current = map
      groupRef.current = group
      setReady(true)
      requestAnimationFrame(() => map?.invalidateSize())
    })()
    return () => {
      dead = true
      map?.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const id = window.setTimeout(() => map.invalidateSize(), 60)
    return () => window.clearTimeout(id)
  }, [expanded, ready])

  useEffect(() => {
    const map = mapRef.current
    const L = libRef.current
    const group = groupRef.current
    if (!ready || !map || !L || !group) return

    const primary = token("--color-primary") || "#d6f25c"
    const muted = token("--color-muted") || "#93a199"
    const danger = token("--color-danger") || "#ff6a45"
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    group.clearLayers()

    const selected = shipments.find((s) => s.id === selectedId) ?? null
    const showCity = zoom >= 9

    for (const hub of hubs) {
      if (hub.kind !== "airport" && !showCity && selected?.originHubId !== hub.id && selected?.destHubId !== hub.id) {
        continue
      }
      const icon = L.divIcon({
        className: "m-pin",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        html: `<div class="pin-wrap"><div class="pin-hub${hub.kind === "airport" ? " is-air" : ""}">${hub.code}</div></div>`,
      })
      const marker = L.marker([hub.lat, hub.lng], { icon, zIndexOffset: 100 })
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event)
        useOps.getState().focusHub(hub.id)
      })
      marker.addTo(group)
    }

    for (const shipment of shipments) {
      const active =
        shipment.status !== "delivered" &&
        shipment.status !== "booked" &&
        shipment.id !== selectedId
      const show =
        shipment.id === selectedId ||
        (view === "desk" && active) ||
        (view === "drive" && shipment.driverId === gps.driverId && active)
      if (!show) continue
      if (shipment.status === "booked" && shipment.id !== selectedId) continue
      const coords = legCoords(shipment, routes, flights, hubs)
      if (coords.length < 2) continue
      const emphasis = shipment.id === selectedId
      const line = L.polyline(coords, {
        color: shipment.status === "exception" ? danger : emphasis ? primary : muted,
        weight: emphasis ? 4 : 2,
        opacity: emphasis ? 0.95 : 0.45,
        dashArray: shipment.service === "air" && shipment.status === "in-flight" ? "6 8" : undefined,
      })
      line.addTo(group)
      if (emphasis) {
        const dest = L.divIcon({
          className: "m-pin",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `<div class="pin-wrap"><div class="pin-drop"></div></div>`,
        })
        L.marker([shipment.destination.lat, shipment.destination.lng], { icon: dest, zIndexOffset: 200 }).addTo(
          group,
        )
      }
    }

    drivers.forEach((driver, index) => {
      const point = driverPoint(driver, index, shipments, hubs, now, routes, flights, gps)
      const job = shipments.find((s) => s.driverId === driver.id && s.status !== "delivered")
      const hold = job?.status === "exception"
      const selectedDriver = selected?.driverId === driver.id || (view === "drive" && gps.driverId === driver.id)
      const icon = L.divIcon({
        className: "m-pin",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        html: `<div class="pin-wrap"><div class="pin-face${point.live ? " is-live" : ""}${selectedDriver ? " is-selected" : ""}${hold ? " is-hold" : ""}"><div class="pin-rot" style="--bearing:${Math.round(point.bearing)}deg">${ARROW}</div></div></div>`,
      })
      const marker = L.marker([point.lat, point.lng], { icon, zIndexOffset: point.live ? 800 : 400 })
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event)
        const next = shipments.find((s) => s.driverId === driver.id && s.status !== "delivered")
        if (next) select(next.id)
      })
      marker.addTo(group)
    })

    if (gps.on && gps.lat != null && gps.lng != null && !gps.follow) {
      const you = L.circleMarker([gps.lat, gps.lng], {
        radius: 8,
        color: primary,
        weight: 2,
        fillColor: primary,
        fillOpacity: 0.9,
      })
      you.addTo(group)
      if (gps.accuracy != null && gps.accuracy < 1500) {
        L.circle([gps.lat, gps.lng], {
          radius: gps.accuracy,
          color: primary,
          weight: 1,
          fillColor: primary,
          fillOpacity: 0.08,
        }).addTo(group)
      }
    }

    for (const flight of flights) {
      if (!flightAirborne(flight, now)) continue
      const from = hubs.find((h) => h.id === flight.fromHubId)
      const to = hubs.find((h) => h.id === flight.toHubId)
      if (!from || !to) continue
      const linked = shipments.find((s) => s.flightId === flight.id && s.status === "in-flight")
      if (!linked) continue
      const point = shipmentPoint(linked, now, routes, flights, hubs)
      const icon = L.divIcon({
        className: "m-pin",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        html: `<div class="pin-wrap"><div class="pin-face is-plane${linked.id === selectedId ? " is-selected" : ""}"><div class="pin-rot" style="--bearing:${Math.round(point.bearing)}deg">${ARROW}</div></div></div>`,
      })
      const marker = L.marker([point.lat, point.lng], { icon, zIndexOffset: 700 })
      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event)
        select(linked.id)
      })
      marker.addTo(group)
    }

    if (skyOn) {
      for (const craft of aircraft) {
        const icon = L.divIcon({
          className: "m-pin",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `<div class="pin-wrap" title="${craft.callsign}"><div class="pin-sky" style="--bearing:${Math.round(craft.track)}deg"></div></div>`,
        })
        L.marker([craft.lat, craft.lng], { icon, interactive: false, zIndexOffset: 50 }).addTo(group)
      }
    }

    if (pendingDrop) {
      const icon = L.divIcon({
        className: "m-pin",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        html: `<div class="pin-wrap"><div class="pin-drop"></div></div>`,
      })
      L.marker([pendingDrop.lat, pendingDrop.lng], { icon, zIndexOffset: 900 }).addTo(group)
    }

    const fitId = `${selectedId ?? "none"}:${forceFit.current ? nonce : ""}`
    if (selected && (fitKey.current !== fitId || forceFit.current)) {
      fitKey.current = fitId
      forceFit.current = false
      const coords = legCoords(selected, routes, flights, hubs)
      const bounds = L.latLngBounds(coords)
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [36, 36],
          maxZoom: selected.status === "in-flight" ? 5 : 14,
          animate: !reduce,
        })
      }
    }

    if (camera && camera.token !== camKey.current) {
      camKey.current = camera.token
      map.flyTo([camera.lat, camera.lng], camera.zoom, { duration: reduce ? 0 : 0.7 })
    }

    if (gps.on && gps.startedAt && gps.lat != null && gps.lng != null && gpsKey.current !== gps.startedAt) {
      gpsKey.current = gps.startedAt
      map.flyTo([gps.lat, gps.lng], Math.max(map.getZoom(), 14), { duration: reduce ? 0 : 0.7 })
    }
  }, [
    ready,
    now,
    hubs,
    drivers,
    flights,
    shipments,
    routes,
    selectedId,
    view,
    gps,
    aircraft,
    skyOn,
    pendingDrop,
    camera,
    zoom,
    nonce,
    select,
  ])

  useEffect(() => {
    if (!ready || !skyOn) return
    const map = mapRef.current
    if (!map) return
    let dead = false
    async function pull() {
      const current = mapRef.current
      if (!current) return
      const bounds = current.getBounds()
      const box = {
        lamin: bounds.getSouth(),
        lamax: bounds.getNorth(),
        lomin: bounds.getWest(),
        lomax: bounds.getEast(),
      }
      if (box.lamax - box.lamin > 12 || box.lomax - box.lomin > 14) {
        if (!dead) useOps.getState().setSkyResult([], "Zoom in for live ADS-B")
        return
      }
      try {
        const res = await getSky({ data: box })
        if (!dead) useOps.getState().setSkyResult(res.aircraft, res.error)
      } catch (err) {
        if (!dead) {
          useOps.getState().setSkyResult([], err instanceof Error ? err.message : "Sky feed unavailable")
        }
      }
    }
    void pull()
    const id = window.setInterval(pull, 30000)
    return () => {
      dead = true
      window.clearInterval(id)
    }
  }, [ready, skyOn, zoom])

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={el} className="absolute inset-0 z-0" />
      <button
        type="button"
        onClick={() => {
          forceFit.current = true
          fitKey.current = ""
          setNonce((n) => n + 1)
        }}
        className="absolute bottom-3 left-3 z-10 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm text-fg"
      >
        <LocateFixed className="size-4" aria-hidden="true" />
        Recenter
      </button>
    </div>
  )
}
