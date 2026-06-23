import type { Language, ReviewResult } from '@/lib/types'

export interface ReviewRequest {
  code: string
  language: Language
}

/**
 * Client for the Vercel Function in `api/review.ts`.
 * Sends source code to the review endpoint and returns the parsed result.
 */
export async function requestReview(
  payload: ReviewRequest,
  signal?: AbortSignal,
): Promise<ReviewResult> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Review request failed with status ${response.status}`)
  }

  return (await response.json()) as ReviewResult
}
