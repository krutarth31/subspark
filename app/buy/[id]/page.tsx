"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ServiceDescription } from "@/components/service-description"
import LoginRegister from "@/components/login-register"

interface BillingOption {
  name?: string
  billing: "free" | "one" | "recurring"
  price?: number
  currency: string
  period?: string
  stripePriceId?: string
  service?: string
}

interface Product {
  _id: string
  name: string
  description?: string
  imageUrl?: string
  price: number
  currency: string
  billing: "free" | "one" | "recurring"
  period?: string
  stripePriceId?: string
  subProducts?: BillingOption[]
  planDescription?: string
}

export default function BuyPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [billing, setBilling] = useState<string>("")
  const [billingIndex, setBillingIndex] = useState<number>(0)
  const [coupon, setCoupon] = useState("")
  const [user, setUser] = useState<any | null | undefined>(undefined)

  const help = <p>Select a plan and proceed to checkout.</p>

  function formatOption(o: BillingOption) {
    if (o.billing === "free") return "Free"
    const base = `${o.price?.toFixed(2)} ${o.currency}`
    return o.billing === "recurring" && o.period ? `${base} / ${o.period}` : base
  }

  useEffect(() => {
    fetch('/api/auth/user')
      .then((res) => res.json())
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        if (data.product?.subProducts?.length) {
          setBilling(data.product.subProducts[0].name || data.product.subProducts[0].billing)
          setBillingIndex(0)
        } else if (data.product) {
          setBilling(data.product.billing)
          setBillingIndex(0)
        }
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load product")
        setLoading(false)
      })
  }, [id])

  async function checkout() {
    if (!product || paying) return
    setPaying(true)
    try {
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/checkout/${product._id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sub: billing, subIndex: billingIndex, coupon }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok || !data.url) throw new Error("Failed")
          window.location.href = data.url as string
        })(),
        {
          loading: "Creating checkout...",
          success: "Redirecting...",
          error: "Checkout failed",
        }
      )
    } finally {
      setPaying(false)
    }
  }

  const option =
    product?.subProducts?.[billingIndex] ??
    product?.subProducts?.find((o) => (o.name ? o.name === billing : o.billing === billing))
  const display: BillingOption = option || {
    billing: product?.billing,
    price: product?.price,
    currency: product?.currency,
    period: product?.period,
    service: product?.planDescription,
  }

  if (user === undefined) {
    return (
      <DashboardLayout title="Checkout" helpContent={help}>
        <div className="p-6 flex justify-center">
          <Spinner className="size-6" />
        </div>
      </DashboardLayout>
    )
  }

  if (user === null) {
    return (
      <DashboardLayout title="Login" helpContent={help}>
        <div className="p-6 flex justify-center">
          <LoginRegister redirect={`/buy/${id}`} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Checkout" helpContent={help}>
      <div className="p-6 flex justify-center">
        {loading ? (
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="h-48 w-full" />
            <div className="space-y-2 text-center">
              <Skeleton className="h-6 w-1/3 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !product ? (
          <p>Product not found.</p>
        ) : (
          <div className="w-full max-w-2xl space-y-4">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt="Product image"
                className="w-full h-48 object-cover rounded-md"
              />
            )}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-muted-foreground">{product.description}</p>
              )}
            </div>
            {product.subProducts && product.subProducts.length > 0 && (
              <div className={`grid gap-4 ${product.subProducts.length > 1 ? "sm:grid-cols-2" : ""}`}
              >
                {product.subProducts.map((o, idx) => (
                  <Card
                    key={idx}
                    className={`cursor-pointer${
                      billing === (o.name || o.billing) ? " ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setBilling(o.name || o.billing)
                      setBillingIndex(idx)
                    }}
                  >
                    <CardHeader className="text-center space-y-1">
                      <CardTitle className="text-lg">{o.name || `Option ${idx + 1}`}</CardTitle>
                      {o.service && (
                        <CardDescription>
                          <ServiceDescription text={o.service} />
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-xl font-semibold">{formatOption(o)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!product.subProducts || product.subProducts.length === 0 ? (
              <>
                {display.service && (
                  <div className="text-center text-sm text-muted-foreground mb-2">
                    <ServiceDescription text={display.service} />
                  </div>
                )}
                <p className="text-center text-2xl font-semibold">{formatOption(display)}</p>
              </>
            ) : null}
            <div>
              <label className="text-sm" htmlFor="coupon">
                Coupon Code
              </label>
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="border mt-1 w-full rounded-md px-2 py-1 text-sm"
              />
            </div>
            <Button onClick={checkout} disabled={paying} className="w-full">
              {paying && <Spinner className="mr-2" />}
              {display.billing === "free" ? "Get Access" : "Checkout"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

