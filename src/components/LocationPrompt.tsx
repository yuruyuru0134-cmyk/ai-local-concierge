'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/types'

interface LocationPromptProps {
  onLocation: (location: Location | null) => void
  accentColor: string
  autoGPS?: boolean  // true = モバイル（GPS自動取得）/ false = PC（住所入力）
}

export function LocationPrompt({ onLocation, accentColor, autoGPS = false }: LocationPromptProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gpsFailed, setGpsFailed] = useState(false)

  // モバイル: マウント時にGPS自動取得
  useEffect(() => {
    if (!autoGPS) return
    setLoading(true)
    if (!navigator.geolocation) {
      setGpsFailed(true)
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setGpsFailed(true)
        setLoading(false)
        setError('GPS取得に失敗しました。住所を入力してください。')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // GPS取得中の表示（モバイルのみ）
  if (autoGPS && loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-12">
        <div className="text-6xl">📡</div>
        <p className={`text-lg font-semibold ${accentColor}`}>現在地を取得中...</p>
        <p className="text-gray-400 text-sm text-center">位置情報の許可をリクエストしています</p>
        <div className="flex gap-1 mt-2">
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        <button
          onClick={() => onLocation(null)}
          className="text-xs text-gray-400 underline mt-4"
        >
          スキップして続ける
        </button>
      </div>
    )
  }

  const handleGPS = () => {
    setLoading(true)
    setError('')
    if (!navigator.geolocation) {
      setError('このブラウザはGPSに対応していません。')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('GPS取得に失敗しました。住所を入力してください。')
        setLoading(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=ja`,
        { headers: { 'User-Agent': 'AI-Useful-Chatbot/1.0 (contact: yuruyuru.0134@gmail.com)' } }
      )
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (data?.[0]) {
        onLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name,
        })
      } else {
        setError('住所が見つかりませんでした。別の住所を試してください。')
      }
    } catch {
      setError('住所の検索に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // PC表示 / GPSフォールバック表示
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 py-8 gap-5">
      <div className="text-5xl">📍</div>
      <h3 className={`text-xl font-bold ${accentColor}`}>現在地の確認</h3>
      <p className="text-gray-500 text-sm text-center">
        周辺情報を検索するために現在地が必要です
      </p>

      {/* GPS失敗フォールバック or PC非モバイル時にGPSボタン表示 */}
      {(gpsFailed || !autoGPS) && (
        <button
          onClick={handleGPS}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 ${accentColor.replace('text-', 'bg-')}`}
        >
          {loading ? '取得中...' : '📡 GPSで現在地を取得'}
        </button>
      )}

      {(gpsFailed || !autoGPS) && (
        <div className="flex items-center w-full gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">または</span>
          <hr className="flex-1 border-gray-200" />
        </div>
      )}

      {/* 住所入力フォーム */}
      <form onSubmit={handleAddressSubmit} className="w-full flex flex-col gap-2">
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="住所・駅名・地名を入力（例: 渋谷区道玄坂）"
          className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-current ${accentColor}`}
        />
        <button
          type="submit"
          disabled={!address.trim() || loading}
          className="w-full py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? '検索中...' : '🔍 住所で検索'}
        </button>
      </form>

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <button
        onClick={() => onLocation(null)}
        className="text-xs text-gray-400 underline mt-2"
      >
        位置情報なしで続ける
      </button>
    </div>
  )
}
