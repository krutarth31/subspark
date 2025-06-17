"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OnboardingFlow() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [accepted, setAccepted] = useState(false)

  if (step === 1) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <h2 className="text-xl font-semibold">Connect Stripe</h2>
        <p className="text-sm text-muted-foreground text-center">
          Connect your Stripe account to start selling.
        </p>
        <Button onClick={() => setStep(2)}>Connect with Stripe</Button>
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        alert("Onboarding complete!")
      }}
      className="flex flex-col gap-4 p-6"
    >
      <h2 className="text-xl font-semibold">Accept Terms</h2>
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
        Complete Onboarding
      </Button>
    </form>
  )
}
