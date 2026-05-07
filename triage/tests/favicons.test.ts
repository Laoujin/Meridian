import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listFavicons } from '../src/favicons';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'favs-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('listFavicons', () => {
  it('returns sorted image files', () => {
    writeFileSync(join(dir, 'rings.svg'), '');
    writeFileSync(join(dir, 'meridian.svg'), '');
    writeFileSync(join(dir, 'watercolour.png'), '');
    expect(listFavicons(dir)).toEqual(['meridian.svg', 'rings.svg', 'watercolour.png']);
  });

  it('skips non-image files', () => {
    writeFileSync(join(dir, 'rings.svg'), '');
    writeFileSync(join(dir, 'README.md'), '');
    writeFileSync(join(dir, 'site.webmanifest'), '');
    expect(listFavicons(dir)).toEqual(['rings.svg']);
  });

  it('returns empty when missing', () => {
    expect(listFavicons(join(dir, 'nope'))).toEqual([]);
  });
});
