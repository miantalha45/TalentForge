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
  GitHub: { icon: '🐙', color: 'text-purple-300', activeBg: 'bg-purple-500/8 border-purple-500/25' },
  LinkedIn: { icon: '💼', color: 'text-blue-300', activeBg: 'bg-blue-500/8 border-blue-500/25' },
  Web: { icon: '🌐', color: 'text-emerald-300', activeBg: 'bg-emerald-500/8 border-emerald-500/25' },
}

function StatusDot({ status }: { status: ProgressStep['status'] }) {
  if (status === 'running') {
    return (
      <span className="relative flex h-3.5 w-3.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500" />
      </span>
    )
  }
  if (status === 'done') return <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
  if (status === 'error') return <span className="w-3.5 h-3.5 rounded-full bg-red-500 shrink-0" />
  return <span className="w-3.5 h-3.5 rounded-full bg-white/10 shrink-0" />
}

export default function ProgressPanel({ steps, isRunning, totalFound }: Props) {
  const completedCount = steps.filter((s) => s.status === 'done' || s.status === 'error').length
  const totalSteps = steps.length
  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isRunning ? 'bg-blue-500' : totalFound > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          </div>
          <span className="text-base font-bold text-white">Agent Progress</span>
        </div>
        <div className="flex items-center gap-4">
          {totalFound > 0 && (
            <span className="text-sm font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
              {totalFound} found
            </span>
          )}
          <span className="text-sm font-mono font-semibold text-zinc-500">
            {completedCount}/{totalSteps || 2}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-2">
        <Progress value={progressPct} className="h-1.5 bg-white/[0.06]" />
      </div>

      {/* Steps */}
      <div className="px-4 pb-5 pt-1 space-y-1.5">
        {steps.length === 0 && !isRunning && (
          <p className="text-sm text-zinc-500 px-2 py-4 text-center">
            Enter a query and click Search to start the agent
          </p>
        )}

        {steps.map((step, i) => {
          const cfg = PLATFORM_CONFIG[step.platform]
          const isActive = step.status === 'running'
          return (
            <div
              key={step.platform + i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
                isActive ? cfg.activeBg : 'border-transparent'
              }`}
            >
              <StatusDot status={step.status} />
              <span className="text-lg leading-none shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-bold ${cfg.color}`}>{step.platform}</span>
                  {step.status === 'done' && (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                      done
                    </span>
                  )}
                  {step.status === 'error' && (
                    <span className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-md">
                      failed
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
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
