import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { formatCoord } from "@/lib/geo"
import { STATUS_LABEL, clock, etaLabel, serviceLabel } from "@/lib/format"
import { arrivalOf, movementProgress, shipmentPoint } from "@/lib/position"
import { useOps } from "@/lib/store"
import type { Shipment } from "@/lib/types"
import { useNow } from "@/components/now"
import { Button } from "@/components/ui"
import { cn } from "@/lib/cn"

function nextLabel(s: Shipment) {
  if (s.status === "delivered") return null
  if (s.status === "exception") return "Release hold"
  if (s.service === "air") {
    if (s.status === "booked") return "Confirm pickup"
    if (s.status === "picked-up") return "Tender to ramp"
    if (s.status === "at-hub") return "Depart flight"
    if (s.status === "in-flight") return "Mark landed"
    if (s.status === "arrived") return "Out for delivery"
    return "Confirm delivered"
  }
  if (s.status === "booked") return "Confirm pickup"
  if (s.status === "picked-up") return "Arrive at hub"
  if (s.status === "at-hub") return "Send for delivery"
  return "Confirm delivered"
}

export function ShipmentDetail({
  shipment,
  mode,
}: {
  shipment: Shipment
  mode: "track" | "desk" | "drive"
}) {
  const now = useNow()
  const hubs = useOps((s) => s.hubs)
  const drivers = useOps((s) => s.drivers)
  const flights = useOps((s) => s.flights)
  const routes = useOps((s) => s.routes)
  const advance = useOps((s) => s.advance)
  const flagException = useOps((s) => s.flagException)
  const assignDriver = useOps((s) => s.assignDriver)
  const [copied, setCopied] = useState(false)
  const flight = flights.find((f) => f.id === shipment.flightId)
  const driver = drivers.find((d) => d.id === shipment.driverId)
  const eta = arrivalOf(shipment, flights)
  const progress = movementProgress(shipment, flights, now)
  const point = shipmentPoint(shipment, now, routes, flights, hubs)
  const from = hubs.find((h) => h.id === shipment.originHubId)
  const to = hubs.find((h) => h.id === shipment.destHubId)
  const action = nextLabel(shipment)
  const hold = shipment.status === "exception"

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(shipment.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-wide text-muted">{shipment.code}</p>
          <h2 className="text-xl font-semibold tracking-tight">{shipment.consignee}</h2>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm"
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={cn("text-sm font-medium", hold ? "text-danger" : "text-primary")}>
              {STATUS_LABEL[shipment.status]}
            </p>
            <p className="font-mono text-3xl font-medium tabular-nums tracking-tight">{etaLabel(shipment.status, eta, now)}</p>
          </div>
          <p className="pb-1 font-mono text-xs text-muted tabular-nums">{clock(eta)}</p>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full", hold ? "bg-danger" : "bg-primary")}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-xs text-muted">{formatCoord(point.lat, point.lng)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Service</dt>
          <dd>{serviceLabel(shipment.service)}</dd>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2">
          <dt className="text-xs text-muted">Weight</dt>
          <dd className="tabular-nums">
            {shipment.weightKg} kg · {shipment.pieces} pc
          </dd>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2">
          <dt className="text-xs text-muted">From</dt>
          <dd>{from ? `${from.code} ${from.city}` : shipment.origin.label}</dd>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2">
          <dt className="text-xs text-muted">To</dt>
          <dd>{to ? `${to.code} ${to.city}` : shipment.destination.label}</dd>
        </div>
      </dl>

      {flight ? (
        <p className="font-mono text-xs text-muted">
          {flight.number} · {flight.aircraft} · {from?.code} → {to?.code}
          {shipment.door ? ` · then ${shipment.door.label}` : ""}
        </p>
      ) : null}
      {driver ? (
        <p className="text-sm">
          {driver.name}{" "}
          <span className="font-mono text-xs text-muted">
            {driver.callsign} · {driver.vehicle}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted">No driver assigned</p>
      )}

      {mode !== "track" && shipment.status !== "delivered" ? (
        <div className="flex flex-col gap-2">
          {mode === "desk" ? (
            <label className="flex flex-col gap-1 text-xs text-muted">
              Assign driver
              <select
                value={shipment.driverId ?? ""}
                onChange={(event) => assignDriver(shipment.id, event.target.value || undefined)}
              >
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.callsign} · {d.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {action ? (
            <Button className="w-full" onClick={() => advance(shipment.id)}>
              {action}
            </Button>
          ) : null}
          {shipment.status !== "exception" ? (
            <div className="grid grid-cols-1 gap-2">
              {["Recipient not at gate", "Docs mismatch", "Traffic hold"].map((title) => (
                <Button key={title} variant="danger" className="w-full" onClick={() => flagException(shipment.id, title)}>
                  {title}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className="flex flex-col">
        {shipment.scans.map((scan, index) => (
          <li key={scan.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1 size-2 rounded-full",
                  index === 0 ? (hold ? "bg-danger" : "bg-primary") : "bg-border",
                )}
              />
              {index < shipment.scans.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
            </div>
            <div className="pb-3">
              <p className="text-sm">{scan.title}</p>
              <p className="font-mono text-xs text-muted tabular-nums">
                {clock(scan.at)} · {scan.place}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}
