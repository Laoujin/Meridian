import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.tsx'
import { story } from './data/story'
import { asset } from './utils/asset'

document.title = story.app.title
const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
if (favicon && story.app.faviconHref) favicon.href = asset(story.app.faviconHref)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
