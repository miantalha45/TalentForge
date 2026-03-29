/**
 * TinyFish Goal Templates for TalentForge
 *
 * Each goal tells the TinyFish browser agent exactly:
 *   1. Where to navigate (url)
 *   2. What to extract (goal — natural language)
 *   3. What JSON shape to return
 */

export type TalentGoal = {
  platform: 'GitHub' | 'LinkedIn' | 'Web'
  url: string
  goal: string
}

/**
 * Raw candidate shape returned by TinyFish.
 * Intentionally loose — the agent may return extras or miss optionals.
 */
export type RawCandidate = {
  name?: string
  username?: string
  profile_url?: string
  bio?: string
  location?: string
  skills?: string[]
  recent_activity?: boolean
  projects?: {
    name?: string
    description?: string
    stars?: number
    url?: string
    language?: string
  }[]
}

/**
 * Build a GitHub people/user search goal.
 *
 * We search GitHub's user search, then ask TinyFish to visit each profile
 * and return structured candidate data.
 */
export function buildGitHubGoal(query: string): TalentGoal {
  const encoded = encodeURIComponent(query)
  return {
    platform: 'GitHub',
    url: `https://github.com/search?q=${encoded}&type=users`,
    goal: `You are searching GitHub for developer talent matching the query: "${query}".

From the search results page, identify the top 5 most relevant developer profiles.
For each developer, visit their profile page and extract the following information:

Return a JSON object with this exact structure:
{
  "candidates": [
    {
      "name": "Full name or null if not shown",
      "username": "GitHub username",
      "profile_url": "Full GitHub profile URL",
      "bio": "Their bio/description or null",
      "location": "Location string or null",
      "skills": ["array", "of", "programming", "languages", "and", "technologies"],
      "recent_activity": true,
      "projects": [
        {
          "name": "Repository name",
          "description": "Repo description or null",
          "stars": 0,
          "url": "Full repo URL",
          "language": "Primary language or null"
        }
      ]
    }
  ]
}

Rules:
- Include up to 3 top repositories per candidate (sorted by stars descending)
- skills should include languages from their top repos and any pinned skills
- recent_activity is true if they have commits or contributions in the last 3 months
- Return exactly the JSON above — no markdown, no code fences, raw JSON only
- If a field is missing, use null for strings and [] for arrays`,
  }
}

/**
 * Build a LinkedIn people search goal.
 *
 * LinkedIn requires stealth mode. We search by keywords and extract
 * profile cards visible in the search results without clicking through
 * (to avoid bot detection on individual profiles).
 */
export function buildLinkedInGoal(query: string): TalentGoal {
  const encoded = encodeURIComponent(query)
  return {
    platform: 'LinkedIn',
    url: `https://www.linkedin.com/search/results/people/?keywords=${encoded}&origin=GLOBAL_SEARCH_HEADER`,
    goal: `You are searching LinkedIn for professional talent matching: "${query}".

Look at the search results and extract information from the visible profile cards.
Find up to 5 relevant professionals from the results.

Return a JSON object with this exact structure:
{
  "candidates": [
    {
      "name": "Full name",
      "username": "LinkedIn username or profile ID from the URL",
      "profile_url": "Full LinkedIn profile URL",
      "bio": "Their headline/title and current company combined, e.g. 'Senior React Developer at Acme Corp'",
      "location": "Location string or null",
      "skills": ["skills", "extracted", "from", "their", "headline", "and", "title"],
      "recent_activity": false,
      "projects": []
    }
  ]
}

Rules:
- Extract from visible cards — do not click individual profiles to avoid detection
- skills: parse their headline for technologies mentioned (React, Python, ML, etc.)
- recent_activity: true if they show recent activity badges or posting indicators
- Return raw JSON only — no markdown, no code fences
- If a field cannot be determined, use null`,
  }
}

/**
 * Build a personal website / portfolio search goal via Google.
 *
 * Searches Google for developer portfolios matching the query.
 */
export function buildWebGoal(query: string): TalentGoal {
  const encoded = encodeURIComponent(`${query} developer portfolio site:github.io OR site:dev.to OR site:hashnode.dev OR personal website`)
  return {
    platform: 'Web',
    url: `https://www.google.com/search?q=${encoded}`,
    goal: `You are searching Google for developer portfolios and personal websites matching: "${query}".

From the search results, identify up to 3 personal developer websites or portfolios.
For each result extract what you can from the search snippet.

Return a JSON object:
{
  "candidates": [
    {
      "name": "Developer name from the page title or snippet",
      "username": null,
      "profile_url": "The website URL",
      "bio": "Description from the Google snippet",
      "location": null,
      "skills": ["skills", "mentioned", "in", "snippet"],
      "recent_activity": false,
      "projects": []
    }
  ]
}

Return raw JSON only — no markdown, no code fences.`,
  }
}
