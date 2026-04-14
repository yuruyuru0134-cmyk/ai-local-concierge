'use client'

import { useEffect, useRef, useState } from 'react'
import type { SubOption } from '@/lib/types'

interface OptionSelectorProps {
  title: string
  subtitle: string
  options: SubOption[]
  onSelect: (option: SubOption) => void
  accentColor: string
}

export function OptionSelector({ title, subtitle, options, onSelect, accentColor }: OptionSelectorProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex(prev => (prev + 1) % options.length)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex(prev => (prev - 1 + options.length) % options.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(options[focusedIndex])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, options, onSelect])

  // フォーカス時にスクロール
  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex])

  // マウント時に最初の項目にフォーカス
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-6 outline-none"
      tabIndex={-1}
    >
      <h2 className={`text-2xl font-bold mb-1 ${accentColor}`}>{title}</h2>
      <p className="text-gray-500 text-sm mb-6">{subtitle}</p>
      <p className="text-xs text-gray-400 mb-4 hidden sm:block">
        ↑↓ キーで選択 / Enter で決定
      </p>
      <p className="text-xs text-gray-400 mb-4 sm:hidden">
        タップして選択
      </p>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option, index) => (
          <button
            key={option.id}
            ref={el => { itemRefs.current[index] = el }}
            onClick={() => onSelect(option)}
            onMouseEnter={() => setFocusedIndex(index)}
            className={`
              flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150
              focus:outline-none active:scale-95
              ${focusedIndex === index
                ? 'border-current shadow-md scale-[1.02] bg-white'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
              ${accentColor}
            `}
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{option.icon}</span>
            <div>
              <div className={`font-semibold text-sm ${focusedIndex === index ? accentColor : 'text-gray-800'}`}>
                {option.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
            </div>
            {focusedIndex === index && (
              <span className="ml-auto flex-shrink-0 text-lg self-center">›</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
