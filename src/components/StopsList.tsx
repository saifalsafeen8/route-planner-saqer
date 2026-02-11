import { useState, useRef } from 'react'
import { Stop } from '../types'

const COLORS = ['#e67e22', '#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#1abc9c', '#e84393', '#00b894', '#6c5ce7', '#fdcb6e']

export function stopColor(i: number) {
  return COLORS[i % COLORS.length]
}

interface Props {
  stops: Stop[]
  onReorder: (from: number, to: number) => void
  onRemove: (id: string) => void
  onSelect: (id: string) => void
  selected: string | null
}


export default function StopsList({ stops, onReorder, onRemove, onSelect, selected }: Props) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const onDragEnd = () => {
    if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
      onReorder(dragFrom, dragOver)
    }
    setDragFrom(null)
    setDragOver(null)
  }

  if (!stops.length) {
    return (
      <div className="flex flex-col items-center py-10 text-gray-500">
        No stops
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {stops.map((stop, i) => {
        const label = i === 0 ? 'S' : i === stops.length - 1 && stops.length > 1 ? 'E' : String(i)
        const isDragTarget = dragOver === i && dragFrom !== null && dragFrom !== i
        const displayName = stop.name?.startsWith('Stop') ? `Stop ${i + 1}` : stop.name

        return (
          <div key={stop.id}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={e => { e.preventDefault(); setDragOver(i) }}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(stop.id)}
            className={`group flex items-center bg-[#1a1a2e] gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all
                 ${isDragTarget ? 'bg-[#8a5cf646] border border-[#8b5cf6]' : ''}
                 ${selected === stop.id ? 'border border-[#3b82f6]' : 'border-b border-[#232b45]'}
                 ${dragFrom === i ? 'opacity-30' : ''}
                 `}
          >

            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: stopColor(i) }}>
              {label}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-200 truncate">{displayName}</div>
              <div className="text-[11px] text-gray-500 truncate">{stop.address}</div>
            </div>

            <button onClick={e => { e.stopPropagation(); onRemove(stop.id) }}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity shrink-0">
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
