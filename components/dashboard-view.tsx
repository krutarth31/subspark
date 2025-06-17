"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { useUserRole } from "@/hooks/use-user-role"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

import data from "@/app/dashboard/data.json"

export default function DashboardView() {
  const { role } = useUserRole()
  const title = role === "seller" ? "Seller Dashboard" : "Buyer Dashboard"
  const [active, setActive] = useState<boolean | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)

  useEffect(() => {
    if (role !== "seller") return
    const storedId = window.localStorage.getItem("stripe_account_id")
    if (storedId) {
      setAccountId(storedId)
      fetch(`/api/seller/status?accountId=${storedId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setActive(data.active)
        })
        .catch(() => {})
    }
  }, [role])

  async function startStripe() {
    const res = await fetch("/api/stripe/onboard", { method: "POST" })
    if (!res.ok) {
      alert("Failed to start onboarding")
      return
    }
    const data = await res.json()
    if (data.accountId) {
      window.localStorage.setItem("stripe_account_id", data.accountId)
    }
    if (data.url) {
      window.location.href = data.url
    }
  }

  async function resumeStripe() {
    if (!accountId) return
    const res = await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    })
    if (!res.ok) {
      alert("Failed to resume onboarding")
      return
    }
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <DashboardLayout title={title}>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {role === "seller" && (
            <div className="px-4 lg:px-6 space-y-2">
              {active === false && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">Stripe setup incomplete.</span>
                  <Button size="sm" onClick={resumeStripe}>Resume Stripe Setup</Button>
                </div>
              )}
              {active === null && !accountId && (
                <Button size="sm" onClick={startStripe}>Connect Stripe</Button>
              )}
              {active && <span className="text-green-600 text-sm">Stripe connected</span>}
            </div>
          )}
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
