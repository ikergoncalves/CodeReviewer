import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import type { Issue, Language } from '@/lib/types'
import type { Status } from '@/hooks/useStreamReview'
import { cn } from '@/lib/utils'

const CodeMirrorEditor = lazy(() => import('./CodeMirrorEditor'))

interface CodeEditorProps {
  code: string
  language: Language
  issues: Issue[]
  highlightedLine: number | null
  status: Status
  onCodeChange: (code: string) => void
  onLanguageChange: (language: Language) => void
  onAnalyze: () => void
  onStop: () => void
}

const MAX_RECOMMENDED_LENGTH = 9000

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

const SHORTCUT_HINT = isMac ? '⌘↵' : 'Ctrl+↵'

/** Placeholder shown while the heavy CodeMirror chunk is loading. */
function EditorSkeleton() {
  return (
    <div
      className="flex h-full animate-pulse flex-col gap-3 bg-slate-900 p-4"
      aria-hidden="true"
    >
      <div className="h-3 w-3/4 rounded bg-slate-800" />
      <div className="h-3 w-1/2 rounded bg-slate-800" />
      <div className="h-3 w-5/6 rounded bg-slate-800" />
      <div className="h-3 w-2/3 rounded bg-slate-800" />
      <div className="h-3 w-1/3 rounded bg-slate-800" />
    </div>
  )
}

export function CodeEditor({
  code,
  language,
  issues,
  highlightedLine,
  status,
  onCodeChange,
  onLanguageChange,
  onAnalyze,
  onStop,
}: CodeEditorProps) {
  const isStreaming = status === 'streaming'
  const isEmpty = code.trim().length === 0
  const overLimit = code.length > MAX_RECOMMENDED_LENGTH

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={<EditorSkeleton />}>
          <CodeMirrorEditor
            code={code}
            language={language}
            issues={issues}
            highlightedLine={highlightedLine}
            onCodeChange={onCodeChange}
          />
        </Suspense>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-3 py-2">
        <div className="flex items-center gap-3">
          <LanguageSelector value={language} onChange={onLanguageChange} />
          <span
            className={cn(
              'text-xs tabular-nums',
              overLimit ? 'text-red-400' : 'text-slate-500',
            )}
          >
            {code.length.toLocaleString()} chars
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-md bg-violet-600/70 px-3 py-1.5 text-sm font-medium text-white">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyzing...
              </span>
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop analysis"
                className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                Stop
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isEmpty}
              aria-disabled={isEmpty}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors',
                isEmpty
                  ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                  : 'bg-violet-600 hover:bg-violet-500',
              )}
            >
              Analyze Code
              <kbd className="rounded border border-white/20 bg-white/10 px-1 text-xs font-normal">
                {SHORTCUT_HINT}
              </kbd>
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
