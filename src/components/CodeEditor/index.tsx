import { useMemo } from 'react'
import CodeMirror, {
  Decoration,
  EditorView,
  RangeSetBuilder,
  ViewPlugin,
} from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { Loader2 } from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import type { Issue, Language } from '@/lib/types'
import type { Status } from '@/hooks/useStreamReview'
import { cn } from '@/lib/utils'

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

const SEVERITY_COLORS = {
  error: 'rgba(239, 68, 68, 0.15)',
  warning: 'rgba(251, 191, 36, 0.15)',
  info: 'rgba(56, 189, 248, 0.15)',
} as const

const SEVERITY_PRIORITY = { error: 3, warning: 2, info: 1 } as const

const HIGHLIGHT_COLOR = 'rgba(139, 92, 246, 0.25)'

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

const SHORTCUT_HINT = isMac ? '⌘↵' : 'Ctrl+↵'

/** Keeps the editor content in JetBrains Mono regardless of the active theme. */
const fontTheme = EditorView.theme({
  '&': { fontFamily: 'var(--font-mono)' },
  '.cm-content': { fontFamily: 'var(--font-mono)' },
  '.cm-gutters': { fontFamily: 'var(--font-mono)' },
})

function getLanguageExtension(language: Language): Extension {
  switch (language) {
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'python':
      return python()
    case 'java':
      return java()
    // go / rust / cpp fall back to the C-family grammar.
    default:
      return cpp()
  }
}

/** Maps each line to the background color it should be painted with. */
function buildLineColors(
  issues: Issue[],
  highlightedLine: number | null,
): Map<number, string> {
  const colors = new Map<number, string>()
  const priorities = new Map<number, number>()

  for (const issue of issues) {
    const priority = SEVERITY_PRIORITY[issue.severity]
    if ((priorities.get(issue.line) ?? 0) < priority) {
      priorities.set(issue.line, priority)
      colors.set(issue.line, SEVERITY_COLORS[issue.severity])
    }
  }

  // The actively highlighted line wins over any severity color.
  if (highlightedLine !== null) {
    colors.set(highlightedLine, HIGHLIGHT_COLOR)
  }

  return colors
}

function buildDecorations(
  view: EditorView,
  lineColors: Map<number, string>,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { doc } = view.state
  const sortedLines = [...lineColors.keys()].sort((a, b) => a - b)

  for (const lineNumber of sortedLines) {
    if (lineNumber < 1 || lineNumber > doc.lines) continue
    const color = lineColors.get(lineNumber)
    if (color === undefined) continue
    const line = doc.line(lineNumber)
    builder.add(
      line.from,
      line.from,
      Decoration.line({ attributes: { style: `background-color: ${color}` } }),
    )
  }

  return builder.finish()
}

/** A ViewPlugin that paints line backgrounds from the given color map. */
function lineHighlighter(lineColors: Map<number, string>): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, lineColors)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, lineColors)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
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

  const extensions = useMemo<Extension[]>(() => {
    const lineColors = buildLineColors(issues, highlightedLine)
    return [
      getLanguageExtension(language),
      fontTheme,
      EditorView.lineWrapping,
      lineHighlighter(lineColors),
    ]
  }, [language, issues, highlightedLine])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={onCodeChange}
          className="h-full text-sm"
          basicSetup={{ lineNumbers: true }}
        />
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
