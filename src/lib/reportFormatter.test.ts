import { formatReportAsMarkdown } from '@/lib/reportFormatter'
import type { Issue } from '@/lib/types'

describe('formatReportAsMarkdown', () => {
  it('outputs "No issues found." when issues array is empty', () => {
    const result = formatReportAsMarkdown([], 'Looks good.', 'typescript')
    expect(result).toContain('No issues found.')
    expect(result).toContain('# Code Review — TypeScript')
  })

  it('groups issues by severity in the correct order (errors first)', () => {
    const issues: Issue[] = [
      { line: 5, severity: 'info', message: 'Consider adding docs' },
      { line: 2, severity: 'error', message: 'Null dereference' },
      { line: 8, severity: 'warning', message: 'Unused variable' },
    ]
    const result = formatReportAsMarkdown(issues, 'Needs work.', 'typescript')
    const errorIndex = result.indexOf('### Errors')
    const warningIndex = result.indexOf('### Warnings')
    const infoIndex = result.indexOf('### Info')
    expect(errorIndex).toBeLessThan(warningIndex)
    expect(warningIndex).toBeLessThan(infoIndex)
  })

  it('omits sections with zero issues', () => {
    const issues: Issue[] = [
      { line: 3, severity: 'error', message: 'Bad cast' },
    ]
    const result = formatReportAsMarkdown(issues, 'Summary.', 'python')
    expect(result).not.toContain('### Warnings')
    expect(result).not.toContain('### Info')
  })

  it('includes suggestion when present', () => {
    const issues: Issue[] = [
      {
        line: 1,
        severity: 'error',
        message: 'Missing return',
        suggestion: 'Add return statement',
      },
    ]
    const result = formatReportAsMarkdown(issues, 'Summary.', 'go')
    expect(result).toContain('Add return statement')
  })

  it('omits suggestion line when suggestion is absent', () => {
    const issues: Issue[] = [
      { line: 1, severity: 'warning', message: 'Shadowed variable' },
    ]
    const result = formatReportAsMarkdown(issues, 'Summary.', 'javascript')
    expect(result).not.toContain('> Suggestion:')
  })
})
