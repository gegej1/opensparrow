import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const buildScriptPath = path.join(repoRoot, 'scripts', 'build-usb-pack.sh')
const exportScriptPath = path.join(
  repoRoot,
  'longrun',
  'workspaces',
  'openclaw-usb-portable',
  'execution',
  'scripts',
  'create-mac-handoff-copy.sh',
)
const serverSourcePath = path.join(repoRoot, 'ui', 'server.mjs')

const REQUIRED_SOURCE_FILES = [
  'ui/lib/model-routing-config.mjs',
  'ui/lib/openai-provider.mjs',
  'scripts/model-routing/lib/custom-plugin-routing.mjs',
]

test('packaged mac runtime hard-import dependencies exist in the repo', () => {
  const serverSource = fs.readFileSync(serverSourcePath, 'utf8')
  assert.match(serverSource, /from '\.\/lib\/model-routing-config\.mjs'/)
  assert.match(serverSource, /from '\.\.\/scripts\/model-routing\/lib\/custom-plugin-routing\.mjs'/)

  for (const relativePath of REQUIRED_SOURCE_FILES) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, relativePath)),
      true,
      `expected required packaged runtime dependency to exist: ${relativePath}`,
    )
  }
})

test('packaged mac build script fails fast when required runtime files are missing', () => {
  const buildScript = fs.readFileSync(buildScriptPath, 'utf8')
  assert.match(buildScript, /require_packaged_file\(\)/)
  assert.match(buildScript, /Required packaged runtime dependency missing:/)
  assert.match(buildScript, /Required packaged runtime dependency missing from staged pack:/)
  for (const relativePath of REQUIRED_SOURCE_FILES.concat('ui/install-helpers.mjs', 'ui/server.mjs')) {
    assert.match(buildScript, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('packaged mac export script fails fast when artifact runtime files are missing', () => {
  const exportScript = fs.readFileSync(exportScriptPath, 'utf8')
  assert.match(exportScript, /Required packaged runtime dependency missing from artifact:/)
  for (const relativePath of REQUIRED_SOURCE_FILES) {
    assert.match(exportScript, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('packaged mac build emits runtime truth manifest', () => {
  const buildScript = fs.readFileSync(buildScriptPath, 'utf8')
  assert.match(buildScript, /RUNTIME_TRUTH\.json/)
  assert.match(buildScript, /canonicalRuntimeSource/)
  assert.match(buildScript, /libOpenclawVersion/)
  assert.match(buildScript, /binOpenclawVersion/)
  assert.match(buildScript, /versionConsistent/)
})
