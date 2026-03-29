import type { RawCandidate } from './goals'

/**
 * Scoring rules:
 *
 *  +10  React found in skills, bio, or repo languages/names
 *  +15  AI/ML/LLM keywords found in repos, bio, or skills
 *  +1   per 50 stars across all projects (capped at +20)
 *  +5   Recent activity detected
 *  +3   Has meaningful bio (non-null, >20 chars)
 *  +2   Has location (shows real presence)
 */

const REACT_KEYWORDS = ['react', 'reactjs', 'react.js', 'next.js', 'nextjs', 'react native']

const AI_KEYWORDS = [
  'ai', 'ml', 'machine learning', 'deep learning', 'llm', 'gpt', 'nlp',
  'neural', 'tensorflow', 'pytorch', 'transformers', 'langchain', 'openai',
  'artificial intelligence', 'computer vision', 'diffusion', 'rag',
]

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((kw) => lower.includes(kw))
}

function candidateText(candidate: RawCandidate): string {
  const parts = [
    candidate.bio ?? '',
    ...(candidate.skills ?? []),
    ...(candidate.projects ?? []).map((p) => `${p.name ?? ''} ${p.description ?? ''} ${p.language ?? ''}`),
  ]
  return parts.join(' ')
}

export type ScoredCandidate = RawCandidate & {
  score: number
  score_breakdown: {
    react: number
    ai: number
    stars: number
    activity: number
    bio: number
    location: number
  }
  source: 'github' | 'linkedin' | 'web'
}

export function scoreCandidate(
  candidate: RawCandidate,
  source: 'github' | 'linkedin' | 'web'
): ScoredCandidate {
  const text = candidateText(candidate)

  const reactScore = containsAny(text, REACT_KEYWORDS) ? 10 : 0
  const aiScore = containsAny(text, AI_KEYWORDS) ? 15 : 0

  const totalStars = (candidate.projects ?? []).reduce((sum, p) => sum + (p.stars ?? 0), 0)
  const starsScore = Math.min(Math.floor(totalStars / 50), 20)

  const activityScore = candidate.recent_activity ? 5 : 0
  const bioScore = candidate.bio && candidate.bio.length > 20 ? 3 : 0
  const locationScore = candidate.location ? 2 : 0

  const score = reactScore + aiScore + starsScore + activityScore + bioScore + locationScore

  return {
    ...candidate,
    score,
    score_breakdown: {
      react: reactScore,
      ai: aiScore,
      stars: starsScore,
      activity: activityScore,
      bio: bioScore,
      location: locationScore,
    },
    source,
  }
}

export function rankCandidates(candidates: ScoredCandidate[]): ScoredCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score)
}
