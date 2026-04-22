import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const wrapperSource = fs.readFileSync(
  path.join(repoRoot, 'platforms', 'mac', 'wrappers', '01-开始部署.command'),
  'utf8',
)

test('packaged mac wrapper clears quarantine and validates bundled runtime architecture before launch', () => {
  assert.match(wrapperSource, /clear_quarantine_if_possible\(\)/)
  assert.match(wrapperSource, /xattr -dr com\.apple\.quarantine/)
  assert.match(wrapperSource, /verify_runtime_cpu_arch\(\)/)
  assert.match(wrapperSource, /bundled Node 架构与本机不匹配/)
})

test('packaged mac wrapper verifies node tool symlinks and picks free gateway or router ports', () => {
  assert.match(wrapperSource, /verify_node_tool_symlinks\(\)/)
  assert.match(wrapperSource, /\$runtime_root\/bin\/\$tool/)
  assert.match(wrapperSource, /不是 symlink/)
  assert.match(wrapperSource, /resolve_free_port 18929/)
  assert.match(wrapperSource, /resolve_free_port 18412/)
})
