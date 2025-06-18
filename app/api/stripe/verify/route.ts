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
    const { accountId } = await request.json()
    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 })
    }
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
    const db = await getDb().catch(() => null)
    if (db) {
      let userId: ObjectId | null = null
      try {
        const cookieStore = cookies()
        const token = cookieStore.get("session")?.value
        if (token) {
          const session = await db
            .collection<{ token: string; userId: ObjectId }>("sessions")
            .findOne({ token })
          if (session) userId = session.userId
        }
      } catch {
        // ignore
      }
      await db
        .collection<{ _id: string; active: boolean; userId?: ObjectId }>(
          "sellers"
        )
        .updateOne(
          { _id: accountId },
          { $set: { active: false, userId } },
          { upsert: true }
        )
    }
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/onboarding?step=3`,
      return_url: `${origin}/onboarding?step=4`,
      type: "account_onboarding",
    })
    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
