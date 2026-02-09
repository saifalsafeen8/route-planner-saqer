import { useState, useRef, useEffect, useCallback } from 'react'
import { searchPlaces } from '../utils/mapbox'

interface Props {
  onSelect: (place: { name: string; address: string; lng: number; lat: number }) => void
  disabled?: boolean
}

export default function SearchInput({ onSelect, disabled }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const ref = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (text: string) => {
    const r = await searchPlaces(text)
    setResults(r)
    setOpen(r.length > 0)
  }, [])

  const onChange = (val: string) => {
    setQ(val)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(val), 300)
  }

  const pick = (r: any) => {
    onSelect(r)
    setQ('')
    setResults([])
    setOpen(false)
  }

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        value={q}
        onChange={e => onChange(e.target.value)}
        placeholder="Search address..."
        disabled={disabled}
        className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-[#8b5cf6] disabled:opacity-40"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-dark-700 border border-dark-600 rounded-md shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button key={i} onClick={() => pick(r)}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#8b5cf6] border-b border-dark-600/40 last:border-0">
              <div className="text-gray-200 font-medium">{r.name}</div>
              <div className="text-gray-500 text-xs truncate">{r.address}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
