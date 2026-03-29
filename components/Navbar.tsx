'use client'

type Props = {
  isRunning?: boolean
  totalFound?: number
}

export default function Navbar({ isRunning, totalFound }: Props) {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl">
      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          
          <div>
            <span className="font-bold text-base tracking-tight text-white">TalentForge</span>
            <span className="hidden sm:inline text-xs text-zinc-500 ml-2">by TinyFish</span>
          </div>
        </div>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {['Search', 'History', 'Docs'].map((item) => (
            <button
              key={item}
              className="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-all"
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Right side — status */}
        <div className="flex items-center gap-3">
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-medium text-blue-400">Agent running</span>
            </div>
          )}
          {!isRunning && totalFound != null && totalFound > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">{totalFound} candidates found</span>
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sm cursor-pointer hover:bg-white/[0.1] transition-all">
            TF
          </div>
        </div>

      </div>
    </header>
  )
}
