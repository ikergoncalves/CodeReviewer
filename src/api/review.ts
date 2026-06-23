import type { Language } from '@/lib/types'

export interface ReviewRequest {
  code: string
  language: Language
}

interface SsePayload {
  chunk?: string
  error?: string
}

/**
 * Streams a code review from the `api/review` endpoint, parsing the Server-Sent
 * Events the function emits and dispatching them through the provided callbacks.
 *
 * - `onChunk` fires for every text fragment as it arrives.
 * - `onDone` fires once when the stream terminates with `data: [DONE]`.
 * - `onError` fires for transport failures, non-2xx responses, or an `error`
 *   payload from the server.
 *
 * Aborting via `signal` stops the stream silently (no callback fires).
 */
export function streamReview(
  payload: ReviewRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): void {
  void (async () => {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      })

      if (!response.ok) {
        onError(await readErrorMessage(response))
        return
      }

      if (!response.body) {
        onError('Response did not include a readable body')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE events are newline-delimited; keep the trailing partial line in
        // the buffer until the next chunk completes it.
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, '')
          if (!line.startsWith('data: ')) continue

          const data = line.slice('data: '.length)
          if (data === '[DONE]') {
            onDone()
            return
          }

          let parsed: SsePayload
          try {
            parsed = JSON.parse(data) as SsePayload
          } catch {
            continue // ignore malformed fragments mid-stream
          }

          if (parsed.error !== undefined) {
            onError(parsed.error)
            return
          }
          if (parsed.chunk !== undefined) {
            onChunk(parsed.chunk)
          }
        }
      }

      // Stream closed without an explicit [DONE]; treat it as a clean finish.
      onDone()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // aborted by caller — stay silent
      }
      onError(error instanceof Error ? error.message : 'Unknown error')
    }
  })()
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string }
    if (typeof data.error === 'string' && data.error.length > 0) {
      return data.error
    }
  } catch {
    // fall through to the generic message
  }
  return `Review request failed with status ${response.status}`
}
