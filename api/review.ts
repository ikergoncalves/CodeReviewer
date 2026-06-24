import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Language } from '../src/lib/types'

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

// Per-instance rate-limit store. Resets whenever the Serverless Function
// instance is recycled, so this is best-effort throttling, not a global
// guarantee.
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
    return
  }

  const ip = clientIp(req)
  if (!withinRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' })
    return
  }

  const validation = validate((req.body ?? {}) as ReviewRequestBody)
  if ('error' in validation) {
    res.status(400).json({ error: validation.error })
    return
  }
  const { code, language } = validation

  const client = new Anthropic({ apiKey })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

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
        res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected streaming error'
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
  } finally {
    res.end()
  }
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

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return value?.split(',')[0]?.trim() ?? 'unknown'
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

function applyCors(res: VercelResponse): void {
  const origin =
    process.env.NODE_ENV !== 'production'
      ? '*'
      : (process.env.FRONTEND_URL ?? '*')

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
