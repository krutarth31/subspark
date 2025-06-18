"use client"
import DashboardLayout from "@/components/dashboard-layout"

export default function Page() {
  return (
    <DashboardLayout title="Billing">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="space-y-2 text-center">
          <p className="text-lg font-semibold">Billing Settings</p>
          <p className="text-muted-foreground text-sm">
            Manage your subscription and payment methods here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
