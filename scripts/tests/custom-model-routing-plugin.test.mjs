import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import {
  CUSTOM_ROUTER_MODEL_ID,
  CUSTOM_ROUTER_PROVIDER_ID,
  buildCustomRouterProviderConfig,
  normalizeCustomTierModelMap,
  sanitizeDebugHeaderValue,
} from '../model-routing/lib/custom-plugin-routing.mjs'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const managerPath = path.join(repoRoot, 'scripts', 'model-routing', 'manage-custom-routing-plugin.mjs')
const defaultTestEntry = 'scripts/tests/custom-model-routing-plugin.test.mjs'

function runManager(args = [], options = {}) {
  return spawnSync(process.execPath, [managerPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  })
}

test('manager help lists the repo-local test entry', () => {
  const result = runManager(['help'])
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /\btest\b/)
  assert.match(result.stdout, new RegExp(defaultTestEntry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('manager status reports the test entry and command', () => {
  const result = runManager(['status'])
  assert.equal(result.status, 0, result.stderr)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.testEntry, defaultTestEntry)
  assert.equal(payload.testCommand, `node --test ${defaultTestEntry}`)
})

test('manager test runs a repo-local test file override when requested', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-routing-test-'))
  const stubTestPath = path.join(tempDir, 'manager-stub.test.mjs')
  const runnerPath = path.join(tempDir, 'run-manager-test.mjs')
  fs.writeFileSync(stubTestPath, [
    "import test from 'node:test'",
    "test('manager override stub passes', () => {})",
    '',
  ].join('\n'), 'utf8')
  fs.writeFileSync(runnerPath, [
    "import { spawnSync } from 'node:child_process'",
    "const result = spawnSync(process.execPath, [process.env.MANAGER_PATH, 'test'], {",
    "  cwd: process.env.REPO_ROOT,",
    "  env: { ...process.env, OPENSPARROW_CUSTOM_ROUTING_PLUGIN_TEST_FILE: process.env.STUB_TEST_PATH },",
    "  encoding: 'utf8',",
    "})",
    "if (result.stdout) process.stdout.write(result.stdout)",
    "if (result.stderr) process.stderr.write(result.stderr)",
    "process.exit(result.status ?? 1)",
    '',
  ].join('\n'), 'utf8')

  try {
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        MANAGER_PATH: managerPath,
        REPO_ROOT: repoRoot,
        STUB_TEST_PATH: stubTestPath,
      },
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(`${result.stdout}\n${result.stderr}`, /manager override stub passes/)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('routing helper keeps defaults and sanitizes debug headers', () => {
  const tierMap = normalizeCustomTierModelMap({
    SIMPLE: 'mini-fast',
    REASONING: 'slow-thinker',
  })
  assert.deepEqual(tierMap, {
    SIMPLE: 'mini-fast',
    MEDIUM: 'kimi-k2-0711-preview',
    COMPLEX: 'deepseek-r1-250528',
    REASONING: 'slow-thinker',
  })

  assert.equal(sanitizeDebugHeaderValue('中文\nreasoning\r\nok'), '? reasoning ok')

  const provider = buildCustomRouterProviderConfig({ port: 9527 })
  assert.equal(provider.baseUrl, 'http://127.0.0.1:9527/v1')
  assert.equal(provider.api, 'openai-completions')
  assert.equal(provider.models.length, 1)
  assert.equal(provider.models[0].id, CUSTOM_ROUTER_MODEL_ID)
  assert.equal(CUSTOM_ROUTER_PROVIDER_ID, 'opensparrow-router')
})
