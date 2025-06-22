"use client"

import { HelpCircle } from "lucide-react"
import { ReactNode } from "react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function HelpButton({ content }: { content: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help">
          <HelpCircle className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-w-sm">
        <SheetHeader>
          <SheetTitle>Help</SheetTitle>
        </SheetHeader>
        <div className="p-4 text-sm space-y-2">{content}</div>
      </SheetContent>
    </Sheet>
  )
}
