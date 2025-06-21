"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ServiceDescription } from "@/components/service-description"

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
  subProducts?: {
    name?: string
    billing: "free" | "one" | "recurring"
    price?: number
    currency: string
    period?: string
    service?: string
  }[]
}

export default function ViewProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [guildName, setGuildName] = useState<string | null>(null)
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.product)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!product || product.type !== 'discord') return
    fetch('/api/discord/status')
      .then((res) => res.json())
      .then((data) => setGuildName(data.guildName || null))
      .catch(() => {})
    fetch('/api/discord/roles')
      .then((res) => res.json())
      .then((data) => setRoles(Array.isArray(data.roles) ? data.roles : []))
      .catch(() => {})
  }, [product])

  if (loading)
    return (
      <DashboardLayout title="Product">
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="size-6" />
        </div>
      </DashboardLayout>
    )
  if (!product) return <DashboardLayout title="Product">Not found</DashboardLayout>

  return (
    <DashboardLayout title={product.name}>
      <div className="p-4 space-y-2">
        <p><strong>Type:</strong> {product.type}</p>
        <p><strong>Status:</strong> {product.status}</p>
        {product.subProducts && product.subProducts.length > 1 ? (
          <div>
            <p className="font-semibold">Sub-products:</p>
            <ul className="ml-4 list-disc space-y-2">
              {product.subProducts.map((o, idx) => (
                <li key={idx} className="space-y-1">
                  <p className="font-medium">{o.name || `Option ${idx + 1}`}</p>
                  {o.service && (
                    <ServiceDescription className="text-muted-foreground" text={o.service} />
                  )}
                  <p>
                    {o.billing === 'free'
                      ? 'Free'
                      : `${o.price?.toFixed(2)} ${o.currency}`}
                    {o.billing === 'recurring' && o.period ? ` / ${o.period}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p>
              <strong>Billing:</strong> {product.billing}
            </p>
            {product.billing !== 'free' && (
              <p>
                <strong>Price:</strong> {product.price.toFixed(2)} {product.currency}
                {product.billing === 'recurring' ? ` / ${product.period}` : ''}
              </p>
            )}
          </>
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
          <div>
            <p>
              <strong>Discord:</strong> {guildName || product.serverId}
            </p>
            {product.subProducts && product.subProducts.length > 0 ? (
              <ul className="ml-4 list-disc">
                {product.subProducts.map((s, idx) => (
                  <li key={idx}>
                    {(s.name ? `${s.name}: ` : '') +
                      (roles.find((r) => r.id === s.roleId)?.name || s.roleId || '-')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ml-4">{roles.find((r) => r.id === product.roleId)?.name || product.roleId}</p>
            )}
          </div>
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
