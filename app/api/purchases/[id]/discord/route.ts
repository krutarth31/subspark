import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'
import Stripe from 'stripe'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(key, { apiVersion: '2022-11-15' })
  return stripe
}

export async function GET(
  request: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> },
) {
  const { id } = await (ctx as { params: { id: string } | Promise<{ id: string }> }).params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.redirect('/purchases')
  const db = await getDb()
  const session = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!session) return NextResponse.redirect('/purchases')
  const purchase = await db
    .collection<{ _id: ObjectId; userId: ObjectId; productId: ObjectId; status: string; subscriptionId?: string; invoiceId?: string; sellerId: string }>('purchases')
    .findOne({ _id: new ObjectId(id), userId: session.userId })
  if (!purchase || purchase.status !== 'paid')
    return NextResponse.redirect('/purchases')
  const product = await db
    .collection<{ _id: ObjectId; type: string; serverId?: string; roleId?: string; subProducts?: { stripePriceId?: string; roleId?: string }[] }>('products')
    .findOne({ _id: purchase.productId })
  if (!product || product.type !== 'discord' || !product.serverId)
    return NextResponse.redirect('/purchases')
  let priceId: string | undefined
  if (purchase.subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(
        purchase.subscriptionId,
        { expand: ['items'] },
        { stripeAccount: purchase.sellerId },
      )
      priceId = sub.items.data[0]?.price?.id
    } catch (err) {
      console.error('Stripe retrieve subscription failed', err)
    }
  } else if (purchase.invoiceId) {
    try {
      const inv = await getStripe().invoices.retrieve(
        purchase.invoiceId,
        { expand: ['lines'] },
        { stripeAccount: purchase.sellerId },
      )
      const price = inv.lines?.data?.[0]?.price
      if (price) priceId = typeof price === 'string' ? price : (price as any).id
    } catch (err) {
      console.error('Stripe retrieve invoice failed', err)
    }
  }
  let roleId = product.roleId
  if (priceId && Array.isArray(product.subProducts)) {
    const opt = product.subProducts.find((s) => s.stripePriceId === priceId)
    if (opt?.roleId) roleId = opt.roleId
  }
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return NextResponse.redirect('/purchases')
  let inviteUrl: string | null = null
  try {
    const channelsRes = await fetch(
      `https://discord.com/api/guilds/${product.serverId}/channels`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    )
    if (channelsRes.ok) {
      const chans: any[] = await channelsRes.json()
      const channelId = chans?.[0]?.id
      if (channelId) {
        const inviteRes = await fetch(
          `https://discord.com/api/channels/${channelId}/invites`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bot ${botToken}`,
            },
            body: JSON.stringify({ max_uses: 1, unique: true }),
          },
        )
        if (inviteRes.ok) {
          const invite = await inviteRes.json()
          inviteUrl = `https://discord.gg/${invite.code}`
        }
      }
    }
    if (roleId) {
      const user = await db
        .collection<{ _id: ObjectId; discordId?: string }>('users')
        .findOne({ _id: session.userId }, { projection: { discordId: 1 } })
      if (user?.discordId) {
        await fetch(
          `https://discord.com/api/guilds/${product.serverId}/members/${user.discordId}/roles/${roleId}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bot ${botToken}` },
          },
        ).catch(() => {})
      }
    }
  } catch (err) {
    console.error('Discord invite failed', err)
  }
  return NextResponse.redirect(inviteUrl || '/purchases')
}
