import { useState } from 'react'
import { AlertCircle, ChevronRight, Code } from 'lucide-react'
import { SeverityBadge } from '@/components/SeverityBadge'
import { formatReportAsMarkdown } from '@/lib/reportFormatter'
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  type Issue,
  type Language,
} from '@/lib/types'
import type { Status } from '@/hooks/useStreamReview'
import { cn } from '@/lib/utils'

interface ReviewPanelProps {
  status: Status
  issues: Issue[]
  summary: string
  error: string | null
  language: Language
  onIssueClick: (line: number) => void
  onReset: () => void
}

export function ReviewPanel({
  status,
  issues,
  summary,
  error,
  language,
  onIssueClick,
  onReset,
}: ReviewPanelProps) {
  return (
    <div
      role="region"
      aria-label="Code review results"
      className="relative flex h-full min-h-0 flex-col bg-slate-950"
    >
      {status === 'streaming' && <ProgressBar />}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === 'idle' && <IdleState />}
        {status === 'streaming' && (
          <StreamingState issues={issues} onIssueClick={onIssueClick} />
        )}
        {status === 'done' && (
          <DoneState
            issues={issues}
            summary={summary}
            language={language}
            onIssueClick={onIssueClick}
            onReset={onReset}
          />
        )}
        {status === 'error' && <ErrorState error={error} onReset={onReset} />}
      </div>
      {status === 'done' && (
        <div role="status" aria-live="polite" className="sr-only">
          Review complete: {issues.length} issues found
        </div>
      )}
    </div>
  )
}

function ProgressBar() {
  return (
    <div className="h-1 w-full overflow-hidden bg-slate-800">
      <div className="progress-indeterminate h-full w-1/3 bg-gradient-to-r from-violet-500 to-sky-400" />
    </div>
  )
}

function IdleState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Code className="h-14 w-14 text-slate-700" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-slate-200">
        Ready to review
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Paste your code and click Analyze Code
      </p>
      <ul className="mt-5 flex max-w-xs flex-wrap justify-center gap-2">
        {LANGUAGES.map((lang) => (
          <li
            key={lang}
            className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs text-slate-400"
          >
            {LANGUAGE_LABELS[lang]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StreamingState({
  issues,
  onIssueClick,
}: {
  issues: Issue[]
  onIssueClick: (line: number) => void
}) {
  return (
    <div>
      <h2 className="animated-ellipsis text-lg font-semibold text-slate-200">
        Analyzing your code
      </h2>
      <ul
        role="list"
        aria-live="polite"
        aria-atomic="false"
        className="mt-4 space-y-3"
      >
        {issues.map((issue, index) => (
          <IssueCard
            key={`${issue.line}-${index}`}
            issue={issue}
            index={index}
            animate
            onIssueClick={onIssueClick}
          />
        ))}
      </ul>
    </div>
  )
}

function DoneState({
  issues,
  summary,
  language,
  onIssueClick,
  onReset,
}: {
  issues: Issue[]
  summary: string
  language: Language
  onIssueClick: (line: number) => void
  onReset: () => void
}) {
  const [copied, setCopied] = useState(false)

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  const handleCopy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(
          formatReportAsMarkdown(issues, summary, language),
        )
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard unavailable — silently ignore.
      }
    })()
  }

  return (
    <div>
      {summary && (
        <div className="border-l-2 border-violet-500 bg-slate-900 p-3 text-sm text-slate-300">
          {summary}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-300">
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'} —{' '}
          {errorCount} errors · {warningCount} warnings · {infoCount} info
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            {copied ? 'Copied!' : 'Copy Report'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500"
          >
            Review Again
          </button>
        </div>
      </div>

      {issues.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          No issues found.
        </p>
      ) : (
        <ul role="list" className="mt-4 space-y-3">
          {issues.map((issue, index) => (
            <IssueCard
              key={`${issue.line}-${index}`}
              issue={issue}
              index={index}
              onIssueClick={onIssueClick}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ErrorState({
  error,
  onReset,
}: {
  error: string | null
  onReset: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <AlertCircle className="h-12 w-12 text-red-500" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-slate-200">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        {error ?? 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        Try again
      </button>
    </div>
  )
}

function IssueCard({
  issue,
  index,
  animate = false,
  onIssueClick,
}: {
  issue: Issue
  index: number
  animate?: boolean
  onIssueClick: (line: number) => void
}) {
  const [showFix, setShowFix] = useState(false)

  return (
    <li
      role="listitem"
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-900/60 p-3',
        animate && 'animate-fade-up',
      )}
      style={animate ? { animationDelay: `${index * 50}ms` } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onIssueClick(issue.line)}
          className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-200 transition-colors hover:bg-slate-600"
        >
          L{issue.line}
        </button>
        <SeverityBadge severity={issue.severity} />
      </div>

      <p className="mt-2 text-sm text-slate-200">{issue.message}</p>

      {issue.suggestion && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowFix((open) => !open)}
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 transition-colors hover:text-violet-300"
            aria-expanded={showFix}
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', showFix && 'rotate-90')}
              aria-hidden="true"
            />
            {showFix ? 'Hide fix' : 'Show fix'}
          </button>
          {showFix && (
            <p className="mt-1 whitespace-pre-wrap rounded-md border-l-2 border-violet-500 bg-slate-900 p-2 text-xs text-slate-300">
              {issue.suggestion}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
