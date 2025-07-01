import { GET } from '@/app/api/purchases/[id]/discord/route'
import { getDb } from '@/lib/mongo'
import { ObjectId } from 'mongodb'

jest.mock('@/lib/mongo')

const mockGetDb = getDb as jest.Mock
const mockCookies = jest.fn()
const mockRetrieveSub = jest.fn()
const mockRetrieveInv = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: { retrieve: mockRetrieveSub },
    invoices: { retrieve: mockRetrieveInv },
  }))
})

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

declare let global: any

describe('GET /api/purchases/[id]/discord', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test'
    process.env.DISCORD_BOT_TOKEN = 'bot'
    process.env.DISCORD_CLIENT_ID = 'cid'
    process.env.DISCORD_CLIENT_SECRET = 'secret'
    global.fetch = jest.fn()
  })

  it('prompts oauth when discord id missing', async () => {
    const purchaseId = new ObjectId('507f191e810c19729de86230')
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86231') }
    const purchase = {
      _id: purchaseId,
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86232'),
      sellerId: 'acct_1',
      status: 'paid',
      invoiceId: 'in_1',
    }
    const product = {
      _id: purchase.productId,
      type: 'discord',
      serverId: 'guild',
      roleId: 'role',
      subProducts: [{ stripePriceId: 'price_1', roleId: 'role' }],
    }
    mockRetrieveInv.mockResolvedValue({ lines: { data: [{ price: { id: 'price_1' } }] } })
    ;(global.fetch as jest.Mock)
    // no external calls expected
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions')
          return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'products')
          return { findOne: jest.fn().mockResolvedValue(product) }
        if (name === 'users')
          return { findOne: jest.fn().mockResolvedValue({ _id: session.userId }) }
        if (name === 'sellers')
          return { findOne: jest.fn().mockResolvedValue(null) }
        if (name === 'discordIntegrations')
          return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })
    const req = new Request('http://localhost', { headers: { cookie: 'session=t' } })
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toMatch(/^https:\/\/discord.com\/oauth2\/authorize/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('joins user and assigns role', async () => {
    const purchaseId = new ObjectId('507f191e810c19729de86240')
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86241') }
    const purchase = {
      _id: purchaseId,
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86242'),
      sellerId: 'acct_2',
      status: 'paid',
      invoiceId: 'in_2',
    }
    const product = {
      _id: purchase.productId,
      type: 'discord',
      serverId: 'guild',
      roleId: 'role',
    }
    mockRetrieveInv.mockResolvedValue({ lines: { data: [{ price: { id: 'price_2' } }] } })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ system_channel_id: 'ch1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'abc' }) })
      .mockResolvedValueOnce({ ok: true })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions')
          return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases')
          return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'products')
          return { findOne: jest.fn().mockResolvedValue(product) }
        if (name === 'users')
          return { findOne: jest.fn().mockResolvedValue({ _id: session.userId, discordId: 'user' }) }
        if (name === 'sellers')
          return { findOne: jest.fn().mockResolvedValue(null) }
        if (name === 'discordIntegrations')
          return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })
    const req = new Request('http://localhost', { headers: { cookie: 'session=t' } })
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(res.status).toBe(307)
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://discord.com/api/guilds/guild/members/user/roles/role',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(res.headers.get('location')).toBe('https://discord.gg/abc')
  })

  it('handles oauth callback and assigns role', async () => {
    const purchaseId = new ObjectId('507f191e810c19729de86245')
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86246') }
    const purchase = {
      _id: purchaseId,
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86247'),
      sellerId: 'acct_cb',
      status: 'paid',
      invoiceId: 'in_cb',
    }
    const product = { _id: purchase.productId, type: 'discord', serverId: 'guild', roleId: 'role' }
    const updateOne = jest.fn()

    mockRetrieveInv.mockResolvedValue({ lines: { data: [{ price: { id: 'price_cb' } }] } })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'newUser' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ system_channel_id: 'ch1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'abc' }) })
      .mockResolvedValueOnce({ ok: true })
    mockCookies.mockReturnValue({
      get: (n: string) =>
        n === 'session'
          ? { value: 't' }
          : n === 'discord_user_state'
          ? { value: 'state' }
          : undefined,
    })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'products') return { findOne: jest.fn().mockResolvedValue(product) }
        if (name === 'users')
          return { findOne: jest.fn().mockResolvedValue({ _id: session.userId }), updateOne }
        return { findOne: jest.fn() }
      },
    })
    const req = new Request('http://localhost?code=xxx&state=state', {
      headers: { cookie: 'session=t; discord_user_state=state' },
    })
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(updateOne).toHaveBeenCalledWith(
      { _id: session.userId },
      { $set: { discordId: 'newUser' } },
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://discord.gg/abc')
  })

  it('uses sub product role when available', async () => {
    const purchaseId = new ObjectId('507f191e810c19729de86250')
    const session = { token: 't', userId: new ObjectId('507f191e810c19729de86251') }
    const purchase = {
      _id: purchaseId,
      userId: session.userId,
      productId: new ObjectId('507f191e810c19729de86252'),
      sellerId: 'acct_3',
      status: 'paid',
      invoiceId: 'in_3',
    }
    const product = {
      _id: purchase.productId,
      type: 'discord',
      serverId: 'guild',
      roleId: 'mainRole',
      subProducts: [
        { stripePriceId: 'price_sub', roleId: 'subRole' },
      ],
    }
    mockRetrieveInv.mockResolvedValue({ lines: { data: [{ price: { id: 'price_sub' } }] } })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ system_channel_id: 'ch1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'abc' }) })
      .mockResolvedValueOnce({ ok: true })
    mockCookies.mockReturnValue({ get: () => ({ value: 't' }) })
    mockGetDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'sessions') return { findOne: jest.fn().mockResolvedValue(session) }
        if (name === 'purchases') return { findOne: jest.fn().mockResolvedValue(purchase) }
        if (name === 'products') return { findOne: jest.fn().mockResolvedValue(product) }
        if (name === 'users')
          return { findOne: jest.fn().mockResolvedValue({ _id: session.userId, discordId: 'user' }) }
        if (name === 'sellers') return { findOne: jest.fn().mockResolvedValue(null) }
        if (name === 'discordIntegrations') return { findOne: jest.fn().mockResolvedValue(null) }
        return { findOne: jest.fn() }
      },
    })
    const req = new Request('http://localhost', { headers: { cookie: 'session=t' } })
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(res.status).toBe(307)
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://discord.com/api/guilds/guild/members/user/roles/subRole',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(res.headers.get('location')).toBe('https://discord.gg/abc')
  })
})
