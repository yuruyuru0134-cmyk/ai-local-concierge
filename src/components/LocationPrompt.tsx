'use client'

import { useState } from 'react'
import type { Location } from '@/lib/types'

interface LocationPromptProps {
  onLocation: (location: Location | null) => void
  accentColor: string
}

export function LocationPrompt({ onLocation, accentColor }: LocationPromptProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGPS = () => {
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setError('GPS取得に失敗しました。住所を入力してください。')
        setLoading(false)
      },
      { timeout: 10000 }
    )
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError('')
    try {
      // Google Geocoding API (無料枠あり) で住所→座標変換
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}&language=ja`
      )
      const data = await res.json()
      if (data.results?.[0]) {
        const loc = data.results[0].geometry.location
        onLocation({ lat: loc.lat, lng: loc.lng, address: data.results[0].formatted_address })
      } else {
        // Google APIキーなしでもOpenStreetMapで試みる
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=ja`
        )
        const osmData = await osmRes.json()
        if (osmData?.[0]) {
          onLocation({
            lat: parseFloat(osmData[0].lat),
            lng: parseFloat(osmData[0].lon),
            address: osmData[0].display_name,
          })
        } else {
          setError('住所が見つかりませんでした。別の住所を試してください。')
        }
      }
    } catch {
      setError('住所の検索に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 py-8 gap-5">
      <div className="text-5xl">📍</div>
      <h3 className={`text-xl font-bold ${accentColor}`}>現在地の確認</h3>
      <p className="text-gray-500 text-sm text-center">
        近くのお店を検索するために位置情報が必要です
      </p>

      {/* GPS取得ボタン */}
      <button
        onClick={handleGPS}
        disabled={loading}
        className={`w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 ${accentColor.replace('text-', 'bg-')}`}
      >
        {loading ? '取得中...' : '📡 GPSで現在地を取得'}
      </button>

      <div className="flex items-center w-full gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">または</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* 住所入力 */}
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
