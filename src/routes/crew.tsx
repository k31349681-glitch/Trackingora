import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState, type ComponentType } from "react"
import { Activity, ArrowUpRight, Box, CheckCircle2, LockKeyhole, LogOut, Plane, ShieldCheck, Truck, X, type LucideProps } from "lucide-react"
import { RANK, STATUS_LABEL } from "@/lib/format"
import { useOps } from "@/lib/store"
import type { Status } from "@/lib/types"
import { cn } from "@/lib/cn"

export const Route = createFileRoute("/crew")({ component: CrewRoute })

const statusTone: Record<Status, string> = {
  booked: "bg-surface-2 text-muted",
  "picked-up": "bg-blue-400/15 text-blue-300",
  "at-hub": "bg-violet-400/15 text-violet-300",
  "in-flight": "bg-primary/15 text-primary",
  arrived: "bg-cyan-400/15 text-cyan-300",
  "out-for-delivery": "bg-amber-400/15 text-amber-300",
  delivered: "bg-emerald-400/15 text-emerald-300",
  exception: "bg-danger/15 text-danger",
}

const statCards: Array<{ label: string; value: number; Icon: ComponentType<LucideProps>; detail: string }> = [
  { label: "Total shipments", value: 0, Icon: Box, detail: "All references" },
  { label: "Active shipments", value: 0, Icon: Activity, detail: "In motion" },
  { label: "Delivered", value: 0, Icon: CheckCircle2, detail: "Confirmed" },
  { label: "Exceptions", value: 0, Icon: X, detail: "Needs attention" },
]

