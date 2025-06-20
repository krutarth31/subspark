import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: check database for saved credentials
  return NextResponse.json({ connected: false })
}
