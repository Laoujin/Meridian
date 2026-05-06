import { describe, it, expect, beforeEach, mock } from 'bun:test';

let parseMock: ReturnType<typeof mock>;

beforeEach(() => {
  parseMock = mock(() => Promise.resolve({}));
  mock.module('exifr', () => ({ default: { parse: parseMock } }));
});

const { readExif } = await import('../src/exif');

describe('readExif', () => {
  it('returns date from DateTimeOriginal', async () => {
    parseMock.mockResolvedValueOnce({ DateTimeOriginal: new Date('2026-05-06T12:00:00Z') });
    const r = await readExif('/fake.jpg');
    expect(r.date?.toISOString()).toBe('2026-05-06T12:00:00.000Z');
  });

  it('falls back to CreateDate when DateTimeOriginal missing', async () => {
    parseMock.mockResolvedValueOnce({ CreateDate: new Date('2026-01-01T00:00:00Z') });
    const r = await readExif('/fake.jpg');
    expect(r.date?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns gps when latitude+longitude present', async () => {
    parseMock.mockResolvedValueOnce({ latitude: 50.85, longitude: 4.35 });
    const r = await readExif('/fake.jpg');
    expect(r.gps).toEqual({ lat: 50.85, lng: 4.35 });
  });

  it('returns null gps when only one coord present', async () => {
    parseMock.mockResolvedValueOnce({ latitude: 50.85 });
    const r = await readExif('/fake.jpg');
    expect(r.gps).toBeNull();
  });

  it('returns nulls when exifr returns null', async () => {
    parseMock.mockResolvedValueOnce(null);
    expect(await readExif('/fake.jpg')).toEqual({ date: null, gps: null });
  });

  it('returns nulls when exifr throws', async () => {
    parseMock.mockImplementationOnce(() => Promise.reject(new Error('bad file')));
    expect(await readExif('/fake.jpg')).toEqual({ date: null, gps: null });
  });
});
