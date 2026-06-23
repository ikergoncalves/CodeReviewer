import { useCallback, useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { CodeEditor } from '@/components/CodeEditor'
import { ReviewPanel } from '@/components/ReviewPanel'
import { useStreamReview } from '@/hooks/useStreamReview'
import type { Language } from '@/lib/types'
import { cn } from '@/lib/utils'

const DEFAULT_CODE = `interface User {
  id: number
  name: string
  email: string
}

async function getUserData(userId: number) {
  const response = await fetch(\`/api/users/\${userId}\`)
  const user = await response.json()

  // Potential null reference - user might be undefined
  console.log(user.name.toUpperCase())

  // Missing error handling for failed requests
  if (user.role = 'admin') {
    deleteAllRecords()
  }

  return user
}

function deleteAllRecords() {
  // Dangerous function with no confirmation
  fetch('/api/records', { method: 'DELETE' })
}
`

type Tab = 'code' | 'review'

export default function App() {
  const [language, setLanguage] = useState<Language>('typescript')
  const [code, setCode] = useState(DEFAULT_CODE)
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('code')

  const { status, issues, summary, error, startReview, cancel } =
    useStreamReview()

  const handleAnalyze = useCallback(() => {
    setActiveTab('review')
    startReview(code, language)
  }, [code, language, startReview])

  const handleReset = useCallback(() => {
    cancel()
    setHighlightedLine(null)
  }, [cancel])

  // Keyboard shortcuts: Cmd/Ctrl+Enter analyzes, Escape cancels.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (status !== 'streaming') {
          setActiveTab('review')
          startReview(code, language)
        }
      } else if (event.key === 'Escape' && status === 'streaming') {
        cancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, language, status, startReview, cancel])

  return (
    <>
      <Header />
      <main className="flex h-screen flex-col overflow-hidden pt-14">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section
            className={cn(
              'min-h-0 flex-1 lg:block lg:border-r lg:border-slate-800',
              activeTab === 'code' ? 'block' : 'hidden',
            )}
          >
            <CodeEditor
              code={code}
              language={language}
              issues={issues}
              highlightedLine={highlightedLine}
              status={status}
              onCodeChange={setCode}
              onLanguageChange={setLanguage}
              onAnalyze={handleAnalyze}
              onStop={cancel}
            />
          </section>

          <section
            className={cn(
              'min-h-0 flex-1',
              activeTab === 'review' ? 'block' : 'hidden',
              'lg:block',
            )}
          >
            <ReviewPanel
              status={status}
              issues={issues}
              summary={summary}
              error={error}
              language={language}
              onIssueClick={setHighlightedLine}
              onReset={handleReset}
            />
          </section>
        </div>

        <nav className="grid grid-cols-2 border-t border-slate-800 bg-slate-950 lg:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={cn(
              'py-3 text-sm font-medium transition-colors',
              activeTab === 'code' ? 'text-violet-400' : 'text-slate-400',
            )}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
              activeTab === 'review' ? 'text-violet-400' : 'text-slate-400',
            )}
          >
            Review
            {status === 'done' && issues.length > 0 && (
              <span className="rounded-full bg-violet-600 px-1.5 text-xs text-white">
                {issues.length}
              </span>
            )}
          </button>
        </nav>
      </main>
    </>
  )
}
