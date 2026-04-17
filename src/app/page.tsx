'use client'

import { useCallback, useEffect, useState } from 'react'
import { ModeSelector } from '@/components/ModeSelector'
import { OptionSelector } from '@/components/OptionSelector'
import { ChatInterface } from '@/components/ChatInterface'
import { LocationPrompt } from '@/components/LocationPrompt'
import type { Location, ModeConfig, PersonalityId, SubOption } from '@/lib/types'

type Step = 'location' | 'mode' | 'sub' | 'chat'

const LOCATION_KEY = 'ai_chat_location'

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window
}

export default function Home() {
  const [step, setStep] = useState<Step>('location')
  const [selectedMode, setSelectedMode] = useState<ModeConfig | null>(null)
  const [selectedSubOption, setSelectedSubOption] = useState<SubOption | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [personality, setPersonality] = useState<PersonalityId>('osaka_ojisan')
  // null = 判定中（SSR対策）
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // デバイス判定 & 保存済み位置情報の読み込み
  useEffect(() => {
    setIsMobile(isTouchDevice())
    try {
      const saved = localStorage.getItem(LOCATION_KEY)
      if (saved) {
        setLocation(JSON.parse(saved) as Location)
        setStep('mode')
      }
    } catch { /* ignore */ }
  }, [])

  const handleLocation = useCallback((loc: Location | null) => {
    setLocation(loc)
    if (loc) {
      try { localStorage.setItem(LOCATION_KEY, JSON.stringify(loc)) } catch { /* ignore */ }
    }
    setStep('mode')
  }, [])

  const handleModeSelect = useCallback((mode: ModeConfig) => {
    setSelectedMode(mode)
    setStep('sub')
  }, [])

  const handleSubOptionSelect = useCallback((sub: SubOption) => {
    setSelectedSubOption(sub)
    setStep('chat')
  }, [])

  const handleChangeLocation = useCallback(() => {
    try { localStorage.removeItem(LOCATION_KEY) } catch { /* ignore */ }
    setStep('location')
  }, [])

  const accentColorMap: Record<string, string> = {
    survey:  'text-blue-600',
    useful:  'text-teal-600',
    thinking: 'text-purple-600',
  }
  const accentColor = selectedMode ? (accentColorMap[selectedMode.id] ?? 'text-gray-600') : 'text-teal-600'

  return (
    <main className="flex flex-col h-dvh bg-gray-50">

      {/* ── STEP 1: 位置情報 ── */}
      {step === 'location' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          {isMobile === null ? (
            // デバイス判定中はローディング表示
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="text-4xl">📍</div>
              <p className="text-sm">読み込み中...</p>
            </div>
          ) : (
            <LocationPrompt
              onLocation={handleLocation}
              accentColor="text-teal-600"
              autoGPS={isMobile}
            />
          )}
        </div>
      )}

      {/* ── STEP 2: モード選択 ── */}
      {step === 'mode' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <ModeSelector
            onSelect={handleModeSelect}
            personality={personality}
            onPersonalityChange={setPersonality}
            location={location}
            onChangeLocation={handleChangeLocation}
          />
        </div>
      )}

      {/* ── STEP 3: サブオプション選択 ── */}
      {step === 'sub' && selectedMode && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setStep('mode')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← 戻る
            </button>
            <span className="text-lg">{selectedMode.icon}</span>
            <span className={`font-semibold ${accentColor}`}>{selectedMode.label}</span>
          </div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center py-4">
            <OptionSelector
              title={selectedMode.label}
              subtitle="どの機能を使いますか？"
              options={selectedMode.subOptions}
              onSelect={handleSubOptionSelect}
              accentColor={accentColor}
            />
          </div>
        </div>
      )}

      {/* ── STEP 4: チャット ── */}
      {step === 'chat' && selectedMode && selectedSubOption && (
        <ChatInterface
          mode={selectedMode}
          subOption={selectedSubOption}
          location={location}
          personality={personality}
          onBack={() => setStep('sub')}
          onBackToMode={() => {
            setSelectedMode(null)
            setSelectedSubOption(null)
            setStep('mode')
          }}
        />
      )}

    </main>
  )
}
