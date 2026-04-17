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
    food: 'グルメ・飲食店', shop: 'スーパー・買い物', medical: '病院・薬局',
    sale: 'チラシ・特売情報', transport: '交通・駅', other: 'その他・フリー検索',
  }
  return map[id] ?? '周辺検索'
}

function getThinkingSubLabel(id: string) {
  const map: Record<string, string> = {
    freeform: '自由な壁打ち', idea: 'アイデア整理', problem: '問題解決', decision: '意思決定',
  }
  return map[id] ?? '壁打ち'
}

// Overpass API フィルター（OSMタグ）
function getOverpassFilters(subOptionId: string): string[] {
  const filters: Record<string, string[]> = {
    food:      ['"amenity"~"restaurant|fast_food|cafe|bar|pub|food_court|ice_cream|bakery"'],
    shop:      ['"shop"~"supermarket|convenience|department_store|drugstore|pharmacy|mall|clothes|electronics|hardware"'],
    medical:   ['"amenity"~"hospital|clinic|pharmacy|doctors|dentist|veterinary"'],
    transport: ['"railway"~"station|halt|tram_stop|subway_entrance"', '"highway"="bus_stop"'],
    sale:      ['"shop"~"supermarket|convenience|department_store|drugstore|clothes|electronics|furniture|hardware"'],
    other:     ['"amenity"~"."', '"shop"~"."'],
  }
  return filters[subOptionId] ?? ['"amenity"~"."']
}

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
- 各スポットは「- [名称](GoogleマップURL) — 種別」の形式で全件表示
- spots が空・0件の場合: 「0件見つかりました（半径1km以内）\n\n周辺で見つかりませんでした。以下のリンクから直接検索できます:\n- [Google マップで検索](fallbackUrl)」と表示
- error フィールドがある場合: 「検索でエラーが発生しました。以下のリンクから直接検索してください:\n- [Google マップで検索](fallbackUrl)」と表示
- チラシ・特売情報カテゴリの場合は flyerUrl も Markdownリンクで表示
- AIによる推察・感想・おすすめコメントは一切加えないこと
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
      stopWhen: stepCountIs(5),
      tools: {
        searchNearby: {
          description: 'GPS座標から周辺施設をOpenStreetMap(Overpass API)で検索し、各スポットのGoogleマップリンクを生成する',
          inputSchema: z.object({
            lat: z.number().describe('緯度'),
            lng: z.number().describe('経度'),
          }),
          execute: async ({ lat, lng }: { lat: number; lng: number }) => {
            // 1. Nominatim で地域名取得
            let area = ''
            try {
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`,
                { headers: { 'User-Agent': 'AI-Useful-Chatbot/1.0 (contact: yuruyuru.0134@gmail.com)' } }
              )
              const geoData = await geoRes.json() as { address?: Record<string, string> }
              const addr = geoData.address ?? {}
              const pref = addr.province ?? addr.state ?? ''
              const city = addr.city ?? addr.town ?? addr.village ?? ''
              area = `${pref}${city ? ' ' + city : ''}`
            } catch { /* ignore */ }

            // 2. Overpass API でPOI検索
            const radius = 1000
            const filters = getOverpassFilters(subOptionId)
            const queryParts = filters.map(f =>
              `node[${f}](around:${radius},${lat},${lng});way[${f}](around:${radius},${lat},${lng});`
            ).join('')
            const query = `[out:json][timeout:25];(${queryParts});out center 30;`

            type OverpassElement = {
              lat?: number; lon?: number
              center?: { lat: number; lon: number }
              tags?: Record<string, string>
            }

            const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(getUsefulSubLabel(subOptionId))}/@${lat},${lng},15z`
            const spots: Array<{ name: string; type: string; mapUrl: string }> = []
            try {
              const controller = new AbortController()
              const timer = setTimeout(() => controller.abort(), 20000)
              const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                signal: controller.signal,
              })
              clearTimeout(timer)
              const overpassData = await overpassRes.json() as { elements?: OverpassElement[] }
              for (const el of overpassData.elements ?? []) {
                const name = el.tags?.name
                if (!name) continue
                const elLat = el.lat ?? el.center?.lat ?? lat
                const elLng = el.lon ?? el.center?.lon ?? lng
                const type = el.tags?.amenity ?? el.tags?.shop ?? el.tags?.railway ?? el.tags?.highway ?? ''
                const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${elLat},${elLng},17z`
                spots.push({ name, type, mapUrl })
                if (spots.length >= 20) break
              }
            } catch (e) {
              console.error('[searchNearby] Overpass API error:', e)
              return { area, spots: [], total: 0, fallbackUrl, error: 'データ取得に失敗しました。' }
            }

            // チラシ・特売の場合はトクバイURLも追加
            if (subOptionId === 'sale') {
              return {
                area, spots, total: spots.length, fallbackUrl,
                flyerUrl: `https://tokubai.co.jp/stores?lat=${lat}&lng=${lng}`,
              }
            }

            return { area, spots, total: spots.length, fallbackUrl }
          },
        },
      },
    })
    return result.toUIMessageStreamResponse()
  }

  // survey / thinking
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system,
    messages: modelMessages,
  })
  return result.toUIMessageStreamResponse()
}
