import { google } from '@ai-sdk/google'
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import type { Mode, PersonalityId } from '@/lib/types'

export const maxDuration = 60

const PERSONALITY_PROMPTS: Record<PersonalityId, string> = {
  osaka_ojisan: `
【口調・キャラクター設定】
大阪の気さくなおっちゃんとして話してください。
- 語尾や表現: 〜やで、〜やんか、〜でっせ、〜やな、〜ちゃうん？、〜やろ？、ほんまに、なんでやねん、ええで、あかんあかん、などの大阪弁を自然に使う
- 性格: 親しみやすく、明るく、ざっくばらんで気取らない
- 専門知識はしっかり持っているが、難しい話も気軽に話しかけるように説明する
- 絵文字は使わず、口語的な表現で`,

  secretary: `
【口調・キャラクター設定】
優秀な女性秘書として、丁寧かつ的確にサポートします。
- 語尾や表現: 〜でございます、〜かと存じます、〜でしょうか、〜させていただきます、承知いたしました、かしこまりました、などの敬語を自然に使う
- 性格: 落ち着いていて礼儀正しく、テキパキとしていて有能
- 専門知識を分かりやすく、簡潔かつ丁寧に説明する
- 絵文字は使わず、格調ある表現で`,

  osaka_obachan: `
【口調・キャラクター設定】
大阪の元気なおばちゃんとして話してください。
- 語尾や表現: 〜やで！、〜やんか！、なんでやねん！、ほんまに！、もー！、あんたー、〜やってー、ちゃうちゃう、などの大阪弁を元気よく使う
- 性格: 親しみやすく元気いっぱい、世話好きで積極的、少し騒がしいくらいにぎやか
- 専門知識はしっかり持っているが、にぎやかで活発な雰囲気で説明する
- 絵文字は使わず、口語的な表現で`,

  robot: `
【口調・キャラクター設定】
高性能AIロボットとして応答シマス。
- 語尾や表現: 〜デス、〜マス、〜シマス、処理完了、データ参照中、計算結果、エラーなし、などのロボット的表現を使用
- 自称: 「本機」
- 性格: 論理的・効率的、感情表現は最小限、正確さを最優先
- 回答は箇条書きや番号リストで構造化することを優先する
- 絵文字は使わず、機械的・カタカナ混じりの表現で`,
}

function getPersonalityPrompt(personality: PersonalityId): string {
  return PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.osaka_ojisan
}

function getPersonalityLabel(personality: PersonalityId): string {
  const labels: Record<PersonalityId, string> = {
    osaka_ojisan: 'おっちゃん', secretary: '秘書', osaka_obachan: 'おばちゃん', robot: 'ロボット',
  }
  return labels[personality] ?? 'おっちゃん'
}

function getSurveySubLabel(id: string) {
  const map: Record<string, string> = {
    distance: '距離・角度計算', area: '面積計算', coordinate: '座標変換',
    traverse: 'トラバース計算', leveling: '水準測量', batter: '丁張計算',
  }
  return map[id] ?? '一般計算'
}

function getUsefulSubLabel(id: string) {
  const map: Record<string, string> = {
    food: 'グルメ・飲食店', shop: 'スーパー・買い物＆チラシ', medical: '病院・薬局',
    transport: '交通・駅', other: 'その他・フリー検索',
  }
  return map[id] ?? '周辺検索'
}

function getThinkingSubLabel(id: string) {
  const map: Record<string, string> = {
    freeform: '自由な壁打ち', idea: 'アイデア整理', problem: '問題解決', decision: '意思決定',
  }
  return map[id] ?? '壁打ち'
}

// ---- ユーティリティ ----

function calcDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(m: number): string {
  return m < 1000 ? `約${Math.round(m / 10) * 10}m` : `約${(m / 1000).toFixed(1)}km`
}

// ---- Overpass API（POI検索メイン） ----

