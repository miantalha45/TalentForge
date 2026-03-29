'use client'

import { useState, useEffect } from 'react'
import type { TalentPool } from '@/lib/supabase'
import type { ScoredCandidate } from '@/lib/scorer'

type Props = {
  candidate: ScoredCandidate
  candidateName: string
  onClose: () => void
}

export default function SaveToPoolModal({ candidate, candidateName, onClose }: Props) {
  const [pools, setPools] = useState<(TalentPool & { candidate_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [newPoolName, setNewPoolName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPools()
  }, [])

  async function fetchPools() {
    setLoading(true)
    try {
      const res = await fetch('/api/pools')
      const json = await res.json() as { pools: (TalentPool & { candidate_count: number })[] }
      setPools(json.pools ?? [])
    } catch {
      setError('Failed to load pools')
    } finally {
      setLoading(false)
    }
  }

  async function createPool() {
    if (!newPoolName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPoolName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create pool')
      setNewPoolName('')
      await fetchPools()
    } catch {
      setError('Failed to create pool')
    } finally {
      setCreating(false)
    }
  }

  async function addToPool(poolId: string) {
    setSaving(poolId)
    setError(null)
    try {
      const res = await fetch('/api/pools/add-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId, candidate }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Failed to save')
      }
      setSaved((prev) => new Set([...prev, poolId]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save candidate')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[oklch(0.17_0.006_285)] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-sm font-bold text-white">Save to Talent Pool</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">{candidateName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center text-base transition-all"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Create new pool */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">New Pool</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPool()}
                placeholder="Pool name..."
                className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={createPool}
                disabled={!newPoolName.trim() || creating}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-40"
              >
                {creating ? '...' : 'Create'}
              </button>
            </div>
          </div>

          {/* Existing pools */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Existing Pools
            </p>

            {loading ? (
              <div className="text-sm text-zinc-500 py-3 text-center">Loading...</div>
            ) : pools.length === 0 ? (
              <div className="text-sm text-zinc-600 py-3 text-center italic">
                No pools yet — create one above
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pools.map((pool) => {
                  const isSaved = saved.has(pool.id)
                  const isSaving = saving === pool.id
                  return (
                    <div
                      key={pool.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{pool.name}</p>
                        <p className="text-xs text-zinc-500">{pool.candidate_count} candidates</p>
                      </div>
                      <button
                        onClick={() => !isSaved && addToPool(pool.id)}
                        disabled={isSaving || isSaved}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSaved
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 cursor-default'
                            : 'bg-blue-600/80 hover:bg-blue-600 text-white disabled:opacity-50'
                        }`}
                      >
                        {isSaved ? '✓ Saved' : isSaving ? '...' : 'Save'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
