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
  const [billing, setBilling] = useState("one")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
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
        setBilling(data.billing || "one")
        setStatus(data.status || "draft")
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
    const data = { type, name, description, price, billing, status }
    localStorage.setItem("newProduct", JSON.stringify(data))
  }, [type, name, description, price, billing, status])

  const nextDisabled = () => {
    if (step === 1) return !type
    if (step === 2) return name.trim().length === 0
    if (step === 3) return price.trim().length === 0
    return false
  }

  async function handlePublish() {
    const priceNumber = parseFloat(price)
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
          {[1, 2, 3, 4].map((n) => (
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
                {n < 4 && <div className={`h-px flex-1 ${step > n ? "bg-primary" : "bg-border"}`} />}
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
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="one">One time</TabsTrigger>
                    <TabsTrigger value="sub">Subscription</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
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
                <strong>Price:</strong> ${parseFloat(price).toFixed(2)} {billing === "sub" ? "/ mo" : ""}
              </p>
              <p>
                <strong>Status:</strong> {status}
              </p>
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
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
