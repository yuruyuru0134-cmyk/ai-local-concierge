'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PERSONALITIES, type Location, type ModeConfig, type PersonalityId, type SubOption } from '@/lib/types'

interface AttachedImage {
  dataUrl: string
  mediaType: string
  filename: string
}

interface ChatInterfaceProps {
  mode: ModeConfig
  subOption: SubOption
  location: Location | null
  personality: PersonalityId
  onBack: () => void
  onBackToMode: () => void
}

export function ChatInterface({ mode, subOption, location, personality, onBack, onBackToMode }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputRows, setInputRows] = useState(1)
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])

  const colorMap: Record<string, { header: string; bubble: string; text: string; border: string }> = {
    survey:   { header: 'bg-blue-600',   bubble: 'bg-blue-600',   text: 'text-blue-600',   border: 'border-blue-300'   },
    useful:   { header: 'bg-teal-600',   bubble: 'bg-teal-600',   text: 'text-teal-600',   border: 'border-teal-300'   },
    thinking: { header: 'bg-purple-600', bubble: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-300' },
  }
  const colors = colorMap[mode.id]

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: {
      mode: mode.id,
      subOptionId: subOption.id,
      location,
      personality,
    },
  }), [mode.id, subOption.id, location, personality])

  const { messages, sendMessage, status, stop, error } = useChat({ transport })

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // お役立ち検索: 画面表示時に自動で一覧を取得
  const autoTriggered = useRef(false)

  useEffect(() => {
    if (autoTriggered.current) return
    if (mode.id !== 'useful') return
    autoTriggered.current = true

    const triggers: Record<string, string> = {
      food:      '近くのグルメ・飲食店を探して一覧表示してください',
      shop:      '近くのスーパー・コンビニ・買い物スポットを探して一覧表示してください',
      medical:   '近くの病院・薬局を探して一覧表示してください',
      sale:      '近くのチラシ・特売情報に関係するお店を検索して一覧表示してください',
      transport: '近くの駅・バス停・交通機関を探して一覧表示してください',
      other:     '近くの施設・お店を探して一覧表示してください',
    }

    sendMessage({ text: triggers[subOption.id] ?? '近くの施設を一覧表示してください' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isLoading = status === 'submitted' || status === 'streaming'

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target!.result as string)
      reader.readAsDataURL(file)
    })

  const addImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const newImages = await Promise.all(
      imageFiles.map(async (file) => ({
        dataUrl: await readFileAsDataURL(file),
        mediaType: file.type,
        filename: file.name || `image-${Date.now()}.${file.type.split('/')[1] ?? 'png'}`,
      }))
    )
    setAttachedImages(prev => [...prev, ...newImages])
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    await addImageFiles(files)
    e.target.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) await addImageFiles(imageFiles)
  }

  const removeAttachedImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!inputValue.trim() && attachedImages.length === 0) || isLoading) return
    const fileUIParts: FileUIPart[] = attachedImages.map(img => ({
      type: 'file' as const,
      mediaType: img.mediaType,
      filename: img.filename,
      url: img.dataUrl,
    }))
    if (fileUIParts.length > 0) {
      sendMessage({ text: inputValue.trim(), files: fileUIParts })
    } else {
      sendMessage({ text: inputValue.trim() })
    }
    setInputValue('')
    setInputRows(1)
    setAttachedImages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const lines = e.target.value.split('\n').length
    setInputRows(Math.min(lines, 5))
  }

  // メッセージのテキスト取得
  const getMessageText = (msg: (typeof messages)[number]) => {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('')
  }

  // メッセージの画像パーツ取得
  const getMessageImages = (msg: (typeof messages)[number]): FileUIPart[] => {
    return msg.parts.filter(
      (p): p is FileUIPart => p.type === 'file' && typeof (p as FileUIPart).mediaType === 'string'
        && (p as FileUIPart).mediaType.startsWith('image/')
    )
  }

  const formatMessage = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('# ')) return <h3 key={i} className="font-bold text-base mt-2">{line.slice(2)}</h3>
        if (line.startsWith('## ')) return <h4 key={i} className="font-semibold text-sm mt-2">{line.slice(3)}</h4>
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="ml-4 list-disc">{formatInline(line.slice(2))}</li>
        }
        if (/^\d+\.\s/.test(line)) {
          return <li key={i} className="ml-4 list-decimal">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        }
        if (line === '') return <div key={i} className="h-2" />
        return <p key={i}>{formatInline(line)}</p>
      })
  }

  const formatInline = (text: string) => {
    // [ラベル](URL)・素のURL・**太字**・`コード` を処理
    const TOKEN = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s）」』\]）>]+)|(\*\*[^*]+\*\*)|(`[^`]+`)/g
    const result: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    let key = 0
    while ((m = TOKEN.exec(text)) !== null) {
      if (m.index > last) result.push(text.slice(last, m.index))
      const matched = m[0]
      if (matched.startsWith('[')) {
        // [ラベル](URL)
        const label = m[2]
        const url   = m[3]
        result.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5">
            {label}<span className="text-xs">↗</span>
          </a>
        )
      } else if (matched.startsWith('http')) {
        // 素のURL → ラベルは表示せずURLをリンク化
        result.push(
          <a key={key++} href={matched} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-0.5">
            リンクを開く<span className="text-xs">↗</span>
          </a>
        )
      } else if (matched.startsWith('**')) {
        result.push(<strong key={key++}>{matched.slice(2, -2)}</strong>)
      } else if (matched.startsWith('`')) {
        result.push(<code key={key++} className="bg-gray-100 px-1 rounded text-xs font-mono">{matched.slice(1, -1)}</code>)
      }
      last = m.index + matched.length
    }
    if (last < text.length) result.push(text.slice(last))
    return result
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className={`${colors.header} text-white px-4 py-3 flex items-center gap-3 flex-shrink-0`}>
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white p-1 rounded transition-colors"
          title="カテゴリ選択に戻る"
        >
          ←
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{subOption.icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{mode.label} › {subOption.label}</div>
            <div className="text-xs text-white/70 flex items-center gap-1">
              <span>{PERSONALITIES.find(p => p.id === personality)?.icon}</span>
              <span>{PERSONALITIES.find(p => p.id === personality)?.label}</span>
              {location && <span>· 📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onBackToMode}
          className="text-white/80 hover:text-white text-xs px-2 py-1 rounded border border-white/30 transition-colors flex-shrink-0"
        >
          モード変更
        </button>
      </div>

      {/* メッセージエリア */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-5xl mb-3">{subOption.icon}</div>
            <h3 className={`text-lg font-bold mb-1 ${colors.text}`}>{subOption.label}</h3>
            <p className="text-gray-500 text-sm max-w-xs">{subOption.description}</p>
            {mode.id === 'useful' ? (
              <p className="text-gray-400 text-xs mt-4 animate-pulse">近くの施設を検索中...</p>
            ) : (
              <p className="text-gray-400 text-xs mt-4">質問や内容を入力してください</p>
            )}
          </div>
        )}

        {messages.map((msg, msgIndex) => {
          const text = getMessageText(msg)
          const images = getMessageImages(msg)
          // 自動トリガーの最初のユーザーメッセージは非表示
          const isAutoTrigger = msgIndex === 0
            && msg.role === 'user'
            && mode.id === 'useful'
          if (isAutoTrigger) return null
          if (!text && images.length === 0 && msg.role !== 'assistant') return null
          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                  {PERSONALITIES.find(p => p.id === personality)?.icon ?? '🤖'}
                </div>
              )}
              {(text || images.length > 0) && (
                <div
                  className={`
                    max-w-[80%] min-w-0 overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? `${colors.bubble} text-white rounded-br-sm`
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                    }
                  `}
                >
                  {/* 添付画像表示 */}
                  {images.length > 0 && (
                    <div className={`flex flex-wrap gap-2 ${text ? 'mb-2' : ''}`}>
                      {images.map((img, i) => (
                        <img
                          key={i}
                          src={img.url}
                          alt="添付画像"
                          className="max-w-full max-h-60 rounded-lg object-contain cursor-pointer"
                          onClick={() => window.open(img.url, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  {/* テキスト表示 */}
                  {text && (
                    msg.role === 'user'
                      ? text
                      : <div className="space-y-0.5">{formatMessage(text)}</div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0 mr-2">
              {PERSONALITIES.find(p => p.id === personality)?.icon ?? '🤖'}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-sm flex-shrink-0 mr-2">
              ⚠
            </div>
            <div className="bg-red-50 text-red-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm border border-red-200">
              エラーが発生しました。しばらく待ってからもう一度試してみてください。
            </div>
          </div>
        )}
      </div>

      {/* 入力エリア */}
      <div className={`bg-white border-t ${colors.border} px-3 pt-3 pb-safe flex-shrink-0`}>
        {/* 画像プレビュー */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative group">
                <img
                  src={img.dataUrl}
                  alt={img.filename}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeAttachedImage(i)}
                  className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none opacity-80 hover:opacity-100"
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          {/* 画像添付ボタン */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="画像を添付（Ctrl+Vでペーストも可）"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 p-1.5 rounded-lg transition-colors flex-shrink-0 text-xl leading-none"
          >
            🖼
          </button>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={inputRows}
            placeholder="メッセージを入力… / 画像をCtrl+Vで貼付け"
            className={`
              flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5
              text-sm focus:outline-none focus:border-current ${colors.text}
              transition-colors placeholder:text-gray-400
            `}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="bg-red-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex-shrink-0"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim() && attachedImages.length === 0}
              className={`
                ${colors.bubble} text-white rounded-xl px-4 py-2.5 text-sm font-medium
                disabled:opacity-40 transition-opacity flex-shrink-0 active:scale-95
              `}
            >
              送信
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
