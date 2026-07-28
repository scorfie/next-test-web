export type StoredFile = {
  buffer: Buffer;
  filename: string;
  createdAt: number;
};

const FILE_TTL_MS = 10 * 60 * 1000;

// Keep the store on globalThis so it survives Next.js dev-mode hot reloads,
// which would otherwise re-evaluate this module and wipe the Map.
const globalForStore = globalThis as unknown as {
  __memoryFileStore?: Map<string, StoredFile>;
};

const store = globalForStore.__memoryFileStore ?? new Map<string, StoredFile>();
globalForStore.__memoryFileStore = store;

function sweepExpired() {
  const now = Date.now();
  for (const [id, file] of store) {
    if (now - file.createdAt > FILE_TTL_MS) {
      store.delete(id);
    }
  }
}

export function putFile(id: string, file: StoredFile) {
  sweepExpired();
  store.set(id, file);
}

export function getFile(id: string): StoredFile | undefined {
  sweepExpired();
  return store.get(id);
}
