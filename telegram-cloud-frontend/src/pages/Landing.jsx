import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud, Shield, Zap, FolderOpen, Share2, Search, ArrowRight, CheckCircle,
  Download, Image as ImageIcon, Check, ChevronDown, Mail, Send
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Shield, title: 'Secure File Storage', desc: 'Files stored securely in Telegram with robust encryption and privacy.' },
  { icon: Share2, title: 'Advanced sharing', desc: 'Generate secure sharing links with expiry dates, passwords, and download limits.' },
  { icon: Download, title: 'Drag & Drop Management', desc: 'Intuitively upload and manage files with native drag-and-drop gestures.' },
  { icon: ImageIcon, title: 'Rich File Preview', desc: 'Instantly view images, play videos, and read PDFs directly in the browser.' },
  { icon: FolderOpen, title: 'Smart Organization', desc: 'Nest folders intuitively and apply color-coding for maximum clarity.' },
  { icon: Zap, title: 'Folder ZIP Download', desc: 'Download entire folders as a single ZIP file instantly with one click.' },
]

const steps = [
  { num: '01', title: 'Upload', desc: 'Securely upload your files. Your files are automatically streamed and stored into Telegram.' },
  { num: '02', title: 'Organize', desc: 'Create folders, color-code directories, and manage your nested files neatly.' },
  { num: '03', title: 'Share', desc: 'Generate public links with strict access controls to collaborate instantly.' },
]

const plans = [
  { name: 'Free Plan', price: '₹0', storage: '10GB Storage', duration: 'Forever', features: ['All standard features', 'Normal upload speeds'] },
  { name: 'Monthly', price: '₹49', storage: 'Unlimited Storage', duration: '/ month', features: ['All Pro features', 'Max upload speeds', 'No limits'], recommended: true },
  { name: '6 Months', price: '₹249', storage: 'Unlimited Storage', duration: '/ 6 months', features: ['All Pro features', 'Max upload speeds', 'Save 15%'] },
  { name: 'Yearly', price: '₹499', storage: 'Unlimited Storage', duration: '/ year', features: ['All Pro features', 'Max upload speeds', 'Best Value'] },
]

