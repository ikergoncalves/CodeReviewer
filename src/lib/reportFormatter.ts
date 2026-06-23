import { LANGUAGE_LABELS, type Issue, type Language, type Severity } from './types'

/** Severity sections, in the order they appear in the report. */
const SECTIONS: { severity: Severity; heading: string }[] = [
  { severity: 'error', heading: 'Errors' },
  { severity: 'warning', heading: 'Warnings' },
  { severity: 'info', heading: 'Info' },
]

/**
 * Renders a review as a Markdown report grouped by severity. Sections with no
 * issues are omitted; when there are no issues at all the body is simply
 * "No issues found."
 */
export function formatReportAsMarkdown(
  issues: Issue[],
  summary: string,
  language: Language,
): string {
  const lines: string[] = [
    `# Code Review — ${LANGUAGE_LABELS[language]}`,
    '',
    '## Summary',
    summary,
    '',
  ]

  if (issues.length === 0) {
    lines.push('No issues found.')
    return lines.join('\n')
  }

  lines.push(`## Issues (${issues.length} found)`, '')

  for (const { severity, heading } of SECTIONS) {
    const group = issues.filter((issue) => issue.severity === severity)
    if (group.length === 0) continue

    lines.push(`### ${heading} (${group.length})`, '')
    for (const issue of group) {
      lines.push(`**Line ${issue.line}** — ${issue.message}`)
      if (issue.suggestion) {
        lines.push(`> Suggestion: ${issue.suggestion}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}
