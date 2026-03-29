'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ScoredCandidate } from '@/lib/scorer'

type Props = {
  candidate: ScoredCandidate
  rank: number
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onSaveToPool?: (candidate: ScoredCandidate) => void
}

const SOURCE_CONFIG = {
  github: { label: 'GitHub', icon: '🐙', color: 'text-purple-300', badge: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'text-blue-300', badge: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
  web: { label: 'Web', icon: '🌐', color: 'text-emerald-300', badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
}

const RANK_STYLE: Record<number, string> = {
  1: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
  2: 'bg-zinc-400/10 text-zinc-200 ring-1 ring-zinc-400/25',
  3: 'bg-orange-600/10 text-orange-400 ring-1 ring-orange-600/25',
}

const BREAKDOWN_LABELS: { key: keyof ScoredCandidate['score_breakdown']; label: string; color: string }[] = [
  { key: 'react', label: 'React skills detected', color: 'text-cyan-300' },
  { key: 'ai', label: 'AI/ML expertise found', color: 'text-violet-300' },
  { key: 'stars', label: 'GitHub stars', color: 'text-amber-300' },
  { key: 'activity', label: 'Recent activity', color: 'text-emerald-300' },
  { key: 'bio', label: 'Detailed bio', color: 'text-blue-300' },
  { key: 'location', label: 'Has location', color: 'text-zinc-300' },
]

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 55) * 100, 100)
  const gradient =
    score >= 30 ? 'from-emerald-500 to-emerald-400' :
    score >= 15 ? 'from-amber-500 to-amber-400' :
    'from-zinc-600 to-zinc-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700 shadow-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-base font-bold tabular-nums text-white w-8 text-right">{score}</span>
    </div>
  )
}

export default function CandidateCard({ candidate, rank, selected = false, onToggleSelect, onSaveToPool }: Props) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const cfg = SOURCE_CONFIG[candidate.source]
  const rankStyle = RANK_STYLE[rank] ?? 'bg-white/[0.05] text-zinc-400'
  const topProjects = (candidate.projects ?? []).slice(0, 3)
  const skills = (candidate.skills ?? []).slice(0, 6)
  const totalStars = (candidate.projects ?? []).reduce((s, p) => s + (p.stars ?? 0), 0)
  const breakdown = candidate.score_breakdown
  const reasons = BREAKDOWN_LABELS.map(({ key, label, color }) => ({ label, color, points: breakdown[key] })).filter((r) => r.points > 0)
  const cardId = `${candidate.source}-${candidate.username ?? rank}`

  return (
    <Card
      className={`border-white/[0.08] bg-card card-lift cursor-default
        ${selected ? 'ring-2 ring-blue-500/60 border-blue-500/40 bg-blue-950/10' : 'hover:border-white/20'}`}
    >
      <CardContent className="p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">

            {/* Checkbox */}
            {onToggleSelect && (
              <button
                onClick={() => onToggleSelect(cardId)}
                aria-label="Select candidate"
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                  selected ? 'bg-blue-500 border-blue-500' : 'border-white/20 hover:border-white/50'
                }`}
              >
                {selected && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}

            {/* Rank badge */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${rankStyle}`}>
              #{rank}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {candidate.name || candidate.username || 'Unknown'}
                </h3>
                {candidate.recent_activity && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    ● Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-base">{cfg.icon}</span>
                <span className={`text-sm font-semibold ${cfg.color}`}>
                  {candidate.username ? `@${candidate.username}` : cfg.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-semibold ${cfg.badge}`}>
              {cfg.label}
            </Badge>
            {totalStars > 0 && (
              <span className="text-sm font-semibold text-amber-300">⭐ {totalStars.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => setBreakdownOpen((o) => !o)}
              className="flex items-center gap-2 group"
            >
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                Relevance Score
              </span>
              <span className={`text-zinc-600 text-xs transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className="flex items-center gap-2">
              {breakdown.react > 0 && (
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-md">React</span>
              )}
              {breakdown.ai > 0 && (
                <span className="text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-md">AI/ML</span>
              )}
            </div>
          </div>
          <ScoreBar score={candidate.score} />

          {breakdownOpen && reasons.length > 0 && (
            <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/[0.07] px-4 py-3 space-y-2">
              {reasons.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{r.label}</span>
                  <span className={`text-sm font-mono font-bold ${r.color}`}>+{r.points}</span>
                </div>
              ))}
              <div className="border-t border-white/[0.07] pt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-300">Total</span>
                <span className="text-sm font-mono font-bold text-white">{candidate.score}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bio */}
        {candidate.bio && (
          <p className="text-sm text-zinc-300 line-clamp-2 mb-4 leading-relaxed">{candidate.bio}</p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.map((skill) => (
              <span
                key={skill}
                className="text-xs font-semibold px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Projects */}
        {topProjects.length > 0 && (
          <div className="space-y-2 mb-5">
            {topProjects.map((project, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-sm text-zinc-500 shrink-0">📁</span>
                <span className="text-sm text-zinc-100 font-semibold truncate flex-1">{project.name}</span>
                {project.language && (
                  <span className="text-xs text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-md shrink-0">{project.language}</span>
                )}
                {(project.stars ?? 0) > 0 && (
                  <span className="text-xs font-bold text-amber-400 shrink-0">⭐ {project.stars}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.07]">
          <span className="text-sm text-zinc-500">
            {candidate.location ? `📍 ${candidate.location}` : ''}
          </span>
          <div className="flex items-center gap-2.5">
            {onSaveToPool && (
              <button
                onClick={() => onSaveToPool(candidate)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-100 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.05]"
              >
                + Pool
              </button>
            )}
            {candidate.profile_url && (
              <a
                href={candidate.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                View Profile <span className="text-base leading-none">→</span>
              </a>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
