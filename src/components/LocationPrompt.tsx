'use client'

import { useEffect, useState } from 'react'
import type { Location } from '@/lib/types'

interface LocationPromptProps {
  onLocation: (location: Location | null) => void
  accentColor: string
  autoGPS?: boolean
}

type Phase = 'input' | 'confirm' | 'change'

export function LocationPrompt({ onLocation, accentColor, autoGPS = false }: LocationPromptProps) {
  const [phase, setPhase] = useState<Phase>('input')
  const [pending, setPending] = useState<Location | null>(null)
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
        setPending({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPhase('confirm')
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
        setPending({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPhase('confirm')
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
        setPending({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name,
        })
        setPhase('confirm')
      } else {
        setError('住所が見つかりませんでした。別の住所を試してください。')
      }
    } catch {
      setError('住所の検索に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ── GPS取得中（モバイル自動） ──
  if (autoGPS && loading && phase === 'input') {
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
        <button onClick={() => onLocation(null)} className="text-xs text-gray-400 underline mt-4">
          スキップして続ける
        </button>
      </div>
    )
  }

  // ── 確認画面 ──
  if (phase === 'confirm' && pending) {
    const mapsEmbedUrl =
      `https://maps.google.com/maps?q=${pending.lat},${pending.lng}&z=16&output=embed&hl=ja`
    const mapsOpenUrl =
      `https://www.google.com/maps/@${pending.lat},${pending.lng},17z`
    const mapsPickUrl =
      `https://www.google.com/maps/search/?api=1&query=${pending.lat},${pending.lng}`

    return (
      <div className="flex flex-col w-full max-w-md mx-auto px-4 py-6 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📍</span>
          <h3 className={`text-lg font-bold ${accentColor}`}>現在地の確認</h3>
        </div>

        {/* Googleマップ埋め込み */}
        <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 260 }}>
          <iframe
            src={mapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="現在地確認マップ"
          />
        </div>

        {/* 座標・住所表示 */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
          <div className="flex gap-2">
            <span className="text-gray-400 w-10 shrink-0">緯度</span>
            <span className="font-mono">{pending.lat.toFixed(6)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-10 shrink-0">経度</span>
            <span className="font-mono">{pending.lng.toFixed(6)}</span>
          </div>
          {pending.address && (
            <div className="flex gap-2 pt-1 border-t border-gray-200">
              <span className="text-gray-400 shrink-0">住所</span>
              <span className="break-all">{pending.address}</span>
            </div>
          )}
        </div>

        {/* Googleマップで開くリンク（埋め込みが表示されない場合の補助） */}
        <a
          href={mapsOpenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 underline text-center"
        >
          Googleマップで開いて確認する↗
        </a>

        {/* 確定 / 変更ボタン */}
        <button
          onClick={() => onLocation(pending)}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-opacity ${accentColor.replace('text-', 'bg-')}`}
        >
          ✅ この場所で確定する
        </button>
        <button
          onClick={() => {
            setPhase('change')
            setError('')
            setAddress('')
          }}
          className="w-full py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
        >
          📌 場所を変更する
        </button>

        <button onClick={() => onLocation(null)} className="text-xs text-gray-400 underline text-center mt-1">
          位置情報なしで続ける
        </button>

        {/* 変更時のGoogleマップリンク（非表示だが事前レンダリング） */}
        <span className="hidden">{mapsPickUrl}</span>
      </div>
    )
  }

  // ── 場所変更画面 ──
  if (phase === 'change') {
    const mapsPickUrl = pending
      ? `https://www.google.com/maps/@${pending.lat},${pending.lng},17z`
      : 'https://www.google.com/maps'

    return (
      <div className="flex flex-col w-full max-w-md mx-auto px-4 py-8 gap-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPhase(pending ? 'confirm' : 'input')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 戻る
          </button>
          <span className="text-2xl">🗺️</span>
          <h3 className={`text-lg font-bold ${accentColor}`}>場所を変更</h3>
        </div>

        {/* Googleマップで場所を確認・コピー誘導 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-2">
          <p className="font-semibold">📌 Googleマップで場所を確認する</p>
          <p className="text-xs text-blue-600">
            下のリンクでGoogleマップを開き、正しい場所を確認してから住所を入力してください。
          </p>
          <a
            href={mapsPickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-semibold text-blue-600 underline"
          >
            Googleマップで場所を確認する↗
          </a>
        </div>

        {/* GPS再取得 */}
        <button
          onClick={handleGPS}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 ${accentColor.replace('text-', 'bg-')}`}
        >
          {loading ? '取得中...' : '📡 GPSで現在地を再取得'}
        </button>

        <div className="flex items-center w-full gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">または住所を入力</span>
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

        <button onClick={() => onLocation(null)} className="text-xs text-gray-400 underline text-center">
          位置情報なしで続ける
        </button>
      </div>
    )
  }

  // ── 通常の入力画面（PC / GPSフォールバック） ──
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 py-8 gap-5">
      <div className="text-5xl">📍</div>
      <h3 className={`text-xl font-bold ${accentColor}`}>現在地の確認</h3>
      <p className="text-gray-500 text-sm text-center">
        周辺情報を検索するために現在地が必要です
      </p>

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

      <button onClick={() => onLocation(null)} className="text-xs text-gray-400 underline mt-2">
        位置情報なしで続ける
      </button>
    </div>
  )
}
