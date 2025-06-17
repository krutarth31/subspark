import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
})

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json()
    if (!accountId) {
      return new NextResponse("Missing accountId", { status: 400 })
    }
    const { origin } = new URL(request.url)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/onboarding?step=3`,
      return_url: `${origin}/onboarding?step=4`,
      type: "account_onboarding",
    })
    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error(err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
