'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ScoredCandidate } from '@/lib/scorer'

type Props = {
  candidate: ScoredCandidate
  rank: number
}

const SOURCE_CONFIG = {
  github: { label: 'GitHub', icon: '🐙', color: 'text-purple-400', badge: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'text-blue-400', badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  web: { label: 'Web', icon: '🌐', color: 'text-emerald-400', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
}

const RANK_CONFIG: Record<number, { bg: string; text: string; ring: string }> = {
  1: { bg: 'bg-amber-500/15', text: 'text-amber-400', ring: 'ring-1 ring-amber-500/30' },
  2: { bg: 'bg-zinc-500/15', text: 'text-zinc-300', ring: 'ring-1 ring-zinc-500/30' },
  3: { bg: 'bg-orange-700/15', text: 'text-orange-500', ring: 'ring-1 ring-orange-700/30' },
}

function ScoreBar({ score }: { score: number }) {
  const max = 55
  const pct = Math.min((score / max) * 100, 100)
  const color =
    score >= 30 ? 'from-emerald-500 to-emerald-400' :
    score >= 15 ? 'from-amber-500 to-amber-400' :
    'from-zinc-600 to-zinc-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums text-white w-7 text-right">{score}</span>
    </div>
  )
}

export default function CandidateCard({ candidate, rank }: Props) {
  const cfg = SOURCE_CONFIG[candidate.source]
  const rankCfg = RANK_CONFIG[rank] ?? { bg: 'bg-white/[0.05]', text: 'text-zinc-500', ring: '' }
  const topProjects = (candidate.projects ?? []).slice(0, 3)
  const skills = (candidate.skills ?? []).slice(0, 6)
  const totalStars = (candidate.projects ?? []).reduce((s, p) => s + (p.stars ?? 0), 0)

  return (
    <Card className="border-white/[0.08] bg-card hover:border-white/[0.14] hover:bg-white/[0.02] transition-all duration-200">
      <CardContent className="p-5">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            {/* Rank badge */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${rankCfg.bg} ${rankCfg.text} ${rankCfg.ring}`}>
              #{rank}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-white leading-tight">
                  {candidate.name || candidate.username || 'Unknown'}
                </h3>
                {candidate.recent_activity && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium shrink-0">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm">{cfg.icon}</span>
                <span className={`text-sm font-medium ${cfg.color}`}>
                  {candidate.username ? `@${candidate.username}` : cfg.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${cfg.badge}`}>
              {cfg.label}
            </Badge>
            {totalStars > 0 && (
              <span className="text-xs text-amber-400/80 font-medium">⭐ {totalStars.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Score bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Relevance Score</span>
            <div className="flex items-center gap-2">
              {candidate.score_breakdown.react > 0 && (
                <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">React</span>
              )}
              {candidate.score_breakdown.ai > 0 && (
                <span className="text-xs font-medium text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">AI/ML</span>
              )}
            </div>
          </div>
          <ScoreBar score={candidate.score} />
        </div>

        {/* Bio */}
        {candidate.bio && (
          <p className="text-sm text-zinc-400 line-clamp-2 mb-4 leading-relaxed">{candidate.bio}</p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2.5 py-1 rounded-full border border-white/[0.1] bg-white/[0.05] text-zinc-300 font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Projects */}
        {topProjects.length > 0 && (
          <div className="space-y-2 mb-4">
            {topProjects.map((project, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-xs text-zinc-500 shrink-0">📁</span>
                <span className="text-sm text-zinc-200 font-medium truncate flex-1">{project.name}</span>
                {project.language && (
                  <span className="text-xs text-zinc-500 bg-white/[0.05] px-2 py-0.5 rounded shrink-0">
                    {project.language}
                  </span>
                )}
                {(project.stars ?? 0) > 0 && (
                  <span className="text-xs text-amber-500/80 font-medium shrink-0">⭐ {project.stars}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <span className="text-sm text-zinc-500">
            {candidate.location ? `📍 ${candidate.location}` : ''}
          </span>
          {candidate.profile_url && (
            <a
              href={candidate.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-semibold"
            >
              View Profile →
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
