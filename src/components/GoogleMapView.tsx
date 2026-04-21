'use client'

import { useEffect, useRef, useState } from 'react'

interface GoogleMapViewProps {
  centerLat: number
  centerLng: number
  category: string
}

// カテゴリ → Google Places タイプ
const PLACE_TYPE: Record<string, string> = {
  food:      'restaurant',
  shop:      'supermarket',
  medical:   'hospital',
  transport: 'transit_station',
  other:     'establishment',
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

          results.forEach(place => {
            if (!place.geometry?.location) return

            const marker = new G.Marker({
              position: place.geometry.location,
              map,
              title: place.name,
            })

            const rating = place.rating ? `⭐ ${place.rating}` : ''
            const vicinity = place.vicinity ?? ''
            const infoWindow = new G.InfoWindow({
              content: `<div style="font-size:13px;line-height:1.6;max-width:200px">
                <strong>${place.name}</strong><br/>
                ${rating}${rating && vicinity ? ' · ' : ''}${vicinity}
              </div>`,
            })

            marker.addListener('click', () => infoWindow.open(map, marker))
          })
        },
      )
    }).catch(() => setLoadError(true))

    return () => { mapInstanceRef.current = null }
  // 初回マウント時のみ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadError) {
    const fallback = `https://www.google.com/maps/search/${PLACE_TYPE[category] ?? 'establishment'}/@${centerLat},${centerLng},15z`
    return (
      <div className="w-full h-20 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
        <a href={fallback} target="_blank" rel="noopener noreferrer"
          className="text-sm text-blue-600 underline">
          Googleマップで開く ↗
        </a>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
    />
  )
}
