'use client'

import { useEffect, useRef, useState } from 'react'
import { MODES, PERSONALITIES, type Location, type ModeConfig, type PersonalityId } from '@/lib/types'

interface ModeSelectorProps {
  onSelect: (mode: ModeConfig) => void
  personality: PersonalityId
  onPersonalityChange: (id: PersonalityId) => void
  location: Location | null
  onChangeLocation: () => void
}

export function ModeSelector({ onSelect, personality, onPersonalityChange, location, onChangeLocation }: ModeSelectorProps) {
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
    survey:  { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-600'   },
    useful:  { border: 'border-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-600'   },
    thinking: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-600' },
  }

  // 位置情報の表示用テキスト
  const locationLabel = location?.address
    ? location.address.split('、')[0].split('，')[0].slice(0, 30)
    : location
      ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
      : null

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center w-full max-w-2xl mx-auto px-4 py-8 outline-none"
      tabIndex={-1}
    >
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🤖 マルチモードAI</h1>
        <p className="text-gray-500">使いたいモードを選んでください</p>
        <p className="text-xs text-gray-400 mt-2 hidden sm:block">↑↓ キーで選択 / Enter で決定</p>

        {/* 現在地表示 */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs">
          {locationLabel ? (
            <>
              <span className="text-gray-400">📍</span>
              <span className="text-gray-500 truncate max-w-[220px]">{locationLabel}</span>
              <button
                onClick={onChangeLocation}
                className="text-teal-500 underline flex-shrink-0"
              >
                変更
              </button>
            </>
          ) : (
            <button
              onClick={onChangeLocation}
              className="text-teal-500 underline"
            >
              📍 現在地を設定する
            </button>
          )}
        </div>
      </div>

      {/* キャラクター選択（プルダウン） */}
      <div className="w-full mb-6">
        <label className="text-xs text-gray-400 font-medium mb-2 text-center tracking-wide block">AIキャラクター</label>
        <select
          value={personality}
          onChange={e => onPersonalityChange(e.target.value as PersonalityId)}
          className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-indigo-400 transition-colors appearance-none cursor-pointer"
        >
          {PERSONALITIES.map(p => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.label}（{p.description}）
            </option>
          ))}
        </select>
      </div>

      {/* モード一覧 */}
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
