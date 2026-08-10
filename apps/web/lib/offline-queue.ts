"use client";

/**
 * IndexedDB queue for Field Ops mutations when offline.
 * Flushes when the browser comes back online.
 */

const DB_NAME = "ibtech-offline";
const STORE = "mutations";

export type QueuedMutation = {
  id: string;
  createdAt: string;
  method: "PATCH" | "POST";
  path: string;
  body: unknown;
  label: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueMutation(input: Omit<QueuedMutation, "id" | "createdAt">) {
  const db = await openDb();
  const row: QueuedMutation = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return row;
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedMutation[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedMutation(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushQueuedMutations(postJson: (method: string, path: string, body: unknown) => Promise<void>) {
  const rows = await listQueuedMutations();
  let flushed = 0;
  for (const row of rows) {
    await postJson(row.method, row.path, row.body);
    await removeQueuedMutation(row.id);
    flushed++;
  }
  return flushed;
}

export function isProbablyOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
