"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"

interface Product {
  _id: string
  name: string
  price: number
  currency: string
  billing: 'free' | 'one' | 'recurring'
  description?: string
  planDescription?: string
  availableUnits?: number
  unlimited?: boolean
  expireDays?: number
  period?: string
  type: "discord" | "file" | "key"
  status: "draft" | "published"
  sales?: number
  createdAt: string
  updatedAt?: string
  deliveryFile?: string
  serverId?: string
  roleId?: string
  licenseKeys?: string
}

export default function ViewProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) return <DashboardLayout title="Product">Loading...</DashboardLayout>
  if (!product) return <DashboardLayout title="Product">Not found</DashboardLayout>

  return (
    <DashboardLayout title={product.name}>
      <div className="p-4 space-y-2">
        <p><strong>Type:</strong> {product.type}</p>
        <p><strong>Status:</strong> {product.status}</p>
        <p><strong>Billing:</strong> {product.billing}</p>
        {product.billing !== 'free' && (
          <p>
            <strong>Price:</strong> {product.price.toFixed(2)} {product.currency}
            {product.billing === 'recurring' ? ` / ${product.period}` : ''}
          </p>
        )}
        <p>
          <strong>Units:</strong>{' '}
          {product.unlimited ? 'Unlimited' : product.availableUnits ?? '-'}
        </p>
        {product.type === 'file' && product.deliveryFile && (
          <p>
            <strong>File:</strong> {product.deliveryFile}
          </p>
        )}
        {product.type === 'discord' && (
          <p>
            <strong>Discord:</strong> {product.serverId} / {product.roleId}
          </p>
        )}
        {product.type === 'key' && product.licenseKeys && (
          <p>
            <strong>Keys:</strong> {product.licenseKeys.split('\n').length}
          </p>
        )}
        {(product.billing === 'free' || product.billing === 'one') && (
          <>
            {product.planDescription && (
              <p>
                <strong>Plan:</strong> {product.planDescription}
              </p>
            )}
            {product.expireDays && (
              <p>
                <strong>Expires in:</strong> {product.expireDays} days
              </p>
            )}
          </>
        )}
        <p><strong>Sales:</strong> {product.sales ?? 0}</p>
        <p><strong>Created:</strong> {new Date(product.createdAt).toLocaleDateString()}</p>
        {product.updatedAt && (
          <p><strong>Updated:</strong> {new Date(product.updatedAt).toLocaleDateString()}</p>
        )}
        <Button asChild>
          <a href={`/products/${params.id}/edit`}>Edit Product</a>
        </Button>
      </div>
    </DashboardLayout>
  )
}
