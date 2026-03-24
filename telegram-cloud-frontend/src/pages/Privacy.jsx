import { Shield, Lock, Eye, Database, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            ← Back to TeleCloud
          </Link>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <main className="pt-32 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
            <Lock size={28} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed">
            
            <p>
              At TeleCloud, your privacy isn't just a policy—it's the core of how our platform is engineered. We utilize Telegram's robust, secure infrastructure as our underlying storage engine to ensure your data is handled with maximum security.
            </p>

            <h2>1. Information We Collect</h2>
            <p>
              <strong>Account Information:</strong> When you register for TeleCloud, we collect basic details such as your email address and password to secure your account. 
            </p>
            <p>
              <strong>Telegram Integration:</strong> To provide our core service, you must link your Telegram account. We only collect the minimal session keys required to interface with Telegram's API on your behalf. We <strong>do not</strong> read your personal chats, contacts, or messages.
            </p>
            <p>
              <strong>File Metadata:</strong> To render your dashboard rapidly, we track high-level metadata such as file names, sizes, creation dates, and MIME types. The actual file contents are stored strictly within your personal Telegram "Saved Messages" or channels.
            </p>

            <h2>2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
              <li>To provide, operate, and maintain exactly the cloud storage capabilities you requested.</li>
              <li>To securely route your file uploads and downloads between your browser and Telegram's infrastructure.</li>
              <li>To send you critical transactional emails, such as subscription confirmations and account security alerts.</li>
            </ul>

            <h2>3. Our Relationship with Telegram</h2>
            <p>
              TeleCloud strictly acts as a bridging interface. Your files are uploaded directly to Telegram's highly secured, globally distributed data centers. Because TeleCloud acts as a client interfacing with your Telegram account, the physical security and data retention of your files are ultimately governed by <a href="https://telegram.org/privacy" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">Telegram's Privacy Policy</a>. 
            </p>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>
              <strong>We never sell your data.</strong> We do not share your personal information, files, or metadata with any third-party marketing, tracking, or advertising networks. TeleCloud will only disclose information if strictly required by lawful subpoenas or explicit legal obligations.
            </p>

            <h2>5. Your Rights & Deletion</h2>
            <p>
              You maintain total sovereignty over your data.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
              <li>You can explicitly disconnect your Telegram account from TeleCloud at any time via your Profile settings, immediately destroying the session key from our databases.</li>
              <li>Deleting a file from TeleCloud invokes a permanent deletion command directly to Telegram's servers.</li>
              <li>You may request complete erasure of your TeleCloud account at any time by contacting our support team.</li>
            </ul>

            <h2>6. Contact Us</h2>
            <p>
              If you have any questions or concerns about how we handle your privacy, please feel free to reach out to us at <strong>sameetpisal@gmail.com</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
