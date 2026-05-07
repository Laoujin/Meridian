import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setEnvVar } from '../src/env';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'env-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('setEnvVar', () => {
  it('creates the file when missing', () => {
    const p = join(dir, '.env');
    setEnvVar(p, 'FOO', 'bar');
    expect(readFileSync(p, 'utf-8')).toBe('FOO=bar\n');
  });

  it('appends a new key, preserving existing lines', () => {
    const p = join(dir, '.env');
    writeFileSync(p, 'EXISTING=1\n# comment\n');
    setEnvVar(p, 'FOO', 'bar');
    expect(readFileSync(p, 'utf-8')).toBe('EXISTING=1\n# comment\nFOO=bar\n');
  });

  it('updates an existing key in place', () => {
    const p = join(dir, '.env');
    writeFileSync(p, 'FOO=old\nOTHER=2\n');
    setEnvVar(p, 'FOO', 'new');
    expect(readFileSync(p, 'utf-8')).toBe('FOO=new\nOTHER=2\n');
  });

  it('handles file without trailing newline', () => {
    const p = join(dir, '.env');
    writeFileSync(p, 'A=1');
    setEnvVar(p, 'B', '2');
    expect(readFileSync(p, 'utf-8')).toBe('A=1\nB=2\n');
  });

  it('only matches whole keys (not substrings)', () => {
    const p = join(dir, '.env');
    writeFileSync(p, 'FOOBAR=1\n');
    setEnvVar(p, 'FOO', 'bar');
    expect(readFileSync(p, 'utf-8')).toBe('FOOBAR=1\nFOO=bar\n');
  });

  it('does not duplicate when value is unchanged', () => {
    const p = join(dir, '.env');
    setEnvVar(p, 'FOO', 'bar');
    setEnvVar(p, 'FOO', 'bar');
    expect(readFileSync(p, 'utf-8')).toBe('FOO=bar\n');
  });
});
