"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { useUserRole } from "@/hooks/use-user-role"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useEffect, useState } from "react"

import data from "@/app/dashboard/data.json"

export default function DashboardView() {
  const { role } = useUserRole()
  const title = role === "seller" ? "Seller Dashboard" : "Buyer Dashboard"
  const [active, setActive] = useState<boolean | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)

  useEffect(() => {
    if (role !== "seller") return
    fetch("/api/seller/status")
        .then(async (res) => {
          if (!res.ok) {
            const msg = await res.text()
            throw new Error(msg || `Request failed: ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          if (data.accountId) {
            setAccountId(data.accountId)
          }
          setActive(data.active)
          setStatusError(null)
        })
        .catch((err) => {
          console.error(err)
          setStatusError("Unable to verify Stripe account status")
        })
  }, [role])

  async function startStripe() {
    if (stripeLoading) return
    setStripeLoading(true)
    const res = await fetch("/api/stripe/onboard", { method: "POST" })
    if (!res.ok) {
      alert("Failed to start onboarding")
      setStripeLoading(false)
      return
    }
    const data = await res.json()
    if (data.accountId) {
      setAccountId(data.accountId)
    }
    if (data.url) {
      window.location.href = data.url
    } else {
      setStripeLoading(false)
    }
  }

  async function resumeStripe() {
    if (!accountId || stripeLoading) return
    setStripeLoading(true)
    const res = await fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    })
    if (!res.ok) {
      alert("Failed to resume onboarding")
      setStripeLoading(false)
      return
    }
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setStripeLoading(false)
    }
  }

  return (
    <DashboardLayout title={title}>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {role === "seller" && (
            <div className="px-4 lg:px-6 space-y-2">
              {statusError && (
                <p className="text-sm text-red-500">{statusError}</p>
              )}
              {active === false && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">Stripe setup incomplete.</span>
                  <Button size="sm" onClick={resumeStripe} disabled={stripeLoading}>
                    {stripeLoading && <Spinner className="mr-2" />}
                    Resume Stripe Setup
                  </Button>
                </div>
              )}
              {active === null && !accountId && (
                <Button size="sm" onClick={startStripe} disabled={stripeLoading}>
                  {stripeLoading && <Spinner className="mr-2" />}
                  Connect Stripe
                </Button>
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
