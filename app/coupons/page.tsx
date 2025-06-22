"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface Coupon {
  _id: string
  code: string
  percentOff: number
  active: boolean
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/coupons')
      .then((res) => res.json())
      .then((data) => {
        setCoupons(Array.isArray(data.coupons) ? data.coupons : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const help = <p>Manage your coupon codes for promotions.</p>

  return (
    <DashboardLayout title="Coupons" helpContent={help}>
      <div className="p-4 space-y-4">
        <div className="flex justify-end">
          <Link href="/coupons/new">
            <Button size="sm">New Coupon</Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Spinner className="size-6" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1">Code</th>
                <th className="px-2 py-1">Percent Off</th>
                <th className="px-2 py-1">Active</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id} className="border-t">
                  <td className="px-2 py-1 font-mono">{c.code}</td>
                  <td className="px-2 py-1">{c.percentOff}%</td>
                  <td className="px-2 py-1">{c.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-center" colSpan={3}>
                    No coupons yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  )
}
