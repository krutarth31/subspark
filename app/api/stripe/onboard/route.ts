import { NextResponse } from "next/server"
import Stripe from "stripe"

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
