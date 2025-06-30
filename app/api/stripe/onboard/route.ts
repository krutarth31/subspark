import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getDb } from "@/lib/mongo"
import { cookies } from "next/headers"
import { ObjectId } from "mongodb"

let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (stripe) return stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not defined")
  }
  stripe = new Stripe(secretKey, { apiVersion: "2022-11-15" })
  return stripe
}

export async function POST(request: Request) {
  try {
    const { origin } = new URL(request.url)
    let stripe: Stripe
    try {
      stripe = getStripe()
    } catch (err) {
      console.error(err)
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      )
    }
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    let portalConfigId: string | undefined
    try {
      const portalConfig = await stripe.billingPortal.configurations.create(
        {
          business_profile: { headline: "Seller portal" },
          features: {
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true, mode: "immediately" },
          },
        },
        { stripeAccount: account.id },
      )
      portalConfigId = portalConfig.id
    } catch (err) {
      console.error(err)
    }
    const db = await getDb().catch(() => null)
    if (db) {
      let userId: ObjectId | null = null
      let userInfo: { name: string; email: string; accountId?: string } | null = null
      try {
        const cookieStore = await cookies()
        const token = cookieStore.get("session")?.value
        if (token) {
          const session = await db
            .collection<{ token: string; userId: ObjectId }>("sessions")
            .findOne({ token })
          if (session) {
            userId = session.userId
            const u = await db
              .collection<{ _id: ObjectId; name: string; email: string; accountId?: string }>("users")
              .findOne({ _id: session.userId }, { projection: { name: 1, email: 1, accountId: 1 } })
            if (u) userInfo = { name: u.name, email: u.email, accountId: u.accountId }
          }
        }
      } catch {
        // ignore cookie errors
      }
      await db
        .collection<{ _id: string; active: boolean; userId?: ObjectId; name?: string; email?: string; accountId?: string; portalConfigId?: string }>(
          "sellers"
        )
        .updateOne(
          { _id: account.id },
          { $setOnInsert: { active: false, portalConfigId }, $set: { userId, ...(userInfo ?? {}) } },
          { upsert: true }
        )
    }
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/onboarding`,
      return_url: `${origin}/onboarding?step=2`,
      type: "account_onboarding",
    })
    return NextResponse.json({ url: accountLink.url, accountId: account.id })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
