'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export interface SpotPin {
  name: string
  type: string
  lat: number
  lng: number
  mapUrl: string
  distanceLabel?: string
}

interface MapViewProps {
  centerLat: number
  centerLng: number
  spots: SpotPin[]
}

export default function MapView({ centerLat, centerLng, spots }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return

      // webpack が _getIconUrl を削除するためデフォルトアイコンを上書き
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current).setView([centerLat, centerLng], 15)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // 現在地マーカー（青丸）
      const centerIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([centerLat, centerLng], { icon: centerIcon })
        .addTo(map)
        .bindPopup('<strong>現在地</strong>')

      // スポットマーカー
      spots.forEach(spot => {
        L.marker([spot.lat, spot.lng])
          .addTo(map)
          .bindPopup(
            `<strong>${spot.name}</strong><br/>${spot.type}${spot.distanceLabel ? ' / ' + spot.distanceLabel : ''}<br/><a href="${spot.mapUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb">OpenStreetMapで開く ↗</a>`,
          )
      })

      // 全マーカーが収まるようにズーム調整
      if (spots.length > 0) {
        const bounds = L.latLngBounds([
          [centerLat, centerLng],
          ...spots.map(s => [s.lat, s.lng] as [number, number]),
        ])
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // spotsの変更で再レンダリングしない（初回マウント時のみ）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-xl overflow-hidden border border-gray-200"
    />
  )
}
