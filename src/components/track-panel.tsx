import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { RANK, STATUS_LABEL, etaLabel } from "@/lib/format"
import { arrivalOf } from "@/lib/position"
import { useOps } from "@/lib/store"
import { useNow } from "@/components/now"
import { ShipmentDetail } from "@/components/shipment-detail"
import { cn } from "@/lib/cn"

export function TrackPanel() {
  const now = useNow()
  const shipments = useOps((s) => s.shipments)
  const flights = useOps((s) => s.flights)
  const selectedId = useOps((s) => s.selectedId)
  const select = useOps((s) => s.select)
  const [query, setQuery] = useState("")
  const selected = shipments.find((s) => s.id === selectedId) ?? null

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shipments
      .filter((s) => {
        if (!q) return true
        return s.code.toLowerCase().includes(q) || s.consignee.toLowerCase().includes(q)
      })
      .sort((a, b) => RANK[a.status] - RANK[b.status] || a.code.localeCompare(b.code))
  }, [shipments, query])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Universal tracking</p>
        <p className="mt-1 text-sm text-muted">Flights, parcels, gifts, cargo, and last-mile delivery.</p>
      </div>
      <label className="relative block">
        <span className="sr-only">Tracking number, flight, or reference</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tracking number, flight, or reference"
          className="pl-9"
          inputMode="search"
        />
      </label>

      {selected && !query ? (
        <>
          <button type="button" onClick={() => select(null)} className="self-start text-sm text-muted">
            All shipments
          </button>
          <ShipmentDetail shipment={selected} mode="track" />
        </>
      ) : (
        <ul className="flex flex-col">
          {list.length === 0 ? (
            <li className="py-6 text-sm text-muted">No shipment under that code.</li>
          ) : (
            list.map((s) => {
              const eta = arrivalOf(s, flights)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(s.id)
                      setQuery("")
                    }}
                    className="flex w-full items-center gap-3 border-b border-border py-3 text-left"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        s.status === "exception" ? "bg-danger" : "bg-primary",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-sm">{s.code}</span>
                        <span className="font-mono text-xs text-primary tabular-nums">
                          {etaLabel(s.status, eta, now)}
                        </span>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {STATUS_LABEL[s.status]} · {s.consignee}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted">
        {[["AIR", "Flight status"], ["PARCEL", "Courier handoff"], ["CARGO", "Freight lanes"], ["GIFT", "Personal delivery"]].map(([key, label]) => (
          <div key={key} className="rounded-lg border border-border bg-surface px-3 py-2">
            <span className="font-mono text-[10px] text-primary">{key}</span>
            <span className="mt-1 block">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Provider-connected data is labeled when available. Local operational updates stay private to this workspace.</p>
    </div>
  )
}
