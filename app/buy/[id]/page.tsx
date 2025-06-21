"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { ServiceDescription } from "@/components/service-description"

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
  price: number
  currency: string
  billing: "free" | "one" | "recurring"
  period?: string
  stripePriceId?: string
  subProducts?: BillingOption[]
}

export default function BuyPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [billing, setBilling] = useState<string>('')

  function formatOption(o: BillingOption) {
    if (o.billing === 'free') return 'Free'
    const base = `${o.price?.toFixed(2)} ${o.currency}`
    return o.billing === 'recurring' && o.period ? `${base} / ${o.period}` : base
  }

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        if (data.product?.subProducts?.length) {
          setBilling(data.product.subProducts[0].name || data.product.subProducts[0].billing)
        } else if (data.product) {
          setBilling(data.product.billing)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function checkout() {
    if (!product || paying) return
    setPaying(true)
    try {
      const res = await fetch(`/api/checkout/${product._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub: billing }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url as string
        return
      }
    } finally {
      setPaying(false)
    }
  }

  const option = product?.subProducts?.find(
    (o) => (o.name ? o.name === billing : o.billing === billing),
  )
  const display: BillingOption = option || {
    billing: product?.billing,
    price: product?.price,
    currency: product?.currency,
    period: product?.period,
    service: product?.planDescription,
  }

  return (
    <DashboardLayout title="Checkout">
      <div className="p-6 flex justify-center">
        {loading ? (
          <Spinner className="size-6" />
        ) : !product ? (
          <p>Product not found.</p>
        ) : (
          <div className="w-full max-w-2xl space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}
            </div>
            {product.subProducts && product.subProducts.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.subProducts.map((o, idx) => (
                  <Card
                    key={idx}
                    className={`cursor-pointer${
                      billing === (o.name || o.billing) ? ' ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setBilling(o.name || o.billing)}
                  >
                    <CardHeader className="text-center space-y-1">
                      <CardTitle className="text-lg">
                        {o.name || `Option ${idx + 1}`}
                      </CardTitle>
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
                <p className="text-center text-2xl font-semibold">
                  {formatOption(display)}
                </p>
              </>
            ) : null}
            <Button onClick={checkout} disabled={paying} className="w-full">
              {paying && <Spinner className="mr-2" />}
              {display.billing === 'free' ? 'Get Access' : 'Checkout'}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
