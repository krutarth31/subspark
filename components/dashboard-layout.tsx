"use client"

import { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useUserRole } from "@/hooks/use-user-role"

export default function DashboardLayout({
  children,
  title: titleProp,
  helpContent,
}: {
  children: ReactNode
  title?: string
  helpContent?: React.ReactNode
}) {
  const { role } = useUserRole()
  const title = titleProp ?? (role === "seller" ? "Seller Dashboard" : "Buyer Dashboard")

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} helpContent={helpContent} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
