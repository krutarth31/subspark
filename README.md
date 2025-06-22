This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Running Tests

Run the automated tests with:

```bash
npm test
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

Create a `.env.local` file with your Stripe keys:

```text
STRIPE_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
MONGODB_URI=mongodb://localhost:27017/yourdb
STRIPE_PRICE_ID=price_12345

# Webhooks are required so seller accounts become active.
# For local development you can forward events with:
#   stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Add SMTP settings to send password reset emails:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
EMAIL_FROM=no-reply@example.com
```

Add Discord OAuth credentials for the integration page:

```text
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

Add Google OAuth credentials for sign in:

```text
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Dashboard Roles

The dashboard renders different metrics depending on the active user role. You
can switch between buyer and seller views by passing the `role` query parameter
in the URL:

```text
http://localhost:3000/dashboard?role=seller
```

The selected role is stored in the browser so it persists as you navigate around
the app.

## Onboarding Flow

The seller onboarding uses a modern vertical stepper inspired by popular store
builders. Each step presents a full-width card guiding the user from connecting
Stripe to paying the platform fee.

## Seller Subscription

After completing the verification step the onboarding flow presents a
subscription screen where sellers pay the platform fee. Clicking **Pay
Subscription** creates a Stripe Checkout session via `/api/stripe/checkout` and
redirects the seller to Stripe. When the checkout completes the webhook marks
the seller account active and the user can continue to the dashboard.
