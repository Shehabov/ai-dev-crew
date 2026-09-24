#!/usr/bin/env node
/**
 * Builds every image under assets/ from code, so the covers and diagrams stay one system.
 *
 * Each module exports a function that returns [{ file, svg }]. A module that is missing or
 * broken is reported and skipped, so one module can be worked on without the other.
 *
 * Usage:  node scripts/assets/build.mjs [--only covers|diagrams]
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null

const MODULES = [
  { key: 'covers', path: './covers.mjs', fn: 'covers' },
  { key: 'diagrams', path: './diagrams.mjs', fn: 'diagrams' },
]

let failed = 0
for (const m of MODULES) {
  if (only && only !== m.key) continue
  let out
  try {
    const mod = await import(m.path)
    out = mod[m.fn]()
  } catch (err) {
    console.error(`skip ${m.key}: ${err.message}`)
    failed++
    continue
  }
  for (const { file, svg } of out) {
    const p = join(root, 'assets', file)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, svg)
    console.log(`wrote assets/${file}`)
  }
}
process.exit(failed ? 1 : 0)
