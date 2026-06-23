import type { Severity } from '@/lib/types'

interface SeverityBadgeProps {
  severity: Severity
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return <span data-severity={severity}>{severity}</span>
}
