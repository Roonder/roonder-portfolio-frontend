import * as React from "react"

import { cn } from "~/shared/lib/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-md border border-outline-variant/40 bg-surface-container-high/60 px-3 py-3 text-base transition-[color,border-color,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
