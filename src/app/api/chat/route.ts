import { google } from '@ai-sdk/google'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { z } from 'zod'
import type { Mode } from '@/lib/types'

export const maxDuration = 60

function getSystemPrompt(mode: Mode, subOptionId: string): string {
  switch (mode) {
    case 'survey':
      return `あなたは測量の専門家です。ユーザーの測量に関する質問や計算を丁寧にサポートしてください。
現在のカテゴリ: ${getSurveySubLabel(subOptionId)}
対応可能な計算:
- 距離・角度計算: 2点間の距離、方位角、内角
- 面積計算: 三斜法、座標法（ガウスの公式）
- 座標変換: 平面直角座標系（1〜19系）⇔ 緯度経度（WGS84、JGD2011）
- トラバース計算: 閉合差、閉合比、座標調整（コンパス法則、トランシット法則）
- 水準測量: 高さ・標高差・視通計算
- 丁張計算: 法面勾配（切土・盛土）、法肩・法尻の位置、丁張高の計算、縦断・横断測量に基づく計算
計算過程を数式と共に丁寧に説明し、単位・有効数字にも注意を払ってください。`

    case 'flyer':
      return `あなたは近くのデパートやスーパーの折り込みチラシ情報を案内するアシスタントです。
カテゴリ: ${subOptionId}
シュフー（https://www.shufoo.net/）を使って近くのチラシを検索するURLを案内します。
ユーザーの位置情報（緯度・経度）または住所・地域名をもとに、シュフーの検索URLを生成して案内してください。
位置情報がない場合は、住所や地域名（市区町村レベル）を聞いてください。
シュフーURLの形式: https://www.shufoo.net/pntweb/shopList/[都道府県コード]/?都市名等
または https://www.shufoo.net/ でのキーワード検索を案内してください。
必ずURLをMarkdownリンク形式 [シュフーで見る](URL) で表示し、タップ・クリックで開けるようにしてください。`

    case 'restaurant':
      return `あなたは近くの安くておいしい食事処を案内するグルメアシスタントです。
カテゴリ: ${getRestaurantSubLabel(subOptionId)}
ユーザーの位置情報をもとにホットペッパーグルメAPIを使って近くの飲食店を検索します。
位置情報がない場合は、住所・地域名・最寄り駅を聞いてください。
予算・ジャンル・雰囲気の希望も確認しながら最適なお店を提案してください。`

    case 'thinking':
      return `あなたは思考の壁打ち相手です。モード: ${getThinkingSubLabel(subOptionId)}
以下のスタンスで対話してください：
- ユーザーの話をしっかり聞き、要点を整理して返す
- 鋭い質問を投げかけて思考を深める（一度に質問は1つまで）
- 複数の視点や可能性を提示する
- 結論を急がず、ユーザーのペースに合わせる
- 必要に応じて考えを箇条書きや構造化して整理する
まず「どんなことを考えたいですか？」と一言聞いてから対話を始めてください。`
  }
}

function getSurveySubLabel(id: string) {
  const map: Record<string, string> = {
    distance: '距離・角度計算', area: '面積計算', coordinate: '座標変換',
    traverse: 'トラバース計算', leveling: '水準測量', batter: '丁張計算',
  }
  return map[id] ?? '一般計算'
}

function getRestaurantSubLabel(id: string) {
  const map: Record<string, string> = {
    any: 'なんでも', lunch: 'ランチ（〜1000円）', dinner: 'ディナー（〜3000円）',
    ramen: 'ラーメン・麺類', teishoku: '定食・居酒屋', cafe: 'カフェ・軽食',
  }
  return map[id] ?? '一般'
}

function getThinkingSubLabel(id: string) {
  const map: Record<string, string> = {
    freeform: '自由な壁打ち', idea: 'アイデア整理', problem: '問題解決', decision: '意思決定',
  }
  return map[id] ?? '壁打ち'
}

function getRestaurantKeyword(id: string) {
  const map: Record<string, string> = {
    ramen: 'ラーメン 麺', teishoku: '定食 居酒屋', cafe: 'カフェ 喫茶',
    lunch: 'ランチ', dinner: 'ディナー',
  }
  return map[id] ?? ''
}

function getRestaurantBudget(id: string) {
  const map: Record<string, string> = { lunch: 'B009', dinner: 'B011' }
  return map[id] ?? ''
}

export async function POST(req: Request) {
  const { messages, mode, subOptionId, location } = await req.json() as {
    messages: UIMessage[]
    mode: Mode
    subOptionId: string
    location?: { lat: number; lng: number } | null
  }

  const system = getSystemPrompt(mode, subOptionId)
    + (location ? `\n\nユーザーの現在地: 緯度 ${location.lat.toFixed(6)}, 経度 ${location.lng.toFixed(6)}` : '')

  const modelMessages = await convertToModelMessages(messages)

  if (mode === 'restaurant') {
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system,
      messages: modelMessages,
      tools: {
        searchRestaurants: {
          description: '近くの飲食店をホットペッパーグルメAPIで検索する',
          inputSchema: z.object({
            lat: z.number().describe('緯度'),
            lng: z.number().describe('経度'),
            keyword: z.string().optional().describe('検索キーワード'),
            range: z.number().min(1).max(5).default(3).describe('検索範囲: 1=300m 2=500m 3=1km 4=2km 5=3km'),
          }),
          execute: async ({ lat, lng, keyword, range }: { lat: number; lng: number; keyword?: string; range: number }) => {
            const apiKey = process.env.HOTPEPPER_API_KEY
            if (!apiKey || apiKey === 'your_hotpepper_api_key_here') {
              return {
                note: 'APIキー未設定のためサンプルデータを表示しています',
                shops: [
                  { name: '定食屋 さくら', genre: '定食・食堂', budget: '〜800円', address: '近隣', access: '徒歩3分', url: '#' },
                  { name: 'ラーメン太郎', genre: 'ラーメン', budget: '〜900円', address: '近隣', access: '徒歩5分', url: '#' },
                ],
              }
            }
            const autoKeyword = keyword ?? getRestaurantKeyword(subOptionId)
            const budget = getRestaurantBudget(subOptionId)
            const params = new URLSearchParams({
              key: apiKey, lat: String(lat), lng: String(lng),
              range: String(range), order: '4', count: '10', format: 'json',
              ...(autoKeyword ? { keyword: autoKeyword } : {}),
              ...(budget ? { budget } : {}),
            })
            const res = await fetch(`https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params}`)
            const data = await res.json() as { results?: { shop?: Record<string, unknown>[] } }
            const shops = data?.results?.shop ?? []
            return {
              shops: shops.map((s: Record<string, unknown>) => ({
                name: s.name,
                genre: (s.genre as Record<string, unknown>)?.name,
                budget: (s.budget as Record<string, unknown>)?.average,
                address: s.address,
                access: s.access,
                url: (s.urls as Record<string, unknown>)?.pc ?? '',
              })),
            }
          },
        },
      },
    })
    return result.toUIMessageStreamResponse()
  }

  if (mode === 'flyer') {
    // チラシモードはShufooサイトへのリンク案内（API不要）
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system,
      messages: modelMessages,
    })
    return result.toUIMessageStreamResponse()
  }

  // survey / thinking
  const result = streamText({
    model: google('gemini-2.0-flash'),
    system,
    messages: modelMessages,
  })
  return result.toUIMessageStreamResponse()
}
