'use client'

import { useEffect, useRef } from 'react'

export interface SpotPin {
  name: string
  type: string
  lat: number
  lng: number
  mapUrl: string
  distanceLabel?: string
}

interface GoogleMapViewProps {
  centerLat: number
  centerLng: number
  spots: SpotPin[]
}

// スクリプトの重複ロードを防ぐシングルトン
let mapsPromise: Promise<void> | null = null

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise(resolve => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps) { resolve(); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=ja`
    script.async = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return mapsPromise
}

export default function GoogleMapView({ centerLat, centerLng, spots }: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || !containerRef.current) return

    loadGoogleMaps(apiKey).then(() => {
      if (!containerRef.current || mapInstanceRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const G = (window as any).google.maps

      const map = new G.Map(containerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 15,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      })
      mapInstanceRef.current = map

      // 現在地マーカー（青丸）
      new G.Marker({
        position: { lat: centerLat, lng: centerLng },
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

      // スポットマーカー
      const bounds = new G.LatLngBounds()
      bounds.extend({ lat: centerLat, lng: centerLng })

      spots.forEach(spot => {
        const marker = new G.Marker({
          position: { lat: spot.lat, lng: spot.lng },
          map,
          title: spot.name,
        })

        const infoWindow = new G.InfoWindow({
          content: `<div style="font-size:13px;line-height:1.6;max-width:180px">
            <strong>${spot.name}</strong><br/>
            ${spot.type}${spot.distanceLabel ? ' / ' + spot.distanceLabel : ''}
            <br/><a href="${spot.mapUrl}" target="_blank" rel="noopener noreferrer"
              style="color:#1a73e8;font-size:12px">Googleマップで開く ↗</a>
          </div>`,
        })

        marker.addListener('click', () => infoWindow.open(map, marker))
        bounds.extend({ lat: spot.lat, lng: spot.lng })
      })

      if (spots.length > 0) {
        map.fitBounds(bounds, { top: 40, right: 20, bottom: 20, left: 20 })
      }
    })

    return () => {
      mapInstanceRef.current = null
    }
  // 初回マウント時のみ実行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
    />
  )
}
