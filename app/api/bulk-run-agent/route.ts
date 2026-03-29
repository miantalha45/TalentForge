export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { runTinyFish, type TinyFishEvent } from '@/lib/tinyfish'
import { buildGitHubGoal, buildLinkedInGoal, type RawCandidate } from '@/lib/goals'
import { scoreCandidate, rankCandidates, type ScoredCandidate } from '@/lib/scorer'
import { enhanceQuery } from '@/lib/queryEnhancer'
import { supabase } from '@/lib/supabase'

const MAX_QUERIES = 3

function parseCandidates(result: Record<string, unknown> | null): RawCandidate[] {
  if (!result) return []
  let candidates = result.candidates
  if (!candidates && typeof result.text === 'string') {
    try { candidates = (JSON.parse(result.text) as Record<string, unknown>).candidates } catch { /* ignore */ }
  }
  if (!Array.isArray(candidates)) return []
  return candidates.filter((c): c is RawCandidate => typeof c === 'object' && c !== null)
}

async function runSingleQuery(
  query: string
): Promise<{ query: string; enhanced: string; candidates: ScoredCandidate[]; error?: string }> {
  const enhanced = enhanceQuery(query)

  try {
    // Store search
    const { data: search } = await supabase
      .from('searches')
      .insert({ query: enhanced, status: 'running' })
      .select('id')
      .single()
    const searchId = search?.id ?? null

    const allCandidates: ScoredCandidate[] = []

    // GitHub
    try {
      const githubGoal = buildGitHubGoal(enhanced)
      const githubResult = await runTinyFish(
        { url: githubGoal.url, goal: githubGoal.goal, browserProfile: 'lite' },
        (event: TinyFishEvent) => { void event }
      )
      allCandidates.push(...parseCandidates(githubResult).map((c) => scoreCandidate(c, 'github')))
    } catch { /* continue to LinkedIn even if GitHub fails */ }

    // LinkedIn
    try {
      const linkedinGoal = buildLinkedInGoal(enhanced)
      const linkedinResult = await runTinyFish(
        { url: linkedinGoal.url, goal: linkedinGoal.goal, browserProfile: 'stealth' },
        (event: TinyFishEvent) => { void event }
      )
      allCandidates.push(...parseCandidates(linkedinResult).map((c) => scoreCandidate(c, 'linkedin')))
    } catch { /* continue */ }

    const ranked = rankCandidates(allCandidates)

    // Persist
    if (searchId && ranked.length > 0) {
      for (const c of ranked) {
        const { data: row } = await supabase
          .from('candidates')
          .insert({
            search_id: searchId,
            name: c.name ?? c.username ?? 'Unknown',
            username: c.username ?? '',
            source: c.source,
            profile_url: c.profile_url ?? '',
            bio: c.bio ?? null,
            location: c.location ?? null,
            score: c.score,
            score_breakdown: c.score_breakdown,
            recent_activity: c.recent_activity ?? false,
          })
          .select('id')
          .single()

        if (!row) continue
        const skills = (c.skills ?? []).filter(Boolean)
        if (skills.length > 0) {
          await supabase.from('candidate_skills').insert(
            skills.map((skill) => ({ candidate_id: row.id, skill }))
          )
        }
      }
      await supabase.from('searches').update({ status: 'completed' }).eq('id', searchId)
    }

    return { query, enhanced, candidates: ranked }
  } catch (err) {
    return { query, enhanced, candidates: [], error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json() as { queries?: string[] }
  const queries = body.queries

  if (!Array.isArray(queries) || queries.length === 0) {
    return Response.json({ error: 'queries array is required' }, { status: 400 })
  }

  const limited = queries.slice(0, MAX_QUERIES).map((q) => String(q).trim()).filter(Boolean)

  if (limited.length === 0) {
    return Response.json({ error: 'No valid queries provided' }, { status: 400 })
  }

  // Process queries sequentially to avoid TinyFish rate limits
  const results: Awaited<ReturnType<typeof runSingleQuery>>[] = []
  for (const query of limited) {
    results.push(await runSingleQuery(query))
  }

  return Response.json({
    total_queries: limited.length,
    total_candidates: results.reduce((s, r) => s + r.candidates.length, 0),
    results,
  })
}
