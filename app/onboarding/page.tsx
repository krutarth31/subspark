"use client"  
import DashboardLayout from "@/components/dashboard-layout"
import OnboardingFlow from "@/components/onboarding-flow"

export default function Page() {
  return (
    <DashboardLayout title="Onboarding">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 bg-gradient-to-br from-[#0d0d0d] via-[#181818] to-black">
        <div className="pointer-events-none absolute inset-0 -z-10 grid grid-cols-2 opacity-40 blur-3xl">
          <div className="bg-gradient-radial from-fuchsia-500/20 via-indigo-500/20 to-transparent" />
          <div className="bg-gradient-radial from-sky-500/20 via-purple-500/20 to-transparent" />
        </div>
        <OnboardingFlow />
      </div>
    </DashboardLayout>
  )
}
