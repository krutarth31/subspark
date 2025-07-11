import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return <Loader2 className={cn("size-4 animate-spin", className)} {...props} />
}
