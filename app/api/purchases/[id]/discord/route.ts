import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'
import Stripe from 'stripe'
import { generateToken } from '@/lib/auth'

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
  const urlObj = new URL(request.url)
  const code = urlObj.searchParams.get('code')
  const oauthState = urlObj.searchParams.get('state')
  let clearStateCookie = false
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return NextResponse.redirect(new URL('/purchases', request.url))
  const db = await getDb()
  const session = await db
    .collection<{ token: string; userId: ObjectId }>('sessions')
    .findOne({ token })
  if (!session) return NextResponse.redirect(new URL('/purchases', request.url))
  const purchase = await db
    .collection<{ _id: ObjectId; userId: ObjectId; productId: ObjectId; status: string; subscriptionId?: string; invoiceId?: string; sellerId: string }>('purchases')
    .findOne({ _id: new ObjectId(id), userId: session.userId })
  if (!purchase || purchase.status !== 'paid')
    return NextResponse.redirect(new URL('/purchases', request.url))
  const product = await db
    .collection<{ _id: ObjectId; type: string; serverId?: string; roleId?: string; subProducts?: { stripePriceId?: string; roleId?: string }[] }>('products')
    .findOne({ _id: purchase.productId })
  if (!product || product.type !== 'discord' || !product.serverId)
    return NextResponse.redirect(new URL('/purchases', request.url))
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
  console.log('Resolved roleId:', roleId)

  const userCollection = db.collection<{ _id: ObjectId; discordId?: string }>('users')
  let user = await userCollection.findOne({ _id: session.userId }, { projection: { discordId: 1 } })

  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`

  if (!user?.discordId) {
    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    if (!code) {
      if (!clientId) {
        console.error('Missing DISCORD_CLIENT_ID.')
        return NextResponse.redirect(new URL('/purchases', request.url))
      }
      const state = generateToken()
      const redirectUri = encodeURIComponent(`${origin}/api/purchases/${id}/discord`)
      const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`
      const res = NextResponse.redirect(authUrl)
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
      res.headers.append('Set-Cookie', `discord_user_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax${secure}`)
      return res
    } else {
      if (!clientId || !clientSecret) {
        console.error('Missing Discord client credentials.')
        return NextResponse.redirect(new URL('/purchases', request.url))
      }
      const rawCookie = request.headers.get('cookie') ?? ''
      const cookieMap = Object.fromEntries(
        rawCookie.split(';').map(c => c.trim().split('=')).map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v ?? '')])
      )
      if (cookieMap['discord_user_state'] !== oauthState) {
        console.error('Discord OAuth state mismatch')
        return NextResponse.redirect(new URL('/purchases', request.url))
      }
      try {
        const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${origin}/api/purchases/${id}/discord`,
          }),
        })
        if (!tokenResp.ok) {
          console.error('Discord token exchange failed', await tokenResp.text())
          return NextResponse.redirect(new URL('/purchases', request.url))
        }
        const tokenData = await tokenResp.json() as { access_token: string }
        const userResp = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        if (!userResp.ok) {
          console.error('Discord user fetch failed', await userResp.text())
          return NextResponse.redirect(new URL('/purchases', request.url))
        }
        const userData = await userResp.json() as { id: string }
        await userCollection.updateOne(
          { _id: session.userId },
          { $set: { discordId: userData.id } },
        )
        user = { _id: session.userId, discordId: userData.id }
        clearStateCookie = true
      } catch (err) {
        console.error('Discord OAuth callback failed', err)
        return NextResponse.redirect(new URL('/purchases', request.url))
      }
    }
  }
  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return NextResponse.redirect(new URL('/purchases', request.url))
  let inviteUrl: string | null = null
  try {
    let channelId: string | undefined
    const guildRes = await fetch(
      `https://discord.com/api/guilds/${product.serverId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    )
    if (guildRes.ok) {
      const guild: any = await guildRes.json()
      channelId = guild.system_channel_id
      console.log('system_channel_id:', channelId)
    } else {
      const body = await guildRes.text()
      console.error('Failed to fetch guild info:', body)
    }
    if (!channelId) {
      const channelsRes = await fetch(
        `https://discord.com/api/guilds/${product.serverId}/channels`,
        {
          headers: { Authorization: `Bot ${botToken}` },
        }
      )
      if (channelsRes.ok) {
        const chans: any[] = await channelsRes.json()
        channelId = chans.find((c) => c.type === 0)?.id
        console.log('Found text channel:', channelId)
      } else {
        const body = await channelsRes.text()
        console.error('Failed to fetch guild channels:', body)
      }
    }
    if (!channelId) {
      console.error('No suitable text channel found in Discord server.')
      return NextResponse.redirect(new URL('/purchases', request.url))
    }

    // Create invite
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
        console.log('Generated Discord invite:', inviteUrl)
      } else {
        const errorBody = await inviteRes.text()
        console.error('Failed to create Discord invite:', errorBody)
      }
    }
    if (roleId) {
      console.log('Fetched user Discord ID:', user?.discordId)
      if (user?.discordId) {
        const url = `https://discord.com/api/guilds/${product.serverId}/members/${user.discordId}/roles/${roleId}`
        console.log(`Attempting to assign role via: ${url}`)
        try {
          const resp = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bot ${botToken}` },
          })
          const text = await resp.text()
          console.log('Discord role assign HTTP status:', resp.status)
          console.log('Discord role assign response body:', text)
          if (resp.ok) {
            console.log('✅ Discord role assigned successfully.')
          } else {
            console.error('❌ Discord role assignment failed:', text)
          }
        } catch (error) {
          console.error('🚨 Fetch call to Discord API failed:', error)
        }
      } else {
        console.error('🚫 User has no discordId. Cannot assign role.')
      }
    } else {
      console.log('ℹ️ No roleId to assign.')
    }
  } catch (err) {
    console.error('Discord invite failed', err)
  }
  const res = NextResponse.redirect(
    inviteUrl ? inviteUrl : new URL('/purchases', request.url),
  )
  if (clearStateCookie) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.headers.append('Set-Cookie', `discord_user_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`)
  }
  return res
}
