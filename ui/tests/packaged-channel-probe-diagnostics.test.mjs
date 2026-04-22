import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('install state persists channel probes for packaged diagnostics', () => {
  assert.match(serverSource, /channelProbes:\s*\{\s*dingtalk:\s*null,\s*wecom:\s*null,\s*\}/)
  assert.match(serverSource, /stored\.channelProbes/)
  assert.match(serverSource, /state\.channelProbes\s*=/)
})

test('install flow and diagnostics export carry channelProbes', () => {
  assert.match(serverSource, /const channelProbes = buildChannelProbes\(\{[\s\S]*dingtalk:\s*dingtalkProbe[\s\S]*wecom:\s*wecomProbe[\s\S]*\},\s*probeSecrets\)/)
  assert.match(serverSource, /installTracker\.setChannelProbes\(channelProbes\)/)
  assert.match(serverSource, /const install = readInstallState\(\)/)
  assert.match(serverSource, /channelProbes,\s*\n\s*artifacts:/)
  assert.match(serverSource, /channelProbes,[\s\S]*channels:\s*channelProbes/)
  assert.match(serverSource, /sendJson\(res,\s*200,\s*bundle\)/)
})

test('channel probe persistence uses secret redaction helpers', () => {
  assert.match(serverSource, /function redactSecretLikeObject\(/)
  assert.match(serverSource, /function sanitizeChannelProbe\(/)
  assert.match(serverSource, /function collectSecretLikeValues\(/)
  assert.match(serverSource, /function buildProbeExecutionFailure\(/)
  assert.match(serverSource, /secret|token|api[_-]?key|authorization|password/i)
  assert.match(serverSource, /const probeSecrets = collectSecretLikeValues\(\{ api, channels \}\)/)
  assert.match(serverSource, /return redactSecretLikeObject\(\s*normalizeChannelProbes\(/)
})
