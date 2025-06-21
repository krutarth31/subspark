"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface Product {
  _id: string
  name: string
  description?: string
  price: number
  currency: string
  billing: "free" | "one" | "recurring"
  period?: string
  stripePriceId?: string
}

export default function BuyPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  async function checkout() {
    if (!product || paying) return
    setPaying(true)
    try {
      const res = await fetch(`/api/checkout/${product._id}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url as string
        return
      }
    } finally {
      setPaying(false)
    }
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
            {product.billing !== "free" && (
              <p>
                Price: {product.price.toFixed(2)} {product.currency}
                {product.billing === "recurring" ? ` / ${product.period}` : ""}
              </p>
            )}
            {product.billing === "free" ? (
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
