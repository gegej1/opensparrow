import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('runtime probe uses a stability helper before classifying daemon fallback', () => {
  assert.match(
    serverSource,
    /async function resolveStableRuntimeState\(\{ attempts = 6, delayMs = 500 \} = \{\}\) \{/,
  )
  assert.match(
    serverSource,
    /if \(runtimeState\.daemon !== 'unknown' \|\| !runtimeState\.gatewayHealthy\) return runtimeState/,
  )
})

test('dingtalk and wecom probes read stable runtime state', () => {
  assert.match(serverSource, /const \{ daemon, runtimeMode, gatewayHealthy, gatewayPortBusy \} = await resolveStableRuntimeState\(\)/)
})

test('gateway fallback runtime refuses foreign listeners on the target port', () => {
  assert.match(
    serverSource,
    /async function startGatewayFallbackRuntime\(\) \{[\s\S]*if \(await isGatewayHealthy\(\)\) \{[\s\S]*alreadyRunning: true[\s\S]*if \(await isPortBusy\(GATEWAY_PORT\)\) \{[\s\S]*non-OpenClaw listener/,
  )
})
