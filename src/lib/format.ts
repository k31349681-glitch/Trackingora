import type { Flight, Service, Status } from "@/lib/types"

const lagosClock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Lagos",
})

export function clock(ts: number) {
  return lagosClock.format(ts)
}

export const STATUS_LABEL: Record<Status, string> = {
  booked: "Booked",
  "picked-up": "Picked up",
  "at-hub": "At hub",
  "in-flight": "In flight",
  arrived: "Landed",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
}

export const RANK: Record<Status, number> = {
  exception: 0,
  "out-for-delivery": 1,
  "in-flight": 2,
  "picked-up": 3,
  arrived: 4,
  "at-hub": 5,
  booked: 6,
  delivered: 7,
}

export function etaLabel(status: Status, eta: number, now: number) {
  if (status === "delivered") return `Delivered ${clock(eta)}`
  if (status === "exception") return "Holding"
  const mins = Math.round((eta - now) / 60000)
  if (mins <= 0) return "Due now"
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function serviceLabel(service: Service) {
  return service === "air" ? "Air" : "Ground"
}

export function flightWindow(f: Flight, now: number) {
  if (now < f.departAt) return `Departs ${clock(f.departAt)}`
  if (now > f.arriveAt) return `Landed ${clock(f.arriveAt)}`
  return `Lands ${clock(f.arriveAt)}`
}
