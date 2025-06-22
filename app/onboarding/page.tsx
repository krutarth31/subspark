"use client"  
import DashboardLayout from "@/components/dashboard-layout"
import OnboardingFlow from "@/components/onboarding-flow"

export default function Page() {
  const help = (
    <p>Follow these steps to set up your seller account and subscription.</p>
  )
  return (
    <DashboardLayout title="Onboarding" helpContent={help}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 -z-10 grid grid-cols-2 opacity-30 blur-3xl">
          <div className="bg-gradient-radial from-fuchsia-300/20 via-indigo-300/20 to-transparent dark:from-fuchsia-500/20 dark:via-indigo-500/20" />
          <div className="bg-gradient-radial from-sky-300/20 via-purple-300/20 to-transparent dark:from-sky-500/20 dark:via-purple-500/20" />
        </div>
        <OnboardingFlow />
      </div>
    </DashboardLayout>
  )
}
