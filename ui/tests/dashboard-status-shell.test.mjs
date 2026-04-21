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

test('status endpoint reports the real config path and gateway port', () => {
  assert.match(serverSource, /gatewayPort:\s*GATEWAY_PORT/)
  assert.match(serverSource, /configPath:\s*toUserPath\(CONFIG_FILE\)/)
  assert.doesNotMatch(serverSource, /configPath:\s*`~\/\.openclaw-\$\{PROFILE\}\/openclaw\.json`/)
})
