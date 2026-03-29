'use client'

import type { ScoredCandidate } from '@/lib/scorer'

type Props = {
  candidates: ScoredCandidate[]
  onClose: () => void
}

const SOURCE_ICON = { github: '🐙', linkedin: '💼', web: '🌐' }

function ScoreCell({ score }: { score: number }) {
  const color = score >= 30 ? 'text-emerald-400' : score >= 15 ? 'text-amber-400' : 'text-zinc-400'
  return <span className={`font-bold text-base ${color}`}>{score}</span>
}

export default function CompareModal({ candidates, onClose }: Props) {
  const totalStars = (c: ScoredCandidate) =>
    (c.projects ?? []).reduce((s, p) => s + (p.stars ?? 0), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col rounded-2xl border border-white/[0.1] bg-[oklch(0.17_0.006_285)] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Candidate Comparison</h2>
            <p className="text-sm text-zinc-500 mt-0.5">{candidates.length} candidates selected</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center text-lg transition-all"
          >
            ×
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <td className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">
                  Field
                </td>
                {candidates.map((c) => (
                  <td key={c.username ?? c.name} className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold text-white">
                        {c.name || c.username || 'Unknown'}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <span>{SOURCE_ICON[c.source]}</span>
                        <span>{c.username ? `@${c.username}` : c.source}</span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">

              {/* Score */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Score</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    <ScoreCell score={c.score} />
                  </td>
                ))}
              </tr>

              {/* Source */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Platform</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    <span className="text-sm capitalize text-zinc-300">{c.source}</span>
                  </td>
                ))}
              </tr>

              {/* Total stars */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Total Stars</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    <span className="text-sm text-amber-400">
                      {totalStars(c) > 0 ? `⭐ ${totalStars(c).toLocaleString()}` : '—'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Recent activity */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Active</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    {c.recent_activity ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        Active
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-sm">—</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Location</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    <span className="text-sm text-zinc-400">{c.location ?? '—'}</span>
                  </td>
                ))}
              </tr>

              {/* Skills */}
              <tr className="hover:bg-white/[0.02] align-top">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400 pt-4">Skills</td>
                {candidates.map((c) => {
                  const skills = (c.skills ?? []).slice(0, 6)
                  return (
                    <td key={c.username} className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {skills.length > 0 ? skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-0.5 rounded-full border border-white/[0.1] bg-white/[0.05] text-zinc-300"
                          >
                            {skill}
                          </span>
                        )) : <span className="text-zinc-600 text-sm">—</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* Top project */}
              <tr className="hover:bg-white/[0.02] align-top">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400 pt-4">Top Project</td>
                {candidates.map((c) => {
                  const top = (c.projects ?? []).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))[0]
                  return (
                    <td key={c.username} className="px-5 py-3 text-center">
                      {top ? (
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-zinc-200">{top.name}</p>
                          {top.language && (
                            <p className="text-xs text-zinc-500">{top.language}</p>
                          )}
                          {(top.stars ?? 0) > 0 && (
                            <p className="text-xs text-amber-500/80">⭐ {top.stars}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-sm">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>

              {/* Profile link */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-zinc-400">Profile</td>
                {candidates.map((c) => (
                  <td key={c.username} className="px-5 py-3 text-center">
                    {c.profile_url ? (
                      <a
                        href={c.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        View →
                      </a>
                    ) : (
                      <span className="text-zinc-600 text-sm">—</span>
                    )}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
