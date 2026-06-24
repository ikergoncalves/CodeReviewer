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
import type { Issue, Language } from '@/lib/types'

interface CodeMirrorEditorProps {
  code: string
  language: Language
  issues: Issue[]
  highlightedLine: number | null
  onCodeChange: (code: string) => void
}

const SEVERITY_COLORS = {
  error: 'rgba(239, 68, 68, 0.15)',
  warning: 'rgba(251, 191, 36, 0.15)',
  info: 'rgba(56, 189, 248, 0.15)',
} as const

const SEVERITY_PRIORITY = { error: 3, warning: 2, info: 1 } as const

const HIGHLIGHT_COLOR = 'rgba(139, 92, 246, 0.25)'

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

/** Heavy CodeMirror editor, lazy-loaded to keep it out of the initial bundle. */
export default function CodeMirrorEditor({
  code,
  language,
  issues,
  highlightedLine,
  onCodeChange,
}: CodeMirrorEditorProps) {
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
    <div className="h-full" aria-label="Code editor">
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
  )
}
