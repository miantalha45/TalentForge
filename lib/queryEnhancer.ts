/**
 * Rule-based query enhancer.
 * Converts vague hiring queries into structured, keyword-rich search strings
 * that produce better results from TinyFish on GitHub and LinkedIn.
 */

type ExpansionRule = {
  triggers: string[]
  additions: string[]
}

const EXPANSION_RULES: ExpansionRule[] = [
  {
    triggers: ['frontend', 'front-end', 'front end', 'ui developer', 'ui dev'],
    additions: ['React', 'TypeScript', 'modern UI frameworks', 'active GitHub repositories'],
  },
  {
    triggers: ['backend', 'back-end', 'back end', 'server', 'api developer'],
    additions: ['Node.js', 'REST APIs', 'databases', 'cloud infrastructure'],
  },
  {
    triggers: ['fullstack', 'full-stack', 'full stack'],
    additions: ['React', 'Node.js', 'TypeScript', 'full-stack projects'],
  },
  {
    triggers: ['machine learning', 'ml engineer', 'ml developer'],
    additions: ['Python', 'PyTorch', 'TensorFlow', 'published ML models'],
  },
  {
    triggers: ['ai engineer', 'ai developer', 'artificial intelligence'],
    additions: ['LLMs', 'Python', 'machine learning', 'AI research repositories'],
  },
  {
    triggers: ['llm', 'large language model', 'genai', 'generative ai'],
    additions: ['LLM fine-tuning', 'LangChain', 'RAG', 'Python', 'Hugging Face'],
  },
  {
    triggers: ['devops', 'sre', 'site reliability', 'platform engineer'],
    additions: ['Docker', 'Kubernetes', 'CI/CD', 'cloud infrastructure', 'Terraform'],
  },
  {
    triggers: ['mobile', 'ios', 'android', 'react native'],
    additions: ['React Native', 'mobile apps', 'published apps', 'Swift or Kotlin'],
  },
  {
    triggers: ['data engineer', 'data pipeline', 'etl'],
    additions: ['Python', 'Spark', 'Airflow', 'data pipeline repositories'],
  },
  {
    triggers: ['blockchain', 'web3', 'solidity', 'smart contract'],
    additions: ['Solidity', 'Ethereum', 'web3 projects', 'DeFi repositories'],
  },
]

const VAGUENESS_INDICATORS = [
  'good', 'great', 'solid', 'experienced', 'skilled', 'talented',
  'awesome', 'amazing', 'top', 'best', 'strong', 'expert',
]

const SENIORITY_MAP: Record<string, string> = {
  'junior': 'junior-level',
  'mid': 'mid-level',
  'senior': 'senior-level',
  'lead': 'tech lead',
  'principal': 'principal engineer',
  'staff': 'staff engineer',
}

export function enhanceQuery(query: string): string {
  const original = query.trim()
  const lower = original.toLowerCase()
  let enhanced = original

  // Remove vagueness indicators while preserving meaning
  let hasVagueness = false
  for (const indicator of VAGUENESS_INDICATORS) {
    if (lower.includes(indicator + ' ')) {
      hasVagueness = true
      break
    }
  }

  // Apply expansion rules
  let expansionApplied = false
  for (const rule of EXPANSION_RULES) {
    for (const trigger of rule.triggers) {
      if (lower.includes(trigger)) {
        // Only add the expansion if the query doesn't already include all terms
        const missingAdditions = rule.additions.filter(
          (a) => !lower.includes(a.toLowerCase())
        )
        if (missingAdditions.length > 0 && !expansionApplied) {
          enhanced = `${enhanced} with ${missingAdditions.join(', ')}`
          expansionApplied = true
        }
        break
      }
    }
    if (expansionApplied) break
  }

  // Normalize seniority language
  for (const [informal, formal] of Object.entries(SENIORITY_MAP)) {
    const regex = new RegExp(`\\b${informal}\\b`, 'i')
    if (regex.test(enhanced)) {
      enhanced = enhanced.replace(regex, formal)
      break
    }
  }

  // Ensure "developers" or "engineers" is present for specificity
  const hasRole =
    lower.includes('developer') ||
    lower.includes('engineer') ||
    lower.includes('designer') ||
    lower.includes('scientist') ||
    lower.includes('analyst') ||
    lower.includes('architect')

  if (!hasRole && hasVagueness) {
    enhanced = enhanced.replace(
      new RegExp(VAGUENESS_INDICATORS.join('|'), 'i'),
      ''
    ).trim()
    enhanced = `${enhanced} developers`
  }

  // Ensure GitHub is referenced for discoverability
  if (
    !enhanced.toLowerCase().includes('github') &&
    !enhanced.toLowerCase().includes('linkedin') &&
    !enhanced.toLowerCase().includes('portfolio')
  ) {
    enhanced += ' with active GitHub repositories'
  }

  return enhanced.trim().replace(/\s{2,}/g, ' ')
}
