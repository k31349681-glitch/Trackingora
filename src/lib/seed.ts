import type { Driver, Flight, GpsState, Hub, Shipment } from "@/lib/types"

export const HUBS: Hub[] = [
  { id: "apapa", name: "Apapa Bonded", code: "APP", kind: "warehouse", city: "Lagos", lat: 6.4411, lng: 3.3644 },
  { id: "ikeja", name: "Ikeja Sort", code: "IKJ", kind: "sort", city: "Lagos", lat: 6.595, lng: 3.339 },
  { id: "yaba", name: "Yaba Crossdock", code: "YAB", kind: "sort", city: "Lagos", lat: 6.5095, lng: 3.378 },
  { id: "lekki", name: "Lekki Hub", code: "LEK", kind: "warehouse", city: "Lagos", lat: 6.4474, lng: 3.4723 },
  { id: "los", name: "Murtala Muhammed", code: "LOS", kind: "airport", city: "Lagos", lat: 6.5774, lng: 3.3211 },
  { id: "acc", name: "Kotoka", code: "ACC", kind: "airport", city: "Accra", lat: 5.6052, lng: -0.1668 },
  { id: "lhr", name: "Heathrow", code: "LHR", kind: "airport", city: "London", lat: 51.47, lng: -0.4543 },
  { id: "cdg", name: "Charles de Gaulle", code: "CDG", kind: "airport", city: "Paris", lat: 49.0097, lng: 2.5479 },
]

export const DRIVERS: Driver[] = [
  { id: "adaeze", name: "Adaeze Okonkwo", callsign: "LK-04", vehicle: "bike", hubId: "lekki" },
  { id: "tunde", name: "Tunde Bakare", callsign: "IK-12", vehicle: "van", hubId: "ikeja" },
  { id: "chioma", name: "Chioma Eze", callsign: "YB-07", vehicle: "bike", hubId: "yaba" },
  { id: "samuel", name: "Samuel Adeyemi", callsign: "AP-02", vehicle: "truck", hubId: "apapa" },
  { id: "ibrahim", name: "Ibrahim Sule", callsign: "LOS-1", vehicle: "van", hubId: "los" },
  { id: "ngozi", name: "Ngozi Umeh", callsign: "VI-03", vehicle: "bike", hubId: "lekki" },
]

const hub = (id: string) => HUBS.find((h) => h.id === id)!

export function emptyGps(driverId = "adaeze"): GpsState {
  return {
    on: false,
    follow: false,
    driverId,
    lat: null,
    lng: null,
    accuracy: null,
    heading: null,
    error: null,
    startedAt: null,
  }
}

