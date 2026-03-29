/**
 * TinyFish SSE Client
 *
 * Matches the exact pattern from the reference tinyfish-acc project.
 * API: POST https://agent.tinyfish.ai/v1/automation/run-sse
 * Auth: X-API-Key header
 *
 * Events streamed:
 *   STARTED       → { runId, streamingUrl }   ← embed streamingUrl in iframe
 *   PROGRESS      → { purpose }               ← live status message
 *   COMPLETE      → { resultJson }            ← final structured data
 *   ERROR         → { error }
 */

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse'

export type TinyFishEvent = {
  type: 'STARTED' | 'STREAMING_URL' | 'PROGRESS' | 'COMPLETE' | 'ERROR'
  runId?: string
  streamingUrl?: string   // normalized from streaming_url
  purpose?: string
  status?: string
  resultJson?: Record<string, unknown>  // some versions use this
  result?: Record<string, unknown>      // SDK uses this
  error?: string
}

export type TinyFishRequest = {
  url: string
  goal: string
  browserProfile?: 'lite' | 'stealth'
}

/**
 * Run a TinyFish agent task. Streams SSE events.
 * onEvent is called for every event — use it to forward streamingUrl + progress to the client.
 * Returns the resultJson from the COMPLETE event, or null on failure.
 */
export async function runTinyFish(
  request: TinyFishRequest,
  onEvent?: (event: TinyFishEvent) => void
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) throw new Error('TINYFISH_API_KEY not set')

  const response = await fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: request.url,
      goal: request.goal,
      browserProfile: request.browserProfile ?? 'stealth',
    }),
  })

  if (!response.ok) {
    throw new Error(`TinyFish API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body from TinyFish')

  const decoder = new TextDecoder()
  let resultJson: Record<string, unknown> | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        try {
          const raw = JSON.parse(line.slice(6))
          // TinyFish API sends streaming_url (snake_case) — normalize to camelCase
          const event: TinyFishEvent = {
            ...raw,
            streamingUrl: raw.streamingUrl ?? raw.streaming_url,
          }
          onEvent?.(event)

          if (event.type === 'COMPLETE') {
            resultJson = (event.resultJson ?? (raw.result as Record<string, unknown>)) ?? null
          }
          if (event.type === 'ERROR') {
            throw new Error(event.error ?? 'TinyFish automation failed')
          }
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue
          throw parseErr
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return resultJson
}
