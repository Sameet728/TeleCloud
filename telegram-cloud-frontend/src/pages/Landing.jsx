import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll } from 'framer-motion'
import {
  Cloud, Shield, Zap, FolderOpen, Share2, ArrowRight, 
  Download, Image as ImageIcon, Check, ChevronDown, Mail, Send, Music, 
  Disc3, Headphones, Moon, Sun, PlayCircle, HardDrive, 
  ShieldCheck, AlertTriangle,
  Shuffle, SkipBack, Pause, SkipForward, Repeat
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import AdBanner from '../components/AdBanner'

const StackXLogo = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="stackx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    <path d="M25 20 L50 60 L25 100 L45 100 L60 75 L75 100 L95 100 L70 60 L95 20 L75 20 L60 45 L45 20 Z" fill="url(#stackx-grad)" opacity="0.9" />
    <path d="M15 40 L40 80 L15 120 L35 120 L50 95 L65 120 L85 120 L60 80 L85 40 L65 40 L50 65 L35 40 Z" fill="url(#stackx-grad)" opacity="0.5" />
  </svg>
)

const TelecloudLogo = ({ iconSize = 16, textSize = "text-base" }) => (
  <div className="flex items-center gap-2.5 group">
    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[10px] flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
      <Cloud size={iconSize} className="text-white" />
    </div>
    <div className="flex flex-col justify-center mt-0.5">
      <span className={`font-extrabold tracking-tight text-gray-900 dark:text-white ${textSize} leading-none mb-1`}>Telecloud</span>
      <span className="text-[8px] font-bold tracking-[0.2em] text-zinc-500 uppercase flex items-center leading-none">
        BY STACK<span className="text-indigo-500 mx-[1px]">X</span> LAB
      </span>
    </div>
  </div>
)

const GridBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iY3VycmVudENvbG9yIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-[0.4] dark:opacity-[0.1]" />
    <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 blur-[120px]" />
    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-500/10 blur-[120px]" />
  </div>
)

const features = [
  { icon: HardDrive, title: 'Infinite Vault', desc: 'Securely store files of any size leveraging Telegram\'s decentralized infrastructure. Zero limits.' },
  { icon: Music, title: 'Hi-Fi Streaming', desc: 'Built-in 320kbps music player. Stream ad-free audio directly from your cloud library.' },
  { icon: Share2, title: 'Secure Distribution', desc: 'Share assets with password protection, download limits, and auto-expiring links.' },
  { icon: Download, title: 'Offline Access', desc: 'Download individual files, full directories, or entire music playlists instantly.' },
  { icon: ImageIcon, title: 'Native Previews', desc: 'View high-res images, play videos, and read documents without leaving the browser.' },
  { icon: FolderOpen, title: 'Smart Workspaces', desc: 'Organize your chaos with nested directories, color-coding, and seamless management.' },
]

const musicFeatures = [
  { icon: Disc3, title: '320kbps Studio Quality', desc: 'Experience crystal-clear audio. No artificial compression, no compromises.' },
  { icon: Headphones, title: 'Background Playback', desc: 'Keep listening while you browse files or switch tabs. The music never stops.' },
  { icon: PlayCircle, title: 'Infinite Queue', desc: 'Algorithmically generated continuous playback based on your listening history.' },
  { icon: Download, title: 'Offline Downloads', desc: 'Save your favorite tracks and playlists directly to your device for offline listening.' }
]

const steps = [
  { num: '1', title: 'Connect Node', desc: 'Link your Telegram account securely. We only use it as your personal storage vault.' },
  { num: '2', title: 'Upload & Organize', desc: 'Drag and drop files, create directories, or import existing Telegram media instantly.' },
  { num: '3', title: 'Stream & Share', desc: 'Listen to music in 320kbps or generate secure links to share your files globally.' },
]