type OverpassElement = {
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

async function fetchOverpass(query: string, timeoutMs: number): Promise<{ elements?: OverpassElement[] }> {
  let lastError: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) { lastError = new Error(`HTTP ${res.status}`); continue }
      const text = await res.text()
      // HTML が返った場合（サーバーエラーページ等）はスキップ
      if (text.trimStart().startsWith('<')) { lastError = new Error('HTML response'); continue }
      const data = JSON.parse(text) as { elements?: OverpassElement[]; remark?: string }
      if (data.remark && (!data.elements || data.elements.length === 0)) {
        lastError = new Error(`Overpass remark: ${data.remark}`)
        continue
      }
      return data
    } catch (e) {
      clearTimeout(timer)
      lastError = e
    }
  }
  throw lastError ?? new Error('All Overpass endpoints failed')
}

function getOverpassFilters(subOptionId: string): string[] {
  const filters: Record<string, string[]> = {
    food:      ['"amenity"~"restaurant|fast_food|cafe|bar|pub|food_court|ice_cream|bakery"'],
    shop:      ['"shop"~"supermarket|convenience|department_store|drugstore|pharmacy|mall|clothes|electronics|hardware"'],
    medical:   ['"amenity"~"hospital|clinic|pharmacy|doctors|dentist|veterinary"'],
    transport: ['"railway"~"station|halt|tram_stop|subway_entrance"', '"highway"="bus_stop"'],
    other:     ['"amenity"~"bank|atm|post_office|library|cinema|theatre|gym|spa|parking|fuel|police|school|place_of_worship|community_centre|charging_station|public_bath"'],
  }
  return filters[subOptionId] ?? ['"amenity"~"."']
}

// ---- Nominatim（逆ジオコーディングのみ） ----

