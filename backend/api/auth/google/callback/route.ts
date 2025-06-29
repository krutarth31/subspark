import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo'
import { generateToken, generateAccountId } from '@/lib/auth'
import { ObjectId } from 'mongodb'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  const host = request.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`
  const redirectUrl = `${origin}/dashboard`

  const res = NextResponse.redirect(redirectUrl)
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.headers.append(
    'Set-Cookie',
    `google_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
  )

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!code || !clientId || !clientSecret) {
    console.error('Missing required OAuth values')
    return res
  }

  // Manually parse cookies
  const rawCookie = request.headers.get('cookie') ?? ''
  const cookieMap = Object.fromEntries(
    rawCookie.split(';').map(c => c.trim().split('=')).map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v ?? '')])
  )

  if (cookieMap['google_state'] !== state) {
    console.error('Invalid CSRF state')
    return res
  }

  try {
    // Exchange code for access token
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/google/callback`,
      }),
    })

    if (!tokenResp.ok) {
      console.error('Token exchange failed:', await tokenResp.text())
      return res
    }

    const { access_token: accessToken } = await tokenResp.json()
    if (!accessToken) {
      console.error('No access token received')
      return res
    }

    // Fetch user info
    const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userResp.ok) {
      console.error('User info fetch failed:', await userResp.text())
      return res
    }

    const userInfo = await userResp.json() as {
      email?: string
      name?: string
      picture?: string
    }

    const email = userInfo.email
    const name = userInfo.name
    const avatar = userInfo.picture

    if (!email || !name) {
      console.error('Missing user data')
      return res
    }

    const db = await getDb()
    const existing = await db.collection('users').findOne({ email })
    let userId: ObjectId

    if (existing) {
      userId = existing._id
      await db.collection('users').updateOne({ _id: userId }, { $set: { name, avatar } })
    } else {
      const accountId = generateAccountId()
      const result = await db.collection('users').insertOne({ name, email, avatar, accountId })
      userId = result.insertedId
    }

    // Create session
    const token = generateToken()
    await db.collection('sessions').insertOne({ token, userId })

    const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.headers.append(
      'Set-Cookie',
      `session=${token}; Path=/; HttpOnly; SameSite=Lax${secureCookie}`
    )
  } catch (err) {
    console.error('OAuth callback error:', err)
  }

  return res
}
