"use client"

import { cn } from "@/lib/utils"

export function ServiceDescription({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  if (lines.length <= 1) {
    return <p className={className}>{text}</p>
  }
  return (
    <ul className={cn("list-disc ml-4", className)}>
      {lines.map((line, idx) => (
        <li key={idx}>{line}</li>
      ))}
    </ul>
  )
}
