import { TerminalSquare } from 'lucide-react'

/**
 * Fixed application top bar: brand on the left, a subtle attribution on the
 * right. Sits above all page content.
 */
export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-4">
      <div className="flex items-center gap-2">
        <TerminalSquare className="h-5 w-5 text-violet-400" aria-hidden="true" />
        <h1 className="text-base font-semibold text-slate-100">Code Reviewer</h1>
      </div>
      <span className="text-xs text-slate-600">Powered by Claude</span>
    </header>
  )
}