export function createSeed(now: number) {
  const min = (m: number) => now - m * 60 * 1000
  const plus = (m: number) => now + m * 60 * 1000

  const flights: Flight[] = [
    {
      id: "f214",
      number: "MN 214",
      aircraft: "B738",
      fromHubId: "los",
      toHubId: "lhr",
      departAt: now - 4.2 * 3600 * 1000,
      arriveAt: now + 2.3 * 3600 * 1000,
    },
    {
      id: "f088",
      number: "MN 088",
      aircraft: "E190",
      fromHubId: "acc",
      toHubId: "los",
      departAt: now - 28 * 60 * 1000,
      arriveAt: now + 24 * 60 * 1000,
    },
    {
      id: "f440",
      number: "MN 440",
      aircraft: "A320",
      fromHubId: "cdg",
      toHubId: "los",
      departAt: now - 1.6 * 3600 * 1000,
      arriveAt: now + 4.4 * 3600 * 1000,
    },
  ]

  const los = hub("los")
  const lhr = hub("lhr")
  const acc = hub("acc")
  const cdg = hub("cdg")
  const ikeja = hub("ikeja")
  const lekki = hub("lekki")
  const yaba = hub("yaba")
  const apapa = hub("apapa")

  const shipments: Shipment[] = [
    {
      id: "s-10482",
      code: "MR-10482",
      consignee: "Amaka · Admiralty",
      pieces: 1,
      weightKg: 2.4,
      service: "ground",
      status: "out-for-delivery",
      origin: { lat: ikeja.lat, lng: ikeja.lng, label: "Ikeja Sort" },
      destination: { lat: 6.4412, lng: 3.4553, label: "Admiralty Way" },
      originHubId: "ikeja",
      destHubId: "lekki",
      driverId: "adaeze",
      eta: plus(18),
      movingSince: min(16),
      scans: [
        { id: "c1", at: min(16), title: "Out for delivery", place: "Lekki corridor" },
        { id: "c2", at: min(70), title: "Sorted", place: "Ikeja Sort" },
        { id: "c3", at: min(140), title: "Collected", place: "Ikeja Sort" },
        { id: "c4", at: min(400), title: "Booked", place: "Ikeja Sort" },
      ],
    },
    {
      id: "s-22819",
      code: "MR-22819",
      consignee: "Jonah · Kensington",
      pieces: 2,
      weightKg: 18,
      service: "air",
      status: "in-flight",
      origin: { lat: los.lat, lng: los.lng, label: "Murtala Muhammed" },
      destination: { lat: lhr.lat, lng: lhr.lng, label: "Heathrow" },
      door: { lat: 51.4988, lng: -0.191, label: "Kensington" },
      originHubId: "los",
      destHubId: "lhr",
      flightId: "f214",
      eta: flights[0]!.arriveAt,
      scans: [
        { id: "a1", at: flights[0]!.departAt, title: "Departed", place: "LOS · MN 214" },
        { id: "a2", at: min(320), title: "Tendered to ramp", place: "Murtala Muhammed" },
        { id: "a3", at: min(900), title: "Booked", place: "Ikeja Sort" },
      ],
    },
    {
      id: "s-77440",
      code: "MR-77440",
      consignee: "Kofi · Ikeja GRA",
      pieces: 1,
      weightKg: 6.1,
      service: "air",
      status: "in-flight",
      origin: { lat: acc.lat, lng: acc.lng, label: "Kotoka" },
      destination: { lat: los.lat, lng: los.lng, label: "Murtala Muhammed" },
      door: { lat: 6.576, lng: 3.357, label: "Ikeja GRA" },
      originHubId: "acc",
      destHubId: "los",
      flightId: "f088",
      eta: flights[1]!.arriveAt,
      scans: [
        { id: "b1", at: flights[1]!.departAt, title: "Departed", place: "ACC · MN 088" },
        { id: "b2", at: min(80), title: "Accepted", place: "Kotoka cargo" },
      ],
    },
    {
      id: "s-91550",
      code: "MR-91550",
      consignee: "Atelier · Victoria Island",
      pieces: 3,
      weightKg: 22,
      service: "air",
      status: "in-flight",
      origin: { lat: cdg.lat, lng: cdg.lng, label: "Charles de Gaulle" },
      destination: { lat: los.lat, lng: los.lng, label: "Murtala Muhammed" },
      door: { lat: 6.4281, lng: 3.4219, label: "Adeola Odeku" },
      originHubId: "cdg",
      destHubId: "los",
      flightId: "f440",
      eta: flights[2]!.arriveAt,
      scans: [
        { id: "p1", at: flights[2]!.departAt, title: "Departed", place: "CDG · MN 440" },
        { id: "p2", at: min(200), title: "Booked", place: "Charles de Gaulle" },
      ],
    },
    {
      id: "s-88012",
      code: "MR-88012",
      consignee: "Funke · Victoria Island",
      pieces: 1,
      weightKg: 3.2,
      service: "ground",
      status: "out-for-delivery",
      origin: { lat: ikeja.lat, lng: ikeja.lng, label: "Ikeja Sort" },
      destination: { lat: 6.4281, lng: 3.4219, label: "Adeola Odeku" },
      originHubId: "ikeja",
      destHubId: "yaba",
      driverId: "tunde",
      eta: plus(22),
      movingSince: min(11),
      scans: [
        { id: "d1", at: min(11), title: "Out for delivery", place: "Third Mainland" },
        { id: "d2", at: min(50), title: "Sorted", place: "Ikeja Sort" },
      ],
    },
    {
      id: "s-44190",
      code: "MR-44190",
      consignee: "Ikeja Sort",
      pieces: 4,
      weightKg: 11,
      service: "ground",
      status: "picked-up",
      origin: { lat: 6.5015, lng: 3.358, label: "Surulere" },
      destination: { lat: ikeja.lat, lng: ikeja.lng, label: "Ikeja Sort" },
      originHubId: "yaba",
      destHubId: "ikeja",
      driverId: "chioma",
      eta: plus(19),
      movingSince: min(8),
      scans: [
        { id: "e1", at: min(8), title: "Picked up", place: "Surulere" },
        { id: "e2", at: min(40), title: "Booked", place: "Yaba Crossdock" },
      ],
    },
    {
      id: "s-66318",
      code: "MR-66318",
      consignee: "Held · cargo docs",
      pieces: 1,
      weightKg: 9,
      service: "ground",
      status: "exception",
      origin: { lat: los.lat, lng: los.lng, label: "Murtala Muhammed" },
      destination: { lat: 6.569, lng: 3.326, label: "Cargo ramp" },
      originHubId: "los",
      destHubId: "los",
      driverId: "ibrahim",
      eta: plus(40),
      frozenProgress: 0.72,
      movingSince: min(25),
      scans: [
        { id: "f1", at: min(6), title: "Docs mismatch", place: "LOS cargo" },
        { id: "f2", at: min(25), title: "Out for delivery", place: "Murtala Muhammed" },
      ],
    },
    {
      id: "s-33071",
      code: "MR-33071",
      consignee: "Chinedu · Apapa Wharf",
      pieces: 8,
      weightKg: 240,
      service: "ground",
      status: "at-hub",
      origin: { lat: apapa.lat, lng: apapa.lng, label: "Apapa Bonded" },
      destination: { lat: 6.446, lng: 3.358, label: "Wharf gate" },
      originHubId: "apapa",
      destHubId: "apapa",
      eta: plus(90),
      scans: [
        { id: "g1", at: min(35), title: "At hub", place: "Apapa Bonded" },
        { id: "g2", at: min(180), title: "Booked", place: "Apapa Bonded" },
      ],
    },
    {
      id: "s-12007",
      code: "MR-12007",
      consignee: "New · Lekki Phase 1",
      pieces: 1,
      weightKg: 1.1,
      service: "ground",
      status: "booked",
      origin: { lat: lekki.lat, lng: lekki.lng, label: "Lekki Hub" },
      destination: { lat: 6.435, lng: 3.481, label: "Lekki Phase 1" },
      originHubId: "lekki",
      destHubId: "lekki",
      driverId: "ngozi",
      eta: plus(70),
      scans: [{ id: "h1", at: min(12), title: "Booked", place: "Lekki Hub" }],
    },
    {
      id: "s-55204",
      code: "MR-55204",
      consignee: "Bisi · Chevron",
      pieces: 1,
      weightKg: 0.8,
      service: "ground",
      status: "delivered",
      origin: { lat: lekki.lat, lng: lekki.lng, label: "Lekki Hub" },
      destination: { lat: 6.4328, lng: 3.5284, label: "Chevron Drive" },
      originHubId: "lekki",
      destHubId: "lekki",
      driverId: "adaeze",
      eta: min(95),
      scans: [
        { id: "i1", at: min(95), title: "Delivered", place: "Chevron Drive" },
        { id: "i2", at: min(120), title: "Out for delivery", place: "Lekki Hub" },
      ],
    },
  ]

  return {
    hubs: HUBS,
    drivers: DRIVERS,
    flights,
    shipments,
    selectedId: "s-10482" as string | null,
    view: "track" as const,
    anchoredAt: now,
  }
}
