import { useCallback, useRef, useState } from 'react'
import { streamReview } from '@/api/review'
import type { Issue, Language, Severity } from '@/lib/types'

export type Status = 'idle' | 'streaming' | 'done' | 'error'

interface State {
  status: Status
  rawText: string
  issues: Issue[]
  summary: string
  error: string | null
}

const initialState: State = {
  status: 'idle',
  rawText: '',
  issues: [],
  summary: '',
  error: null,
}

/**
 * Drives a streaming code review. `startReview` opens an SSE stream, parsing
 * the partial JSON as it arrives so issues and the summary surface
 * incrementally; `cancel` aborts the in-flight request.
 */
export function useStreamReview() {
  const [state, setState] = useState<State>(initialState)
  const abortController = useRef<AbortController | null>(null)

  const startReview = useCallback((code: string, language: Language) => {
    // Tear down any in-flight stream before starting a new one.
    abortController.current?.abort()
    const controller = new AbortController()
    abortController.current = controller

    setState({
      status: 'streaming',
      rawText: '',
      issues: [],
      summary: '',
      error: null,
    })

    // Accumulate locally so each chunk parses the full text so far without
    // depending on the asynchronous state update.
    let raw = ''

    streamReview(
      { code, language },
      (text) => {
        raw += text
        const { issues, summary } = parsePartial(raw)
        setState((prev) => ({ ...prev, rawText: raw, issues, summary }))
      },
      () => {
        setState((prev) => ({ ...prev, status: 'done' }))
      },
      (message) => {
        setState((prev) => ({ ...prev, status: 'error', error: message }))
      },
      controller.signal,
    )
  }, [])

  const cancel = useCallback(() => {
    abortController.current?.abort()
    setState((prev) => ({ ...prev, status: 'idle' }))
  }, [])

  return { ...state, startReview, cancel }
}

const SEVERITIES: readonly Severity[] = ['error', 'warning', 'info']

/**
 * Best-effort parse of the model's partial output into issues + summary.
 *
 * The expected shape is a JSON array of issues followed by `SUMMARY: <text>`.
 * Mid-stream the JSON is usually incomplete, so this never throws: it falls
 * back to extracting whatever complete `{...}` objects it can find.
 */
export function parsePartial(raw: string): {
  issues: Issue[]
  summary: string
} {
  try {
    let summary = ''
    const summaryIndex = raw.indexOf('SUMMARY:')
    if (summaryIndex !== -1) {
      summary = raw.slice(summaryIndex + 'SUMMARY:'.length).trim()
    }

    const start = raw.indexOf('[')
    if (start === -1) {
      return { issues: [], summary }
    }

    // Only consider the region before SUMMARY when locating the array's end.
    const beforeSummary = summaryIndex === -1 ? raw : raw.slice(0, summaryIndex)
    const end = beforeSummary.lastIndexOf(']')

    if (end > start) {
      try {
        const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
        if (Array.isArray(parsed)) {
          return { issues: parsed.filter(isIssue), summary }
        }
      } catch {
        // Array region present but not yet valid JSON — fall through.
      }
    }

    return { issues: extractIssues(raw.slice(start)), summary }
  } catch {
    return { issues: [], summary: '' }
  }
}

/** Recover complete `{...}` objects from a partially-streamed array. */
function extractIssues(text: string): Issue[] {
  const matches = text.match(/\{[^}]+\}/g)
  if (!matches) return []

  const issues: Issue[] = []
  for (const match of matches) {
    try {
      const parsed: unknown = JSON.parse(match)
      if (isIssue(parsed)) {
        issues.push(parsed)
      }
    } catch {
      // skip fragments that don't parse on their own
    }
  }
  return issues
}

function isIssue(value: unknown): value is Issue {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.line === 'number' &&
    typeof candidate.severity === 'string' &&
    SEVERITIES.includes(candidate.severity as Severity) &&
    typeof candidate.message === 'string'
  )
}
