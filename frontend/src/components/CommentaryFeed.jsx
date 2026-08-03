import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, Mic } from 'lucide-react'

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 5)  return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const AVATAR_COLORS = [
  ['#00D4FF', '#0B1120'],
  ['#FFB800', '#0B1120'],
  ['#39FF14', '#0B1120'],
  ['#FF6B6B', '#0B1120'],
  ['#A855F7', '#0B1120'],
  ['#F97316', '#0B1120'],
  ['#06B6D4', '#0B1120'],
  ['#EC4899', '#0B1120'],
]

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* ── Single Comment Bubble ──────────────────────────────────────────── */
function CommentBubble({ comment, isNew }) {
  const [bg, fg] = getAvatarColor(comment.authorName)
  const initials = comment.authorName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: 16, scale: 0.95 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-start gap-3 group"
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5 shadow-lg"
        style={{ background: bg, color: fg, boxShadow: `0 0 12px ${bg}55` }}
      >
        {initials}
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-bold text-white truncate" style={{ maxWidth: 120 }}>
            {comment.authorName}
          </span>
          <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <div
          className="text-sm text-slate-200 leading-relaxed rounded-2xl rounded-tl-sm px-3 py-2 break-words"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            wordBreak: 'break-word',
          }}
        >
          {comment.text}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Commentary Feed ────────────────────────────────────────────────── */
export default function CommentaryFeed({
  comments = [],
  viewerName = '',
  onSend,
  sending = false,
  inputValue = '',
  onInputChange,
  readOnly = false,
  maxHeight = 420,
}) {
  const listRef   = useRef(null)
  const prevLen   = useRef(comments.length)
  const newIds    = useRef(new Set())

  // Track newly arrived comments for animation
  useEffect(() => {
    if (comments.length > prevLen.current) {
      const newComments = comments.slice(prevLen.current)
      newComments.forEach(c => newIds.current.add(c.id))
      // Scroll to bottom
      if (listRef.current) {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      }
    }
    prevLen.current = comments.length
  }, [comments])

  // Initial scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
      e.preventDefault()
      onSend?.()
    }
  }

  return (
    <div
      className="flex flex-col rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(11,17,32,0.98) 0%, rgba(8,13,26,0.99) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        height: maxHeight,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Mic size={14} className="text-[#00D4FF]" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-300">
          Live Commentary
        </span>
        <span
          className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(57,255,20,0.12)', color: '#39FF14', border: '1px solid rgba(57,255,20,0.2)' }}
        >
          {comments.length} messages
        </span>
      </div>

      {/* Comment list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageCircle size={32} className="text-slate-700" />
            <p className="text-slate-500 text-sm font-medium">No commentary yet.</p>
            <p className="text-slate-600 text-xs">Be the first to comment!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <CommentBubble
                key={c.id}
                comment={c}
                isNew={newIds.current.has(c.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input area */}
      {!readOnly && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {viewerName && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] text-slate-500 font-medium">Commenting as</span>
              <span className="text-[10px] font-bold text-[#00D4FF]">{viewerName}</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={inputValue}
              onChange={e => onInputChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add your commentary…"
              maxLength={300}
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                minHeight: 40,
                maxHeight: 96,
                overflowY: 'auto',
                lineHeight: '1.4',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
              }}
            />
            <button
              onClick={onSend}
              disabled={sending || !inputValue.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #0099bb)',
                boxShadow: inputValue.trim() ? '0 0 16px rgba(0,212,255,0.4)' : 'none',
              }}
            >
              {sending
                ? <Loader2 size={16} className="animate-spin text-[#0B1120]" />
                : <Send size={16} className="text-[#0B1120]" />
              }
            </button>
          </div>
          {inputValue.length > 240 && (
            <p className="text-[10px] text-slate-500 mt-1 text-right">
              {300 - inputValue.length} chars left
            </p>
          )}
        </div>
      )}
    </div>
  )
}
