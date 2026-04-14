export type Mode = 'survey' | 'flyer' | 'restaurant' | 'thinking'

export interface SubOption {
  id: string
  label: string
  icon: string
  description: string
}

export interface ModeConfig {
  id: Mode
  label: string
  icon: string
  description: string
  color: string
  bgGradient: string
  subOptions: SubOption[]
}

export const MODES: ModeConfig[] = [
  {
    id: 'survey',
    label: '測量計算',
    icon: '📐',
    description: '測量に関する各種計算をサポート',
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-blue-100',
    subOptions: [
      { id: 'distance', label: '距離・角度計算', icon: '📏', description: '2点間の距離・方位角・内角の計算' },
      { id: 'area', label: '面積計算', icon: '🔷', description: '三斜法・座標法による面積計算' },
      { id: 'coordinate', label: '座標変換', icon: '🗺️', description: '平面直角座標系・緯度経度の変換' },
      { id: 'traverse', label: 'トラバース計算', icon: '📊', description: '閉合・結合トラバースの計算' },
      { id: 'leveling', label: '水準測量', icon: '⚖️', description: '高さ・標高差の計算' },
      { id: 'batter', label: '丁張計算', icon: '🏗️', description: '法面勾配・切盛高・丁張高の計算' },
    ],
  },
  {
    id: 'flyer',
    label: '折り込みチラシ',
    icon: '🛒',
    description: '近くのお店のチラシを検索',
    color: 'text-green-600',
    bgGradient: 'from-green-50 to-green-100',
    subOptions: [
      { id: 'all', label: 'すべてのチラシ', icon: '📋', description: '近隣すべての店舗チラシを表示' },
      { id: 'supermarket', label: 'スーパー・食料品', icon: '🥦', description: 'スーパーマーケットのチラシ' },
      { id: 'department', label: 'デパート・百貨店', icon: '🏬', description: 'デパート・百貨店のセール情報' },
      { id: 'drugstore', label: 'ドラッグストア', icon: '💊', description: '薬局・ドラッグストアのチラシ' },
      { id: 'homestore', label: 'ホームセンター', icon: '🔨', description: 'ホームセンターのチラシ' },
      { id: 'electronics', label: '家電量販店', icon: '📱', description: '家電量販店のセール情報' },
    ],
  },
  {
    id: 'restaurant',
    label: '食事処検索',
    icon: '🍜',
    description: '近くのおいしいお店を探す',
    color: 'text-orange-600',
    bgGradient: 'from-orange-50 to-orange-100',
    subOptions: [
      { id: 'any', label: 'なんでも探す', icon: '🍽️', description: '条件なしで近くのお店を検索' },
      { id: 'lunch', label: 'ランチ（〜1000円）', icon: '🥢', description: 'お手頃なランチのお店' },
      { id: 'dinner', label: 'ディナー（〜3000円）', icon: '🍖', description: '夜ごはんにおすすめのお店' },
      { id: 'ramen', label: 'ラーメン・麺類', icon: '🍜', description: 'ラーメン・うどん・そば・パスタ' },
      { id: 'teishoku', label: '定食・居酒屋', icon: '🍱', description: '定食屋・居酒屋・和食' },
      { id: 'cafe', label: 'カフェ・軽食', icon: '☕', description: 'カフェ・喫茶店・軽食' },
    ],
  },
  {
    id: 'thinking',
    label: '思考アシスト',
    icon: '💡',
    description: '考えをまとめる壁打ち相手',
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-purple-100',
    subOptions: [
      { id: 'freeform', label: 'とにかく話したい', icon: '💬', description: 'まとまっていなくてもOK。話しながら整理しよう' },
      { id: 'idea', label: 'アイデアを整理したい', icon: '🧩', description: 'アイデアを広げて構造化する' },
      { id: 'problem', label: '問題を解決したい', icon: '🔍', description: '問題の原因を掘り下げて解決策を見つける' },
      { id: 'decision', label: '意思決定をしたい', icon: '⚖️', description: 'メリット・デメリットを整理して決断する' },
    ],
  },
]

export interface Location {
  lat: number
  lng: number
  address?: string
}

export interface Restaurant {
  name: string
  address: string
  genre: string
  budget: string
  access: string
  url: string
  photo?: string
}

export interface Flyer {
  storeName: string
  storeType: string
  validFrom: string
  validTo: string
  thumbnailUrl?: string
  detailUrl?: string
}
