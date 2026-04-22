import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('dingtalk install tracks plugin readiness before channel config', () => {
  assert.match(serverSource, /let dingtalkPluginReady = !requestedHasDingtalk/)
  assert.match(serverSource, /dingtalkPluginReady = dingtalkInstall\.ok/)
})

test('dingtalk plugin rejection skips later dingtalk channel config writes', () => {
  assert.match(
    serverSource,
    /if \(ch\.type === 'dingtalk' && !dingtalkPluginReady\) \{[\s\S]*warnings\.push\('钉钉插件未安装成功，跳过钉钉渠道配置'\)[\s\S]*continue[\s\S]*\}/,
  )
})
