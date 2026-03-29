export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import type { ScoredCandidate } from '@/lib/scorer'

// POST /api/pools/add-candidate
// Body: { poolId: string, candidate: ScoredCandidate }
export async function POST(request: Request) {
  const body = await request.json() as { poolId?: string; candidate?: ScoredCandidate }

  if (!body.poolId || !body.candidate) {
    return Response.json({ error: 'poolId and candidate are required' }, { status: 400 })
  }

  const c = body.candidate

  // 1. Look up existing candidate by source + username
  const { data: existing } = await supabase
    .from('candidates')
    .select('id')
    .eq('source', c.source)
    .eq('username', c.username ?? '')
    .maybeSingle()

  let candidateId: string

  if (existing?.id) {
    candidateId = existing.id
  } else {
    // 2. Insert the candidate into DB to get a real UUID
    const { data: inserted, error: insertError } = await supabase
      .from('candidates')
      .insert({
        name: c.name ?? c.username ?? 'Unknown',
        username: c.username ?? '',
        source: c.source,
        profile_url: c.profile_url ?? '',
        bio: c.bio ?? null,
        location: c.location ?? null,
        score: c.score,
        score_breakdown: c.score_breakdown ?? null,
        recent_activity: c.recent_activity ?? false,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      return Response.json({ error: insertError?.message ?? 'Failed to persist candidate' }, { status: 500 })
    }

    candidateId = inserted.id
  }

  // 3. Add to pool
  const { error } = await supabase
    .from('talent_pool_candidates')
    .insert({ pool_id: body.poolId, candidate_id: candidateId })

  if (error) {
    if (error.code === '23505') {
      return Response.json({ message: 'Candidate already in pool' })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ message: 'Candidate added to pool' }, { status: 201 })
}

// DELETE /api/pools/add-candidate
// Body: { poolId: string, candidateId: string }
export async function DELETE(request: Request) {
  const body = await request.json() as { poolId?: string; candidateId?: string }

  if (!body.poolId || !body.candidateId) {
    return Response.json({ error: 'poolId and candidateId are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('talent_pool_candidates')
    .delete()
    .eq('pool_id', body.poolId)
    .eq('candidate_id', body.candidateId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ message: 'Candidate removed from pool' })
}
