import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ICONS_DIR = fileURLToPath(new URL('../../apps/ui/public/icons/', import.meta.url))

const ICONS = [
  { source: 'icon.svg', target: 'icon-192.png', size: 192 },
  { source: 'icon.svg', target: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', target: 'icon-maskable-512.png', size: 512 },
  // iOS draws its own rounded mask, so the apple-touch-icon starts from the full-bleed artwork.
  { source: 'icon-maskable.svg', target: 'apple-touch-icon.png', size: 180 },
] as const

const browser = await chromium.launch()
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } })
    const svg = readFileSync(`${ICONS_DIR}${icon.source}`, 'utf8')
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${icon.size}px;height:${icon.size}px}</style>${svg}`,
    )
    await page.screenshot({ path: `${ICONS_DIR}${icon.target}`, omitBackground: true })
    await page.close()
    console.log(`render-icons: ${icon.target} (${icon.size} px)`)
  }
} finally {
  await browser.close()
}
