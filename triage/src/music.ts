import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const AUDIO_RX = /\.(mp3|m4a|wav|flac|ogg|aac)$/i;

export function listMusic(dataDir: string): string[] {
  const musicDir = join(dataDir, 'music');
  if (!existsSync(musicDir)) return [];
  return readdirSync(musicDir).filter(n => AUDIO_RX.test(n)).sort();
}
