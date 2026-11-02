import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger"
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium disabled:opacity-40",
        variant === "primary" && "bg-primary text-primary-fg",
        variant === "ghost" && "border border-border bg-surface text-fg",
        variant === "danger" && "bg-danger/15 text-danger",
        className,
      )}
      {...props}
    />
  )
}
