export type Severity = 'error' | 'warning' | 'info'

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'

export interface Issue {
  line: number
  severity: Severity
  message: string
  suggestion?: string
}

export interface ReviewResult {
  issues: Issue[]
  summary: string
}

/** All supported languages, in display order. */
export const LANGUAGES: readonly Language[] = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'cpp',
]

/** Human-readable labels for each language. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  cpp: 'C++',
}
