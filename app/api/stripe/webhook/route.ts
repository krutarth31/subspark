import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined')
  stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' })
  return stripe
}

async function grantDiscordAccess(
  purchaseId: string,
  session: Stripe.Checkout.Session,
  accountId?: string | null,
) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) return
    const db = await getDb()
    const purchase = await db
      .collection<{ _id: ObjectId; productId: ObjectId }>('purchases')
      .findOne({ _id: new ObjectId(purchaseId) })
    if (!purchase) return
    const product = await db
      .collection<{
        _id: ObjectId
        userId: ObjectId
        type: string
        serverId?: string
        roleId?: string
        subProducts?: { stripePriceId?: string; roleId?: string }[]
      }>('products')
      .findOne({ _id: purchase.productId })
    if (!product || product.type !== 'discord' || !product.serverId) return
    const integration = await db
      .collection<{ userId: ObjectId; guildId: string }>('discordIntegrations')
      .findOne({ userId: product.userId })
    if (!integration) return

    let priceId: string | undefined
    try {
      const detail = await getStripe().checkout.sessions.retrieve(
        session.id,
        { expand: ['line_items'] },
        accountId ? { stripeAccount: accountId } : undefined,
      )
      const price = (detail as any).line_items?.data?.[0]?.price
      if (price) priceId = typeof price === 'string' ? price : price.id
    } catch (err) {
      console.error('Failed to fetch line items', err)
    }

    let roleId = product.roleId
    if (priceId && Array.isArray(product.subProducts)) {
      const opt = product.subProducts.find((s) => s.stripePriceId === priceId)
      if (opt?.roleId) roleId = opt.roleId
    }

    try {
      const resp = await fetch(
        `https://discord.com/api/v10/guilds/${product.serverId}/invites`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ max_uses: 1, unique: true }),
        },
      )
      if (!resp.ok) {
        console.error('Discord invite failed', await resp.text())
        return
      }
      const data = (await resp.json()) as { code?: string }
      const url = data.code ? `https://discord.gg/${data.code}` : undefined
      await db.collection('purchases').updateOne(
        { _id: purchase._id },
        {
          $set: {
            discordInvite: url,
            discordRoleId: roleId,
          },
        },
      )
    } catch (err) {
      console.error('Discord invite error', err)
    }
  } catch (err) {
    console.error('Discord access failed', err)
  }
}

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    return new Response('No signature', { status: 400 })
  }
  const body = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook error', err)
    return new Response('Webhook Error', { status: 400 })
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    const ready = account.charges_enabled && account.details_submitted
    if (!ready) {
      try {
        const db = await getDb()
        await db
          .collection<{ _id: string; active: boolean }>('sellers')
          .updateOne(
            { _id: account.id },
            { $set: { active: false } },
            { upsert: true }
          )
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const accountId = session.metadata?.accountId
    if (session.metadata?.purchaseId) {
      try {
        const db = await getDb()
        const update: any = { status: 'paid' }
        if (session.invoice)
          update.invoiceId =
            typeof session.invoice === 'string'
              ? session.invoice
              : session.invoice.id
        if (session.subscription)
          update.subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
        if (session.payment_intent)
          update.paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent.id
        if (session.customer)
          update.customerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer.id
        await db
          .collection('purchases')
          .updateOne(
            { _id: new ObjectId(session.metadata.purchaseId) },
            { $set: update }
          )
        await grantDiscordAccess(
          session.metadata.purchaseId,
          session,
          event.account || accountId || null,
        )
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
    if (accountId) {
      try {
        const db = await getDb()
        await db
          .collection<{ _id: string; active: boolean }>('sellers')
          .updateOne({ _id: accountId }, { $set: { active: true } }, { upsert: true })
      } catch (err) {
        console.error('DB update failed', err)
      }
    }
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    (event.type === 'customer.subscription.updated' &&
      ((event.data.object as Stripe.Subscription).status === 'canceled' ||
        (event.data.object as Stripe.Subscription).cancel_at_period_end))
  ) {
    const sub = event.data.object as Stripe.Subscription
    try {
      const db = await getDb()
      await db
        .collection('purchases')
        .updateOne(
          { subscriptionId: sub.id },
          { $set: { status: 'canceled' } },
        )
    } catch (err) {
      console.error('DB update failed', err)
    }
  }

  return NextResponse.json({ received: true })
}
