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