async function fetchArea(lat: number, lng: number): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 5000)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`,
      { headers: { 'User-Agent': 'AI-Useful-Chatbot/1.0 (contact: yuruyuru.0134@gmail.com)' }, signal: ctrl.signal },
    )
    clearTimeout(timer)
    if (!res.ok) return ''
    const data = await res.json() as { address?: Record<string, string> }
    const addr = data.address ?? {}
    const pref = addr.province ?? addr.state ?? ''
    const city = addr.city ?? addr.town ?? addr.village ?? ''
    return `${pref}${city ? ' ' + city : ''}`
  } catch {
    clearTimeout(timer)
    return ''
  }
}

// ---- キャッシュ ----

const searchResultCache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_TTL_ERROR_MS = 30 * 1000

function getSearchCacheKey(subOptionId: string, lat: number, lng: number) {
  return `${subOptionId}:${lat.toFixed(2)}:${lng.toFixed(2)}`
}

// ---- 型定義 ----

type Spot = {
  name: string
  type: string
  lat: number
  lng: number
  mapUrl: string
  distanceM?: number
  distanceLabel?: string
  tags?: Record<string, string>
}

type SpotResult = {
  area: string
  centerLat: number
  centerLng: number
  spots: Spot[]
  total: number
  fallbackUrl: string
  source?: string
  error?: string
  errorMessage?: string
  transportMode?: boolean
  flyerUrl?: string
  flyerGoogleUrl?: string
  flyerSearchUrl?: string
}

// ---- 検索メイン ----

async function searchNearbyImpl(lat: number, lng: number, subOptionId: string, fallbackUrl: string): Promise<SpotResult> {
  const cacheKey = getSearchCacheKey(subOptionId, lat, lng)
  const cached = searchResultCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.data as SpotResult

  const radius = subOptionId === 'transport' ? 2000 : 1000
  const filters = getOverpassFilters(subOptionId)
  const queryParts = filters.map(f =>
    `node[${f}](around:${radius},${lat},${lng});way[${f}](around:${radius},${lat},${lng});`
  ).join('')
  const overpassLimit = subOptionId === 'transport' ? 50 : 30
  const overpassQuery = `[out:json][timeout:12];(${queryParts});out center ${overpassLimit};`

  const flyerExtras = subOptionId === 'shop' ? {
    flyerUrl: `https://www.shufoo.net/`,
    flyerGoogleUrl: `https://www.google.com/search?q=${encodeURIComponent('近く スーパー チラシ 特売情報')}`,
    flyerSearchUrl: `https://www.google.com/maps/search/スーパー+特売/@${lat},${lng},15z`,
  } : {}

  // エリア名とOverpassを並列実行
  const [areaResult, overpassResult] = await Promise.allSettled([
    fetchArea(lat, lng),
    fetchOverpass(overpassQuery, 12000),
  ])

  const area = areaResult.status === 'fulfilled' ? areaResult.value : ''

  const base = { centerLat: lat, centerLng: lng, fallbackUrl }

  if (overpassResult.status === 'rejected') {
    console.error('[searchNearby] Overpass error:', overpassResult.reason)
    const errorMessage = `周辺施設の取得に失敗しました。Googleマップから直接検索してください:\n- [Googleマップで${getUsefulSubLabel(subOptionId)}を検索](${fallbackUrl})`
    const errorResult: SpotResult = { ...base, area, spots: [], total: 0, error: 'データ取得に失敗しました。', errorMessage, ...flyerExtras }
    searchResultCache.set(cacheKey, { data: errorResult, expires: Date.now() + CACHE_TTL_ERROR_MS })
    return errorResult
  }

  // Overpass結果をSpotに変換
  const spots: Spot[] = []
  const seen = new Set<string>()
  const limit = subOptionId === 'transport' ? 50 : 20

  for (const el of (overpassResult.value.elements ?? [])) {
    if (spots.length >= limit) break
    const name = el.tags?.name
    if (!name || seen.has(name)) continue
    seen.add(name)
    const elLat = el.lat ?? el.center?.lat ?? lat
    const elLng = el.lon ?? el.center?.lon ?? lng
    const type = el.tags?.amenity ?? el.tags?.shop ?? el.tags?.railway ?? el.tags?.highway ?? ''
    const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${elLat},${elLng},17z`
    const distanceM = calcDistanceM(lat, lng, elLat, elLng)
    const usefulTags: Record<string, string> = {}
    for (const key of ['cuisine', 'opening_hours', 'takeaway', 'delivery', 'wheelchair', 'phone', 'website', 'operator', 'brand', 'railway', 'highway'] as const) {
      if (el.tags?.[key]) usefulTags[key] = el.tags[key]
    }
    spots.push({
      name, type, lat: elLat, lng: elLng, mapUrl,
      distanceM, distanceLabel: formatDist(distanceM),
      ...(Object.keys(usefulTags).length > 0 ? { tags: usefulTags } : {}),
    })
  }

  // 交通: 駅・バス停を距離順に分離して最大3件ずつ
  if (subOptionId === 'transport') {
    const stations = spots
      .filter(s => s.tags?.railway && s.tags.railway !== 'bus_stop')
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
      .slice(0, 3)
    const busStops = spots
      .filter(s => s.type === 'bus_stop' || s.tags?.highway === 'bus_stop')
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
      .slice(0, 3)
    const transportSpots = [...stations, ...busStops]
    const result: SpotResult = { ...base, area, spots: transportSpots, total: transportSpots.length, transportMode: true }
    searchResultCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS })
    return result
  }

  const resultData: SpotResult = { ...base, area, spots, total: spots.length, ...flyerExtras }
  searchResultCache.set(cacheKey, { data: resultData, expires: Date.now() + CACHE_TTL_MS })
  return resultData
}

// ---- システムプロンプト ----

function getSystemPrompt(mode: Mode, subOptionId: string, personality: PersonalityId): string {
  const p = getPersonalityPrompt(personality)
  const pLabel = getPersonalityLabel(personality)
  switch (mode) {
    case 'survey':
      return `あなたは測量の専門家の${pLabel}です。${p}
現在のカテゴリ: ${getSurveySubLabel(subOptionId)}
対応可能な計算:
- 距離・角度計算: 2点間の距離、方位角、内角
- 面積計算: 三斜法、座標法（ガウスの公式）
- 座標変換: 平面直角座標系（1〜19系）⇔ 緯度経度（WGS84、JGD2011）
- トラバース計算: 閉合差、閉合比、座標調整（コンパス法則、トランシット法則）
- 水準測量: 高さ・標高差・視通計算
- 丁張計算: 法面勾配（切土・盛土）、法肩・法尻の位置、丁張高の計算、縦断・横断測量に基づく計算
計算過程は数式と一緒に、上記のキャラクターで説明してください。単位・有効数字にも気をつけること。`

    case 'useful':
      return `あなたは周辺施設・店舗情報を検索して結果をそのまま伝えるアシスタントの${pLabel}です。${p}
カテゴリ: ${getUsefulSubLabel(subOptionId)}

【厳守ルール】
- 位置情報がある場合は必ず最初に searchNearby ツールを呼び出すこと（必須）
- searchNearby の結果を受け取ったら、必ず以下の形式で応答すること
- 先頭行: 「○件見つかりました（半径1km以内）」（0件でも必ず書く）
- 交通・駅カテゴリ（transportMode: true の場合）の表示形式:
  ## 最寄り駅
  - [駅名](GoogleマップURL) — 種別 ／ distanceLabel（例: 約230m）
  ## 最寄りバス停
  - [バス停名](GoogleマップURL) — bus_stop ／ distanceLabel
  （それぞれ見つからなければ「見つかりませんでした」と表示）
- 交通以外のカテゴリの表示形式:
  「- [名称](GoogleマップURL) — 種別 ／ distanceLabel ／ おすすめ情報があれば一言」
  例: 「- [マクドナルド渋谷店](https://...) — fast_food ／ 約230m ／ 24時間営業」
- spots が空・0件の場合: errorMessage フィールドの内容をそのまま出力すること
- errorMessage フィールドがある場合: そのフィールドの内容をそのまま出力すること
- スーパー・買い物カテゴリ（shop）の場合は、店舗リストの後に必ず追加:
  「📰 チラシ・特売情報:
  - [シュフーで探す](flyerUrl)
  - [エリアのチラシをGoogle検索](flyerGoogleUrl)」
- 位置情報がない場合は住所・地域名を聞くこと`

    case 'thinking':
      return `あなたは思考の壁打ち相手の${pLabel}です。モード: ${getThinkingSubLabel(subOptionId)}
${p}
以下のスタンスで対話してください：
- ユーザーの話をしっかり聞いて、要点を整理して返す
- 鋭い質問を投げかけて思考を深める（一度に質問は1つだけ）
- いろんな視点や可能性を提示する
- 結論を急がず、相手のペースに合わせる
- 必要に応じて箇条書きや構造化して整理する
まず最初の一言でキャラクターらしく話しかけてから対話を始めてください。`
  }
}

// ---- API ルート ----

export async function POST(req: Request) {
  const { messages, mode, subOptionId, location, personality } = await req.json() as {
    messages: UIMessage[]
    mode: Mode
    subOptionId: string
    location?: { lat: number; lng: number } | null
    personality?: PersonalityId
  }

  const system = getSystemPrompt(mode, subOptionId, personality ?? 'osaka_ojisan')
    + (location ? `\n\nユーザーの現在地: 緯度 ${location.lat.toFixed(6)}, 経度 ${location.lng.toFixed(6)}` : '')

  const modelMessages = await convertToModelMessages(messages)

  if (mode === 'useful') {
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system,
      messages: modelMessages,
      abortSignal: req.signal,
      stopWhen: stepCountIs(5),
      tools: {
        searchNearby: {
          description: 'GPS座標から周辺施設をOverpass API（OpenStreetMapデータ）で検索し、各スポットの座標とOpenStreetMapリンクを返す',
          inputSchema: z.object({
            lat: z.number().describe('緯度'),
            lng: z.number().describe('経度'),
          }),
          execute: async ({ lat, lng }: { lat: number; lng: number }) => {
            const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(getUsefulSubLabel(subOptionId))}/@${lat},${lng},15z`
            try {
              return await searchNearbyImpl(lat, lng, subOptionId, fallbackUrl)
            } catch (e) {
              console.error('[searchNearby] unexpected error:', e)
              const errorMessage = `検索でエラーが発生しました。以下のリンクから直接検索してください:\n- [Googleマップで${getUsefulSubLabel(subOptionId)}を検索](${fallbackUrl})`
              return { area: '', centerLat: lat, centerLng: lng, spots: [], total: 0, fallbackUrl, error: 'データ取得に失敗しました。', errorMessage }
            }
          },
        },
      },
    })
    return result.toUIMessageStreamResponse()
  }

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system,
    messages: modelMessages,
    abortSignal: req.signal,
  })
  return result.toUIMessageStreamResponse()
}
