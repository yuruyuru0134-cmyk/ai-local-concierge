export type Mode = 'survey' | 'useful' | 'thinking'

export type PersonalityId = 'osaka_ojisan' | 'secretary' | 'osaka_obachan' | 'robot'

export interface Personality {
  id: PersonalityId
  label: string
  icon: string
  description: string
}

export const PERSONALITIES: Personality[] = [
  { id: 'osaka_ojisan',  label: '大阪のおっちゃん', icon: '👨', description: '気さくで親しみやすいおっちゃん' },
  { id: 'secretary',    label: '女性秘書',         icon: '👩‍💼', description: '丁寧で有能な秘書スタイル' },
  { id: 'osaka_obachan', label: '大阪のおばちゃん', icon: '👩', description: '元気いっぱいのにぎやか担当' },
  { id: 'robot',        label: 'ロボット',          icon: '🤖', description: '論理的で正確なAIロボット' },
]

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
      { id: 'distance',   label: '距離・角度計算', icon: '📏', description: '2点間の距離・方位角・内角の計算' },
      { id: 'area',       label: '面積計算',       icon: '🔷', description: '三斜法・座標法による面積計算' },
      { id: 'coordinate', label: '座標変換',       icon: '🗺️', description: '平面直角座標系・緯度経度の変換' },
      { id: 'traverse',   label: 'トラバース計算', icon: '📊', description: '閉合・結合トラバースの計算' },
      { id: 'leveling',   label: '水準測量',       icon: '⚖️', description: '高さ・標高差の計算' },
      { id: 'batter',     label: '丁張計算',       icon: '🏗️', description: '法面勾配・切盛高・丁張高の計算' },
    ],
  },
  {
    id: 'useful',
    label: 'お役立ち検索',
    icon: '🔍',
    description: '現在地周辺を多角的に検索',
    color: 'text-teal-600',
    bgGradient: 'from-teal-50 to-teal-100',
    subOptions: [
      { id: 'food',      label: 'グルメ・飲食店',   icon: '🍽️', description: 'レストラン・カフェ・ファストフードなど' },
      { id: 'shop',      label: 'スーパー・買い物', icon: '🛒', description: 'スーパー・コンビニ・ドラッグストアなど' },
      { id: 'medical',   label: '病院・薬局',       icon: '🏥', description: '病院・クリニック・歯科・薬局など' },
      { id: 'sale',      label: 'チラシ・特売情報', icon: '🏷️', description: '近くのお店のセール・特売情報' },
      { id: 'transport', label: '交通・駅',         icon: '🚉', description: '駅・バス停・交通機関など' },
      { id: 'other',     label: 'その他・フリー検索', icon: '🔎', description: '上記以外の周辺施設を探す' },
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
      { id: 'freeform', label: 'とにかく話したい',     icon: '💬', description: 'まとまっていなくてもOK。話しながら整理しよう' },
      { id: 'idea',     label: 'アイデアを整理したい', icon: '🧩', description: 'アイデアを広げて構造化する' },
      { id: 'problem',  label: '問題を解決したい',     icon: '🔍', description: '問題の原因を掘り下げて解決策を見つける' },
      { id: 'decision', label: '意思決定をしたい',     icon: '⚖️', description: 'メリット・デメリットを整理して決断する' },
    ],
  },
]

export interface Location {
  lat: number
  lng: number
  address?: string
}