const plans = [
  { name: 'Starter', price: '₹0', storage: '10GB Volume', duration: 'Forever', features: ['10GB Storage Limit', '2 Hours/mo Music Streaming', 'Standard Upload Speeds', 'Ad-Supported'] },
  { name: 'Pro Monthly', price: '₹49', storage: 'Unmetered Volume', duration: '/ month', features: ['Unlimited Storage', 'Unlimited Hi-Fi Streaming', 'Max Network Speeds', 'Zero Advertisements'], recommended: true },
  { name: 'Pro Bi-Annual', price: '₹249', storage: 'Unmetered Volume', duration: '/ 6 months', features: ['Unlimited Storage', 'Unlimited Hi-Fi Streaming', 'Zero Advertisements', 'Save 15% Annually'] },
  { name: 'Pro Annual', price: '₹499', storage: 'Unmetered Volume', duration: '/ year', features: ['Unlimited Storage', 'Unlimited Hi-Fi Streaming', 'VIP Node Routing', 'Maximum Value'] },
]

const faqs = [
  { q: "Is the music streaming really 320kbps?", a: "Yes. For our Pro users, the integrated music player streams audio at the highest available fidelity (320kbps) without any artificial compression, rivaling dedicated platforms like Spotify or Apple Music." },
  { q: "How is my data stored securely?", a: "Telecloud acts as a sophisticated bridge. Your files are encrypted and routed directly into your personal Telegram account's 'Saved Messages' or dedicated channels. We do not store your files on our servers." },
  { q: "What happens when my Pro subscription expires?", a: "Your files are never deleted. You will be downgraded to the Starter tier. You won't be able to upload new files if you are over the 10GB limit, and your music streaming will be capped at 2 hours per month." },
  { q: "Is storage truly unlimited?", a: "Yes. By utilizing Telegram's infrastructure, Pro users face no artificial caps on how much data they can store in their vault." },
  { q: "Can I download my entire music playlist?", a: "Absolutely. You can download individual tracks, entire folders, or full playlists as a single ZIP archive for offline listening." }
]

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } } }

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200/60 dark:border-zinc-800/60 rounded-xl overflow-hidden mb-3 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-colors bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left focus:outline-none">
        <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{q}</span>
        <ChevronDown size={16} className={`text-indigo-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="px-5 pb-5 text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed font-medium">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)

  // ✅ THE FIX: Apply dark class to <html> so ALL Tailwind dark: variants work correctly,
  // including fixed/absolute elements that escape a wrapper div's stacking context.
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 20)
    })
  }, [scrollY])

  return (
    // ✅ Removed the outer wrapper <div className={dark ? 'dark' : ''}> — no longer needed
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0c] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative transition-colors duration-300">
      <GridBackground />

      {/* ── Modern Floating Pill Navbar ────────────────────────────────── */}
      <motion.header 
        className={`fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[920px] px-3.5 transition-all duration-300 sm:top-3 sm:px-5`}
      >
        <div className={`flex h-12 items-center justify-between rounded-[1.2rem] px-3.5 transition-all duration-300 sm:rounded-full sm:px-5 
          ${isScrolled 
            ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-lg shadow-black/5' 
            : 'bg-transparent border border-transparent'
          }`}
        >
          <Link to="/" className="flex items-center gap-3">
            <TelecloudLogo iconSize={16} textSize="text-base" />
          </Link>
          
          <nav className="hidden items-center gap-5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 md:flex">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#music" className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
              <Music size={12} className="text-indigo-500"/> Studio Player
            </a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-zinc-800/50 transition-colors text-zinc-500 dark:text-zinc-400 flex items-center justify-center"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 hidden sm:block mx-1" />

            {user ? (
              <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full transition-all active:scale-95 shadow-sm">
                Workspace <ArrowRight size={12} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors">Log in</Link>
                <Link to="/register" className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full transition-all active:scale-95 shadow-sm">
                  Deploy Free
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center px-5 pb-12 pt-[7rem]">
        <div className="relative z-10 mx-auto max-w-[840px] text-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer} className="flex flex-col items-center space-y-5">
            
            <motion.div variants={fadeUp}>
              <a href="#footer-stackx" className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white/50 px-3.5 py-1 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800">
                <StackXLogo size={14} />
                <span className="text-[10px] font-bold tracking-wide text-gray-600 dark:text-zinc-300">
                  A flagship product by <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline">StackX Lab</span> →
                </span>
              </a>
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-3xl font-black leading-[1.03] tracking-tighter text-gray-900 dark:text-white md:text-[3.25rem] lg:text-[3.95rem]">
              Institutional Storage, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-indigo-500">
                Studio-Grade Streaming.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="mx-auto max-w-xl text-[13px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-sm">
              Deploy unlimited cloud storage utilizing Telegram's infrastructure. Access high-fidelity 320kbps music instantly without artificial caps or compression.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex w-full flex-col items-center justify-center gap-2.5 pt-3 sm:w-auto sm:flex-row">
              <Link to={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                <button className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all active:scale-95 hover:bg-emerald-400 sm:w-auto">
                  {user ? 'Open Workspace' : 'Start Building'} <ArrowRight size={14} />
                </button>
              </Link>
              <a href="#music" className="w-full sm:w-auto">
                <button className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-[13px] font-bold text-gray-900 shadow-sm transition-all active:scale-95 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 sm:w-auto">
                  <Music size={14} /> Explore Audio Player
                </button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Core Features Grid ────────────────────────────────────────── */}
      <section id="features" className="relative z-10 border-y border-gray-200/50 bg-white/40 px-5 py-[4.5rem] backdrop-blur-2xl dark:border-white/5 dark:bg-[#0a0a0c]/40">
        <div className="mx-auto max-w-[1040px]">
          <div className="mb-12 text-center">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">Unified Infrastructure</h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">The ultimate media vault.</h3>
          </div>
          
          <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div key={i} variants={fadeUp} className="group rounded-[1.25rem] border border-gray-200/60 bg-white/80 p-5 shadow-sm transition-colors hover:border-indigo-500/40 dark:border-white/5 dark:bg-zinc-900/60 dark:hover:border-indigo-500/40">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-indigo-100 bg-indigo-50 transition-transform group-hover:scale-105 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                  <feature.icon size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="mb-2 text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">{feature.title}</h4>
                <p className="text-[11px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Ad Break */}
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="overflow-hidden rounded-[1.4rem] border border-gray-200/50 bg-white/50 p-1.5 shadow-sm backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/50">
          <AdBanner formatId="2018497" />
        </div>
      </div>

      {/* ── Studio Player Spotlight ─────────────────────────────── */}
      <section id="music" className="relative z-10 overflow-hidden px-5 py-[4.5rem]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 dark:via-emerald-500/5 to-transparent pointer-events-none" />
        
        <div className="mx-auto grid max-w-[1040px] items-center gap-8 md:grid-cols-2 md:gap-10">
          
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
            <div>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-50 px-2.5 py-0.75 text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Disc3 size={12} className="animate-spin-slow"/> Spotify Alternative
              </span>
              <h2 className="text-[2rem] font-black leading-[1.08] tracking-tight text-gray-900 dark:text-white md:text-[2.5rem]">
                Your personal, <br className="hidden md:block"/> ad-free audio studio.
              </h2>
              <p className="mt-3 max-w-md text-[13px] font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
                Ditch the monthly music subscriptions. Telecloud Pro includes a native, high-fidelity music player with infinite streaming, curated playlists, and offline downloads.
              </p>
            </div>

            <div className="space-y-4">
              {musicFeatures.map((feat, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-800">
                    <feat.icon size={16} className="text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">{feat.title}</h4>
                    <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Player Mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="w-full relative">
            <div className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-tr from-emerald-500 to-indigo-500 opacity-20 blur-[50px] dark:opacity-30" />
            
            <div className="relative mx-auto flex max-w-sm flex-col gap-4 rounded-[1.5rem] border border-white/50 bg-white/90 p-5 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0a0a0c]/90">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">Now Playing</span>
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.75 text-[8px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">320kbps</span>
              </div>
              
              <div className="group relative aspect-square w-full overflow-hidden rounded-[1.2rem] bg-zinc-800 bg-[url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center shadow-md">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
              
              <div className="px-1">
                <h5 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Starboy</h5>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">The Weeknd, Daft Punk</p>
              </div>
              
              <div className="space-y-2 px-1">
                <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-1/3 rounded-full relative" />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                  <span>1:18</span>
                  <span>3:50</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-2">
                <Shuffle size={18} className="text-zinc-400" />
                <SkipBack size={24} className="text-gray-900 dark:text-white fill-current" />
                <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 cursor-pointer hover:scale-105 transition-transform">
                  <Pause size={24} className="fill-current" />
                </div>
                <SkipForward size={24} className="text-gray-900 dark:text-white fill-current" />
                <Repeat size={18} className="text-zinc-400" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative z-10 bg-white/40 dark:bg-[#0a0a0c]/40 backdrop-blur-2xl border-y border-gray-200/50 dark:border-white/5">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">Workflow</h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Three steps to infinite storage.</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white dark:bg-zinc-950 rounded-[1.5rem] border-[4px] border-gray-50 dark:border-zinc-900 flex items-center justify-center mb-5 relative z-10 shadow-md">
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{step.num}</span>
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">{step.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed px-4">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="pt-24 pb-12 px-6 relative z-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">Pricing</h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Unmetered resources. Simple tiers.</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className={`relative flex flex-col bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-8 transition-all
                  ${plan.recommended 
                    ? 'border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 xl:-translate-y-2' 
                    : 'border border-gray-200/60 dark:border-white/5 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:shadow-md'
                  }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                    <span className="bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">Recommended</span>
                  </div>
                )}
                
                <h4 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-2">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-xs font-bold text-zinc-400">{plan.duration}</span>
                </div>
                
                <div className="flex items-center gap-3 mb-8 px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
                  <HardDrive size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">{plan.storage}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs font-medium text-gray-700 dark:text-zinc-300">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to={user ? "/pricing" : "/register"} className="w-full mt-auto">
                  <button className={`w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95
                    ${plan.recommended 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md' 
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-white'
                    }`}>
                    Deploy {plan.name}
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-[1.5rem] p-6 flex gap-4 backdrop-blur-md">
              <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-1.5 tracking-tight">Your Data Never Expires</h4>
                <p className="text-xs font-medium text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                  When paid plans end, we <strong>never delete your data</strong>. We only restrict access. Renew at any time to instantly unlock your vault. Your files are safe on our side forever.
                </p>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-[1.5rem] p-6 flex gap-4 backdrop-blur-md">
              <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1.5 tracking-tight">Telegram Inactivity Warning</h4>
                <p className="text-xs font-medium text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                  Telecloud uses your Telegram account for storage. If your Telegram account gets closed, banned, or is inactive for more than 6 months, Telegram data loss may take place. We are not responsible for data lost due to Telegram account termination.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 relative z-10 bg-white/40 dark:bg-[#0a0a0c]/40 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-2">Support</h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Frequently Asked Questions</h3>
          </div>
          
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── StackX Lab Pre-Footer ────────────────────── */}
      <section id="footer-stackx" className="py-20 px-6 relative z-10 bg-white/60 dark:bg-[#0a0a0c]/60 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/5">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
            <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 dark:border-white/5 shrink-0">
               <StackXLogo size={32} />
            </div>
            <div className="max-w-xl">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Stack<span className="text-indigo-500">X</span> Lab</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                A developer startup building innovative, high-performance applications. Telecloud is proudly developed and maintained as one of our flagship products.
              </p>
            </div>
          </div>
          <a href="mailto:sameetpisal@gmail.com" className="w-full md:w-auto">
            <button className="w-full md:w-auto px-6 py-3 rounded-full border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white font-bold text-sm hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors shadow-sm">
              Contact StackX Lab
            </button>
          </a>
        </div>
      </section>

      {/* ── Main Footer ────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 relative z-10 bg-[#fafafa] dark:bg-[#09090b] border-t border-gray-200/50 dark:border-white/5">
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <TelecloudLogo iconSize={14} textSize="text-base" />
          
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/terms" className="text-xs font-bold text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="text-xs font-bold text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
          </div>

          <div className="text-xs font-bold text-zinc-400">
            © {new Date().getFullYear()} StackX Lab. All rights reserved.
          </div>
          
        </div>
      </footer>
    </div>
  )
}
