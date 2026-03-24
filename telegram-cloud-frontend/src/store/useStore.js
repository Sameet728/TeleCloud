import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Upload progress map: uploadId -> { progress, status, name }
  uploads: {},
  addUpload: (id, name) =>
    set(s => ({ uploads: { ...s.uploads, [id]: { progress: 0, status: 'pending', name } } })),
  updateUpload: (id, progress, status = 'uploading') =>
    set(s => ({ uploads: { ...s.uploads, [id]: { ...s.uploads[id], progress, status } } })),
  removeUpload: (id) =>
    set(s => {
      const u = { ...s.uploads }; delete u[id]; return { uploads: u }
    }),

  // Selected files for bulk operations
  selected: new Set(),
  toggleSelect: (id) =>
    set(s => {
      const sel = new Set(s.selected)
      sel.has(id) ? sel.delete(id) : sel.add(id)
      return { selected: sel }
    }),
  clearSelected: () => set({ selected: new Set() }),
  selectAll: (ids) => set({ selected: new Set(ids) }),
}))

export default useStore
