'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Navbar from './Navbar'
import TinyFishViewer from './TinyFishViewer'
import ProgressPanel, { type ProgressStep } from './ProgressPanel'
import CandidateCard from './CandidateCard'
import FilterBar, { type FilterState, DEFAULT_FILTERS } from './FilterBar'
import CompareModal from './CompareModal'
import SaveToPoolModal from './SaveToPoolModal'
import type { ScoredCandidate } from '@/lib/scorer'

// ── SSE event shapes ──────────────────────────────────────────────────────────

type SSEStatus = { platform: string; message: string; phase: string }
type SSEStreamingUrl = { url: string; platform: string }
type SSEProgress = { platform: string; message: string }
type SSEPlatformComplete = { platform: string; count: number; message: string }
type SSEPlatformError = { platform: string; message: string }
type SSEComplete = { candidates: ScoredCandidate[]; total: number; searchId: string }
type SSEError = { message: string }
type SSEQueryEnhanced = { original: string; enhanced: string }

// ── SSE stream reader ─────────────────────────────────────────────────────────

async function* readSSE(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const block of parts) {
        const lines = block.split('\n')
        let eventType = 'message'
        let data = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          if (line.startsWith('data: ')) data = line.slice(6).trim()
        }
        if (data) {
          try { yield { event: eventType, data: JSON.parse(data) } }
          catch { /* skip malformed */ }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── CSV export helper ─────────────────────────────────────────────────────────

function downloadCSV(candidates: ScoredCandidate[]) {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['Rank', 'Name', 'Username', 'Source', 'Profile URL', 'Score', 'Skills', 'Top Project', 'Stars', 'Location', 'Bio', 'Active']
  const rows = candidates.map((c, i) => {
    const topProject = (c.projects ?? []).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))[0]
    return [i + 1, c.name ?? '', c.username ?? '', c.source, c.profile_url ?? '', c.score, (c.skills ?? []).join('; '), topProject?.name ?? '', topProject?.stars ?? '', c.location ?? '', c.bio ?? '', c.recent_activity ? 'Yes' : 'No']
  })
  const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `talentforge-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Bulk CSV parse ────────────────────────────────────────────────────────────

function parseBulkCsv(text: string): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const start = lines[0]?.toLowerCase().replace(/"/g, '').trim() === 'query' ? 1 : 0
  return lines.slice(start).map((l) => l.replace(/^["']|["']$/g, '').trim()).filter((l) => l.length > 3)
}

const EXAMPLE_QUERIES = [
  'Senior React developers with AI repos',
  'Full-stack engineers with LLM projects',
  'Python ML engineers',
]

// ── Main component ────────────────────────────────────────────────────────────

export default function SearchUI() {
  const [query, setQuery] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enhancedQuery, setEnhancedQuery] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = useState(false)
  const [poolCandidate, setPoolCandidate] = useState<ScoredCandidate | null>(null)
  const [bulkQueries, setBulkQueries] = useState<string[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkResults, setBulkResults] = useState<{ query: string; count: number }[]>([])
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        const text = `${c.name ?? ''} ${c.username ?? ''} ${c.bio ?? ''} ${(c.projects ?? []).map((p) => p.name ?? '').join(' ')}`
        if (!text.toLowerCase().includes(kw)) return false
      }
      if (filters.skills.length > 0) {
        const cSkills = (c.skills ?? []).map((s) => s.toLowerCase())
        if (!filters.skills.some((fs) => cSkills.some((cs) => cs.includes(fs.toLowerCase())))) return false
      }
      if (filters.minScore > 0 && c.score < filters.minScore) return false
      if (filters.source !== 'all' && c.source !== filters.source) return false
      if (filters.activeOnly && !c.recent_activity) return false
      return true
    })
  }, [candidates, filters])

  const selectedCandidates = useMemo(
    () => filteredCandidates.filter((c) => selectedIds.has(`${c.source}-${c.username ?? ''}`)),
    [filteredCandidates, selectedIds]
  )

  const updateStep = useCallback((platform: ProgressStep['platform'], status: ProgressStep['status'], message: string) => {
    setSteps((prev) => {
      const existing = prev.find((s) => s.platform === platform)
      if (existing) return prev.map((s) => s.platform === platform ? { ...s, status, message } : s)
      return [...prev, { platform, status, message }]
    })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }, [])

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isRunning) return
    setIsRunning(true)
    setError(null)
    setStreamingUrl(null)
    setCurrentPlatform(null)
    setSteps([])
    setCandidates([])
    setEnhancedQuery(null)
    setSelectedIds(new Set())
    setFilters(DEFAULT_FILTERS)
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortRef.current.signal,
      })
      if (!response.ok) {
        const json = await response.json() as { error?: string }
        throw new Error(json.error ?? 'Request failed')
      }
      for await (const { event, data } of readSSE(response)) {
        switch (event) {
          case 'query_enhanced': { const d = data as SSEQueryEnhanced; setEnhancedQuery(d.enhanced); break }
          case 'status': { const d = data as SSEStatus; updateStep(d.platform as ProgressStep['platform'], 'running', d.message); setCurrentPlatform(d.platform); break }
          case 'streaming_url': { const d = data as SSEStreamingUrl; setStreamingUrl(d.url); setCurrentPlatform(d.platform); break }
          case 'progress': { const d = data as SSEProgress; updateStep(d.platform as ProgressStep['platform'], 'running', d.message); break }
          case 'platform_complete': { const d = data as SSEPlatformComplete; updateStep(d.platform as ProgressStep['platform'], 'done', d.message); break }
          case 'platform_error': { const d = data as SSEPlatformError; updateStep(d.platform as ProgressStep['platform'], 'error', d.message); break }
          case 'complete': { const d = data as SSEComplete; setCandidates(d.candidates); break }
          case 'error': { const d = data as SSEError; setError(d.message); break }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsRunning(false)
      setCurrentPlatform(null)
    }
  }, [query, isRunning, updateStep])

  const handleStop = useCallback(() => { abortRef.current?.abort(); setIsRunning(false) }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isRunning) handleSearch()
  }, [handleSearch, isRunning])

  const handleBulkFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const queries = parseBulkCsv(ev.target?.result as string)
      setBulkQueries(queries)
      setBulkResults([])
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleBulkRun = useCallback(async () => {
    if (bulkQueries.length === 0 || bulkRunning) return
    setBulkRunning(true)
    setBulkResults([])
    const allCandidates: ScoredCandidate[] = []
    try {
      const res = await fetch('/api/bulk-run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: bulkQueries }),
      })
      const json = await res.json() as { results: { query: string; candidates: ScoredCandidate[]; error?: string }[] }
      const results = json.results ?? []
      setBulkResults(results.map((r) => ({ query: r.query, count: r.candidates.length })))
      for (const r of results) allCandidates.push(...r.candidates)
      setCandidates((prev) => {
        const seen = new Set(prev.map((c) => `${c.source}-${c.username}`))
        const fresh = allCandidates.filter((c) => !seen.has(`${c.source}-${c.username}`))
        return [...prev, ...fresh].sort((a, b) => b.score - a.score)
      })
      setBulkQueries([])
    } catch {
      setError('Bulk search failed')
    } finally {
      setBulkRunning(false)
    }
  }, [bulkQueries, bulkRunning])

  const totalFound = candidates.length

  return (
    <div className="min-h-screen bg-background grid-bg flex flex-col">
      <Navbar isRunning={isRunning || bulkRunning} totalFound={totalFound} />

      {/* ── Hero / Search section ─────────────────────────────────────────────── */}
      <div className="relative border-b border-white/[0.08] overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 hero-glow pointer-events-none" />

        <div className="relative max-w-screen-2xl mx-auto px-6 py-8">

          {/* Page heading — only when idle */}
          {!isRunning && candidates.length === 0 && (
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                Find top talent,{' '}
                <span className="gradient-text">autonomously</span>
              </h1>
              <p className="text-base text-zinc-500 max-w-lg mx-auto">
                Describe the engineer you need. TinyFish agents browse GitHub and LinkedIn and rank the best matches.
              </p>
            </div>
          )}

          {/* Enhanced query banner */}
          {enhancedQuery && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-blue-500/8 border border-blue-500/20">
              <span className="text-blue-400 text-lg mt-0.5">✦</span>
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Query Enhanced</span>
                <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{enhancedQuery}</p>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative group">
              {/* Glow ring on focus */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-violet-600/0 group-focus-within:from-blue-600/40 group-focus-within:via-blue-500/40 group-focus-within:to-violet-600/40 transition-all duration-300 rounded-2xl blur-sm -z-10" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g. "Senior React developers with AI repositories"'
                disabled={isRunning}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-2xl px-5 py-4 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {query && !isRunning && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 text-2xl leading-none transition-colors"
                >
                  ×
                </button>
              )}
            </div>

            {isRunning ? (
              <button
                onClick={handleStop}
                className="px-6 py-4 rounded-2xl border border-red-500/30 bg-red-500/8 text-red-300 hover:bg-red-500/15 hover:text-red-200 font-bold text-sm transition-all shrink-0"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="px-8 py-4 rounded-2xl gradient-brand glow-blue text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none shrink-0 hover:opacity-90 active:scale-[0.98]"
              >
                Search
              </button>
            )}

            {/* Bulk upload */}
            <input ref={bulkFileRef} type="file" accept=".csv,.txt" onChange={handleBulkFile} className="hidden" />
            <button
              onClick={() => bulkFileRef.current?.click()}
              disabled={isRunning}
              title="Upload CSV with multiple queries"
              className="px-4 py-4 rounded-2xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.09] text-zinc-400 hover:text-white text-sm font-semibold transition-all disabled:opacity-40 shrink-0"
            >
              📁
            </button>
          </div>

          {/* Example queries */}
          {!isRunning && candidates.length === 0 && bulkQueries.length === 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              <span className="text-xs text-zinc-600 py-2 font-medium">Try:</span>
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="text-sm text-zinc-400 hover:text-white border border-white/[0.09] hover:border-white/20 rounded-full px-4 py-2 transition-all hover:bg-white/[0.06] font-medium"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {/* Bulk queue */}
          {bulkQueries.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">{bulkQueries.length} queries loaded</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBulkQueries([])} className="text-xs font-semibold text-zinc-500 hover:text-zinc-200 transition-colors">
                    Clear
                  </button>
                  <button
                    onClick={handleBulkRun}
                    disabled={bulkRunning}
                    className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold disabled:opacity-50 transition-all"
                  >
                    {bulkRunning ? 'Running...' : 'Run All'}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {bulkQueries.map((q, i) => {
                  const result = bulkResults[i]
                  return (
                    <div key={i} className="flex items-center justify-between text-sm text-zinc-400">
                      <span className="truncate max-w-[80%]">{i + 1}. {q}</span>
                      {result && (
                        <span className={`text-xs font-bold ${result.count > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {result.count} found
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm text-red-300 flex items-center gap-3 font-medium">
            <span className="text-base shrink-0">✕</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* ── Left sidebar ────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 flex flex-col gap-5">

            {/* TinyFish viewer */}
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-card" style={{ height: '440px' }}>
              <TinyFishViewer streamingUrl={streamingUrl} platform={currentPlatform} isRunning={isRunning} />
            </div>

            {/* Progress */}
            <ProgressPanel steps={steps} isRunning={isRunning} totalFound={totalFound} />

            {/* Scoring guide */}
            {(isRunning || steps.length > 0) && (
              <div className="rounded-2xl border border-white/[0.08] bg-card px-5 py-5">
                <p className="section-label mb-4">Scoring Guide</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { label: 'React match', pts: '+10' },
                    { label: 'AI/ML match', pts: '+15' },
                    { label: 'Per 50 stars', pts: '+1' },
                    { label: 'Recent activity', pts: '+5' },
                    { label: 'Detailed bio', pts: '+3' },
                    { label: 'Has location', pts: '+2' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-zinc-400 truncate">{r.label}</span>
                      <span className="text-sm text-emerald-400 font-mono font-bold shrink-0">{r.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Results column ──────────────────────────────────────────────── */}
          <div className="xl:col-span-3 flex flex-col gap-4">

            {/* Filter bar */}
            {candidates.length > 0 && (
              <FilterBar
                filters={filters}
                onChange={setFilters}
                totalCount={candidates.length}
                filteredCount={filteredCandidates.length}
              />
            )}

            {/* Empty: idle */}
            {candidates.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center h-[420px] text-center rounded-2xl border border-white/[0.08] border-dashed bg-white/[0.015]">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-4xl mb-5">
                  🔍
                </div>
                <p className="text-xl font-bold text-white mb-2">No results yet</p>
                <p className="text-sm text-zinc-500 max-w-xs">Enter a hiring query above and click Search to find candidates</p>
              </div>
            )}

            {/* Empty: searching */}
            {candidates.length === 0 && isRunning && (
              <div className="flex flex-col items-center justify-center h-[420px] text-center rounded-2xl border border-blue-500/15 bg-blue-500/[0.03]">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-full border border-blue-500/20 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-2 border-t-blue-500 border-blue-500/10 animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🐟</div>
                </div>
                <p className="text-xl font-bold text-white mb-2">Agent is searching...</p>
                <p className="text-sm text-zinc-500">Results will appear when platforms complete</p>
              </div>
            )}

            {/* Results */}
            {candidates.length > 0 && (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="section-label">Ranked Candidates</span>
                    <span className="text-xs text-zinc-700 font-mono">{filteredCandidates.length}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {selectedIds.size >= 2 ? (
                      <button
                        onClick={() => setCompareOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                      >
                        ⇄ Compare {selectedIds.size}
                      </button>
                    ) : selectedIds.size === 1 ? (
                      <span className="text-xs font-medium text-zinc-500">Select 1 more to compare</span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-600">☐ Check cards to compare</span>
                    )}
                    <button
                      onClick={() => downloadCSV(filteredCandidates)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white text-xs font-bold transition-all"
                    >
                      ↓ Export CSV
                    </button>
                  </div>
                </div>

                {/* No filter match */}
                {filteredCandidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center rounded-2xl border border-white/[0.08] border-dashed">
                    <p className="text-sm font-semibold text-zinc-500 mb-2">No candidates match your filters</p>
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    {filteredCandidates.map((candidate, i) => (
                      <CandidateCard
                        key={`${candidate.source}-${candidate.username ?? i}`}
                        candidate={candidate}
                        rank={candidates.indexOf(candidate) + 1}
                        selected={selectedIds.has(`${candidate.source}-${candidate.username ?? ''}`)}
                        onToggleSelect={toggleSelect}
                        onSaveToPool={setPoolCandidate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {compareOpen && selectedCandidates.length >= 2 && (
        <CompareModal candidates={selectedCandidates} onClose={() => setCompareOpen(false)} />
      )}
      {poolCandidate && (
        <SaveToPoolModal
          candidate={poolCandidate}
          candidateName={poolCandidate.name ?? poolCandidate.username ?? 'Unknown'}
          onClose={() => setPoolCandidate(null)}
        />
      )}
    </div>
  )
}
