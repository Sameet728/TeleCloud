import { FileText, Cloud } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Terms() {
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
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-6">
            <FileText size={28} className="text-brand-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Terms and Conditions</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-10 prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed">
            
            <p>
              Welcome to TeleCloud! Please read these Terms of Service ("Terms", "Terms of Service") carefully before using our website and platform operated by TeleCloud ("us", "we", or "our").
            </p>
            <p>
              By accessing or using the platform, you agree to be bound by these Terms. If you disagree with any part of the terms, you must not access the service.
            </p>

            <h2>1. Service Description & Infrastructure</h2>
            <p>
              TeleCloud provides a modern Software-as-a-Service (SaaS) interface that enables you to upload, organize, and share files. To achieve unmetered storage at high speeds, TeleCloud leverages <strong>Telegram's MTProto API</strong>. 
            </p>
            <p>
              <strong>Data Availability Disclaimer:</strong> TeleCloud acts exclusively as a bridge to Telegram. While we provide the organizational layer, we do not physically host your files. Consequently, TeleCloud is not a guaranteed permanent backup solution. Your data remains completely available and secure as long as:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
              <li>Your underlying Telegram account remains active and in good standing.</li>
              <li>You do not violate Telegram's Terms of Service (such as uploading illegal content or explicit copyright violations).</li>
              <li>Your account is not systematically deleted by Telegram due to extreme inactivity (e.g., failing to log into the Telegram app for over 6-12 months).</li>
            </ul>

            <h2>2. Acceptable Use Policy</h2>
            <p>
              TeleCloud grants you a non-exclusive, non-transferable right to access the service. However, you agree <strong>not</strong> to use the service to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
              <li>Host or distribute illegal files, malware, viruses, or any deeply harmful software.</li>
              <li>Violate the intellectual property rights of any third party.</li>
              <li>Attempt to reverse-engineer, overwhelm, or disrupt TeleCloud's or Telegram's network infrastructure (e.g., establishing abusive automated bots).</li>
            </ul>
            <p>
              Violation of these policies—or Telegram's native Terms of Service—may result in the suspension of your TeleCloud account and the revocation of your shared links.
            </p>

            <h2>3. Subscriptions & Payments</h2>
            <p>
              TeleCloud offers premium subscription plans granting access to unmetered storage features.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
              <li><strong>Billing:</strong> Fees are billed in advance on a recurring basis (e.g., Monthly, 6-Months, Yearly) depending on the plan you select.</li>
              <li><strong>Expiry Details:</strong> If your subscription lapses, TeleCloud <strong>never</strong> deletes your data. However, until your subscription is renewed, interactive capabilities such as file uploading, downloading, and sharing will be temporarily fully restricted.</li>
              <li><strong>Refunds:</strong> All payments are processed securely via our payments provider. Certain refund requests may be honored at our sole discretion, typically within 7 days of purchase if the service is deemed unusable.</li>
            </ul>

            <h2>4. Limitation of Liability</h2>
            <p>
              In no event shall TeleCloud, nor its engineers or partners, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, absolute data loss, resulting from your access to or use of the service.
            </p>
            <p>
              Because your file storage relies physically on your personal Telegram account, we are mathematically incapable of recovering files if Telegram inherently deletes your account due to prolonged inactivity or policy violations. You are strongly advised to keep your Telegram app active periodically.
            </p>

            <h2>5. Changes to the Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time. We will provide at least 15 days' notice prior to any material new terms taking effect. Your continued use of the platform after the new terms become effective constitutes acceptance of the modified Terms.
            </p>

            <h2>6. Contact</h2>
            <p>
              If you have any questions about these Terms, feel free to contact us at <strong>sameetpisal@gmail.com</strong>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