function CrewRoute() {
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem("trackora-crew") === "1")
  const [password, setPassword] = useState("")
  const [query, setQuery] = useState("")
  const [section, setSection] = useState("Overview")
  const shipments = useOps((s) => s.shipments)
  const flights = useOps((s) => s.flights)
  const advance = useOps((s) => s.advance)
  const flagException = useOps((s) => s.flagException)
  const select = useOps((s) => s.select)
  const setView = useOps((s) => s.setView)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...shipments]
      .filter((shipment) => !q || shipment.code.toLowerCase().includes(q) || shipment.consignee.toLowerCase().includes(q))
      .sort((a, b) => RANK[a.status] - RANK[b.status])
  }, [shipments, query])

  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#090c0b] px-4 text-fg">
        <form
          className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-2xl"
          onSubmit={(event) => {
            event.preventDefault()
            if (!password.trim()) return
            window.sessionStorage.setItem("trackora-crew", "1")
            setUnlocked(true)
          }}
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary font-bold text-primary-fg">T</span>
              <div>
                <p className="text-sm font-semibold tracking-[0.2em]">TRACKORA</p>
                <p className="font-mono text-[10px] text-muted">CREW / PRIVATE ACCESS</p>
              </div>
            </div>
            <LockKeyhole className="size-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Command centre access</h1>
          <p className="mt-2 text-sm leading-6 text-muted">This route is intentionally unlisted. Authenticate with the server-backed Crew credential before enabling it in production.</p>
          <label className="mt-7 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Access phrase
            <input className="mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter secure credential" autoComplete="current-password" />
          </label>
          <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-fg" type="submit">
            Unlock Crew <ArrowUpRight className="size-4" />
          </button>
          <p className="mt-4 text-center font-mono text-[10px] text-muted">SESSION SECURITY · SHORT-LIVED · AUDITED</p>
        </form>
      </main>
    )
  }

  const active = shipments.filter((s) => !["delivered", "booked"].includes(s.status)).length
  const delivered = shipments.filter((s) => s.status === "delivered").length
  const delayed = shipments.filter((s) => s.status === "exception").length
  const airborne = shipments.filter((s) => s.status === "in-flight").length
  const cards = statCards.map((card) => ({
    ...card,
    value: card.label === "Total shipments" ? shipments.length : card.label === "Active shipments" ? active : card.label === "Delivered" ? delivered : delayed,
  }))

  function openShipment(id: string) {
    select(id)
    setView("desk")
    window.location.href = "/?view=desk"
  }

  return (
    <main className="h-dvh overflow-y-auto bg-[#090c0b] text-fg">
      <div className="mx-auto flex min-h-dvh max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 border-r border-border p-5 lg:block">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary font-bold text-primary-fg">T</span>
            <div><p className="text-sm font-semibold tracking-[0.18em]">TRACKORA</p><p className="font-mono text-[10px] text-muted">CREW / 01</p></div>
          </div>
          <nav className="mt-10 space-y-1">
            {["Overview", "Shipments", "Flights", "Cargo", "Providers", "Notifications", "Audit log", "Settings"].map((item) => (
              <button key={item} type="button" onClick={() => setSection(item)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm", section === item ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface hover:text-fg")}>
                <span>{item}</span>{section === item ? <span className="size-1.5 rounded-full bg-primary-fg" /> : null}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-20"><button type="button" onClick={() => { window.sessionStorage.removeItem("trackora-crew"); setUnlocked(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-muted"><LogOut className="size-4" /> Sign out</button></div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Private operations / {section}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Good evening, Crew.</h1><p className="mt-1 text-sm text-muted">Global movement overview · synced from workspace state</p></div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted"><ShieldCheck className="size-4 text-primary" /> Admin session active</div>
          </header>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, Icon, detail }) => (
              <div key={label} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><Icon className="size-4 text-primary" /></div><p className="mt-5 font-mono text-3xl tabular-nums">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <section className="rounded-2xl border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="font-medium">Shipment control</h2><p className="mt-1 text-xs text-muted">Advance local operations or flag exceptions.</p></div><input className="h-10 max-w-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference…" /></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-4 py-3 font-medium">Reference</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Mode</th><th className="px-4 py-3 font-medium">Action</th></tr></thead><tbody>{filtered.map((shipment) => <tr key={shipment.id} className="border-t border-border/70"><td className="px-4 py-3"><button type="button" onClick={() => openShipment(shipment.id)} className="font-mono text-primary hover:underline">{shipment.code}</button><span className="mt-1 block text-xs text-muted">{shipment.consignee}</span></td><td className="px-4 py-3 text-xs text-muted">{shipment.origin.label} <span className="text-primary">→</span> {shipment.destination.label}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-xs", statusTone[shipment.status])}>{STATUS_LABEL[shipment.status]}</span></td><td className="px-4 py-3 text-xs text-muted">{shipment.service === "air" ? <span className="flex items-center gap-1"><Plane className="size-3" /> Air</span> : <span className="flex items-center gap-1"><Truck className="size-3" /> Ground</span>}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => advance(shipment.id)} disabled={shipment.status === "delivered"} className="rounded-lg border border-border px-2 py-1 text-xs hover:border-primary disabled:opacity-40">Advance</button><button type="button" onClick={() => flagException(shipment.id, "Crew review") } disabled={shipment.status === "delivered" || shipment.status === "exception"} className="rounded-lg border border-danger/40 px-2 py-1 text-xs text-danger disabled:opacity-40">Flag</button></div></td></tr>)}</tbody></table></div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center justify-between"><h2 className="font-medium">Live systems</h2><span className="size-2 rounded-full bg-primary" /></div><div className="mt-5 space-y-4">{[["Shipment engine", "Operational"], ["Flight feed", `${airborne} active`], ["Provider adapters", "Manual mode"], ["Notification queue", "Ready"]].map(([name, state]) => <div key={name} className="flex items-center justify-between text-sm"><span className="text-muted">{name}</span><span className="font-mono text-xs text-primary">{state}</span></div>)}</div></section>
              <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><Activity className="size-4 text-primary" /><h2 className="font-medium">Activity feed</h2></div><div className="mt-5 space-y-4">{shipments.slice(0, 4).map((shipment) => <div key={shipment.id} className="border-l border-primary/40 pl-3"><p className="text-sm">{STATUS_LABEL[shipment.status]}</p><p className="mt-1 font-mono text-[10px] text-muted">{shipment.code} · {shipment.scans[0]?.place}</p></div>)}</div></section>
              <p className="px-1 font-mono text-[10px] leading-5 text-muted">FLIGHTS: {flights.length} RECORDS · PRIVATE DATA NEVER SHOWN ON PUBLIC TRACKING</p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
