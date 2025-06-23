import { MongoClient, Db } from 'mongodb'

declare global {
  // Reuse the Mongo client across hot reloads and serverless invocations
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
  // eslint-disable-next-line no-var
  var _mongoDb: Db | undefined
}

export async function getDb(): Promise<Db> {
  if (global._mongoDb) return global._mongoDb

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not defined')
  }

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri)
    await global._mongoClient.connect()
  }

  global._mongoDb = global._mongoClient.db()
  return global._mongoDb
}
