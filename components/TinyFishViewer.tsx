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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-black/20 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>

        <div className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-zinc-400 font-mono truncate">
          {streamingUrl
            ? streamingUrl
            : isRunning
            ? 'Connecting to TinyFish agent...'
            : 'Waiting for agent run'}
        </div>

        <div className="shrink-0">
          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              {platform ?? 'Browsing'}
            </div>
          )}
          {!isRunning && streamingUrl && (
            <span className="text-xs font-bold text-emerald-400">Done</span>
          )}
        </div>
      </div>

      {/* Browser content */}
      <div className="flex-1 bg-[#0a0a0a] rounded-b-2xl overflow-hidden relative">
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
                  <div className="w-20 h-20 rounded-full border border-blue-500/20 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-2 border-t-blue-500 border-blue-500/10 animate-spin" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🐟</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-200">Launching browser agent...</p>
                  <p className="text-xs text-zinc-600 mt-1.5">Stream will appear once connected</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl">
                  🐟
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-300">TinyFish Browser</p>
                  <p className="text-xs text-zinc-600 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                    Live browser stream appears here when the agent runs
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
