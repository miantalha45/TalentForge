export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(',')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'csv'
  const searchId = searchParams.get('search_id') ?? null
  const minScore = parseInt(searchParams.get('min_score') ?? '0', 10)
  const source = searchParams.get('source') ?? null // 'github' | 'linkedin' | 'web'

  // ── Fetch candidates ────────────────────────────────────────────────────────

  let query = supabase
    .from('candidates')
    .select('*')
    .order('score', { ascending: false })

  if (searchId) query = query.eq('search_id', searchId)
  if (minScore > 0) query = query.gte('score', minScore)
  if (source) query = query.eq('source', source)

  const { data: candidates, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!candidates || candidates.length === 0) {
    return Response.json({ error: 'No candidates found' }, { status: 404 })
  }

  // ── Fetch skills + projects for all candidates ──────────────────────────────

  const ids = candidates.map((c) => c.id)

  const [{ data: skills }, { data: projects }] = await Promise.all([
    supabase.from('candidate_skills').select('*').in('candidate_id', ids),
    supabase.from('candidate_projects').select('*').in('candidate_id', ids),
  ])

  const skillsMap = new Map<string, string[]>()
  for (const s of skills ?? []) {
    const list = skillsMap.get(s.candidate_id) ?? []
    list.push(s.skill)
    skillsMap.set(s.candidate_id, list)
  }

  const projectsMap = new Map<string, { project_name: string; stars: number; language: string | null }[]>()
  for (const p of projects ?? []) {
    const list = projectsMap.get(p.candidate_id) ?? []
    list.push(p)
    projectsMap.set(p.candidate_id, list)
  }

  // ── Build CSV ───────────────────────────────────────────────────────────────

  const header = buildCsvRow([
    'Rank',
    'Name',
    'Username',
    'Source',
    'Profile URL',
    'Score',
    'Skills',
    'Top Project',
    'Top Project Stars',
    'Top Project Language',
    'Location',
    'Bio',
    'Recent Activity',
  ])

  const rows = candidates.map((c, i) => {
    const cSkills = skillsMap.get(c.id) ?? []
    const cProjects = projectsMap.get(c.id) ?? []
    const topProject = cProjects.sort((a, b) => b.stars - a.stars)[0]

    return buildCsvRow([
      i + 1,
      c.name,
      c.username,
      c.source,
      c.profile_url,
      c.score,
      cSkills.join('; '),
      topProject?.project_name ?? '',
      topProject?.stars ?? '',
      topProject?.language ?? '',
      c.location,
      c.bio,
      c.recent_activity ? 'Yes' : 'No',
    ])
  })

  const csv = [header, ...rows].join('\n')
  const filename = `talentforge-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
