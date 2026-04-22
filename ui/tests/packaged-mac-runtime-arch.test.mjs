import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

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
const vendorNodePath = path.join(repoRoot, 'vendor', 'mac-openclaw', 'bin', 'node')

test('packaged mac runtime node includes an arm64 slice', () => {
  const fileOutput = execFileSync('file', [vendorNodePath], { encoding: 'utf8' })
  assert.match(fileOutput, /Mach-O/, 'expected packaged runtime node to be a Mach-O binary')
  assert.match(
    fileOutput,
    /\barm64\b/,
    `expected packaged runtime node to include an arm64 slice, got: ${fileOutput.trim()}`,
  )
})

test('packaged mac build script guards runtime architecture truth before staging', () => {
  const buildScript = fs.readFileSync(buildScriptPath, 'utf8')
  assert.match(buildScript, /assert_mac_runtime_arch_truth\(\)/)
  assert.match(buildScript, /mac runtime architecture guard failed:/)
  assert.match(buildScript, /nodeBinaryArchitectures/)
})

test('packaged mac export script guards artifact node architecture before shipping', () => {
  const exportScript = fs.readFileSync(exportScriptPath, 'utf8')
  assert.match(exportScript, /artifact node architecture guard failed:/)
  assert.match(exportScript, /expected runtime slice/)
})
