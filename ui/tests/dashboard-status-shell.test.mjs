import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const dashboardHtml = fs.readFileSync(path.join(repoRoot, 'ui', 'public', 'dashboard.html'), 'utf8')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('dashboard status shell uses backend-reported gateway port instead of hardcoding 18889', () => {
  assert.match(dashboardHtml, /serviceInfo\.port = String\(data\.gatewayPort \?\? ''\)/)
  assert.doesNotMatch(dashboardHtml, /serviceInfo\.port = '18889'/)
})

test('dashboard status shell treats gateway fallback as running service state', () => {
  assert.match(
    dashboardHtml,
    /data\.daemon === 'running'[\s\S]*data\.runtimeMode === 'gateway-fallback'[\s\S]*data\.gatewayHealthy === true/
  )
  assert.doesNotMatch(dashboardHtml, /serviceStatus = data\.daemon === 'running' \? 'running' : 'stopped'/)
})

test('dashboard DingTalk diagnostics has its own timeout budget aligned with backend probe', () => {
  assert.match(dashboardHtml, /requestTimeout:\s*\{[\s\S]*diagnostics:\s*30000/)
  assert.match(
    dashboardHtml,
    /fetchWithTimeout\('\/api\/dingtalk\/probe'[\s\S]*this\.requestTimeout\.diagnostics\)/
  )
  assert.doesNotMatch(
    dashboardHtml,
    /fetchWithTimeout\('\/api\/dingtalk\/probe'[\s\S]*this\.requestTimeout\.status\)/
  )
})

test('dashboard DingTalk diagnostics timeout copy does not expose raw AbortError text', () => {
  assert.match(dashboardHtml, /e\?\.name === 'AbortError'/)
  assert.match(
    dashboardHtml,
    /if \(e\?\.name === 'AbortError'\) \{[\s\S]*钉钉诊断请求超时，请稍后重试；这不代表消息发送失败。[\s\S]*\} else \{/
  )
  assert.doesNotMatch(
    dashboardHtml,
    /if \(e\?\.name === 'AbortError'\) \{[\s\S]{0,500}e\?\.message/
  )
})

test('dashboard shell uses GTClaw branding instead of legacy Open Sparrow copy', () => {
  assert.match(dashboardHtml, /<title>GTClaw 管理面板<\/title>/)
  assert.match(dashboardHtml, /\.brand-mark\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#1677FF,\s*#0958D9\)/)
  assert.match(dashboardHtml, /<span class="brand-mark" aria-hidden="true">GT<\/span>[\s\S]*>GTClaw<\/span>/)
  assert.match(dashboardHtml, />GTClaw<\/span>/)
  assert.doesNotMatch(dashboardHtml, /<img\s+[^>]*src="logo\.png"/)
  assert.doesNotMatch(dashboardHtml, /Open Sparrow/)
})

test('status endpoint reports the real config path, gateway port, and bundled runtime version', () => {
  assert.match(serverSource, /gatewayPort:\s*GATEWAY_PORT/)
  assert.match(serverSource, /configPath:\s*toUserPath\(CONFIG_FILE\)/)
  assert.match(serverSource, /version:\s*getBundledOpenClawVersion\(\)\s*\|\|\s*null/)
  assert.doesNotMatch(serverSource, /configPath:\s*`~\/\.openclaw-\$\{PROFILE\}\/openclaw\.json`/)
})

test('dashboard status shell never fabricates a static v1.0.0 fallback', () => {
  assert.doesNotMatch(dashboardHtml, /1\.0\.0/)
})

test('logo.png remains on the static allowlist without being the dashboard header dependency', () => {
  assert.doesNotMatch(dashboardHtml, /<img\s+[^>]*src="logo\.png"/)
  assert.match(serverSource, /'\.png':\s*'image\/png'/)
  assert.match(serverSource, /pathname\.endsWith\('\.png'\)/)
  assert.match(serverSource, /const safeName = path\.basename\(pathname\)/)
})

test('browser launch and html responses use cache-busting semantics', () => {
  assert.match(serverSource, /const launchToken = encodeURIComponent\(SERVER_STARTED_AT\)/)
  assert.match(serverSource, /const url = `http:\/\/localhost:\$\{port\}\/\?launch=\$\{launchToken\}`/)
  assert.match(serverSource, /if \(ext === '\.html'\) \{\s*headers\['Cache-Control'\] = 'no-store, max-age=0'/)
})
