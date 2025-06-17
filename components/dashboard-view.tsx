"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { useUserRole } from "@/hooks/use-user-role"

import data from "@/app/dashboard/data.json"

export default function DashboardView() {
  const { role } = useUserRole()
  const title = role === "seller" ? "Seller Dashboard" : "Buyer Dashboard"

  return (
    <DashboardLayout title={title}>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards role={role} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive role={role} />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </DashboardLayout>
  )
}
