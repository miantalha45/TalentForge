'use client'

type Props = {
  streamingUrl: string | null
  platform: string | null
  isRunning: boolean
}

export default function TinyFishViewer({ streamingUrl, platform, isRunning }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Browser chrome header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.07] bg-background/60 rounded-t-xl shrink-0">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>

        {/* Address bar */}
        <div className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-md px-3 py-1.5 text-sm text-zinc-400 font-mono truncate">
          {streamingUrl
            ? streamingUrl
            : isRunning
            ? 'Connecting to TinyFish agent...'
            : 'Waiting for agent run'}
        </div>

        {/* Status indicator */}
        <div className="shrink-0">
          {isRunning && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {platform ?? 'Browsing'}
            </div>
          )}
          {!isRunning && streamingUrl && (
            <span className="text-sm font-medium text-emerald-400">Done</span>
          )}
        </div>
      </div>

      {/* Browser content */}
      <div className="flex-1 bg-[#0d0d0d] rounded-b-xl overflow-hidden relative">
        {streamingUrl ? (
          <iframe
            key={streamingUrl}
            src={streamingUrl}
            className="w-full h-full border-0"
            title="TinyFish Live Browser"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            {isRunning ? (
              <>
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-t-blue-500 border-blue-500/10 animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl">🐟</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-zinc-300">Launching browser agent...</p>
                  <p className="text-sm text-zinc-600 mt-1">Stream will appear once connected</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                  <span className="text-2xl">🐟</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-zinc-300">TinyFish Browser</p>
                  <p className="text-sm text-zinc-600 mt-1 max-w-[200px]">
                    Live browser stream appears here when the agent runs
                  </p>
                </div>
                {/* Skeleton browser chrome */}
                <div className="w-56 rounded-lg border border-white/[0.06] overflow-hidden opacity-25">
                  <div className="bg-white/[0.04] px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="flex-1 h-2.5 bg-white/[0.06] rounded" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-2 bg-white/[0.04] rounded w-3/4" />
                    <div className="h-2 bg-white/[0.04] rounded w-full" />
                    <div className="h-2 bg-white/[0.04] rounded w-5/6" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
