import Anthropic from '@anthropic-ai/sdk'
import type { Language } from '../src/lib/types'

export const config = {
  runtime: 'edge',
}

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 2048
const MAX_CODE_LENGTH = 10_000

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

const SUPPORTED_LANGUAGES: readonly Language[] = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'cpp',
]

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided code and return a JSON array of issues.

Each issue must have:
- line: number (1-indexed line number where the issue occurs)
- severity: "error" | "warning" | "info"
- message: string (clear, actionable description)
- suggestion: string (optional - concrete fix suggestion)

After the JSON array, add a brief summary paragraph.

Format your response EXACTLY as:
[
  { "line": 1, "severity": "error", "message": "...", "suggestion": "..." },
  ...
]

SUMMARY: <one paragraph summarizing the overall code quality>

Rules:
- Point to specific line numbers
- Be direct and actionable, not generic
- Max 15 issues per review
- For "info" severity: positive observations or minor style notes
- For "warning": potential bugs or maintainability concerns
- For "error": bugs, security issues, or critical problems`

interface ReviewRequestBody {
  code?: unknown
  language?: unknown
}

// Per-instance rate-limit store. Resets whenever the Edge Function instance is
// recycled, so this is best-effort throttling, not a global guarantee.
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export default async function handler(request: Request): Promise<Response> {
  const cors = corsHeaders()

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500, cors)
  }

  const ip = clientIp(request)
  if (!withinRateLimit(ip)) {
    return jsonResponse(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      429,
      cors,
    )
  }

  let body: ReviewRequestBody
  try {
    body = (await request.json()) as ReviewRequestBody
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400, cors)
  }

  const validation = validate(body)
  if ('error' in validation) {
    return jsonResponse({ error: validation.error }, 400, cors)
  }
  const { code, language } = validation

  const client = new Anthropic({ apiKey })
  const encoder = new TextEncoder()

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\``,
            },
          ],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`,
              ),
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unexpected streaming error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}

type ValidationResult =
  | { code: string; language: Language }
  | { error: string }

function validate(body: ReviewRequestBody): ValidationResult {
  if (typeof body.code !== 'string') {
    return { error: 'Field "code" must be a string' }
  }

  // Strip null bytes before measuring length so the check reflects the payload
  // we actually forward to the model.
  const code = body.code.replace(/\0/g, '')
  if (code.length === 0) {
    return { error: 'Field "code" must not be empty' }
  }
  if (code.length > MAX_CODE_LENGTH) {
    return {
      error: `Field "code" exceeds the maximum of ${MAX_CODE_LENGTH} characters`,
    }
  }

  if (
    typeof body.language !== 'string' ||
    !SUPPORTED_LANGUAGES.includes(body.language as Language)
  ) {
    return {
      error: `Field "language" must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
    }
  }

  return { code, language: body.language as Language }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

function withinRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count += 1
  return true
}

function corsHeaders(): Record<string, string> {
  const origin =
    process.env.NODE_ENV !== 'production'
      ? '*'
      : (process.env.FRONTEND_URL ?? '*')

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(
  data: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
