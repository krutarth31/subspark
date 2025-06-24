"use client"
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { DataTable } from '@/components/ui/data-table'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { getColumns, BuyerPurchase } from './columns'

export default function BuyersPage() {
  const [items, setItems] = useState<BuyerPurchase[] | null>(null)

  useEffect(() => {
    fetch('/api/buyers')
      .then((res) => res.json())
      .then((data) => setItems(data.buyers || []))
      .catch(() => setItems([]))
  }, [])

  async function handleAction(id: string, action: string) {
    if (!items) return
    if (action === 'approve' || action === 'decline') {
      const reason = action === 'decline' ? prompt('Reason for decline?') || '' : undefined
      await toast.promise(
        (async () => {
          const res = await fetch(`/api/purchases/${id}/refund`, {
            method: 'PATCH',
            body: JSON.stringify({ action, reason }),
          })
          if (!res.ok) throw new Error('Failed')
          setItems((prev) =>
            prev
              ? prev.map((p) =>
                  p._id === id
                    ? {
                        ...p,
                        status: action === 'approve' ? 'refunded' : p.status,
                        refundRequest: {
                          ...(p.refundRequest || {}),
                          status: action === 'approve' ? 'approved' : 'declined',
                          sellerReason: reason,
                        },
                      }
                    : p
                )
              : prev
          )
        })(),
        {
          loading: action === 'approve' ? 'Refunding...' : 'Saving...',
          success: action === 'approve' ? 'Refunded' : 'Declined',
          error: 'Failed',
        }
      )
    }
  }

  const help = <p>View your customers and refund purchases if needed.</p>

  return (
    <DashboardLayout title="Buyers" helpContent={help}>
      <div className="p-6">
        {items === null ? (
          <div className="flex justify-center">
            <Spinner className="size-6" />
          </div>
        ) : items.length === 0 ? (
          <p>No buyers found.</p>
        ) : (
          <DataTable columns={getColumns(handleAction)} data={items} />
        )}
      </div>
    </DashboardLayout>
  )
}
