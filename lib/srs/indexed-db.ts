"use client";

export interface MirrorCard {
  id: string;
  userId: string;
  exerciseId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string;
  lapses: number;
}

const DB_NAME = "elp-srs";
const STORE = "cards";

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

async function getDB(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("userId_dueDate", ["userId", "dueDate"]);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function mirrorPut(card: MirrorCard): Promise<void> {
  if (!hasIndexedDB()) {
    try {
      const key = `elp-srs-${card.id}`;
      localStorage.setItem(key, JSON.stringify(card));
    } catch {}
    return;
  }
  const db = await getDB();
  if (!db) return;
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(card);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function mirrorGetDue(userId: string, todayISO: string): Promise<MirrorCard[]> {
  if (!hasIndexedDB()) {
    const out: MirrorCard[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith("elp-srs-")) continue;
        const c = JSON.parse(localStorage.getItem(k)!) as MirrorCard;
        if (c.userId === userId && c.dueDate <= todayISO) out.push(c);
      }
    } catch {}
    return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  const db = await getDB();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result as MirrorCard[];
      resolve(all.filter((c) => c.userId === userId && c.dueDate <= todayISO).sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function mirrorGetAll(userId: string): Promise<MirrorCard[]> {
  if (!hasIndexedDB()) {
    const out: MirrorCard[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith("elp-srs-")) continue;
        const c = JSON.parse(localStorage.getItem(k)!) as MirrorCard;
        if (c.userId === userId) out.push(c);
      }
    } catch {}
    return out;
  }
  const db = await getDB();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as MirrorCard[]).filter((c) => c.userId === userId));
    req.onerror = () => reject(req.error);
  });
}

export async function mirrorClear(): Promise<void> {
  if (!hasIndexedDB()) return;
  const db = await getDB();
  if (!db) return;
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
