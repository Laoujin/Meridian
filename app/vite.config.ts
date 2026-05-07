import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readdirSync, readFileSync, statSync, createReadStream, mkdirSync, copyFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const defaultDataDir = resolve(repoRoot, 'data', 'ny-trip')

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
// Also redirects the canonical `data/ny-trip/story.json` import to the active
// dataset's story.json so themed copy travels with the dataset.
function meridianMemoriesPlugin(root: string): Plugin {
  return {
    name: 'meridian-memories',
    enforce: 'pre',
    resolveId(id) {
      if (id === MEMORIES_VIRTUAL) return MEMORIES_RESOLVED
      const normalized = id.replace(/\\/g, '/')
      if (normalized.endsWith('/data/ny-trip/story.json')) {
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

// In dev: serve any media file under the active data dir whose URL path
// matches a real file there. Falls through to Vite's normal public-dir lookup
// for anything not in the data root, so shared scaffolding (favicons,
// start1.jpg) keeps working. Only intercepts URLs with a known media
// extension to avoid clashing with Vite internals.
//
// In build: copy the same media files into outDir so the deployed site has
// them at the expected paths (mirrors what the dev middleware would have
// served).
function meridianMediaPlugin(root: string): Plugin {
  let outDir = ''
  return {
    name: 'meridian-media',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
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
    writeBundle() {
      if (!outDir) return
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const src = resolve(dir, entry.name)
          if (entry.isDirectory()) { walk(src); continue }
          const ext = extname(entry.name).toLowerCase()
          if (!MIME[ext]) continue
          const dest = resolve(outDir, relative(root, src))
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(src, dest)
        }
      }
      walk(root)
    },
  }
}

// MERIDIAN_DATA points at a folder containing memories*.json + story.json + photos/.
// Resolved from the worktree root, so MERIDIAN_DATA=data/love-story works from any cwd.
// Defaults to data/ny-trip when unset. Read from process.env (shell) and/or
// .env.local (Vite convention, gitignored).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, __dirname, ''), ...process.env }
  const dataDir = env.MERIDIAN_DATA?.trim()
  const root = dataDir ? resolve(repoRoot, dataDir) : defaultDataDir
  return {
    plugins: [
      react(),
      meridianMemoriesPlugin(root),
      meridianMediaPlugin(root),
    ],
  }
})
