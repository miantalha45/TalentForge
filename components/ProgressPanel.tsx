'use client'

import { Progress } from '@/components/ui/progress'

export type ProgressStep = {
  platform: 'GitHub' | 'LinkedIn' | 'Web'
  status: 'queued' | 'running' | 'done' | 'error'
  message: string
}

type Props = {
  steps: ProgressStep[]
  isRunning: boolean
  totalFound: number
}

const PLATFORM_CONFIG = {
  GitHub: { icon: '🐙', color: 'text-purple-400', activeBg: 'bg-purple-500/10 border-purple-500/20' },
  LinkedIn: { icon: '💼', color: 'text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/20' },
  Web: { icon: '🌐', color: 'text-emerald-400', activeBg: 'bg-emerald-500/10 border-emerald-500/20' },
}

function StatusDot({ status }: { status: ProgressStep['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
      </span>
    )
  }
  if (status === 'done') return <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
  if (status === 'error') return <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
  return <span className="w-3 h-3 rounded-full bg-white/10 shrink-0" />
}

export default function ProgressPanel({ steps, isRunning, totalFound }: Props) {
  const completedCount = steps.filter((s) => s.status === 'done' || s.status === 'error').length
  const totalSteps = steps.length
  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
            Agent Progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalFound > 0 && (
            <span className="text-sm font-semibold text-emerald-400">{totalFound} found</span>
          )}
          <span className="text-xs font-mono text-zinc-500 tabular-nums">
            {completedCount}/{totalSteps || 2}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3">
        <Progress value={progressPct} className="h-1.5 bg-white/[0.07]" />
      </div>

      {/* Steps */}
      <div className="px-4 pb-4 space-y-2">
        {steps.length === 0 && !isRunning && (
          <p className="text-sm text-zinc-500 italic px-1 py-2">
            Enter a query and click Search to start the agent
          </p>
        )}

        {steps.map((step, i) => {
          const cfg = PLATFORM_CONFIG[step.platform]
          const isActive = step.status === 'running'
          return (
            <div
              key={step.platform + i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
                isActive ? cfg.activeBg : 'border-transparent'
              }`}
            >
              <StatusDot status={step.status} />
              <span className="text-base leading-none shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${cfg.color}`}>{step.platform}</span>
                  {step.status === 'done' && (
                    <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      done
                    </span>
                  )}
                  {step.status === 'error' && (
                    <span className="text-xs text-red-400 font-medium bg-red-500/10 px-1.5 py-0.5 rounded">
                      failed
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate mt-0.5 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {step.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
