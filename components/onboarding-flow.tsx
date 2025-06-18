"use client"

import { useEffect, useState } from "react"
import { CheckIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserRole } from "@/hooks/use-user-role"

export default function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)
  const [banner, setBanner] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const { setRole } = useUserRole()
  const cardClass =
    "bg-white/5 backdrop-blur-md border-white/20 text-white shadow-lg"

  useEffect(() => {
    fetch('/api/seller/status')
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || `Request failed: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (data.accountId) setAccountId(data.accountId)
        if (data.active) {
          setActive(true)
          setStep(5)
          setRole('seller')
        }
      })
      .catch((err) => {
        console.error(err)
      })
    const stepParam = new URLSearchParams(window.location.search).get("step")
    if (stepParam) {
      const num = parseInt(stepParam)
      if (!isNaN(num)) setStep(num)
    }
  }, [setRole])

  useEffect(() => {
    if (avatar) {
      const url = URL.createObjectURL(avatar)
      setAvatarPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAvatarPreview(null)
  }, [avatar])

  useEffect(() => {
    if (banner) {
      const url = URL.createObjectURL(banner)
      setBannerPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setBannerPreview(null)
  }, [banner])

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
  const stepsList = [
    "Connect Stripe",
    "Set up profile",
    "Verify & accept",
    "Pay subscription",
    "Finish",
  ]

  let content: JSX.Element

  if (step === 1) {
    content = (
      <Card className={cardClass}>
        <CardHeader className="text-center">
          <CardTitle>Connect Stripe</CardTitle>
          <CardDescription>
            Connect your Stripe account to start selling.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" onClick={startStripeConnect} disabled={loading}>
            {loading ? "Redirecting..." : "Connect with Stripe"}
          </Button>
        </CardContent>
      </Card>
    )
  } else if (step === 2) {
    content = (
      <Card className={cardClass} asChild>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setStep(3)
          }}
          className="space-y-4"
        >
          <CardHeader className="text-center">
            <CardTitle>Set up your profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="size-20 rounded-full object-cover"
                />
              ) : null}
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner">Banner</Label>
              {bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="Preview"
                  className="h-24 w-full rounded-md object-cover"
                />
              ) : null}
              <Input
                id="banner"
                type="file"
                accept="image/*"
                onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Save and Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    )
  } else if (step === 3) {
    content = (
      <Card className={cardClass} asChild>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setStep(4)
          }}
          className="space-y-4"
        >
          <CardHeader className="text-center">
            <CardTitle>Verify identity &amp; accept terms</CardTitle>
            <CardDescription>
              Stripe requires identity verification before you can receive payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              className="w-full"
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
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={!accepted}>
              Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    )
  } else if (step === 4) {
    content = (
      <Card className={cardClass}>
        <CardHeader className="text-center">
          <CardTitle>Pay subscription</CardTitle>
          <CardDescription>
            Pay the platform fee to activate your seller account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            onClick={async () => {
              if (!accountId) return
              setLoading(true)
              try {
                const res = await fetch('/api/stripe/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accountId }),
                })
                if (!res.ok) {
                  const msg = await res.text()
                  throw new Error(msg || `Request failed: ${res.status}`)
                }
                const data = await res.json()
                if (data.url) {
                  window.location.href = data.url as string
                  return
                }
                throw new Error('No url returned from Stripe')
              } catch (err) {
                setError((err as Error).message)
                setLoading(false)
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Pay Subscription'}
          </Button>
        </CardContent>
      </Card>
    )
  } else {
    content = (
      <Card className={cardClass}>
        <CardHeader className="text-center">
          <CardTitle>
            {active ? "Onboarding complete!" : "Payment pending"}
          </CardTitle>
          <CardDescription>
            {active
              ? "You're all set. Start selling from your dashboard."
              : "Complete payment to activate your account."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center gap-2">
          {active ? (
            <Button
              onClick={() => {
                setRole("seller")
                window.location.href = "/dashboard"
              }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Button onClick={() => setStep(4)}>Back to Payment</Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 rounded-2xl bg-white/5 p-8 backdrop-blur-lg ring-1 ring-white/10 md:grid-cols-[240px_1fr]">
      <ol className="relative hidden flex-col space-y-6 md:flex">
        {stepsList.map((label, idx) => (
          <li key={label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`size-8 rounded-full border flex items-center justify-center font-medium ${
                  step >= idx + 1
                    ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-none shadow'
                    : 'bg-zinc-800 border-zinc-700 text-muted-foreground'
                }`}
              >
                {step > idx + 1 ? <CheckIcon className="size-4" /> : idx + 1}
              </div>
              {idx < stepsList.length - 1 && (
                <div
                  className={`w-px flex-1 ${
                    step > idx + 1 ? 'bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500' : 'bg-border'
                  }`}
                />
              )}
            </div>
            <span className="mt-1 font-medium">{label}</span>
          </li>
        ))}
      </ol>
      <div className="space-y-6">
        <ol className="flex items-center gap-2 md:hidden">
          {stepsList.map((label, idx) => (
            <li key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`size-7 rounded-full border flex items-center justify-center font-medium ${
                    step >= idx + 1
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-none shadow'
                      : 'bg-zinc-800 border-zinc-700 text-muted-foreground'
                  }`}
                >
                  {step > idx + 1 ? <CheckIcon className="size-4" /> : idx + 1}
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      step > idx + 1 ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' : 'bg-border'
                    }`}
                  />
                )}
              </div>
              <span className="mt-2 text-xs text-center">{label}</span>
            </li>
          ))}
        </ol>
        {content}
      </div>
    </div>
  )
}
