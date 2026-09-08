"use client";
// Transient audio blob store - memory only (no persistence), optional IndexedDB if opted in

let memoryBlob: Blob | null = null;

export function storeAudioBlob(blob: Blob): void {
  memoryBlob = blob;
}

export function getAudioBlob(): Blob | null {
  return memoryBlob;
}

export function clearAudioBlob(): void {
  memoryBlob = null;
}
