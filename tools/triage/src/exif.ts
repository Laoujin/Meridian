import exifr from 'exifr';

export interface ExifData {
  date: Date | null;
  gps: { lat: number; lng: number } | null;
}

export async function readExif(path: string): Promise<ExifData> {
  try {
    const tags = await exifr.parse(path, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });
    if (!tags) return { date: null, gps: null };
    const date: Date | null = tags.DateTimeOriginal ?? tags.CreateDate ?? null;
    const gps = (typeof tags.latitude === 'number' && typeof tags.longitude === 'number')
      ? { lat: tags.latitude, lng: tags.longitude }
      : null;
    return { date, gps };
  } catch {
    return { date: null, gps: null };
  }
}