const faqs = [
  { q: "What happens when my subscription expires?", a: "Your data is सुरक्षित (safe) and not deleted. You will not be able to access, download, or share files until you renew." },
  { q: "Will my files be deleted if I don't renew?", a: "No. All files remain completely secure and will be restored instantly after renewal." },
  { q: "How is my data stored and is it permanently guaranteed?", a: "To provide blazing fast, unmetered storage, TeleCloud acts as a secure bridge to Telegram's infrastructure. Your files remain available as long as your Telegram account is active and in good standing. Note that TeleCloud is not a guaranteed permanent backup solution—data may be lost if Telegram inherently deletes your account due to extreme inactivity (e.g., 6+ months) or policy violations." },
  { q: "Is storage really unlimited?", a: "Yes, for our paid plans. There are no artificial caps on how much you can upload." },
  { q: "How secure is my data?", a: "Extremely secure. Your files are encrypted and securely stored using Telegram's battle-tested infrastructure." },
  { q: "Can I share files securely?", a: "Absolutely! You can protect shared links with passwords, set expiry dates, and restrict total downloads." },
  { q: "Can I download folders?", a: "Yes, you can easily download entire folders as zipped archives with a single click." }
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden mb-3 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-gray-900">
        <span className="font-semibold text-gray-900 dark:text-white">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-gray-50 dark:bg-gray-800/50">
            <p className="p-5 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 scroll-smooth">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
              <Cloud size={16} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">TeleCloud</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-sm flex items-center gap-1.5">
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm hidden sm:block">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-brand-100 dark:border-brand-800">
              <Zap size={14} /> SaaS Excellence
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
              Smart Cloud Storage <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-purple-500">
                Powered by Telegram.
              </span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Store, share, and manage your files securely with unlimited potential. Experience fluid drag-and-drop, rich previews, and enterprise-grade infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-brand-500/25">
                    Enter Dashboard <ArrowRight size={18} className="ml-1" />
                  </motion.button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-brand-500/25">
                      Get Started <ArrowRight size={18} className="ml-1" />
                    </motion.button>
                  </Link>
                  <a href="#pricing">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="btn-secondary text-base px-8 py-3.5">
                      View Pricing
                    </motion.button>
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 bg-gray-50/50 dark:bg-gray-900/20 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Powerful Features</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Designed for professionals. Built on a rock-solid foundation with everything you need out of the box.</p>
          </div>
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={item} className="card p-8 bg-white dark:bg-gray-900 hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-800">
                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-6">
                  <Icon size={24} className="text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 layout-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
          <p className="text-gray-500 dark:text-gray-400">Adopt a workflow that feels native.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-gray-100 via-brand-200 to-gray-100 dark:from-gray-800 dark:via-brand-800 dark:to-gray-800" />

          {steps.map((s, i) => (
            <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} viewport={{ once: true }} className="relative text-center">
              <div className="w-24 h-24 mx-auto bg-white dark:bg-gray-950 rounded-full border-8 border-gray-50 dark:border-gray-900 flex items-center justify-center mb-6 relative z-10 shadow-sm">
                <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">{s.num}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{s.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Subscription Logic Banner ────────────────────────────────── */}
      <section className="py-12 px-4 bg-amber-50 dark:bg-amber-900/10 border-y border-amber-100 dark:border-amber-900/30">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-16 h-16 shrink-0 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
            <Shield size={28} className="text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-2">Important Note on Subscriptions</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-200/70">
              We never delete your data. If your subscription expires, your files remain <strong>सुरक्षित (securely stored)</strong>. Access and sharing will be temporarily disabled until you renew your subscription.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 bg-gray-50 dark:bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 dark:text-gray-400">Unlock infinite possibilities with unmetered storage.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            {plans.map((p) => (
              <motion.div key={p.name} whileHover={{ y: -8 }} className={`p-8 rounded-3xl bg-white dark:bg-gray-900 border ${p.recommended ? 'border-brand-500 ring-4 ring-brand-500/10 shadow-xl' : 'border-gray-200 dark:border-gray-800'}`}>
                {p.recommended && <span className="inline-block px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-wider rounded-full mb-4">Recommended</span>}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{p.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{p.duration}</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Cloud size={18} className={p.recommended ? "text-brand-500" : "text-gray-400"} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.storage}</span>
                  </div>
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <Check size={18} className="text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>
                <Link to={user ? "/pricing" : "/login"}>
                  <button className={`w-full py-3 rounded-xl font-semibold transition-colors ${p.recommended ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}>
                    Choose Plan
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            *Storage relies on Telegram's secure infrastructure. By using TeleCloud, you acknowledge that file availability is tied to your Telegram account's active status.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-500 dark:text-gray-400">Got questions? We've got answers.</p>
          </div>
          <div>
            {faqs.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Section ──────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center bg-white dark:bg-gray-900 p-8 md:p-12 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Get in touch</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Have a question forming in your mind? Reach out to us, and we'll get back to you as soon as possible.</p>
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-medium">sameetpisal@gmail.com</span>
            </div>
          </div>
          <div className="flex-1 w-full bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Thanks for reaching out! We'll get back to you shortly.") }}>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input required type="text" className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input required type="email" className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea required rows={4} className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 py-3" placeholder="How can we help?" />
              </div>
              <button type="submit" className="w-full btn-primary justify-center">
                Send Message <Send size={16} className="ml-2" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex flex-col gap-4 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center">
                <Cloud size={12} className="text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">TeleCloud</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Disclaimer: TeleCloud utilizes Telegram's infrastructure for storage. Data remains available as long as your Telegram account is active. TeleCloud acts as a bridge and is not a guaranteed permanent backup solution.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-gray-900 dark:text-white font-semibold text-sm">Product</span>
              <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Features</a>
              <a href="#pricing"  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Pricing</a>
              <a href="#faq"      className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">FAQ</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-gray-900 dark:text-white font-semibold text-sm">Company</span>
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms"   className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Terms of Service</Link>
              <a href="#contact"  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-100 dark:border-gray-900">
          <p className="text-sm text-gray-400 text-center md:text-left">© {new Date().getFullYear()} TeleCloud. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
