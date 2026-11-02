import { formatCoord } from "@/lib/geo"
import { activeJob } from "@/lib/position"
import { useOps } from "@/lib/store"
import { ShipmentDetail } from "@/components/shipment-detail"
import { Button } from "@/components/ui"

export function DrivePanel() {
  const drivers = useOps((s) => s.drivers)
  const shipments = useOps((s) => s.shipments)
  const hubs = useOps((s) => s.hubs)
  const gps = useOps((s) => s.gps)
  const startGps = useOps((s) => s.startGps)
  const stopGps = useOps((s) => s.stopGps)
  const setFollow = useOps((s) => s.setFollow)
  const setGpsDriver = useOps((s) => s.setGpsDriver)
  const select = useOps((s) => s.select)
  const driver = drivers.find((d) => d.id === gps.driverId) ?? drivers[0]
  const job = driver ? activeJob(driver, shipments) : undefined
  const hub = hubs.find((h) => h.id === driver?.hubId)

  if (!driver) return null

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Driving as
        <select
          value={driver.id}
          onChange={(event) => {
            const id = event.target.value
            setGpsDriver(id)
            const next = shipments.find((s) => s.driverId === id && s.status !== "delivered")
            if (next) select(next.id)
          }}
        >
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.callsign} · {d.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="text-sm">{gps.on ? "GPS live" : "GPS off"}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          {gps.lat != null && gps.lng != null
            ? `${formatCoord(gps.lat, gps.lng)}${gps.accuracy != null ? ` · ±${Math.round(gps.accuracy)} m` : ""}`
            : "Uses this phone’s location. The rest of the fleet stays on real roads."}
        </p>
        {gps.error ? <p className="mt-2 text-sm text-danger">{gps.error}</p> : null}
        <div className="mt-3 flex gap-2">
          {gps.on ? (
            <Button variant="ghost" className="flex-1" onClick={stopGps}>
              Stop
            </Button>
          ) : (
            <Button className="flex-1" onClick={startGps}>
              Go live
            </Button>
          )}
          <Button
            variant={gps.follow ? "primary" : "ghost"}
            className="flex-1"
            disabled={!gps.on || gps.lat == null}
            onClick={() => setFollow(!gps.follow)}
          >
            {gps.follow ? "Carrying job" : "Carry job"}
          </Button>
        </div>
      </div>

      {job && job.status !== "booked" ? (
        <ShipmentDetail shipment={job} mode="drive" />
      ) : job ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {job.code} is booked. Confirm pickup when you have the parcel.
          </p>
          <ShipmentDetail shipment={job} mode="drive" />
        </div>
      ) : (
        <p className="text-sm text-muted">
          {driver.callsign} is idle{hub ? ` at ${hub.name}` : ""}. Assign a job from Desk.
        </p>
      )}
    </div>
  )
}
