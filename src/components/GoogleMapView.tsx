'use client'

import { useEffect, useRef, useState } from 'react'

interface GoogleMapViewProps {
  centerLat: number
  centerLng: number
  category: string
}

interface PlaceInfo {
  name: string
  rating?: number
  userRatingsTotal?: number
  vicinity?: string
  placeId?: string
  photoUrl?: string
  isOpen?: boolean
  types?: string[]
  priceLevel?: number
}

// カテゴリ → Google Places タイプ
const PLACE_TYPE: Record<string, string> = {
  food:      'restaurant',
  shop:      'supermarket',
  medical:   'hospital',
  transport: 'transit_station',
  other:     'establishment',
}

// タイプ → 日本語ラベル
const TYPE_LABEL: Record<string, string> = {
  restaurant: 'レストラン', cafe: 'カフェ', bar: 'バー', bakery: 'ベーカリー',
  fast_food: 'ファストフード', meal_takeaway: 'テイクアウト',
  supermarket: 'スーパー', convenience_store: 'コンビニ', drugstore: 'ドラッグストア',
  grocery_or_supermarket: 'スーパー', department_store: 'デパート',
  hospital: '病院', pharmacy: '薬局', doctor: 'クリニック', dentist: '歯科',
  transit_station: '駅', subway_station: '地下鉄', bus_station: 'バス停',
  train_station: '鉄道駅',
  bank: '銀行', atm: 'ATM', gas_station: 'ガソリンスタンド',
  parking: '駐車場', gym: 'ジム', spa: 'スパ', beauty_salon: '美容院',
  school: '学校', library: '図書館', park: '公園',
}

// タイプ → 絵文字アイコン
const TYPE_ICON: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', bar: '🍺', bakery: '🥐', fast_food: '🍔',
  meal_takeaway: '🥡', supermarket: '🛒', convenience_store: '🏪',
  drugstore: '💊', grocery_or_supermarket: '🛒', department_store: '🏬',
  hospital: '🏥', pharmacy: '💊', doctor: '🩺', dentist: '🦷',
  transit_station: '🚉', subway_station: '🚇', bus_station: '🚌',
  train_station: '🚃',
}

function getTypeLabel(types?: string[]): string {
  if (!types) return ''
  for (const t of types) {
    const label = TYPE_LABEL[t]
    if (label) return label
  }
  return ''
}

function getTypeIcon(types?: string[]): string {
  if (!types) return '📍'
  for (const t of types) {
    const icon = TYPE_ICON[t]
    if (icon) return icon
  }
  return '📍'
}

function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half)
}

// スクリプトの重複ロードを防ぐシングルトン
let mapsPromise: Promise<void> | null = null

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.places) { resolve(); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { mapsPromise = null; reject(new Error('Maps JS API load failed')) }
    document.head.appendChild(script)
  })
  return mapsPromise
}

export default function GoogleMapView({ centerLat, centerLng, category }: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  const [loadError, setLoadError] = useState(false)
  const [places, setPlaces] = useState<PlaceInfo[]>([])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setLoadError(true); return }
    if (!containerRef.current) return

    loadGoogleMaps(apiKey).then(() => {
      if (!containerRef.current || mapInstanceRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const G = (window as any).google.maps
      const center = { lat: centerLat, lng: centerLng }

      const map = new G.Map(containerRef.current, {
        center,
        zoom: 15,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      })
      mapInstanceRef.current = map

      // 現在地マーカー（青丸）
      new G.Marker({
        position: center,
        map,
        title: '現在地',
        icon: {
          path: G.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        zIndex: 999,
      })

      // Google Places 周辺検索
      const service = new G.places.PlacesService(map)
      service.nearbySearch(
        {
          location: center,
          radius: 1000,
          type: PLACE_TYPE[category] ?? 'establishment',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[], status: string) => {
          if (status !== G.places.PlacesServiceStatus.OK || !results) return

          const placeInfos: PlaceInfo[] = []

          results.forEach(place => {
            if (!place.geometry?.location) return

            const marker = new G.Marker({
              position: place.geometry.location,
              map,
              title: place.name,
            })

            const ratingStr = place.rating ? `⭐ ${place.rating}` : ''
            const vicinity = place.vicinity ?? ''
            const infoWindow = new G.InfoWindow({
              content: `<div style="font-size:13px;line-height:1.6;max-width:220px">
                <strong>${place.name}</strong><br/>
                ${ratingStr}${ratingStr && vicinity ? ' · ' : ''}${vicinity}
              </div>`,
            })
            marker.addListener('click', () => infoWindow.open(map, marker))

            const photoUrl: string | undefined = place.photos?.[0]?.getUrl({ maxWidth: 300, maxHeight: 200 })

            placeInfos.push({
              name: place.name,
              rating: place.rating,
              userRatingsTotal: place.user_ratings_total,
              vicinity: place.vicinity,
              placeId: place.place_id,
              photoUrl,
              isOpen: place.opening_hours?.isOpen?.(),
              types: place.types,
              priceLevel: place.price_level,
            })
          })

          setPlaces(placeInfos.slice(0, 10))
        },
      )
    }).catch(() => setLoadError(true))

    return () => { mapInstanceRef.current = null }
  // 初回マウント時のみ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // APIキーなし・ロードエラー時は何も表示しない
  if (loadError) return null

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      />
      {places.length > 0 && (
        <div className="mt-2 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {places.map((p, i) => (
            <a
              key={i}
              href={p.placeId ? `https://www.google.com/maps/place/?q=place_id:${p.placeId}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-none w-36 snap-start rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              {/* 写真 or アイコンプレースホルダー */}
              {p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  className="w-full h-24 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-3xl">
                  {getTypeIcon(p.types)}
                </div>
              )}

              {/* 店舗情報 */}
              <div className="p-2 space-y-0.5">
                <div className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">
                  {p.name}
                </div>

                {/* カテゴリラベル */}
                {getTypeLabel(p.types) && (
                  <div className="text-xs text-gray-500">{getTypeLabel(p.types)}</div>
                )}

                {/* 評価 */}
                {p.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-xs leading-none">{renderStars(p.rating)}</span>
                    <span className="text-xs text-gray-700 font-medium">{p.rating}</span>
                  </div>
                )}
                {p.userRatingsTotal != null && (
                  <div className="text-xs text-gray-400">
                    ({p.userRatingsTotal > 999 ? '999+' : p.userRatingsTotal}件)
                  </div>
                )}

                {/* 価格帯 */}
                {p.priceLevel != null && (
                  <div className="text-xs text-gray-500">{'¥'.repeat(p.priceLevel)}</div>
                )}

                {/* 営業状況 */}
                {p.isOpen !== undefined && (
                  <div className={`text-xs font-medium ${p.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                    {p.isOpen ? '営業中' : '営業時間外'}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
