import { useEffect, useState } from 'react'
import { Folder } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { foldersAPI } from '../services/api'
import ModalShell from './ui/ModalShell'
import AppButton from './ui/AppButton'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6']

export default function CreateFolderModal({ open, parentFolderId, onClose, existingFolder }) {
  const qc = useQueryClient()
  const [name, setName] = useState(existingFolder?.name || '')
  const [color, setColor] = useState(existingFolder?.color || COLORS[0])
  const [loading, setLoading] = useState(false)
  const editing = !!existingFolder

  useEffect(() => {
    if (!open) return
    setName(existingFolder?.name || '')
    setColor(existingFolder?.color || COLORS[0])
  }, [existingFolder, open])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    try {
      if (editing) {
        await foldersAPI.update(existingFolder._id, { name, color })
        toast.success('Folder renamed')
      } else {
        await foldersAPI.create({ name, parentFolderId: parentFolderId || null, color })
        toast.success('Folder created')
      }
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['folder'] })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={Folder}
      iconClassName="text-indigo-500 dark:text-indigo-300"
      title={editing ? 'Rename Folder' : 'Create New Folder'}
      subtitle={editing ? 'Update the folder name and color theme.' : 'Spin up a new directory with a polished color identity.'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/40 shadow-inner transition-transform duration-300 hover:scale-105 dark:border-white/10"
            style={{ background: `linear-gradient(135deg, ${color}18, ${color}35)` }}
          >
            <Folder size={44} style={{ color }} fill={color} fillOpacity={0.28} />
          </div>
        </div>

        <div>
          <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Folder Name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            placeholder="My Documents"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-3 block pl-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Color Theme
          </label>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {COLORS.map((shade) => {
              const active = color === shade
              return (
                <button
                  key={shade}
                  type="button"
                  onClick={() => setColor(shade)}
                  className={`relative h-11 rounded-[1.2rem] transition-transform ${active ? 'scale-105 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#12141b]' : 'hover:scale-[1.03]'}`}
                  style={{ background: shade, ringColor: shade }}
                >
                  {active ? <span className="absolute inset-0 rounded-[1.2rem] border border-white/70" /> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <AppButton variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton fullWidth loading={loading} disabled={!name.trim()} type="submit">
            {editing ? 'Save Changes' : 'Create Folder'}
          </AppButton>
        </div>
      </form>
    </ModalShell>
  )
}
