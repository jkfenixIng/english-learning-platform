export function createSeededRng(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 2 ** 31)
    throw new Error(`INVALID_SEED: ${seed} must be integer 0..2147483648`);
  let a = seed >>> 0;
  function nextFloat() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function nextInt(min: number, max: number) {
    if (min > max) [min, max] = [max, min];
    return Math.floor(nextFloat() * (max - min + 1)) + min;
  }
  function shuffle<T>(arr: T[]) {
    const o = [...arr];
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(nextFloat() * (i + 1));
      [o[i], o[j]] = [o[j]!, o[i]!];
    }
    return o;
  }
  function pick<T>(arr: T[]) {
    if (!arr.length) throw new Error("pick: empty array");
    return arr[Math.floor(nextFloat() * arr.length)]!;
  }
  function next() {
    return nextFloat();
  }
  return { next, nextFloat, nextInt, shuffle, pick, getSeed: () => seed };
}
export type SeededRng = ReturnType<typeof createSeededRng>;
export const seededRng = createSeededRng;
export function mulberry32(s: number) {
  return createSeededRng(s).nextFloat;
}
