import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Calendar, Zap, ChevronRight, Activity, Shield, BarChart3 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import api from '@/services/api'
import PageTransition from '@/components/PageTransition'

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  { icon: Zap,       title: 'Live Scoring',       desc: 'Track every ball, over and wicket in real time with precision.' },
  { icon: Users,     title: 'Team Management',    desc: 'Manage players, roles and optimal team compositions.' },
  { icon: Trophy,    title: 'Tournaments',         desc: 'Create and manage full cricket tournaments seamlessly.' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Deep performance insights and immersive statistics.' },
  { icon: Shield,    title: 'Role-based Access',  desc: 'Admins, scorers and viewers with fine-grained control.' },
  { icon: Activity,  title: 'Match History',      desc: 'Full ball-by-ball history for every completed match.' },
]

/* ─── Inline SVG Stadium ─────────────────────────────────────────── */
function StadiumSVG() {
  return (
    <svg
      id="stadium-svg"
      viewBox="0 0 1200 900"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      <defs>
        {/* Sky gradient */}
        <radialGradient id="skyGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="#0a1628" />
          <stop offset="100%" stopColor="#010810" />
        </radialGradient>

        {/* Outfield gradient */}
        <radialGradient id="outfieldGrad" cx="50%" cy="52%" r="50%">
          <stop offset="0%"   stopColor="#1a4a2e" />
          <stop offset="60%"  stopColor="#143d24" />
          <stop offset="100%" stopColor="#0d2e1a" />
        </radialGradient>

        {/* Infield / 30-yard circle */}
        <radialGradient id="infieldGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#22613a" />
          <stop offset="100%" stopColor="#1a4d2e" />
        </radialGradient>

        {/* Pitch strip */}
        <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c8aa6e" />
          <stop offset="50%"  stopColor="#d4b87a" />
          <stop offset="100%" stopColor="#c8aa6e" />
        </linearGradient>

        {/* Floodlight glow */}
        <radialGradient id="floodGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>

        {/* Stadium bowl — used for stands clipping */}
        <clipPath id="stadiumClip">
          <ellipse cx="600" cy="450" rx="560" ry="420" />
        </clipPath>

        {/* Grass mow-stripe pattern */}
        <pattern id="mowStripe" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="14" height="28" fill="#143d24" opacity="0.35" />
        </pattern>
      </defs>

      {/* ── Background sky ── */}
      <rect width="1200" height="900" fill="url(#skyGrad)" />

      {/* ── Stars ── */}
      {[
        [80,60],[200,30],[380,80],[520,20],[700,50],[900,30],[1050,70],[1140,40],
        [150,120],[460,110],[750,90],[1000,100],[320,45],[850,55],[60,170],[1100,140],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={Math.random() > 0.5 ? 1.5 : 1} fill="white" opacity={0.4 + (i % 4) * 0.15} />
      ))}

      {/* ── Floodlight towers (corners) ── */}
      {[
        { x: 130, y: 90 },
        { x: 1070, y: 90 },
        { x: 100, y: 750 },
        { x: 1100, y: 750 },
      ].map((pos, i) => (
        <g key={i}>
          {/* Glow halo */}
          <ellipse cx={pos.x} cy={pos.y} rx="90" ry="90" fill="url(#floodGlow)" />
          {/* Tower pole */}
          <line
            x1={pos.x} y1={pos.y + 20}
            x2={pos.x} y2={pos.y + 120}
            stroke="#556" strokeWidth="4" strokeLinecap="round"
          />
          {/* Light bar */}
          <rect x={pos.x - 22} y={pos.y - 8} width="44" height="14" rx="4" fill="#8899bb" />
          {/* Light dots */}
          {[-14, -5, 4, 13].map((dx, j) => (
            <circle key={j} cx={pos.x + dx} cy={pos.y} r="3.5" fill="#00d4ff" opacity="0.9" />
          ))}
        </g>
      ))}

      {/* ── Outer stadium ring / stands ── */}
      <ellipse cx="600" cy="450" rx="555" ry="415" fill="#0e1c2e" />

      {/* Stand tiers — darkest outer */}
      <ellipse cx="600" cy="450" rx="530" ry="395" fill="#1a2d47" />
      <ellipse cx="600" cy="450" rx="500" ry="370" fill="#162540" />
      {/* Stand seat rows (subtle) */}
      {[490, 478, 466, 454, 442].map((rx, i) => (
        <ellipse
          key={i}
          cx="600" cy="450"
          rx={rx} ry={rx * 0.742}
          fill="none"
          stroke="#1e3258"
          strokeWidth="4"
          opacity="0.8"
        />
      ))}
      {/* Crowd dots (packed seats) */}
      {Array.from({ length: 220 }, (_, i) => {
        const angle = (i / 220) * Math.PI * 2
        const spread = 0.7 + (i % 5) * 0.058
        const rx2 = 430 + (i % 7) * 11
        const ry2 = rx2 * 0.74
        return (
          <circle
            key={i}
            cx={600 + Math.cos(angle) * rx2 * spread}
            cy={450 + Math.sin(angle) * ry2 * spread}
            r="2.8"
            fill={i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#39ff8e' : '#ffffff'}
            opacity={0.25 + (i % 4) * 0.07}
          />
        )
      })}

      {/* ── Playing field ── */}
      <ellipse cx="600" cy="450" rx="390" ry="295" fill="url(#outfieldGrad)" />

      {/* Mow stripe overlay */}
      <ellipse cx="600" cy="450" rx="390" ry="295" fill="url(#mowStripe)" opacity="0.5" />

      {/* Outfield boundary circle */}
      <ellipse
        cx="600" cy="450" rx="390" ry="295"
        fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="0" opacity="0.6"
      />

      {/* ── 30-yard circle ── */}
      <ellipse
        cx="600" cy="450" rx="220" ry="167"
        fill="url(#infieldGrad)"
      />
      <ellipse
        cx="600" cy="450" rx="220" ry="167"
        fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.5"
      />

      {/* ── Outfield fielder dots ── */}
      {[
        [600, 195], [430, 250], [780, 248], [310, 380], [895, 375],
        [330, 540], [880, 535], [430, 660], [780, 658],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="7" fill="#00d4ff" opacity="0.85" />
          <circle cx={cx} cy={cy} r="12" fill="#00d4ff" opacity="0.15" />
        </g>
      ))}

      {/* ── Pitch crease ── */}
      <rect x="567" y="330" width="66" height="240" rx="3" fill="url(#pitchGrad)" />
      {/* Crease lines */}
      <line x1="560" y1="380" x2="640" y2="380" stroke="white" strokeWidth="2" opacity="0.8" />
      <line x1="560" y1="520" x2="640" y2="520" stroke="white" strokeWidth="2" opacity="0.8" />
      {/* Popping crease */}
      <line x1="558" y1="390" x2="642" y2="390" stroke="white" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
      <line x1="558" y1="510" x2="642" y2="510" stroke="white" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
      {/* Stumps */}
      {[-8, 0, 8].map((dx, i) => (
        <rect key={i} x={596 + dx} y={370} width="3" height="22" rx="1" fill="#f5e6b2" />
      ))}
      {[-8, 0, 8].map((dx, i) => (
        <rect key={i} x={596 + dx} y={508} width="3" height="22" rx="1" fill="#f5e6b2" />
      ))}
      {/* Bails */}
      <line x1="593" y1="370" x2="610" y2="370" stroke="#f5e6b2" strokeWidth="2" strokeLinecap="round" />
      <line x1="593" y1="529" x2="610" y2="529" stroke="#f5e6b2" strokeWidth="2" strokeLinecap="round" />

      {/* ── Batsman & bowler (iconic silhouettes via circles+lines) ── */}
      {/* Batsman at striker end */}
      <g transform="translate(590, 368)">
        <circle cx="5" cy="-12" r="5" fill="#39ff8e" opacity="0.9" />
        <line x1="5" y1="-7" x2="5" y2="8" stroke="#39ff8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="5" y1="-1" x2="-4" y2="4" stroke="#39ff8e" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="-1" x2="15" y2="2" stroke="#39ff8e" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Bowler at other end */}
      <g transform="translate(590, 540)">
        <circle cx="5" cy="-12" r="5" fill="#ffd700" opacity="0.9" />
        <line x1="5" y1="-7" x2="5" y2="8" stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="5" y1="-1" x2="-4" y2="4" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="-1" x2="14" y2="-4" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ── Scoreboard ── */}
      <rect x="490" y="94" width="220" height="70" rx="8" fill="#0a1628" stroke="#00d4ff" strokeWidth="1.5" opacity="0.9" />
      <text x="600" y="118" textAnchor="middle" fill="#00d4ff" fontSize="11" fontFamily="monospace" opacity="0.8">LIVE</text>
      <text x="600" y="142" textAnchor="middle" fill="white" fontSize="20" fontFamily="monospace" fontWeight="bold">142 / 3  (24.2)</text>

      {/* ── Umpires ── */}
      {[[580, 450], [630, 450]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="white" opacity="0.7" />
      ))}

      {/* ── Corner branding ── */}
      <text x="600" y="845" textAnchor="middle" fill="#00d4ff" fontSize="13" fontFamily="sans-serif" opacity="0.4" letterSpacing="4">
        PITCHMASTER STADIUM
      </text>
    </svg>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function HomePage() {
  const [stats, setStats] = useState({ tournaments: 0, teams: 0, players: 0, matches: 0 })
  const [statsLoaded, setStatsLoaded] = useState(false)

  const containerRef   = useRef(null)
  const stadiumRef     = useRef(null)
  const heroTextRef    = useRef(null)
  const overlayRef     = useRef(null)
  const statsRef       = useRef(null)
  const featuresRef    = useRef(null)
  const ctaRef         = useRef(null)

  /* Fetch stats */
  useEffect(() => {
    Promise.allSettled([
      api.get('/tournaments'),
      api.get('/teams'),
      api.get('/players'),
      api.get('/matches'),
    ]).then(([t, te, p, m]) => {
      setStats({
        tournaments: t.value?.data?.data?.length ?? 0,
        teams:       te.value?.data?.data?.length ?? 0,
        players:     p.value?.data?.data?.length ?? 0,
        matches:     m.value?.data?.data?.length ?? 0,
      })
      setStatsLoaded(true)
    })
  }, [])

  /* GSAP scroll magic */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=4000',
          scrub: 1.4,
          pin: true,
          anticipatePin: 1,
        },
      })

      /* ─ Phase 0: opening pulse on SVG load ─ */
      gsap.fromTo('#stadium-svg', { opacity: 0, scale: 0.92 }, {
        opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out', delay: 0.2,
      })
      gsap.fromTo(heroTextRef.current, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.6,
      })

      /* ─ Phase 1: zoom into stands (0–25%) ─ */
      tl.to(stadiumRef.current, {
        scale: 1.8,
        y: '-5%',
        duration: 1,
        ease: 'power2.inOut',
      }, 0)
      tl.to(heroTextRef.current, {
        opacity: 0,
        y: -60,
        duration: 0.4,
        ease: 'power2.in',
      }, 0)

      /* ─ Phase 2: zoom into outfield (25–50%) ─ */
      tl.to(stadiumRef.current, {
        scale: 3.5,
        y: '-12%',
        duration: 1,
        ease: 'power2.inOut',
      }, 1)
      /* Overlay darkens, stats slide in */
      tl.to(overlayRef.current, { opacity: 0.6, duration: 0.5 }, 1)
      tl.fromTo(statsRef.current,
        { opacity: 0, y: 80, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.4)' },
        1.2,
      )

      /* Animate stat counters when they appear */
      tl.call(() => {
        if (!statsLoaded) return
        gsap.utils.toArray('.stat-num').forEach((el) => {
          const target = +el.dataset.target
          gsap.fromTo(el, { textContent: 0 }, {
            textContent: target,
            duration: 1.2,
            ease: 'power3.out',
            snap: { textContent: 1 },
            onUpdate() { el.textContent = Math.round(+el.textContent) },
          })
        })
      }, [], 1.3)

      /* ─ Phase 3: zoom into pitch centre (50–75%) ─ */
      tl.to(stadiumRef.current, {
        scale: 6,
        y: '8%',
        duration: 1.2,
        ease: 'power2.inOut',
      }, 2)
      tl.to(statsRef.current, { opacity: 0, y: -60, duration: 0.4 }, 2)
      tl.to(overlayRef.current, { opacity: 0.75, duration: 0.3 }, 2)
      tl.fromTo(featuresRef.current,
        { opacity: 0, y: 100, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.2)' },
        2.3,
      )
      /* Stagger feature cards */
      tl.fromTo('.feature-card',
        { opacity: 0, y: 40, rotateX: 12 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' },
        2.5,
      )

      /* ─ Phase 4: extreme zoom — pitch close-up, CTA (75–100%) ─ */
      tl.to(stadiumRef.current, {
        scale: 11,
        y: '18%',
        duration: 1,
        ease: 'power2.inOut',
      }, 3)
      tl.to(featuresRef.current, { opacity: 0, y: -80, duration: 0.4 }, 3)
      tl.to(overlayRef.current, { opacity: 0.85, duration: 0.3 }, 3)
      tl.fromTo(ctaRef.current,
        { opacity: 0, scale: 0.85, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)' },
        3.3,
      )
    }, containerRef)

    return () => ctx.revert()
  }, [statsLoaded])

  /* Stat counter side-effect when statsLoaded flips after scroll init */
  useEffect(() => {
    if (!statsLoaded) return
    const els = document.querySelectorAll('.stat-num')
    if (!els.length) return
    els.forEach((el) => {
      if (el.textContent !== '0') return
      const target = +el.dataset.target
      gsap.fromTo(el, { textContent: 0 }, {
        textContent: target,
        duration: 1.4,
        ease: 'power3.out',
        snap: { textContent: 1 },
        onUpdate() { el.textContent = Math.round(+el.textContent) },
      })
    })
  }, [statsLoaded])

  return (
    <PageTransition>
      {/* ═══════════════════════════════════════════════
          PINNED SCROLL CONTAINER
      ═══════════════════════════════════════════════ */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: '100vh', overflow: 'hidden', background: 'transparent' }}
      >
        {/* ── Stadium layer ── */}
        <div
          ref={stadiumRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformOrigin: '50% 55%',
            willChange: 'transform',
          }}
        >
          <StadiumSVG />
        </div>

        {/* ── Dark overlay (for readability during zoom) ── */}
        <div
          ref={overlayRef}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(1,8,16,0.4) 0%, rgba(1,8,16,0.9) 100%)',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        {/* ── Vignette always ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(1,8,16,0.7) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ╔══════════════════════════════╗
            ║  HERO TEXT (Phase 0)         ║
            ╚══════════════════════════════╝ */}
        <div
          ref={heroTextRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 20px',
              borderRadius: 999,
              border: '1px solid rgba(0,212,255,0.35)',
              color: '#00d4ff',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 28,
              background: 'rgba(0,212,255,0.06)',
              boxShadow: '0 0 20px rgba(0,212,255,0.2)',
            }}
          >
            <Zap size={13} /> Next-Gen Cricket Management
          </span>

          <h1
            style={{
              fontSize: 'clamp(52px,8vw,96px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'white',
              textAlign: 'center',
              margin: '0 0 20px',
              textShadow: '0 0 60px rgba(0,212,255,0.3)',
            }}
          >
            Master the<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #39ff8e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Pitch
            </span>
          </h1>

          <p
            style={{
              color: 'rgba(180,200,220,0.8)',
              fontSize: 'clamp(15px,1.8vw,19px)',
              fontWeight: 300,
              maxWidth: 560,
              textAlign: 'center',
              lineHeight: 1.65,
              margin: '0 0 40px',
            }}
          >
            Immersive ball-by-ball scoring, interactive analytics, and premium
            tournament management — all from the palm of your hand.
          </p>

          {/* Scroll cue */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ color: 'rgba(0,212,255,0.6)', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Scroll to explore
            </span>
            <div
              className="scroll-arrow"
              style={{
                width: 24,
                height: 40,
                border: '1.5px solid rgba(0,212,255,0.4)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: 5,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 10,
                  borderRadius: 2,
                  background: '#00d4ff',
                  animation: 'scrollDot 1.6s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════╗
            ║  STATS PANEL (Phase 2)       ║
            ╚══════════════════════════════╝ */}
        <div
          ref={statsRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div className="stats-wrapper" style={{ textAlign: 'center', padding: '0 24px', maxWidth: 960, width: '100%' }}>
            <p
              style={{
                color: '#00d4ff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              ⚡ Live Platform Stats
            </p>
            <h2
              className="stats-headline"
              style={{
                color: 'white',
                fontSize: 'clamp(20px,4vw,48px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '0 0 32px',
                textShadow: '0 2px 30px rgba(0,0,0,0.5)',
              }}
            >
              The Numbers Behind the Game
            </h2>
            <div className="stats-grid">
              {[
                { label: 'Tournaments', value: stats.tournaments, icon: Trophy,    color: '#ffd700' },
                { label: 'Teams',       value: stats.teams,       icon: Users,     color: '#00d4ff' },
                { label: 'Players',     value: stats.players,     icon: Activity,  color: '#39ff8e' },
                { label: 'Matches',     value: stats.matches,     icon: Calendar,  color: '#ff6b9d' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '28px 20px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Corner glow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
                    }}
                  />
                  <Icon size={22} style={{ color, marginBottom: 12, opacity: 0.9 }} />
                  <div
                    className="stat-num"
                    data-target={value}
                    style={{
                      fontSize: 'clamp(36px,5vw,58px)',
                      fontWeight: 900,
                      color: 'white',
                      lineHeight: 1,
                      letterSpacing: '-0.03em',
                      marginBottom: 8,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {statsLoaded ? value : 0}
                  </div>
                  <div className="stat-label" style={{ color }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════╗
            ║  FEATURES GRID (Phase 3)     ║
            ╚══════════════════════════════╝ */}
        <div
          ref={featuresRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            zIndex: 20,
            pointerEvents: 'none',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '24px', maxWidth: 1040, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h2
                style={{
                  fontSize: 'clamp(26px,3.5vw,44px)',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.02em',
                  margin: '0 0 12px',
                }}
              >
                Engineered for{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Excellence
                </span>
              </h2>
              <p style={{ color: 'rgba(150,170,200,0.8)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
                Premium tools forged for modern cricket. Unmatched speed, precision, and aesthetics.
              </p>
            </div>

            <div className="features-grid">
              {FEATURES.map(({ icon: Icon, title, desc }, i) => {
                const colors = ['#00d4ff', '#39ff8e', '#ffd700', '#ff6b9d', '#a78bfa', '#fb923c']
                const c = colors[i % colors.length]
                return (
                  <div
                    key={title}
                    className="feature-card"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 18,
                      padding: '24px',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -30,
                        right: -30,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${c}18 0%, transparent 70%)`,
                      }}
                    />
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: `1px solid ${c}44`,
                        background: `${c}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        boxShadow: `0 0 16px ${c}22`,
                      }}
                    >
                      <Icon size={20} style={{ color: c }} />
                    </div>
                    <h3
                      style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: 700,
                        margin: '0 0 8px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      style={{
                        color: 'rgba(140,165,195,0.85)',
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        margin: 0,
                        fontWeight: 300,
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════╗
            ║  CTA PANEL (Phase 4)         ║
            ╚══════════════════════════════╝ */}
        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            zIndex: 20,
          }}
        >
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            {/* Pitch texture badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 24px',
                borderRadius: 999,
                background: 'rgba(212,184,122,0.12)',
                border: '1px solid rgba(212,184,122,0.3)',
                color: '#d4b87a',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 28,
              }}
            >
              🏏 You've reached the pitch
            </div>

            <h2
              style={{
                fontSize: 'clamp(36px,5.5vw,72px)',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                margin: '0 0 20px',
                textShadow: '0 0 80px rgba(57,255,142,0.25)',
              }}
            >
              Ready to<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #39ff8e 0%, #00d4ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Take the Crease?
              </span>
            </h2>

            <p
              style={{
                color: 'rgba(160,185,215,0.8)',
                fontSize: 16,
                maxWidth: 420,
                margin: '0 auto 44px',
                lineHeight: 1.65,
                fontWeight: 300,
              }}
            >
              Join thousands of cricketers already managing their game on PitchMaster.
            </p>

            <div className="cta-buttons" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/matches"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 32px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #00d4ff 0%, #39ff8e 100%)',
                  color: '#020c1b',
                  fontWeight: 800,
                  fontSize: 15,
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 8px 30px rgba(0,212,255,0.35)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,212,255,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,212,255,0.35)'
                }}
              >
                Explore Matches <ChevronRight size={17} />
              </Link>

              <Link
                to="/tournaments"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 32px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  backdropFilter: 'blur(8px)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Trophy size={16} /> View Tournaments
              </Link>
            </div>

            {/* Social proof */}
            <div
              style={{
                marginTop: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                color: 'rgba(120,145,175,0.7)',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', gap: -4 }}>
                {['#00d4ff','#39ff8e','#ffd700','#ff6b9d'].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: '2px solid #020c1b',
                      marginLeft: i > 0 ? -8 : 0,
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              Trusted by 1,200+ cricket teams worldwide
            </div>
          </div>
        </div>

        {/* Scroll progress indicator */}
        <div
          className="scroll-dots-rail"
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            flexDirection: 'column',
            gap: 8,
            zIndex: 30,
          }}
        >
          {['Hero', 'Stats', 'Features', 'Launch'].map((label, i) => (
            <div
              key={label}
              title={label}
              className={`scroll-dot-${i}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(0,212,255,0.3)',
                border: '1px solid rgba(0,212,255,0.4)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── CSS Keyframes + Mobile Fixes ───────────────────────────── */}
      <style>{`
        @keyframes scrollDot {
          0%   { opacity: 1; transform: translateY(0); }
          60%  { opacity: 0; transform: translateY(14px); }
          61%  { opacity: 0; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ── Stats panel: 4-col → 2-col on mobile ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 700px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }

        /* ── Features grid: 3-col → 2-col → 1-col ── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 700px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
        }
        @media (max-width: 420px) {
          .features-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* ── Scroll dots: hide on small screens ── */
        .scroll-dots-rail {
          display: flex;
        }
        @media (max-width: 480px) {
          .scroll-dots-rail { display: none !important; }
        }

        /* ── Stat card label: never overflow ── */
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        @media (max-width: 400px) {
          .stat-label { font-size: 9px; letter-spacing: 0.08em; }
        }

        /* ── Stats panel padding ── */
        @media (max-width: 480px) {
          .stats-wrapper { padding: 0 12px !important; }
          .stats-headline { font-size: 22px !important; margin-bottom: 24px !important; }
          .feature-card { padding: 16px !important; }
          .feature-card h3 { font-size: 13px !important; }
          .feature-card p { font-size: 12px !important; }
        }

        /* ── CTA buttons stack on tiny screens ── */
        @media (max-width: 400px) {
          .cta-buttons { flex-direction: column !important; align-items: center !important; }
          .cta-buttons a { width: 100% !important; justify-content: center !important; }
        }
      `}</style>
    </PageTransition>
  )
}