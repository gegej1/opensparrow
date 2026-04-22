import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('packaged plugin install checks shared extension root under OPENCLAW_HOME', () => {
  assert.match(
    serverSource,
    /const EXTENSIONS_DIR = path\.join\(OPENCLAW_HOME, '\.openclaw', 'extensions'\)/,
  )
  assert.match(serverSource, /const extDir = path\.join\(EXTENSIONS_DIR, id\)/)
})

test('dingtalk plugin patching resolves from shared extension root', () => {
  assert.match(
    serverSource,
    /function resolveDingtalkPluginDistFile\(\) \{[\s\S]*path\.join\(\s*EXTENSIONS_DIR,\s*'channels',[\s\S]*'dist',[\s\S]*'index\.js'/,
  )
})
