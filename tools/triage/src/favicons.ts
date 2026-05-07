import { existsSync, readdirSync } from 'node:fs';

const FAVICON_RX = /\.(svg|png|ico|jpe?g|webp)$/i;

export function listFavicons(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(n => FAVICON_RX.test(n)).sort();
}
