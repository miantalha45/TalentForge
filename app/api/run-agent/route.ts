export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — TinyFish needs time

import { runTinyFish, type TinyFishEvent } from '@/lib/tinyfish'
import { buildGitHubGoal, buildLinkedInGoal, type RawCandidate } from '@/lib/goals'
import { scoreCandidate, rankCandidates, type ScoredCandidate } from '@/lib/scorer'
import { enhanceQuery } from '@/lib/queryEnhancer'
import { supabase } from '@/lib/supabase'

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  )
}

// ── Supabase persistence ──────────────────────────────────────────────────────

async function persistCandidates(
  searchId: string,
  candidates: ScoredCandidate[]
): Promise<void> {
  for (const c of candidates) {
    const { data: row, error } = await supabase
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

    if (error || !row) continue

    const candidateId: string = row.id

    const skills = (c.skills ?? []).filter(Boolean)
    if (skills.length > 0) {
      await supabase.from('candidate_skills').insert(
        skills.map((skill) => ({ candidate_id: candidateId, skill }))
      )
    }

    const projects = (c.projects ?? []).filter((p) => p.name)
    if (projects.length > 0) {
      await supabase.from('candidate_projects').insert(
        projects.map((p) => ({
          candidate_id: candidateId,
          project_name: p.name ?? '',
          description: p.description ?? null,
          stars: p.stars ?? 0,
          url: p.url ?? '',
          language: p.language ?? null,
        }))
      )
    }
  }
}

// ── Parse raw TinyFish result → RawCandidate[] ────────────────────────────────

function parseCandidates(result: Record<string, unknown> | null): RawCandidate[] {
  if (!result) {
    console.log('[parseCandidates] result is null')
    return []
  }

  console.log('[parseCandidates] raw result keys:', Object.keys(result))
  console.log('[parseCandidates] raw result:', JSON.stringify(result).slice(0, 500))

  let candidates = result.candidates

  if (!candidates && typeof result.text === 'string') {
    try {
      const parsed = JSON.parse(result.text) as Record<string, unknown>
      candidates = parsed.candidates ?? parsed
    } catch { /* ignore */ }
  }

  if (!candidates && Array.isArray(result)) {
    candidates = result
  }

  if (!Array.isArray(candidates)) {
    console.log('[parseCandidates] candidates is not an array:', typeof candidates)
    return []
  }

  console.log('[parseCandidates] found', candidates.length, 'candidates')
  return candidates.filter((c): c is RawCandidate => typeof c === 'object' && c !== null)
}

// ── Main route handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json() as { query?: string; skipEnhance?: boolean }
  const rawQuery = body.query?.trim()

  if (!rawQuery) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  // Enhance query unless caller opted out
  const query = body.skipEnhance ? rawQuery : enhanceQuery(rawQuery)
  const queryWasEnhanced = query !== rawQuery

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => sseEvent(controller, event, data)
      const allCandidates: ScoredCandidate[] = []

      try {
        // Inform client if query was enhanced
        if (queryWasEnhanced) {
          send('query_enhanced', { original: rawQuery, enhanced: query })
        }

        // ── Create search record ───────────────────────────────────────────
        const { data: search } = await supabase
          .from('searches')
          .insert({ query, status: 'running' })
          .select('id')
          .single()

        const searchId: string | null = search?.id ?? null

        // ── GitHub ────────────────────────────────────────────────────────
        send('status', { platform: 'GitHub', message: 'Starting GitHub search...', phase: 'start' })

        const githubGoal = buildGitHubGoal(query)

        try {
          const githubResult = await runTinyFish(
            { url: githubGoal.url, goal: githubGoal.goal, browserProfile: 'lite' },
            (event: TinyFishEvent) => {
              if (event.streamingUrl) {
                send('streaming_url', { url: event.streamingUrl, platform: 'GitHub' })
              }
              if (event.type === 'PROGRESS' && event.purpose) {
                send('progress', { platform: 'GitHub', message: event.purpose })
              }
            }
          )

          console.log('[run-agent] GitHub raw result:', JSON.stringify(githubResult).slice(0, 800))
          const githubCandidates = parseCandidates(githubResult).map((c) =>
            scoreCandidate(c, 'github')
          )
          allCandidates.push(...githubCandidates)

          send('platform_complete', {
            platform: 'GitHub',
            count: githubCandidates.length,
            message: `Found ${githubCandidates.length} candidates on GitHub`,
          })
        } catch (err) {
          console.error('[run-agent] GitHub failed:', err)
          send('platform_error', {
            platform: 'GitHub',
            message: err instanceof Error ? err.message : 'GitHub search failed',
          })
        }

        // ── LinkedIn ──────────────────────────────────────────────────────
        send('status', { platform: 'LinkedIn', message: 'Starting LinkedIn search...', phase: 'start' })

        const linkedinGoal = buildLinkedInGoal(query)

        try {
          const linkedinResult = await runTinyFish(
            { url: linkedinGoal.url, goal: linkedinGoal.goal, browserProfile: 'stealth' },
            (event: TinyFishEvent) => {
              if (event.streamingUrl) {
                send('streaming_url', { url: event.streamingUrl, platform: 'LinkedIn' })
              }
              if (event.type === 'PROGRESS' && event.purpose) {
                send('progress', { platform: 'LinkedIn', message: event.purpose })
              }
            }
          )

          console.log('[run-agent] LinkedIn raw result:', JSON.stringify(linkedinResult).slice(0, 800))
          const linkedinCandidates = parseCandidates(linkedinResult).map((c) =>
            scoreCandidate(c, 'linkedin')
          )
          allCandidates.push(...linkedinCandidates)

          send('platform_complete', {
            platform: 'LinkedIn',
            count: linkedinCandidates.length,
            message: `Found ${linkedinCandidates.length} candidates on LinkedIn`,
          })
        } catch (err) {
          console.error('[run-agent] LinkedIn failed:', err)
          send('platform_error', {
            platform: 'LinkedIn',
            message: err instanceof Error ? err.message : 'LinkedIn search failed',
          })
        }

        // ── Score + rank ──────────────────────────────────────────────────
        const ranked = rankCandidates(allCandidates)

        // ── Persist to DB ─────────────────────────────────────────────────
        if (searchId && ranked.length > 0) {
          await persistCandidates(searchId, ranked)
          await supabase
            .from('searches')
            .update({ status: 'completed' })
            .eq('id', searchId)
        }

        // ── Done ──────────────────────────────────────────────────────────
        send('complete', {
          candidates: ranked,
          total: ranked.length,
          searchId,
          enhancedQuery: queryWasEnhanced ? query : null,
        })
      } catch (err) {
        console.error('[run-agent] Fatal error:', err)
        send('error', { message: err instanceof Error ? err.message : 'Agent failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
