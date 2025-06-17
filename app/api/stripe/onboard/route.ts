import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
})

export async function POST(request: Request) {
  try {
    const { origin } = new URL(request.url)
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
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
