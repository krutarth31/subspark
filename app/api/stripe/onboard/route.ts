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
    const account = await stripe.accounts.create({ type: "express" })
    const db = await getDb().catch(() => null)
    if (db) {
      let userId: ObjectId | null = null
      let userInfo: { name: string; email: string } | null = null
      try {
        const cookieStore = cookies()
        const token = cookieStore.get("session")?.value
        if (token) {
          const session = await db
            .collection<{ token: string; userId: ObjectId }>("sessions")
            .findOne({ token })
          if (session) {
            userId = session.userId
            const u = await db
              .collection<{ _id: ObjectId; name: string; email: string }>("users")
              .findOne({ _id: session.userId }, { projection: { name: 1, email: 1 } })
            if (u) userInfo = { name: u.name, email: u.email }
          }
        }
      } catch {
        // ignore cookie errors
      }
      await db
        .collection<{ _id: string; active: boolean; userId?: ObjectId; name?: string; email?: string }>(
          "sellers"
        )
        .updateOne(
          { _id: account.id },
          { $setOnInsert: { active: false }, $set: { userId, ...(userInfo ?? {}) } },
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
