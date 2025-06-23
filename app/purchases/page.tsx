"use client"
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'

interface Purchase {
  _id: string
  productId: string
  productName: string
  status: string
  createdAt: string
}

export default function PurchasesPage() {
  const [items, setItems] = useState<Purchase[] | null>(null)

  useEffect(() => {
    fetch('/api/purchases')
      .then((res) => res.json())
      .then((data) => setItems(data.purchases || []))
      .catch(() => setItems([]))
  }, [])

  const help = <p>All products you have purchased will appear here.</p>

  return (
    <DashboardLayout title="Purchases" helpContent={help}>
      <div className="p-6">
        {items === null ? (
          <div className="flex justify-center"><Spinner className="size-6" /></div>
        ) : items.length === 0 ? (
          <p>No purchases found.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((p) => (
              <li key={p._id} className="border rounded-md p-3">
                <div className="font-medium">{p.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()} - {p.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
