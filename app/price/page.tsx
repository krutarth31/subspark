'use client'

import DashboardLayout from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function Page() {
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    setLoading(true)
    const accountId = window.localStorage.getItem('stripe_account_id')
    if (!accountId) {
      alert('Missing Stripe account')
      setLoading(false)
      return
    }
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url as string
        return
      }
    }
    const msg = await res.text()
    alert(msg || 'Failed to create checkout')
    setLoading(false)
  }

  return (
    <DashboardLayout title='Pricing'>
      <div className='flex flex-1 items-center justify-center p-6'>
        <div className='flex flex-col items-center gap-4'>
          <h2 className='text-xl font-semibold'>Subscribe to start selling</h2>
          <p className='text-sm text-muted-foreground'>
            Pay the platform fee to activate your seller account.
          </p>
          <Button onClick={handleSubscribe} disabled={loading}>
            {loading ? 'Processing...' : 'Pay Subscription'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
