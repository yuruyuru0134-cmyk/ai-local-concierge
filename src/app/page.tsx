'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ModeSelector } from '@/components/ModeSelector'
import { OptionSelector } from '@/components/OptionSelector'
import { ChatInterface } from '@/components/ChatInterface'
import { LocationPrompt } from '@/components/LocationPrompt'
import type { Location, ModeConfig, SubOption } from '@/lib/types'

type Step = 'mode' | 'sub' | 'location' | 'chat'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const LOCATION_REQUIRED_MODES = ['flyer', 'restaurant']

export default function Home() {
  const [step, setStep] = useState<Step>('mode')
  const [selectedMode, setSelectedMode] = useState<ModeConfig | null>(null)
  const [selectedSubOption, setSelectedSubOption] = useState<SubOption | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [locationChecked, setLocationChecked] = useState(false)
  const isMobile = useRef(false)

  useEffect(() => {
    isMobile.current = isMobileDevice()
  }, [])

  const handleModeSelect = useCallback((mode: ModeConfig) => {
    setSelectedMode(mode)
    setStep('sub')
  }, [])

  const handleSubOptionSelect = useCallback((sub: SubOption) => {
    setSelectedSubOption(sub)

    if (!selectedMode) return

    if (LOCATION_REQUIRED_MODES.includes(selectedMode.id)) {
      if (isMobile.current && navigator.geolocation) {
        // モバイル: GPS自動取得を試みる
        setStep('location')
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setLocationChecked(true)
            setStep('chat')
          },
          () => {
            // 失敗したら住所入力フォームのまま
            setLocationChecked(false)
          },
          { timeout: 8000 }
        )
      } else {
        // PC: 住所入力フォーム
        setStep('location')
      }
    } else {
      setStep('chat')
    }
  }, [selectedMode])

  const handleLocation = useCallback((loc: Location | null) => {
    setLocation(loc)
    setLocationChecked(true)
    setStep('chat')
  }, [])

  const accentColorMap: Record<string, string> = {
    survey:     'text-blue-600',
    flyer:      'text-green-600',
    restaurant: 'text-orange-600',
    thinking:   'text-purple-600',
  }

  const accentColor = selectedMode ? accentColorMap[selectedMode.id] : 'text-gray-600'

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {step === 'mode' && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <ModeSelector onSelect={handleModeSelect} />
        </div>
      )}

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

      {step === 'location' && selectedMode && !locationChecked && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => { setStep('sub') }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← 戻る
            </button>
            <span className="text-lg">{selectedMode.icon}</span>
            <span className={`font-semibold ${accentColor}`}>{selectedSubOption?.label}</span>
          </div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center">
            <LocationPrompt onLocation={handleLocation} accentColor={accentColor} />
          </div>
        </div>
      )}

      {step === 'chat' && selectedMode && selectedSubOption && (
        <ChatInterface
          mode={selectedMode}
          subOption={selectedSubOption}
          location={location}
          onBack={() => {
            setLocationChecked(false)
            setLocation(null)
            setStep('sub')
          }}
          onBackToMode={() => {
            setLocationChecked(false)
            setLocation(null)
            setSelectedMode(null)
            setSelectedSubOption(null)
            setStep('mode')
          }}
        />
      )}
    </main>
  )
}
