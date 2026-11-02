import { createFileRoute } from "@tanstack/react-router"
import { Shell } from "@/components/shell"
import type { ViewName } from "@/lib/types"

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const view: ViewName | undefined =
      search.view === "desk" || search.view === "drive" || search.view === "track"
        ? search.view
        : undefined
    const track = typeof search.track === "string" ? search.track : undefined
    return { view, track }
  },
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  return <Shell search={search} />
}
