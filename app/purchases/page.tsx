"use client"
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'
import { DataTable } from '@/components/ui/data-table'
import { toast } from 'sonner'
import { getColumns, Purchase } from './columns'

export default function PurchasesPage() {
  const [items, setItems] = useState<Purchase[] | null>(null)

  useEffect(() => {
    fetch('/api/purchases')
      .then((res) => res.json())
      .then((data) => setItems(data.purchases || []))
      .catch(() => setItems([]))
  }, [])

  async function handleAction(id: string, action: string) {
    if (!items) return
    switch (action) {
      case 'invoice': {
        const res = await fetch(`/api/purchases/${id}/invoice`)
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.url) {
          window.open(data.url as string, '_blank')
        } else {
          toast.error(data.error || 'Failed')
        }
        break
      }
      case 'cancel': {
        await toast.promise(
          (async () => {
            const res = await fetch(`/api/purchases/${id}/cancel`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed')
            setItems((prev) =>
              prev ? prev.map((p) => (p._id === id ? { ...p, status: 'canceled' } : p)) : prev
            )
          })(),
          { loading: 'Canceling...', success: 'Canceled', error: 'Failed to cancel' }
        )
        break
      }
      case 'payment': {
        const res = await fetch(`/api/purchases/${id}/payment-method`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.url) {
          window.location.href = data.url as string
        } else {
          toast.error(data.error || 'Failed')
        }
        break
      }
      case 'refund': {
        await toast.promise(
          (async () => {
            const res = await fetch(`/api/purchases/${id}/refund`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed')
            setItems((prev) =>
              prev ? prev.map((p) => (p._id === id ? { ...p, status: 'refunded' } : p)) : prev
            )
          })(),
          { loading: 'Requesting refund...', success: 'Refund requested', error: 'Failed to refund' }
        )
        break
      }
    }
  }

  const help = <p>All products you have purchased will appear here.</p>

  return (
    <DashboardLayout title="Purchases" helpContent={help}>
      <div className="p-6">
        {items === null ? (
          <div className="flex justify-center">
            <Spinner className="size-6" />
          </div>
        ) : items.length === 0 ? (
          <p>No purchases found.</p>
        ) : (
          <DataTable columns={getColumns(handleAction)} data={items} />
        )}
      </div>
    </DashboardLayout>
  )
}
