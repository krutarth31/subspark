"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckIcon, FileIcon, KeyIcon, ServerIcon } from "lucide-react"
import { useRouter } from "next/navigation"

const types = [
  { id: "file", label: "File", icon: FileIcon },
  { id: "discord", label: "Discord", icon: ServerIcon },
  { id: "key", label: "License Key", icon: KeyIcon },
]

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [type, setType] = useState<string>("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("10")
  const [currency, setCurrency] = useState("USD")
  const [billing, setBilling] = useState("one")
  const [period, setPeriod] = useState("month")
  const [availableUnits, setAvailableUnits] = useState("")
  const [unlimited, setUnlimited] = useState(false)
  const [planDescription, setPlanDescription] = useState("")
  const [expireDays, setExpireDays] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [serverId, setServerId] = useState("")
  const [roleId, setRoleId] = useState("")
  const [licenseKeys, setLicenseKeys] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [error, setError] = useState<string | null>(null)

  // persist between reloads
  useEffect(() => {
    const stored = localStorage.getItem("newProduct")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setType(data.type || "")
        setName(data.name || "")
        setDescription(data.description || "")
        setPrice(data.price || "10")
        setCurrency(data.currency || "USD")
        setBilling(data.billing || "one")
        setPeriod(data.period || "month")
        setStatus(data.status || "draft")
        setServerId(data.serverId || "")
        setRoleId(data.roleId || "")
        setLicenseKeys(data.licenseKeys || "")
        setAvailableUnits(data.availableUnits || "")
        setUnlimited(Boolean(data.unlimited))
        setPlanDescription(data.planDescription || "")
        setExpireDays(data.expireDays || "")
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [file])

  useEffect(() => {
    const data = {
      type,
      name,
      description,
      price,
      currency,
      billing,
      period,
      status,
      serverId,
      roleId,
      licenseKeys,
      availableUnits,
      unlimited,
      planDescription,
      expireDays,
    }
    localStorage.setItem("newProduct", JSON.stringify(data))
  }, [
    type,
    name,
    description,
    price,
    billing,
    status,
    serverId,
    roleId,
    licenseKeys,
    availableUnits,
    unlimited,
    planDescription,
    expireDays,
    currency,
    period,
  ])

  const nextDisabled = () => {
    if (step === 1) return !type
    if (step === 2) return name.trim().length === 0
    if (step === 3) {
      const unitsInvalid =
        !unlimited &&
        availableUnits.trim().length > 0 &&
        isNaN(parseInt(availableUnits))

      if (billing === 'free') {
        return !unlimited &&
          (availableUnits.trim().length === 0 || isNaN(parseInt(availableUnits)))
      }

      if (billing === 'one') {
        return (
          price.trim().length === 0 ||
          currency.trim().length === 0 ||
          unitsInvalid
        )
      }

      if (billing === 'recurring') {
        return (
          price.trim().length === 0 ||
          currency.trim().length === 0 ||
          !period ||
          unitsInvalid
        )
      }
    }
    if (step === 4) {
      if (type === "file") return !contentFile
      if (type === "discord") return !serverId.trim() || !roleId.trim()
      if (type === "key") return licenseKeys.trim().length === 0 && !csvFile
    }
    return false
  }

  async function handlePublish() {
    const priceNumber = billing === 'free' ? 0 : parseFloat(price)
    if (isNaN(priceNumber)) {
      setError("Invalid price")
      return
    }
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        price: priceNumber,
        currency,
        billing,
        period: billing === 'recurring' ? period : undefined,
        planDescription,
        availableUnits: unlimited ? null : availableUnits ? parseInt(availableUnits) : null,
        unlimited,
        expireDays: expireDays ? parseInt(expireDays) : null,
        type,
        status,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Failed to save")
      return
    }
    localStorage.removeItem("newProduct")
    router.push("/products")
  }

  return (
    <DashboardLayout title="New Product">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <ol className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="flex flex-1 flex-col items-center">
              <div className="flex items-center w-full">
                <div
                  className={`size-7 rounded-full border flex items-center justify-center font-medium ${
                    step >= n
                      ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"
                  }`}
                >
                  {step > n ? <CheckIcon className="size-4" /> : n}
                </div>
                {n < 5 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
              </div>
            </li>
          ))}
        </ol>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select product type</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={() => setStep(2)} disabled={nextDisabled()}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}
        {step === 2 && (
          <Card asChild>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(3)
              }}
              className="space-y-4"
            >
              <CardHeader>
                <CardTitle>Product details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {name.length}/60
                  </p>
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
                  <Label htmlFor="file">Image</Label>
                  {preview && (
                    <img src={preview} alt="Preview" className="h-24 w-full rounded object-cover" />
                  )}
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={nextDisabled()}>
                  Next
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
        {step === 3 && (
          <Card asChild>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(4)
              }}
              className="space-y-4"
            >
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={billing} onValueChange={setBilling} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="free">Free</TabsTrigger>
                    <TabsTrigger value="one">One time</TabsTrigger>
                    <TabsTrigger value="recurring">Recurring</TabsTrigger>
                  </TabsList>
                </Tabs>
                {billing !== 'free' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="available">Available units</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="available"
                        value={availableUnits}
                        onChange={(e) => setAvailableUnits(e.target.value)}
                        disabled={unlimited}
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <Checkbox
                          checked={unlimited}
                          onCheckedChange={(v) => setUnlimited(!!v)}
                        />
                        Unlimited
                      </label>
                  </div>
                </div>
                  {billing !== 'recurring' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="planDesc">Plan description</Label>
                        <textarea
                          id="planDesc"
                          className="min-h-[60px] w-full rounded-md border px-3 py-1"
                          value={planDescription}
                          onChange={(e) => setPlanDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expire">Auto expire access (days)</Label>
                        <Input
                          id="expire"
                          value={expireDays}
                          onChange={(e) => setExpireDays(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  {billing === 'recurring' && (
                    <div className="space-y-2">
                      <Label htmlFor="period">Subscription period</Label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger id="period" className="w-full">
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
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" disabled={nextDisabled()}>
                  Next
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
        {step === 4 && (
          <Card asChild>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(5)
              }}
              className="space-y-4"
            >
              <CardHeader>
                <CardTitle>Delivery content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {type === "file" && (
                  <div className="space-y-2">
                    <Label htmlFor="content-file">Upload file</Label>
                    <Input
                      id="content-file"
                      type="file"
                      onChange={(e) => setContentFile(e.target.files?.[0] || null)}
                    />
                  </div>
                )}
                {type === "discord" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="server">Server ID</Label>
                      <Input
                        id="server"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role ID</Label>
                      <Input
                        id="role"
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={() => alert("Test not implemented")}>Test Connection</Button>
                  </div>
                )}
                {type === "key" && (
                  <div className="space-y-2">
                    <Label htmlFor="keys">License Keys</Label>
                    <textarea
                      id="keys"
                      className="w-full rounded-md border px-3 py-1 min-h-[100px]"
                      value={licenseKeys}
                      onChange={(e) => setLicenseKeys(e.target.value)}
                    />
                    <Input id="csv" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button type="submit" disabled={nextDisabled()}>
                  Next
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Type:</strong> {type}
              </p>
              <p>
                <strong>Name:</strong> {name}
              </p>
              <p>
                <strong>Billing:</strong> {billing}
              </p>
              {billing !== 'free' && (
                <p>
                  <strong>Price:</strong> {parseFloat(price).toFixed(2)} {currency}
                  {billing === 'recurring' ? ` / ${period}` : ''}
                </p>
              )}
              <p>
                <strong>Units:</strong>{' '}
                {unlimited ? 'Unlimited' : availableUnits || '-'}
              </p>
              {(billing === 'free' || billing === 'one') && (
                <>
                  {planDescription && (
                    <p>
                      <strong>Plan:</strong> {planDescription}
                    </p>
                  )}
                  {expireDays && (
                    <p>
                      <strong>Expires in:</strong> {expireDays} days
                    </p>
                  )}
                </>
              )}
              <p>
                <strong>Status:</strong> {status}
              </p>
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={status === "published"}
                    onCheckedChange={(v) => setStatus(v ? "published" : "draft")}
                  />
                  Publish now
                </label>
                <Button onClick={handlePublish}>Save</Button>
              </div>
            </CardFooter>
            {error && (
              <p className="px-6 pb-4 text-sm text-destructive">{error}</p>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
