"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)
  const [banner, setBanner] = useState<File | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedId = window.localStorage.getItem("stripe_account_id")
    if (storedId) {
      setAccountId(storedId)
    }
    const stepParam = new URLSearchParams(window.location.search).get("step")
    if (stepParam) {
      const num = parseInt(stepParam)
      if (!isNaN(num)) setStep(num)
    }
  }, [])

  async function startStripeConnect() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/stripe/onboard", { method: "POST" })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Request failed: ${res.status}`)
      }
      const data = await res.json()
      if (data?.url) {
        if (data.accountId) {
          setAccountId(data.accountId)
          window.localStorage.setItem("stripe_account_id", data.accountId)
        }
        window.location.href = data.url as string
      } else {
        setError("No url returned from Stripe")
        setLoading(false)
      }
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-xl font-semibold">Connect Stripe</h2>
        <p className="text-sm text-muted-foreground text-center">
          Connect your Stripe account to start selling.
        </p>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button onClick={startStripeConnect} disabled={loading}>
          {loading ? "Redirecting..." : "Connect with Stripe"}
        </Button>
      </div>
    )
  }

  if (step === 2) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setStep(3)
        }}
        className="flex flex-col gap-4 p-6"
      >
        <h2 className="text-xl font-semibold">Set up your profile</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
          />
          {avatar ? (
            <p className="text-xs text-muted-foreground">{avatar.name}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner">Banner</Label>
          <Input
            id="banner"
            type="file"
            accept="image/*"
            onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
          />
          {banner ? (
            <p className="text-xs text-muted-foreground">{banner.name}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
        <Button type="submit">Save and Continue</Button>
      </form>
    )
  }

  if (step === 3) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setStep(4)
        }}
        className="flex flex-col gap-4 p-6"
      >
        <h2 className="text-xl font-semibold">Verify identity &amp; accept terms</h2>
        <p className="text-sm text-muted-foreground">
          Stripe requires identity verification before you can receive payouts.
        </p>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button
          type="button"
          onClick={async () => {
            if (!accountId) return
            setLoading(true)
            try {
              setError(null)
              const res = await fetch("/api/stripe/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId }),
              })
              if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg || `Request failed: ${res.status}`)
              }
              const data = await res.json()
              if (data?.url) {
                window.location.href = data.url as string
              } else {
                setError("No url returned from Stripe")
                setLoading(false)
              }
            } catch (err) {
              setError((err as Error).message)
              setLoading(false)
            }
          }}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Start verification"}
        </Button>
        <Label className="gap-2">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
          />
          I agree to the terms and conditions
        </Label>
        <Button type="submit" disabled={!accepted}>
          Continue
        </Button>
      </form>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Onboarding complete!</h2>
      <p className="text-sm text-muted-foreground">
        You&apos;re all set. Start selling from your dashboard.
      </p>
      <Button onClick={() => (window.location.href = "/dashboard")}>Go to Dashboard</Button>
    </div>
  )
}
