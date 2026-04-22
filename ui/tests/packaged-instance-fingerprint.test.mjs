import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('status, install-state, and diagnostics expose packaged instance fingerprint fields', () => {
  assert.match(serverSource, /function buildInstanceFingerprint\(\)/)
  assert.match(serverSource, /const SERVER_STARTED_AT = new Date\(\)\.toISOString\(\)/)
  assert.match(serverSource, /const ACTIVE_UI_PORT = \{ value: null \}/)
  assert.match(serverSource, /uiPort:\s*ACTIVE_UI_PORT\.value/)
  assert.match(serverSource, /packRoot:\s*toUserPath\(PACK_ROOT\)/)
  assert.match(serverSource, /openclawHome:\s*toUserPath\(OPENCLAW_HOME\)/)
  assert.match(serverSource, /profileDir:\s*toUserPath\(PROFILE_DIR\)/)
  assert.match(serverSource, /serverStartedAt:\s*SERVER_STARTED_AT/)
  assert.match(serverSource, /instance:\s*buildInstanceFingerprint\(\)/)
})
