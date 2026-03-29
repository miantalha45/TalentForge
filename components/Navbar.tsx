'use client'

type Props = {
  isRunning?: boolean
  totalFound?: number
}

export default function Navbar({ isRunning, totalFound }: Props) {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl">
      {/* Gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px gradient-brand opacity-60" />

      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand shadow-lg shadow-blue-600/30 flex items-center justify-center shrink-0">
            <span className="text-base">🎯</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-lg text-white tracking-tight">TalentForge</span>
            <span className="hidden sm:inline text-xs text-zinc-500 font-medium">by TinyFish</span>
          </div>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Search', active: true },
            { label: 'History', active: false },
            { label: 'Pools', active: false },
          ].map(({ label, active }) => (
            <button
              key={label}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                active
                  ? 'text-white bg-white/[0.08]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {active && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full gradient-brand" />
              )}
              {label}
            </button>
          ))}
        </nav>

        {/* Right — status + avatar */}
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 transition-all">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <span className="text-sm font-semibold text-blue-300">Agent running</span>
            </div>
          )}
          {!isRunning && totalFound != null && totalFound > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">{totalFound} found</span>
            </div>
          )}
          <div className="w-9 h-9 rounded-full gradient-brand opacity-80 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:opacity-100 transition-opacity shadow-md shadow-blue-900/40">
            TF
          </div>
        </div>

      </div>
    </header>
  )
}
