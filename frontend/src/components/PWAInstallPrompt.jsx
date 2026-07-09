import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Zap, Smartphone } from 'lucide-react'

/**
 * PWAInstallPrompt
 * Shows a slick "Install CricBlitz" banner when:
 *  - The browser fires the `beforeinstallprompt` event (Chrome/Android)
 *  - OR the user is on iOS Safari (manual install instructions)
 * Dismissed state is persisted in localStorage for 7 days.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Dismissed recently (within 7 days)
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    if (ios) {
      setIsIOS(true)
      setTimeout(() => setShow(true), 2000) // slight delay feels natural
      return
    }

    // Chrome / Android — listen for install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (isInstalled) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="fixed bottom-6 left-4 right-4 z-[9999] md:left-auto md:right-6 md:w-[380px]"
        >
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(10,10,26,0.98) 0%, rgba(20,20,50,0.98) 100%)',
              boxShadow: '0 0 40px rgba(0,212,255,0.15), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Glowing top bar */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: 'linear-gradient(90deg, #00d4ff, #7c3aed, #f97316, #00d4ff)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }}
            />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {/* App icon */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
                    <img src="/icon-192.png" alt="CricBlitz" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Zap size={11} className="text-[#00d4ff]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00d4ff]">Install App</span>
                    </div>
                    <p className="font-black text-white text-lg leading-tight">CricBlitz</p>
                    <p className="text-slate-400 text-xs font-medium">Live. Score. Dominate.</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['⚡ Live Scoring', '🏆 Tournaments', '📊 Analytics', '📴 Works Offline'].map(f => (
                  <span key={f} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {f}
                  </span>
                ))}
              </div>

              {/* CTA */}
              {isIOS ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-300 font-medium leading-relaxed">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={14} className="text-[#00d4ff]" />
                    <span className="font-black text-white text-[11px] uppercase tracking-wider">Add to Home Screen</span>
                  </div>
                  Tap the <span className="text-[#00d4ff] font-bold">Share</span> button below, then select <span className="text-[#00d4ff] font-bold">"Add to Home Screen"</span> to install CricBlitz.
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                    color: '#000',
                    boxShadow: '0 0 20px rgba(0,212,255,0.4)',
                  }}
                >
                  <Download size={16} />
                  Install CricBlitz
                </button>
              )}
            </div>
          </div>

          <style>{`
            @keyframes shimmer {
              0% { background-position: 0% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
