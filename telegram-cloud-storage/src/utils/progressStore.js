/**
 * utils/progressStore.js — In-memory SSE upload progress store
 * Maps uploadId → { progress: number, clients: Set<res> }
 */

const store = new Map();

const create = (uploadId) => {
  store.set(uploadId, { progress: 0, status: "pending", clients: new Set() });
};

const update = (uploadId, progress, status = "uploading") => {
  if (!store.has(uploadId)) return;
  const entry = store.get(uploadId);
  entry.progress = Math.round(progress);
  entry.status   = status;
  // Push to all connected SSE clients
  entry.clients.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify({ progress: entry.progress, status })}\n\n`);
    } catch (_) {}
  });
};

const complete = (uploadId) => {
  update(uploadId, 100, "complete");
  // Cleanup after 30 s
  setTimeout(() => store.delete(uploadId), 30_000);
};

const fail = (uploadId, error = "Upload failed") => {
  if (!store.has(uploadId)) return;
  const entry = store.get(uploadId);
  entry.clients.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify({ progress: entry.progress, status: "error", error })}\n\n`);
    } catch (_) {}
  });
  setTimeout(() => store.delete(uploadId), 5_000);
};

const addClient = (uploadId, res) => {
  if (!store.has(uploadId)) create(uploadId);
  store.get(uploadId).clients.add(res);
};

const removeClient = (uploadId, res) => {
  if (store.has(uploadId)) store.get(uploadId).clients.delete(res);
};

const get = (uploadId) => store.get(uploadId) || null;

module.exports = { create, update, complete, fail, addClient, removeClient, get };
