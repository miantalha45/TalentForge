'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Navbar from './Navbar'
import TinyFishViewer from './TinyFishViewer'
import ProgressPanel, { type ProgressStep } from './ProgressPanel'
import CandidateCard from './CandidateCard'
import type { ScoredCandidate } from '@/lib/scorer'

// ── SSE event shapes from /api/run-agent ─────────────────────────────────────

type SSEStatus = { platform: string; message: string; phase: string }
type SSEStreamingUrl = { url: string; platform: string }
type SSEProgress = { platform: string; message: string }
type SSEPlatformComplete = { platform: string; count: number; message: string }
type SSEPlatformError = { platform: string; message: string }
type SSEComplete = { candidates: ScoredCandidate[]; total: number; searchId: string }
type SSEError = { message: string }

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
          try {
            yield { event: eventType, data: JSON.parse(data) }
          } catch {
            // skip malformed event
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

const EXAMPLE_QUERIES = [
  'Senior React developers with AI repos',
  'Full-stack engineers with LLM projects',
  'Python ML engineers on GitHub',
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
  const abortRef = useRef<AbortController | null>(null)

  const updateStep = useCallback(
    (platform: ProgressStep['platform'], status: ProgressStep['status'], message: string) => {
      setSteps((prev) => {
        const existing = prev.find((s) => s.platform === platform)
        if (existing) {
          return prev.map((s) => (s.platform === platform ? { ...s, status, message } : s))
        }
        return [...prev, { platform, status, message }]
      })
    },
    []
  )

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isRunning) return

    setIsRunning(true)
    setError(null)
    setStreamingUrl(null)
    setCurrentPlatform(null)
    setSteps([])
    setCandidates([])

    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error ?? 'Request failed')
      }

      for await (const { event, data } of readSSE(response)) {
        switch (event) {
          case 'status': {
            const d = data as SSEStatus
            updateStep(d.platform as ProgressStep['platform'], 'running', d.message)
            setCurrentPlatform(d.platform)
            break
          }
          case 'streaming_url': {
            const d = data as SSEStreamingUrl
            setStreamingUrl(d.url)
            setCurrentPlatform(d.platform)
            break
          }
          case 'progress': {
            const d = data as SSEProgress
            updateStep(d.platform as ProgressStep['platform'], 'running', d.message)
            break
          }
          case 'platform_complete': {
            const d = data as SSEPlatformComplete
            updateStep(d.platform as ProgressStep['platform'], 'done', d.message)
            break
          }
          case 'platform_error': {
            const d = data as SSEPlatformError
            updateStep(d.platform as ProgressStep['platform'], 'error', d.message)
            break
          }
          case 'complete': {
            const d = data as SSEComplete
            setCandidates(d.candidates)
            break
          }
          case 'error': {
            const d = data as SSEError
            setError(d.message)
            break
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setIsRunning(false)
      setCurrentPlatform(null)
    }
  }, [query, isRunning, updateStep])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsRunning(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isRunning) handleSearch()
    },
    [handleSearch, isRunning]
  )

  const totalFound = candidates.length

  return (
    <div className="min-h-screen bg-background grid-bg flex flex-col">
      <Navbar isRunning={isRunning} totalFound={totalFound} />

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.08] bg-background/60">
        <div className="max-w-screen-2xl mx-auto px-6 py-5">
          <div className="flex gap-3 max-w-3xl">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g. "Senior React developers with AI repositories"'
                disabled={isRunning}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-4 py-3 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {query && !isRunning && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xl leading-none transition-colors"
                >
                  ×
                </button>
              )}
            </div>
            {isRunning ? (
              <Button
                onClick={handleStop}
                variant="outline"
                className="px-7 py-3 rounded-lg border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg font-semibold"
              >
                Stop
              </Button>
            ) : (
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="px-7 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all glow-blue disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shrink-0"
              >
                Search
              </button>
            )}
          </div>

          {/* Example queries */}
          {!isRunning && candidates.length === 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="text-sm text-zinc-500 hover:text-zinc-300 border border-white/[0.08] hover:border-white/[0.14] rounded-full px-3.5 py-1.5 transition-all hover:bg-white/[0.04]"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400 flex items-center gap-2.5">
            <span className="text-base">✕</span> {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* ── Left: browser + progress ──────────────────────────────────── */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {/* TinyFish browser */}
            <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-card" style={{ height: '440px' }}>
              <TinyFishViewer streamingUrl={streamingUrl} platform={currentPlatform} isRunning={isRunning} />
            </div>

            {/* Progress panel */}
            <ProgressPanel steps={steps} isRunning={isRunning} totalFound={totalFound} />

            {/* Score legend */}
            {(isRunning || steps.length > 0) && (
              <div className="rounded-xl border border-white/[0.08] bg-card px-5 py-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Score breakdown</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  {[
                    { label: 'React match', pts: '+10' },
                    { label: 'AI/ML match', pts: '+15' },
                    { label: 'Per 50 stars', pts: '+1' },
                    { label: 'Recent activity', pts: '+5' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">{r.label}</span>
                      <span className="text-sm text-emerald-400 font-mono font-semibold">{r.pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: candidate results ──────────────────────────────────── */}
          <div className="xl:col-span-3">
            {candidates.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-4xl mb-5">
                  🔍
                </div>
                <p className="text-base font-semibold text-white">No results yet</p>
                <p className="text-sm text-zinc-500 mt-1.5">Enter a hiring query above and click Search</p>
              </div>
            )}

            {candidates.length === 0 && isRunning && (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-4xl mb-5 animate-pulse">
                  🐟
                </div>
                <p className="text-base font-semibold text-white">Agent is searching...</p>
                <p className="text-sm text-zinc-500 mt-1.5">Results will appear when platforms complete</p>
              </div>
            )}

            {candidates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Ranked Candidates</h2>
                    <div className="h-px w-12 bg-white/[0.08]" />
                  </div>
                  <span className="text-sm text-zinc-500">Sorted by relevance score</span>
                </div>

                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {candidates.map((candidate, i) => (
                    <CandidateCard
                      key={`${candidate.source}-${candidate.username ?? i}`}
                      candidate={candidate}
                      rank={i + 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
