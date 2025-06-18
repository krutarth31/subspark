"use client"  
import DashboardLayout from "@/components/dashboard-layout"
import OnboardingFlow from "@/components/onboarding-flow"

export default function Page() {
  return (
    <DashboardLayout title="Onboarding">
      <div className="flex flex-1 items-center justify-center p-6">
        <OnboardingFlow />
      </div>
    </DashboardLayout>
  )
}
