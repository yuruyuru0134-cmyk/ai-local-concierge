'use client'

import { useEffect, useRef, useState } from 'react'
import { MODES, type ModeConfig } from '@/lib/types'

interface ModeSelectorProps {
  onSelect: (mode: ModeConfig) => void
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex(prev => (prev + 1) % MODES.length)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex(prev => (prev - 1 + MODES.length) % MODES.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(MODES[focusedIndex])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, onSelect])

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex])

  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    survey:     { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-600'   },
    flyer:      { border: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-600'  },
    restaurant: { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-600' },
    thinking:   { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-600' },
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8 outline-none"
      tabIndex={-1}
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🤖 マルチモードAI</h1>
        <p className="text-gray-500">使いたいモードを選んでください</p>
        <p className="text-xs text-gray-400 mt-2 hidden sm:block">↑↓ キーで選択 / Enter で決定</p>
        <p className="text-xs text-gray-400 mt-2 sm:hidden">タップして選択</p>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODES.map((mode, index) => {
          const colors = colorMap[mode.id]
          const isFocused = focusedIndex === index
          return (
            <button
              key={mode.id}
              ref={el => { itemRefs.current[index] = el }}
              onClick={() => onSelect(mode)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`
                relative flex flex-col items-start gap-2 p-5 rounded-2xl border-2 text-left
                transition-all duration-150 focus:outline-none active:scale-95
                ${isFocused
                  ? `${colors.border} ${colors.bg} shadow-lg scale-[1.03]`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-3xl">{mode.icon}</span>
                <span className={`text-lg font-bold ${isFocused ? colors.text : 'text-gray-800'}`}>
                  {mode.label}
                </span>
                {isFocused && <span className={`ml-auto text-xl ${colors.text}`}>›</span>}
              </div>
              <p className="text-sm text-gray-500 pl-1">{mode.description}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {mode.subOptions.slice(0, 3).map(sub => (
                  <span
                    key={sub.id}
                    className={`text-xs px-2 py-0.5 rounded-full ${isFocused ? `${colors.bg} ${colors.text} border ${colors.border}` : 'bg-gray-100 text-gray-500'}`}
                  >
                    {sub.icon} {sub.label}
                  </span>
                ))}
                {mode.subOptions.length > 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    +{mode.subOptions.length - 3}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
