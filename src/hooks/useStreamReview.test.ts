import { parsePartial } from '@/hooks/useStreamReview'

describe('parsePartial', () => {
  it('returns empty on blank input', () => {
    expect(parsePartial('')).toEqual({ issues: [], summary: '' })
  })

  it('parses a complete JSON array', () => {
    const raw = `[{"line":1,"severity":"error","message":"Null ref"}]\n\nSUMMARY: Needs work`
    const result = parsePartial(raw)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ line: 1, severity: 'error' })
    expect(result.summary).toBe('Needs work')
  })

  it('handles partial JSON mid-stream', () => {
    const raw = `[{"line":2,"severity":"warning","message":"Unused var"},{"line":5,"sev`
    const result = parsePartial(raw)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.line).toBe(2)
  })

  it('returns empty issues when JSON is completely malformed', () => {
    expect(parsePartial('not json at all')).toEqual({ issues: [], summary: '' })
  })
})
