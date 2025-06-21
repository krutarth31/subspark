"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface BillingOption {
  billing: "free" | "one" | "recurring"
  price?: number
  currency: string
  period?: string
  stripePriceId?: string
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
  billingOptions?: BillingOption[]
}

export default function BuyPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [billing, setBilling] = useState<string>('')

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        if (data.product?.billingOptions?.length) {
          setBilling(data.product.billingOptions[0].billing)
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
        body: JSON.stringify({ billing }),
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

  const option = product?.billingOptions?.find((o) => o.billing === billing)
  const display = option || {
    billing: product?.billing,
    price: product?.price,
    currency: product?.currency,
    period: product?.period,
  }

  return (
    <DashboardLayout title="Buy Product">
      <div className="p-6 flex flex-col items-center gap-4">
        {loading ? (
          <Spinner className="size-6" />
        ) : !product ? (
          <p>Product not found.</p>
        ) : (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {product.description && <p>{product.description}</p>}
            {display.billing !== "free" && (
              <p>
                Price: {display.price?.toFixed(2)} {display.currency}
                {display.billing === "recurring" && display.period
                  ? ` / ${display.period}`
                  : ""}
              </p>
            )}
            {product.billingOptions && product.billingOptions.length > 1 && (
              <select
                value={billing}
                onChange={(e) => setBilling(e.target.value)}
                className="rounded border px-2 py-1"
              >
                {product.billingOptions.map((o) => (
                  <option key={o.billing} value={o.billing}>
                    {o.billing}
                  </option>
                ))}
              </select>
            )}
            {display.billing === "free" ? (
              <p>This product is free.</p>
            ) : (
              <Button onClick={checkout} disabled={paying}>
                {paying && <Spinner className="mr-2" />}Checkout
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
