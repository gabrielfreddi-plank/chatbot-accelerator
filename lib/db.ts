import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Returns null when DATABASE_URL is not configured so callers can skip SQL
// gracefully and fall back to localStorage.
export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return drizzle(neon(url), { schema })
}
