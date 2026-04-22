import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('wecom install tracks plugin readiness before channel config', () => {
  assert.match(serverSource, /let wecomPluginReady = !requestedHasWecom/)
  assert.match(serverSource, /wecomPluginReady = wecomInstall\.ok/)
})

test('wecom plugin rejection skips later wecom channel config writes', () => {
  assert.match(
    serverSource,
    /if \(ch\.type === 'wecom' && !wecomPluginReady\) \{[\s\S]*warnings\.push\('企微插件未安装成功，跳过企业微信渠道配置'\)[\s\S]*continue[\s\S]*\}/,
  )
})
