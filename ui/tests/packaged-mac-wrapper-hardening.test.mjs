import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const wrapperSource = fs.readFileSync(
  path.join(repoRoot, 'platforms', 'mac', 'wrappers', '01-开始部署.command'),
  'utf8',
)

function getShellFunctionBody(source, functionName) {
  const match = source.match(new RegExp(`${functionName}\\(\\) \\{([\\s\\S]*?)\\n\\}`))
  assert.ok(match, `${functionName} should exist`)
  return match[1]
}

test('packaged mac wrapper clears quarantine and validates bundled runtime architecture before launch', () => {
  assert.match(wrapperSource, /clear_quarantine_if_possible\(\)/)
  assert.match(wrapperSource, /xattr -dr com\.apple\.quarantine/)
  assert.match(wrapperSource, /verify_runtime_cpu_arch\(\)/)
  assert.match(wrapperSource, /bundled Node 架构与本机不匹配/)
})

test('packaged mac wrapper prefers the packaged script directory before ancestor checkout fallbacks', () => {
  const resolvePackRootBody = getShellFunctionBody(wrapperSource, 'resolve_pack_root')
  const candidates = Array.from(
    resolvePackRootBody.matchAll(/^\s+("\$script_dir(?:\/\.\.)*")(?:\s+\\|\s*;\s*do)$/gm),
    (match) => match[1],
  )

  assert.deepEqual(candidates, [
    '"$script_dir"',
    '"$script_dir/.."',
    '"$script_dir/../../.."',
  ])
})

test('source checkout wrapper launch is explicit developer debug mode and does not require bundled archives by default', () => {
  assert.match(wrapperSource, /is_source_checkout\(\)/)
  assert.match(wrapperSource, /source developer\/debug mode/)
  assert.match(wrapperSource, /交付包根目录.*01-开始部署\.command/)
  assert.match(wrapperSource, /OPENSPARROW_PACKAGED_RUNTIME="\$\{OPENSPARROW_PACKAGED_RUNTIME:-0\}"/)
  assert.match(wrapperSource, /OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="\$\{OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-0\}"/)
})

test('packaged root wrapper still enables packaged hardening and bundled plugin archives by default', () => {
  assert.match(wrapperSource, /packaged runtime hardening/)
  assert.match(wrapperSource, /OPENSPARROW_PACKAGED_RUNTIME="\$\{OPENSPARROW_PACKAGED_RUNTIME:-1\}"/)
  assert.match(wrapperSource, /OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="\$\{OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-1\}"/)
})

test('packaged mac wrapper verifies node tool symlinks and picks free gateway or router ports', () => {
  assert.match(wrapperSource, /verify_node_tool_symlinks\(\)/)
  assert.match(wrapperSource, /\$runtime_root\/bin\/\$tool/)
  assert.match(wrapperSource, /不是 symlink/)
  assert.match(wrapperSource, /resolve_free_port 18929/)
  assert.match(wrapperSource, /resolve_free_port 18412/)
})

test('packaged mac wrapper picks a free UI port and prints it before launch', () => {
  assert.match(wrapperSource, /OPENSPARROW_UI_PORT="\$\{OPENSPARROW_UI_PORT:-\$\(resolve_free_port 19000\)\}"/)
  assert.match(wrapperSource, /printf 'UI: %s\\n' "\$OPENSPARROW_UI_PORT"/)
})

test('packaged mac wrapper skips recursive quarantine cleanup when launched from a git checkout', () => {
  assert.match(wrapperSource, /is_git_checkout\(\)/)
  assert.match(wrapperSource, /if is_git_checkout "\$target"; then/)
  assert.match(wrapperSource, /xattr -d com\.apple\.quarantine "\$target"/)
})
