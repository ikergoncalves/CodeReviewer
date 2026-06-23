import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@/lib/types'

interface LanguageSelectorProps {
  value: Language
  onChange: (lang: Language) => void
}

/** Native select styled to match the dark theme. */
export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <select
      aria-label="Language"
      value={value}
      onChange={(event) => onChange(event.target.value as Language)}
      className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {LANGUAGE_LABELS[lang]}
        </option>
      ))}
    </select>
  )
}
