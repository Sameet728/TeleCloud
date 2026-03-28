import { AlertTriangle } from 'lucide-react'
import ModalShell from './ui/ModalShell'
import AppButton from './ui/AppButton'

export default function DeleteConfirmModal({ open, title, message, onConfirm, onClose, loading }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={AlertTriangle}
      iconClassName="text-red-500 dark:text-red-400"
      title={title}
      subtitle="This action cannot be undone"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <p className="rounded-[1.6rem] border border-red-100 bg-red-50/80 p-4 text-sm font-medium leading-relaxed text-zinc-700 dark:border-red-500/10 dark:bg-red-500/5 dark:text-zinc-300">
          {message}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <AppButton variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="danger" fullWidth loading={loading} onClick={onConfirm}>
            Delete Permanently
          </AppButton>
        </div>
      </div>
    </ModalShell>
  )
}
