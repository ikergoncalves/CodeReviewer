import type { Issue, ReviewResult } from '../src/lib/types'

export const config = {
  runtime: 'edge',
}

interface ReviewRequestBody {
  code?: string
  language?: string
}

/**
 * Vercel Edge Function that will run a code review via the Anthropic API.
 * Currently scaffolded: it validates input and returns an empty review.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)
  }

  const body = (await request.json()) as ReviewRequestBody
  if (!body.code) {
    return jsonResponse({ error: 'Missing "code" in request body' }, 400)
  }

  // TODO: call the Anthropic API and stream a real review back to the client.
  const issues: Issue[] = []
  const result: ReviewResult = {
    issues,
    summary: 'Review endpoint scaffolded. Implementation pending.',
  }

  return jsonResponse(result, 200)
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
