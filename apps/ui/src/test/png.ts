import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// jsdom gives import.meta.url an http scheme, so the path comes from the module directory.
const PUBLIC_DIR = join(import.meta.dirname, '..', '..', 'public')
const PNG_SIGNATURE = '89504e470d0a1a0a'

export type PngSize = { isPng: boolean; width: number; height: number }

// Reads the IHDR chunk, which follows the 8 byte signature and the chunk length and type.
export function readPublicPngSize(publicPath: string): PngSize {
  const bytes = readFileSync(`${PUBLIC_DIR}${publicPath}`)
  return {
    isPng: bytes.subarray(0, 8).toString('hex') === PNG_SIGNATURE,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}
