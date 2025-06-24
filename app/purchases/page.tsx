"use client"
import { useEffect, useState, useRef } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'
import { DataTable } from '@/components/ui/data-table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getColumns, Purchase } from './columns'

export default function PurchasesPage() {
  const [items, setItems] = useState<Purchase[] | null>(null)
  const [refundId, setRefundId] = useState<string | null>(null)
  const [reasonType, setReasonType] = useState('')
  const [reasonText, setReasonText] = useState('')
  const prevStatuses = useRef<Record<string, string | undefined>>({})

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/purchases')
      const data = await res.json().catch(() => ({}))
      const purchases = (data.purchases || []) as Purchase[]
      purchases.forEach((p) => {
        const status = p.refundRequest?.status
        if (
          prevStatuses.current[p._id] &&
          prevStatuses.current[p._id] !== status &&
          (status === 'approved' || status === 'declined')
        ) {
          toast.info(`Refund ${status} for ${p.productName}`)
        }
        prevStatuses.current[p._id] = status
      })
      setItems(purchases)
    }
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
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
        setRefundId(id)
        break
      }
    }
  }

  async function submitRefund() {
    if (!refundId) return
    const reason = reasonType === 'other' ? reasonText : reasonType
    setRefundId(null)
    setReasonType('')
    setReasonText('')
    await toast.promise(
      (async () => {
        const res = await fetch(`/api/purchases/${refundId}/refund`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        })
        if (!res.ok) throw new Error('Failed')
        setItems((prev) =>
          prev
            ? prev.map((p) =>
                p._id === refundId
                  ? {
                      ...p,
                      refundRequest: { status: 'requested', reason },
                      status: 'refund_requested',
                    }
                  : p,
              )
            : prev,
        )
        prevStatuses.current[refundId] = 'requested'
      })(),
      {
        loading: 'Requesting refund...',
        success: 'Refund requested',
        error: 'Failed to refund',
      },
    )
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
          <DataTable
            columns={getColumns(handleAction)}
            data={items}
            renderSubRows={(row) => {
              const p = row.original as Purchase
              return (
                <div className="p-4 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                  {p.invoiceId && (
                    <div className="col-span-1">Invoice: {p.invoiceId}</div>
                  )}
                  {p.subscriptionId && (
                    <div className="col-span-1">Sub: {p.subscriptionId}</div>
                  )}
                  {p.paymentIntentId && (
                    <div className="col-span-1">Payment: {p.paymentIntentId}</div>
                  )}
                  {p.refundRequest?.reason && (
                    <div className="col-span-2">Reason: {p.refundRequest.reason}</div>
                  )}
                  {p.refundRequest?.sellerReason && (
                    <div className="col-span-2">Seller: {p.refundRequest.sellerReason}</div>
                  )}
                </div>
              )
            }}
          />
        )}
      </div>
      <Sheet open={!!refundId} onOpenChange={(o) => !o && setRefundId(null)}>
        <SheetContent side="bottom" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Request Refund</SheetTitle>
            <SheetDescription>Select a reason for your refund.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reasonType} onValueChange={setReasonType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_described">Not as described</SelectItem>
                  <SelectItem value="accidental">Accidental purchase</SelectItem>
                  <SelectItem value="quality">Poor quality</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reasonType === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Details</Label>
                <textarea
                  id="reason"
                  className="min-h-[80px] w-full rounded-md border px-3 py-1"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </div>
            )}
          </div>
          <SheetFooter>
            <Button onClick={submitRefund} disabled={!reasonType}>Submit</Button>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  )
}
