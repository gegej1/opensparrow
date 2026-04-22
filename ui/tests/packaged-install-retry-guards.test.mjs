import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')
const uiSource = fs.readFileSync(path.join(repoRoot, 'ui', 'public', 'index.html'), 'utf8')
const buildScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'build-usb-pack.sh'), 'utf8')
const handoffScript = fs.readFileSync(
  path.join(repoRoot, 'longrun', 'workspaces', 'openclaw-usb-portable', 'execution', 'scripts', 'create-mac-handoff-copy.sh'),
  'utf8',
)

test('packaged plugin reinstall uses openclaw plugins install --force instead of manual pre-delete', () => {
  assert.match(
    serverSource,
    /const args = \['plugins', 'install', installSpec\][\s\S]*args\.push\('--pin'\)[\s\S]*args\.push\('--force'\)/,
  )
})

test('install page polls authoritative install-status terminal state after install request timeout', () => {
  assert.match(
    uiSource,
    /async waitForInstallTerminalState\(timeoutMs = this\.requestTimeout\.installTerminal\) \{[\s\S]*const startedAt = Date\.now\(\)[\s\S]*Date\.now\(\) - startedAt < timeoutMs[\s\S]*payload\.status === 'error'[\s\S]*payload\.status === 'completed'[\s\S]*payload\.status === 'done'[\s\S]*return false;/,
  )
  assert.match(
    uiSource,
    /if \(e\?\.name === 'AbortError'\) \{[\s\S]*const terminal = await this\.waitForInstallTerminalState\(\)[\s\S]*terminal\?\.status === 'error'[\s\S]*this\.installError = true[\s\S]*this\.installErrorMsg = this\.buildInstallErrorText\(terminal, 500\)[\s\S]*if \(!terminal\) \{[\s\S]*未能在限定时间内从 \/api\/install\/status 读取到最终状态[\s\S]*return;/,
  )
  assert.match(
    uiSource,
    /async waitUntilInstalled\(maxWaitMs = this\.requestTimeout\.installedWait\) \{[\s\S]*Date\.now\(\) - startedAt < maxWaitMs[\s\S]*return false;/,
  )
})

test('install page timeout budgets leave room for slower packaged-mac installs on clean machines', () => {
  assert.match(
    uiSource,
    /requestTimeout:\s*\{[\s\S]*install:\s*300000,[\s\S]*installTerminal:\s*600000,[\s\S]*installedWait:\s*600000,[\s\S]*\}/,
  )
})

test('build pack strips package-local gtclaw/openclaw state directories before shipping', () => {
  assert.match(
    buildScript,
    /find "\$STAGING_DIR" -type d[\s\S]*-name '\.gtclaw-state'[\s\S]*-o -name '\.openclaw'[\s\S]*-o -name '\.openclaw-\*'/,
  )
})

test('mac handoff export strips package-local gtclaw/openclaw state directories after rsync', () => {
  assert.match(
    handoffScript,
    /find "\$artifact_dir" -type d[\s\S]*-name '\.gtclaw-state'[\s\S]*-o -name '\.openclaw'[\s\S]*-o -name '\.openclaw-\*'/,
  )
})

test('packaged plugin install can require bundled tarballs and keeps openclaw cwd anchored at pack root', () => {
  assert.match(
    serverSource,
    /const bundledArchive = findBundledPluginArchive\(BUNDLED_PLUGINS_DIR, packageSpec\)/,
  )
  assert.match(
    serverSource,
    /if \(REQUIRE_BUNDLED_PLUGINS && !bundledArchive\) \{[\s\S]*bundled plugin archive[\s\S]*避免在新 Mac 上走在线安装/,
  )
  assert.match(
    serverSource,
    /const proc = spawn\([\s\S]*env: \{ \.\.\.process\.env, CI: process\.env\.CI \?\? '1' \},[\s\S]*stdio: \['ignore', 'pipe', 'pipe'\],[\s\S]*cwd: PACK_ROOT,/,
  )
})
