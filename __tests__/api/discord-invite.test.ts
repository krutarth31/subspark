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
    global.fetch = jest.fn()
  })

  it('redirects to discord invite', async () => {
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
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ch1' }] })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'abc' }) })
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
    const req = new Request('http://localhost')
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://discord.gg/abc')
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
    const seller = { _id: 'acct_2', userId: new ObjectId('507f191e810c19729de86243') }
    const integration = {
      userId: seller.userId,
      guildId: 'guild',
      accessToken: 'userToken',
    }
    mockRetrieveInv.mockResolvedValue({ lines: { data: [{ price: { id: 'price_2' } }] } })
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'ch1' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ code: 'abc' }) })
      .mockResolvedValueOnce({ ok: true })
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
          return { findOne: jest.fn().mockResolvedValue(seller) }
        if (name === 'discordIntegrations')
          return { findOne: jest.fn().mockResolvedValue(integration) }
        return { findOne: jest.fn() }
      },
    })
    const req = new Request('http://localhost')
    const res = await GET(req, { params: { id: purchaseId.toString() } })
    expect(res.status).toBe(307)
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://discord.com/api/guilds/guild/members/user',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      'https://discord.com/api/guilds/guild/members/user/roles/role',
      expect.objectContaining({ method: 'PUT' }),
    )
    expect(res.headers.get('location')).toBe('https://discord.gg/abc')
  })
})
