import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readdirSync, readFileSync, statSync, createReadStream } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const defaultDataDir = resolve(repoRoot, 'data')

const MEMORIES_VIRTUAL = 'virtual:meridian-memories'
const MEMORIES_RESOLVED = '\0' + MEMORIES_VIRTUAL

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.flac': 'audio/flac',
}

// Synthesize a virtual module that concatenates every memories*.json under
// the chosen data dir. The loader does `import memories from 'virtual:meridian-memories'`
// and gets a single Memory[] regardless of how the dataset is sharded.
// Also redirects `data/story.json` imports to the override folder when present
// (so themed copy travels with the dataset).
function meridianMemoriesPlugin(root: string, isOverride: boolean): Plugin {
  return {
    name: 'meridian-memories',
    enforce: 'pre',
    resolveId(id) {
      if (id === MEMORIES_VIRTUAL) return MEMORIES_RESOLVED
      if (!isOverride) return
      const normalized = id.replace(/\\/g, '/')
      if (normalized.endsWith('/data/story.json')) {
        const overrideStory = resolve(root, 'story.json')
        if (existsSync(overrideStory)) return overrideStory
      }
    },
    load(id) {
      if (id !== MEMORIES_RESOLVED) return
      const files = readdirSync(root)
        .filter((f) => /^memories.*\.json$/.test(f))
        .sort()
      const all = files.flatMap((f) =>
        JSON.parse(readFileSync(resolve(root, f), 'utf-8')) as unknown[],
      )
      return `export default ${JSON.stringify(all)};`
    },
  }
}

// Serves any file under MERIDIAN_DATA when its URL path matches a real file
// there. Falls through to Vite's normal public-dir lookup for anything not
// in the override root, so demo-only assets (favicons, etc.) keep working.
// Only intercepts URLs with a known media/static extension to avoid clashing
// with Vite internals (/@vite/client, /src/..., /node_modules/...).
function meridianMediaPlugin(root: string): Plugin {
  return {
    name: 'meridian-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (!url) return next()
        const ext = extname(url).toLowerCase()
        if (!MIME[ext]) return next()
        const file = resolve(root, '.' + decodeURIComponent(url))
        if (!file.startsWith(root) || !existsSync(file)) return next()
        const stat = statSync(file)
        if (!stat.isFile()) return next()
        res.setHeader('Content-Type', MIME[ext])
        res.setHeader('Content-Length', stat.size)
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// MERIDIAN_DATA points at a folder containing memories*.json + photos/ + videos/ + music/.
// Resolved from the worktree root, so MERIDIAN_DATA=data/caro works from any cwd.
// Read from process.env (shell) and/or .env.local (Vite convention, gitignored).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, __dirname, ''), ...process.env }
  const dataDir = env.MERIDIAN_DATA?.trim()
  const root = dataDir ? resolve(repoRoot, dataDir) : defaultDataDir
  return {
    plugins: [
      react(),
      meridianMemoriesPlugin(root, !!dataDir),
      ...(dataDir ? [meridianMediaPlugin(root)] : []),
    ],
  }
})
