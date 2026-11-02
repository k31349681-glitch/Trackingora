import { useState } from "react"
import { RANK, STATUS_LABEL, etaLabel } from "@/lib/format"
import { arrivalOf } from "@/lib/position"
import { useOps } from "@/lib/store"
import type { Service } from "@/lib/types"
import { useNow } from "@/components/now"
import { ShipmentDetail } from "@/components/shipment-detail"
import { Button } from "@/components/ui"
import { cn } from "@/lib/cn"
import { formatCoord } from "@/lib/geo"

export function DeskPanel() {
  const now = useNow()
  const shipments = useOps((s) => s.shipments)
  const flights = useOps((s) => s.flights)
  const hubs = useOps((s) => s.hubs)
  const drivers = useOps((s) => s.drivers)
  const selectedId = useOps((s) => s.selectedId)
  const select = useOps((s) => s.select)
  const focusHub = useOps((s) => s.focusHub)
  const createShipment = useOps((s) => s.createShipment)
  const reset = useOps((s) => s.reset)
  const pinMode = useOps((s) => s.pinMode)
  const setPinMode = useOps((s) => s.setPinMode)
  const pendingDrop = useOps((s) => s.pendingDrop)
  const setDrop = useOps((s) => s.setDrop)
  const aircraft = useOps((s) => s.aircraft)
  const skyNote = useOps((s) => s.skyNote)
  const [open, setOpen] = useState(false)
  const [consignee, setConsignee] = useState("")
  const [service, setService] = useState<Service>("ground")
  const [fromId, setFromId] = useState("lekki")
  const [toId, setToId] = useState("ikeja")
  const [weight, setWeight] = useState("4")
  const [pieces, setPieces] = useState("1")
  const [driverId, setDriverId] = useState("")
  const [dropMode, setDropMode] = useState<"hub" | "gps" | "pin">("hub")
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const selected = shipments.find((s) => s.id === selectedId) ?? null
  const moving = shipments.filter((s) =>
    ["picked-up", "out-for-delivery", "in-flight"].includes(s.status),
  ).length
  const airborne = shipments.filter((s) => s.status === "in-flight").length
  const holds = shipments.filter((s) => s.status === "exception").length
  const airports = hubs.filter((h) => h.kind === "airport")
  const fromHubs = service === "air" ? airports : hubs
  const toHubs = service === "air" ? airports : hubs

  async function useMyGps() {
    if (!navigator.geolocation) {
      setError("This device has no GPS")
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDrop({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "GPS drop",
        })
        setDropMode("gps")
        setLocating(false)
      },
      () => {
        setError("GPS permission denied")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function submit() {
    const from = hubs.find((h) => h.id === fromId)
    const to = hubs.find((h) => h.id === toId)
    const kg = Number(weight)
    const pcs = Number(pieces)
    if (!consignee.trim()) {
      setError("Name the consignee")
      return
    }
    if (!from || !to) {
      setError("Pick hubs")
      return
    }
    if (service === "air" && (from.kind !== "airport" || to.kind !== "airport")) {
      setError("Air moves use airports")
      return
    }
    if (!Number.isFinite(kg) || kg <= 0 || kg > 20000) {
      setError("Weight looks wrong")
      return
    }
    if (!Number.isInteger(pcs) || pcs < 1 || pcs > 40) {
      setError("Pieces should be 1–40")
      return
    }
    let destination = { lat: to.lat, lng: to.lng, label: to.name }
    if (service === "ground" && dropMode !== "hub") {
      if (!pendingDrop) {
        setError(dropMode === "pin" ? "Tap the map to drop a pin" : "Take a GPS fix first")
        return
      }
      destination = pendingDrop
    } else if (from.id === to.id) {
      setError("Pick two hubs, or use a pin")
      return
    }
    setError(null)
    createShipment({
      consignee,
      pieces: pcs,
      weightKg: kg,
      service,
      origin: { lat: from.lat, lng: from.lng, label: from.name },
      destination,
      originHubId: from.id,
      destHubId: to.id,
      driverId: driverId || undefined,
    })
    setConsignee("")
    setOpen(false)
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => select(null)} className="self-start text-sm text-muted">
          Board
        </button>
        <ShipmentDetail shipment={selected} mode="desk" />
      </div>
    )
  }

  const rows = [...shipments].sort((a, b) => RANK[a.status] - RANK[b.status])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Moving", moving],
          ["Airborne", airborne],
          ["Holds", holds],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg bg-surface px-2 py-2">
            <p className="text-xs text-muted">{label}</p>
            <p className="font-mono text-xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        {aircraft.length
          ? `${aircraft.length} live ADS-B aircraft in view`
          : skyNote || "Sky feed arms when the map is regional"}
      </p>

      <div className="flex gap-2 overflow-x-auto">
        {hubs.map((hub) => (
          <button
            key={hub.id}
            type="button"
            onClick={() => focusHub(hub.id)}
            className="h-10 shrink-0 rounded-full border border-border px-3 text-sm"
          >
            <span className="font-mono text-xs text-primary">{hub.code}</span> {hub.city}
          </button>
        ))}
      </div>

      <ul>
        {rows.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => select(s.id)}
              className="flex w-full items-baseline justify-between gap-3 border-b border-border py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block font-mono text-sm">{s.code}</span>
                <span className="block truncate text-sm text-muted">
                  {STATUS_LABEL[s.status]} · {s.consignee}
                </span>
              </span>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  s.status === "exception" ? "text-danger" : "text-primary",
                )}
              >
                {etaLabel(s.status, arrivalOf(s, flights), now)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <h3 className="text-sm font-medium">New shipment</h3>
          <input
            value={consignee}
            onChange={(event) => setConsignee(event.target.value)}
            placeholder="Consignee"
            aria-label="Consignee"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={service} aria-label="Service" onChange={(event) => {
                const next = event.target.value as Service
                setService(next)
                if (next === "air") {
                  setFromId("los")
                  setToId("lhr")
                }
              }}>
              <option value="ground">Ground</option>
              <option value="air">Air</option>
            </select>
            <select value={driverId} aria-label="Driver" onChange={(event) => setDriverId(event.target.value)}>
              <option value="">Driver later</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.callsign}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={fromId} aria-label="Origin hub" onChange={(event) => setFromId(event.target.value)}>
              {fromHubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} · {h.name}
                </option>
              ))}
            </select>
            <select value={toId} aria-label="Destination hub" onChange={(event) => setToId(event.target.value)}>
              {toHubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} · {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              aria-label="Weight kilograms"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="kg"
            />
            <input
              inputMode="numeric"
              aria-label="Pieces"
              value={pieces}
              onChange={(event) => setPieces(event.target.value)}
              placeholder="pieces"
            />
          </div>
          {service === "ground" ? (
            <div className="grid grid-cols-3 gap-2">
              <Button variant={dropMode === "hub" ? "primary" : "ghost"} onClick={() => setDropMode("hub")}>
                Hub
              </Button>
              <Button variant={dropMode === "gps" ? "primary" : "ghost"} onClick={useMyGps} disabled={locating}>
                {locating ? "GPS…" : "My GPS"}
              </Button>
              <Button
                variant={dropMode === "pin" || pinMode ? "primary" : "ghost"}
                onClick={() => {
                  setDropMode("pin")
                  setPinMode(true)
                }}
              >
                Pin
              </Button>
            </div>
          ) : null}
          {pendingDrop && service === "ground" && dropMode !== "hub" ? (
            <p className="font-mono text-xs text-muted">{formatCoord(pendingDrop.lat, pendingDrop.lng)}</p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full">
            Create shipment
          </Button>
        </form>
      ) : (
        <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
          New shipment
        </Button>
      )}

      <button type="button" onClick={reset} className="self-start text-xs text-muted">
        Reset sample fleet
      </button>
    </div>
  )
}
