import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { BOOT_AT } from "@/lib/clock"

const NowContext = createContext(BOOT_AT)

export function NowProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(BOOT_AT)
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>
}

export function useNow() {
  return useContext(NowContext)
}
