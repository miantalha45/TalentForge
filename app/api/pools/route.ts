export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

// GET /api/pools — list all pools with candidate counts
export async function GET() {
  const { data: pools, error } = await supabase
    .from('talent_pools')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Enrich with candidate counts
  const poolsWithCounts = await Promise.all(
    (pools ?? []).map(async (pool) => {
      const { count } = await supabase
        .from('talent_pool_candidates')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', pool.id)

      return { ...pool, candidate_count: count ?? 0 }
    })
  )

  return Response.json({ pools: poolsWithCounts })
}

// POST /api/pools — create a new pool
export async function POST(request: Request) {
  const body = await request.json() as { name?: string; description?: string }

  if (!body.name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('talent_pools')
    .insert({ name: body.name.trim(), description: body.description ?? null })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ pool: data }, { status: 201 })
}
