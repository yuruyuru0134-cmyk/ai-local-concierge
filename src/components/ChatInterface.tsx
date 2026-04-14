'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Location, ModeConfig, SubOption } from '@/lib/types'

interface ChatInterfaceProps {
  mode: ModeConfig
  subOption: SubOption
  location: Location | null
  onBack: () => void
  onBackToMode: () => void
}

export function ChatInterface({ mode, subOption, location, onBack, onBackToMode }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputRows, setInputRows] = useState(1)

  const colorMap: Record<string, { header: string; bubble: string; text: string; border: string }> = {
    survey:     { header: 'bg-blue-600',   bubble: 'bg-blue-600',   text: 'text-blue-600',   border: 'border-blue-300' },
    flyer:      { header: 'bg-green-600',  bubble: 'bg-green-600',  text: 'text-green-600',  border: 'border-green-300' },
    restaurant: { header: 'bg-orange-500', bubble: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-300' },
    thinking:   { header: 'bg-purple-600', bubble: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-300' },
  }
  const colors = colorMap[mode.id]

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: {
      mode: mode.id,
      subOptionId: subOption.id,
      location,
    },
  }), [mode.id, subOption.id, location])

  const { messages, sendMessage, status, stop } = useChat({ transport })

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return
    sendMessage({ text: inputValue.trim() })
    setInputValue('')
    setInputRows(1)
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
    // [ラベル](URL) 形式のリンク、**太字**、`コード` に対応
    const parts = text.split(/(\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*[^*]+\*\*|`[^`]+`)/g)
    const result: React.ReactNode[] = []
    let i = 0
    while (i < parts.length) {
      const part = parts[i]
      if (!part) { i++; continue }
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
      if (linkMatch) {
        result.push(
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 underline break-all hover:text-blue-800">
            {linkMatch[1]}
          </a>
        )
      } else if (part.startsWith('**') && part.endsWith('**')) {
        result.push(<strong key={i}>{part.slice(2, -2)}</strong>)
      } else if (part.startsWith('`') && part.endsWith('`')) {
        result.push(<code key={i} className="bg-gray-100 px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>)
      } else {
        result.push(part)
      }
      i++
    }
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
            {location && (
              <div className="text-xs text-white/70 truncate">
                📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}
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
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-5xl mb-3">{subOption.icon}</div>
            <h3 className={`text-lg font-bold mb-1 ${colors.text}`}>{subOption.label}</h3>
            <p className="text-gray-500 text-sm max-w-xs">{subOption.description}</p>
            <p className="text-gray-400 text-xs mt-4">質問や内容を入力してください</p>
          </div>
        )}

        {messages.map((msg) => {
          const text = getMessageText(msg)
          if (!text && msg.role !== 'assistant') return null
          return (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                  🤖
                </div>
              )}
              {text && (
                <div
                  className={`
                    max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? `${colors.bubble} text-white rounded-br-sm`
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                    }
                  `}
                >
                  {msg.role === 'user'
                    ? text
                    : <div className="space-y-0.5">{formatMessage(text)}</div>
                  }
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm flex-shrink-0 mr-2">
              🤖
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
      </div>

      {/* 入力エリア */}
      <div className={`bg-white border-t ${colors.border} px-3 py-3 flex-shrink-0`}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={inputRows}
            placeholder="メッセージを入力…（Shift+Enterで改行）"
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
              disabled={!inputValue.trim()}
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
