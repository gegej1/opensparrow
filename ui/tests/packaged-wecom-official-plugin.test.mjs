import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')
const buildScriptSource = fs.readFileSync(path.join(repoRoot, 'scripts', 'build-usb-pack.sh'), 'utf8')

test('wecom packaged install uses the official plugin package and plugin id', () => {
  assert.match(serverSource, /const WECOM_PLUGIN_PACKAGE = '@wecom\/wecom-openclaw-plugin'/)
  assert.match(serverSource, /const WECOM_PLUGIN_ID = 'wecom-openclaw-plugin'/)
})

test('wecom plugin entry config follows the official plugin id instead of legacy wecom id', () => {
  assert.match(
    serverSource,
    /const WECOM_PLUGIN_ENTRY_ENABLED_PATH = `plugins\.entries\.\$\{WECOM_PLUGIN_ID\}\.enabled`/,
  )
  assert.match(serverSource, /const pluginEntryValue = config\?\.plugins\?\.entries\?\.\[WECOM_PLUGIN_ID\]\?\.enabled/)
  assert.match(serverSource, /await oc\(WECOM_PLUGIN_ENTRY_ENABLED_PATH, 'true'\)/)
})

test('packaged build bundles the official wecom plugin archive', () => {
  assert.match(
    buildScriptSource,
    /rm -f "\$plugins_dst"\/openclaw-china-channels-\*\.tgz "\$plugins_dst"\/wecom-wecom-openclaw-plugin-\*\.tgz/,
  )
  assert.match(buildScriptSource, /"\$npm_bin" pack @wecom\/wecom-openclaw-plugin@\$\{wecom_version\} >/)
})
