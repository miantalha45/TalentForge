import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url') {
    throw new Error('Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  _client = createClient(url, key)
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// ── Types ──────────────────────────────────────────────────────────────────────

export type SearchStatus = 'pending' | 'running' | 'completed' | 'failed'

export type Search = {
  id: string
  query: string
  status: SearchStatus
  created_at: string
}

export type Candidate = {
  id: string
  search_id: string
  name: string
  username: string
  source: 'github' | 'linkedin' | 'web'
  profile_url: string
  bio: string | null
  location: string | null
  score: number
  recent_activity: boolean
  created_at: string
}

export type CandidateSkill = {
  id: string
  candidate_id: string
  skill: string
}

export type CandidateProject = {
  id: string
  candidate_id: string
  project_name: string
  description: string | null
  stars: number
  url: string
  language: string | null
}

export type CandidateWithDetails = Candidate & {
  skills: string[]
  projects: CandidateProject[]
}
