import { AlertTriangle, Info, XCircle, type LucideIcon } from 'lucide-react'
import type { Severity } from '@/lib/types'

interface SeverityBadgeProps {
  severity: Severity
}

const SEVERITY_STYLES: Record<
  Severity,
  { className: string; icon: LucideIcon; label: string }
> = {
  error: {
    className: 'bg-red-950/60 border border-red-500/40 text-red-400',
    icon: XCircle,
    label: 'Error',
  },
  warning: {
    className: 'bg-amber-950/60 border border-amber-500/40 text-amber-400',
    icon: AlertTriangle,
    label: 'Warning',
  },
  info: {
    className: 'bg-sky-950/60 border border-sky-500/40 text-sky-400',
    icon: Info,
    label: 'Info',
  },
}

/** Inline pill conveying an issue's severity with an icon + label. */
export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { className, icon: Icon, label } = SEVERITY_STYLES[severity]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon size={12} aria-hidden="true" />
      <span className="sr-only">{severity}:</span>
      {label}
    </span>
  )
}
