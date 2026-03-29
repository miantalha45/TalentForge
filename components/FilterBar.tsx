'use client'

import { useState } from 'react'

export type FilterState = {
  keyword: string
  skills: string[]
  minScore: number
  source: 'all' | 'github' | 'linkedin' | 'web'
  activeOnly: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  skills: [],
  minScore: 0,
  source: 'all',
  activeOnly: false,
}

type Props = {
  filters: FilterState
  onChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
}

export default function FilterBar({ filters, onChange, totalCount, filteredCount }: Props) {
  const [skillInput, setSkillInput] = useState('')

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !filters.skills.includes(trimmed)) {
      set('skills', [...filters.skills, trimmed])
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) =>
    set('skills', filters.skills.filter((s) => s !== skill))

  const hasActiveFilters =
    filters.keyword ||
    filters.skills.length > 0 ||
    filters.minScore > 0 ||
    filters.source !== 'all' ||
    filters.activeOnly

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">

        {/* Keyword search */}
        <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/[0.09] rounded-xl px-4 py-2.5 min-w-[200px] focus-within:border-blue-500/40 focus-within:bg-white/[0.08] transition-all">
          <span className="text-zinc-500 text-sm">🔍</span>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => set('keyword', e.target.value)}
            placeholder="Search name, bio, project..."
            className="bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none w-full"
          />
          {filters.keyword && (
            <button
              onClick={() => set('keyword', '')}
              className="text-zinc-500 hover:text-zinc-200 text-xl leading-none shrink-0 transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.09] rounded-xl p-1">
          {(['all', 'github', 'linkedin'] as const).map((src) => (
            <button
              key={src}
              onClick={() => set('source', src)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filters.source === src
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {src === 'all' ? 'All Sources' : src === 'github' ? '🐙 GitHub' : '💼 LinkedIn'}
            </button>
          ))}
        </div>

        {/* Min score */}
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.09] rounded-xl px-4 py-2.5">
          <span className="text-xs font-bold text-zinc-500 whitespace-nowrap uppercase tracking-wide">Min</span>
          <input
            type="number"
            min={0}
            max={55}
            value={filters.minScore || ''}
            onChange={(e) => set('minScore', parseInt(e.target.value || '0', 10))}
            placeholder="0"
            className="bg-transparent text-sm font-bold text-white w-10 focus:outline-none text-center"
          />
        </div>

        {/* Active only */}
        <button
          onClick={() => set('activeOnly', !filters.activeOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            filters.activeOnly
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
              : 'bg-white/[0.06] border-white/[0.09] text-zinc-500 hover:text-zinc-200 hover:border-white/[0.15]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${filters.activeOnly ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          Active Only
        </button>

        {/* Skills filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.09] rounded-xl px-4 py-2.5 focus-within:border-blue-500/40 transition-all">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Skill</span>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              placeholder="e.g. React"
              className="bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none w-20"
            />
            <button
              onClick={addSkill}
              disabled={!skillInput.trim()}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors"
            >
              + Add
            </button>
          </div>

          {filters.skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="text-blue-400/60 hover:text-blue-200 ml-0.5 text-sm leading-none transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Count + clear */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {filteredCount < totalCount ? (
              <><span className="text-white font-bold">{filteredCount}</span> <span className="text-zinc-600">of {totalCount}</span></>
            ) : (
              <span className="text-zinc-500">{totalCount} candidates</span>
            )}
          </span>
          {hasActiveFilters && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="text-xs font-bold text-zinc-500 hover:text-white border border-white/[0.09] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
            >
              Clear
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
