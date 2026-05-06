// Prefix a public-asset path with Vite's BASE_URL so it resolves both in dev
// (BASE_URL="/") and under a subpath deploy (e.g. "/Meridian/demo/").
export function asset(path: string | undefined | null): string {
  if (!path) return '';
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}
