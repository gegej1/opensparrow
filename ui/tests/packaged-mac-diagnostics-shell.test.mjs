import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')
const wizardSource = fs.readFileSync(path.join(repoRoot, 'ui', 'public', 'index.html'), 'utf8')
const buildScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'build-usb-pack.sh'), 'utf8')
const exportCommon = fs.readFileSync(
  path.join(repoRoot, 'longrun', 'workspaces', 'openclaw-usb-portable', 'execution', 'scripts', 'lib', 'export-common.sh'),
  'utf8',
)
const diagnosticsDocPath = path.join(repoRoot, 'docs', 'packaged-mac-diagnostics.md')

test('packaged mac diagnostics shell exposes install status and diagnostics endpoints plus package-local artifacts', () => {
  assert.match(serverSource, /pathname === '\/api\/install\/status'/)
  assert.match(serverSource, /pathname === '\/api\/diagnostics'/)
  assert.match(serverSource, /pathname === '\/api\/diagnostics\/export'/)
  assert.match(serverSource, /install-state\.json/)
  assert.match(serverSource, /install\.log/)
  assert.match(serverSource, /diagnostic-bundle\.json/)
})

test('packaged mac diagnostics shell prefers lib runtime truth before bin runtime truth', () => {
  assert.match(
    serverSource,
    /path\.join\(RUNTIME_ROOT, 'lib', 'node_modules', 'openclaw', 'openclaw\.mjs'\)[\s\S]*path\.join\(RUNTIME_ROOT, 'bin', 'node_modules', 'openclaw', 'openclaw\.mjs'\)/,
  )
  assert.match(
    serverSource,
    /path\.join\(RUNTIME_ROOT, 'lib', 'node_modules', 'openclaw', 'package\.json'\)[\s\S]*path\.join\(RUNTIME_ROOT, 'bin', 'node_modules', 'openclaw', 'package\.json'\)/,
  )
  assert.match(exportCommon, /vendor\/mac-openclaw\/lib\/node_modules\/openclaw\/package\.json/)
})

test('packaged mac diagnostics shell adds build-time drift guard and real install status polling', () => {
  assert.match(buildScript, /drift guard|version drift|runtime truth/i)
  assert.match(buildScript, /vendor\/mac-openclaw\/bin\/node_modules\/openclaw\/package\.json/)
  assert.match(buildScript, /vendor\/mac-openclaw\/lib\/node_modules\/openclaw\/package\.json/)
  assert.match(wizardSource, /\/api\/install\/status/)
})

test('packaged mac diagnostics doc exists and documents export endpoints', () => {
  assert.equal(fs.existsSync(diagnosticsDocPath), true)
  const diagnosticsDoc = fs.readFileSync(diagnosticsDocPath, 'utf8')
  assert.match(diagnosticsDoc, /\/api\/install\/status/)
  assert.match(diagnosticsDoc, /\/api\/diagnostics/)
  assert.match(diagnosticsDoc, /\/api\/diagnostics\/export/)
})
