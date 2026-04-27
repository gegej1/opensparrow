import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const buildScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'build-usb-pack.sh'), 'utf8')

function getGeneratedMacCompatibilityLauncher() {
  const match = buildScript.match(
    /cat > "\$\{STAGING_DIR\}\/mac\/01-开始部署\.command" <<'EOF'\n([\s\S]*?)\nEOF/,
  )
  assert.ok(match, 'build script should generate mac/01-开始部署.command as a dedicated handoff launcher')
  return match[1]
}

test('build script places the official mac launcher at the package root', () => {
  assert.match(buildScript, /local main_entry="\$\{PROJECT_ROOT\}\/platforms\/mac\/wrappers\/01-开始部署\.command"/)
  assert.match(buildScript, /cp "\$main_entry" "\$\{STAGING_DIR\}\/01-开始部署\.command"/)
  assert.match(buildScript, /pack root .*main entry point/)
})

test('build script generates package mac 01 command as compatibility handoff only', () => {
  const handoffLauncher = getGeneratedMacCompatibilityLauncher()

  assert.match(handoffLauncher, /compatibility \/ handoff/)
  assert.match(handoffLauncher, /root_launcher="\$script_dir\/\.\.\/01-开始部署\.command"/)
  assert.match(handoffLauncher, /exec "\$root_launcher" "\$@"/)
  assert.doesNotMatch(handoffLauncher, /ui\/server\.mjs/)
  assert.doesNotMatch(handoffLauncher, /OPENSPARROW_REQUIRE_BUNDLED_PLUGINS/)
})
