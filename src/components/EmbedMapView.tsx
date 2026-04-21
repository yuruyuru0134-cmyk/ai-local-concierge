'use client'

interface EmbedMapViewProps {
  lat: number
  lng: number
  query: string
}

export default function EmbedMapView({ lat, lng, query }: EmbedMapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null

  const src =
    `https://www.google.com/maps/embed/v1/search` +
    `?key=${apiKey}` +
    `&q=${encodeURIComponent(query)}` +
    `&center=${lat},${lng}` +
    `&zoom=15` +
    `&language=ja`

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <iframe
        title="周辺マップ"
        src={src}
        className="w-full h-64 border-0"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
