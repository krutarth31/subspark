"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckIcon, FileIcon, KeyIcon, ServerIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

const types = [
  { id: "file", label: "File", icon: FileIcon },
  { id: "discord", label: "Discord", icon: ServerIcon },
  { id: "key", label: "License Key", icon: KeyIcon },
]

type SubProduct = {
  name: string
  billing: string
  price: string
  currency: string
  period: string
  roleId: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [type, setType] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [subProducts, setSubProducts] = useState<SubProduct[]>([
    {
      name: "Default",
      billing: "one",
      price: "10",
      currency: "USD",
      period: "month",
      roleId: "",
    },
  ])
  const [serverId, setServerId] = useState("")
  const [licenseKeys, setLicenseKeys] = useState("")
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [discordStatus, setDiscordStatus] = useState<
    { connected: boolean; guildId?: string; guildName?: string } | null
  >(null)
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
  const [discordLoading, setDiscordLoading] = useState<"connect" | "load" | null>(null)
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [image])

  useEffect(() => {
    if (step !== 3 || type !== "discord") return
    async function loadDiscord() {
      setDiscordLoading("load")
      try {
        const statusRes = await fetch("/api/discord/status")
        const statusData = await statusRes.json().catch(() => ({}))
        setDiscordStatus(statusData)
        if (statusData.connected) {
          setServerId(statusData.guildId || "")
          const rolesRes = await fetch("/api/discord/roles")
          const rolesData = await rolesRes.json().catch(() => ({}))
          setRoles(Array.isArray(rolesData.roles) ? rolesData.roles : [])
        }
      } finally {
        setDiscordLoading(null)
      }
    }
    loadDiscord()
  }, [step, type])

  async function connectDiscord() {
    if (discordLoading) return
    setDiscordLoading("connect")
    const res = await fetch("/api/discord/connect", { method: "POST" })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url as string
        return
      }
    }
    setDiscordLoading(null)
  }

  function addSub() {
    setSubProducts((subs) => [
      ...subs,
      {
        name: "",
        billing: "one",
        price: "10",
        currency: "USD",
        period: "month",
        roleId: "",
      },
    ])
  }

  function updateSub(index: number, key: keyof SubProduct, value: string) {
    setSubProducts((subs) => subs.map((s, i) => (i === index ? { ...s, [key]: value } : s)))
  }

  function removeSub(index: number) {
    setSubProducts((subs) => subs.filter((_, i) => i !== index))
  }

  const nextDisabled = () => {
    if (step === 1) return !type || name.trim().length === 0
    if (step === 2) {
      for (const s of subProducts) {
        if (!s.name.trim()) return true
        if (s.billing !== "free") {
          if (!s.price.trim() || isNaN(parseFloat(s.price))) return true
          if (!s.currency.trim()) return true
        }
        if (s.billing === "recurring" && !s.period) return true
      }
    }
    if (step === 3) {
      if (type === "file") return !contentFile
      if (type === "discord") {
        if (!serverId.trim()) return true
        for (const s of subProducts) {
          if (!s.roleId.trim()) return true
        }
        return false
      }
      if (type === "key") return licenseKeys.trim().length === 0
    }
    return false
  }

  async function handlePublish() {
    setLoading(true)
    try {
      const body = {
        name,
        description,
        type,
        status,
        subProducts: subProducts.map((s) => ({
          name: s.name,
          billing: s.billing,
          price: s.billing === "free" ? 0 : parseFloat(s.price),
          currency: s.currency,
          period: s.billing === "recurring" ? s.period : undefined,
          roleId: s.roleId,
        })),
        deliveryFile: contentFile ? contentFile.name : undefined,
        serverId,
        roleId: subProducts[0]?.roleId,
        licenseKeys,
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to save")
        setLoading(false)
        return
      }
      router.push("/products")
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="New Product">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <ol className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex flex-1 flex-col items-center">
              <div className="flex items-center w-full">
                <div
                  className={`size-7 rounded-full border flex items-center justify-center font-medium ${
                    step >= n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {step > n ? <CheckIcon className="size-4" /> : n}
                </div>
                {n < 3 && (
                  <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            </li>
          ))}
        </ol>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Product details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {types.map((t) => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`rounded-md border p-4 flex flex-col items-center gap-2 hover:bg-accent ${
                          type === t.id ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <Icon className="size-6" />
                        <span>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="desc">Description</Label>
                <textarea
                  id="desc"
                  className="min-h-[100px] w-full rounded-md border px-3 py-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="img">Image</Label>
                {preview && <img src={preview} alt="Preview" className="h-24 w-full rounded object-cover" />}
                <Input id="img" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => router.push("/products")}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={nextDisabled()}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Sub-products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subProducts.map((sub, i) => (
                <div key={i} className="rounded border p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <Input
                      placeholder="Name"
                      value={sub.name}
                      onChange={(e) => updateSub(i, "name", e.target.value)}
                      className="flex-1 mr-2"
                    />
                    {subProducts.length > 1 && (
                      <Button type="button" size="sm" variant="outline" onClick={() => removeSub(i)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <Select value={sub.billing} onValueChange={(v) => updateSub(i, "billing", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Billing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="one">One time</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                  {sub.billing !== "free" && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input value={sub.price} onChange={(e) => updateSub(i, "price", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input
                          value={sub.currency}
                          onChange={(e) => updateSub(i, "currency", e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>
                  )}
                  {sub.billing === "recurring" && (
                    <div className="space-y-2">
                      <Label>Subscription period</Label>
                      <Select value={sub.period} onValueChange={(v) => updateSub(i, "period", v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSub}>
                Add Sub-product
              </Button>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={nextDisabled()}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {type === "file" && (
                <div className="space-y-2">
                  <Label htmlFor="file">Upload file</Label>
                  <Input id="file" type="file" onChange={(e) => setContentFile(e.target.files?.[0] || null)} />
                </div>
              )}
              {type === "discord" && (
                <div className="space-y-4">
                  {!discordStatus?.connected ? (
                    <div className="space-y-2">
                      <p className="text-sm">Connect your Discord server to assign a role to buyers.</p>
                      <Button type="button" onClick={connectDiscord} disabled={discordLoading === "connect"}>
                        {discordLoading === "connect" && <Spinner className="mr-2" />}Connect Discord
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">Connected to: {discordStatus.guildName || serverId}</p>
                      {subProducts.map((sub, i) => (
                        <div key={i} className="space-y-2">
                          <Label>
                            Role for {sub.name || `Option ${i + 1}`}
                          </Label>
                          <Select
                            value={sub.roleId}
                            onValueChange={(v) => updateSub(i, 'roleId', v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {type === "key" && (
                <div className="space-y-2">
                  <Label htmlFor="keys">License Keys (one per line)</Label>
                  <textarea
                    id="keys"
                    className="w-full rounded-md border px-3 py-1 min-h-[100px]"
                    value={licenseKeys}
                    onChange={(e) => setLicenseKeys(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={status === "published"}
                    onChange={(e) => setStatus(e.target.checked ? "published" : "draft")}
                  />
                  Publish now
                </label>
                <Button onClick={handlePublish} disabled={loading}>
                  {loading && <Spinner className="mr-2" />}Save
                </Button>
              </div>
            </CardFooter>
            {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

