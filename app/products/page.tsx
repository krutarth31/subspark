"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { getColumns, Product } from './columns'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])


  function archiveProduct(id: string) {
    if (archivingId) return
    setArchivingId(id)
    fetch(`/api/products/${id}`, { method: 'DELETE' })
      .then(() => {
        setProducts((prev) => prev.filter((p) => p._id !== id))
      })
      .finally(() => setArchivingId(null))
  }

  function toggleRow(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const help = (
    <p>
      Manage your products here. Add new products or archive existing ones.
    </p>
  )

  if (loading)
    return (
      <DashboardLayout title="Products" helpContent={help}>
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner className="size-6" />
        </div>
      </DashboardLayout>
    )

  return (
    <DashboardLayout title="Products" helpContent={help}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/products/new">Add Product</Link>
          </Button>
        </div>
        {products.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <DataTable
            columns={getColumns(archiveProduct, archivingId, toggleRow, expanded)}
            data={products}
            renderSubRows={(row) => {
              const p = row.original as Product
              if (!expanded[p._id]) return null
              if (!p.subProducts || p.subProducts.length <= 1) return null
              return (
                <div className="ml-6">
                  <Table className="w-[95%] text-sm">
                    <TableHeader className="bg-muted text-xs">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.subProducts.map((s, i) => (
                        <TableRow key={i} className="border-t">
                          <TableCell>{s.name || '-'}</TableCell>
                          <TableCell>{s.billing}</TableCell>
                          <TableCell className="text-right">
                            {s.billing === 'free'
                              ? 'Free'
                              : `${s.price?.toFixed(2)} ${s.currency}`}
                            {s.billing === 'recurring' && s.period ? ` / ${s.period}` : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
