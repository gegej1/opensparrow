import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  CUSTOM_ROUTER_MODEL_TARGET,
  DEFAULT_CUSTOM_TIER_MODEL_MAP,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverPath = path.join(repoRoot, 'ui', 'server.mjs')

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function createFakeRuntime(runtimeRoot) {
  const nodeBin = path.join(runtimeRoot, 'bin', 'node')
  const openclawEntry = path.join(runtimeRoot, 'openclaw', 'openclaw.mjs')

  fs.mkdirSync(path.dirname(nodeBin), { recursive: true })
  fs.mkdirSync(path.dirname(openclawEntry), { recursive: true })

  fs.writeFileSync(nodeBin, `#!/bin/sh
exec "${process.execPath}" "$@"
`, 'utf8')
  fs.chmodSync(nodeBin, 0o755)

  fs.writeFileSync(openclawEntry, `#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const rawArgs = process.argv.slice(2)
let profile = 'usb-portable'
const args = []
for (let index = 0; index < rawArgs.length; index += 1) {
  const token = rawArgs[index]
  if (token === '--profile') {
    profile = String(rawArgs[index + 1] ?? profile)
    index += 1
    continue
  }
  args.push(token)
}

const homeRoot = String(process.env.OPENCLAW_HOME || process.env.HOME || process.cwd())
const profileDir = path.join(homeRoot, '.openclaw-' + profile)
const configFile = path.join(profileDir, 'openclaw.json')

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(data) {
  fs.mkdirSync(path.dirname(configFile), { recursive: true })
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2) + '\\n', 'utf8')
}

function setByPath(target, dottedPath, value) {
  const segments = String(dottedPath || '').split('.').filter(Boolean)
  if (segments.length === 0) return
  let cursor = target
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index]
    const current = cursor[key]
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }
  cursor[segments[segments.length - 1]] = value
}

const [command, subcommand, ...rest] = args

if (command === 'config' && subcommand === 'set') {
  const [dottedPath, rawValue] = rest
  const config = readConfig()
  setByPath(config, dottedPath, JSON.parse(rawValue))
  writeConfig(config)
  process.stdout.write('ok\\n')
  process.exit(0)
}

if (command === 'models' && subcommand === 'set') {
  if (String(process.env.FAKE_OC_FAIL_MODELS_SET || '').trim() === '1') {
    process.stderr.write('models set forced failure\\n')
    process.exit(1)
  }
  const modelTarget = String(rest[0] || '').trim()
  const config = readConfig()
  config.agents = config.agents && typeof config.agents === 'object' ? config.agents : {}
  config.agents.defaults = config.agents.defaults && typeof config.agents.defaults === 'object' ? config.agents.defaults : {}
  config.agents.defaults.model = config.agents.defaults.model && typeof config.agents.defaults.model === 'object' ? config.agents.defaults.model : {}
  config.agents.defaults.model.primary = modelTarget
  writeConfig(config)
  process.stdout.write('ok\\n')
  process.exit(0)
}

if (command === 'daemon' && (subcommand === 'restart' || subcommand === 'install')) {
  process.stdout.write('ok\\n')
  process.exit(0)
}

if (command === 'daemon' && subcommand === 'status') {
  process.stdout.write(JSON.stringify({ status: 'stopped' }))
  process.exit(0)
}

if (command === 'health') {
  process.stderr.write('gateway not reachable\\n')
  process.exit(1)
}

process.stderr.write('unsupported fake openclaw command: ' + args.join(' ') + '\\n')
process.exit(1)
`, 'utf8')
  fs.chmodSync(openclawEntry, 0o755)
}

async function startServer(options = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-f031-'))
  const openclawHome = path.join(tempRoot, 'home')
  const userHome = path.join(tempRoot, 'user-home')
  const runtimeRoot = path.join(tempRoot, 'runtime')
  const profile = 'packet-test'
  const profileDir = path.join(openclawHome, `.openclaw-${profile}`)
  const configFile = path.join(profileDir, 'openclaw.json')
  const authFile = path.join(profileDir, 'agents', 'main', 'agent', 'auth-profiles.json')
  const uiMetaFile = path.join(profileDir, 'ui-meta.json')

  createFakeRuntime(runtimeRoot)
  writeJson(configFile, options.config ?? {})
  if (options.auth !== null) {
    writeJson(authFile, options.auth ?? {
      version: 1,
      profiles: {
        'openai:default': { type: 'api_key', provider: 'openai', key: 'saved-api-key' },
      },
      order: { openai: ['openai:default'] },
    })
  }
  if (options.uiMeta) writeJson(uiMetaFile, options.uiMeta)

  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: userHome,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENCLAW_HOME: openclawHome,
      OPENCLAW_PROFILE: profile,
      USB_RUNTIME_ROOT: runtimeRoot,
      OPENSPARROW_UI_PORT: String(options.port ?? 39100 + Math.floor(Math.random() * 1000)),
      FAKE_OC_FAIL_MODELS_SET: options.failModelsSet ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let logs = ''
  const append = (chunk) => {
    logs += chunk.toString()
  }
  child.stdout.on('data', append)
  child.stderr.on('data', append)

  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for server start.\n${logs}`))
    }, 10000)

    const onData = () => {
      const match = logs.match(/Listening:\s+(http:\/\/localhost:\d+)/)
      if (!match) return
      clearTimeout(timeout)
      child.stdout.off('data', onData)
      child.stderr.off('data', onData)
      resolve(match[1])
    }

    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Server exited early (${code}).\n${logs}`))
    })
  })

  async function stop() {
    if (child.exitCode !== null) return
    child.kill('SIGTERM')
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
      }, 3000)
      child.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }

  return {
    url,
    stop,
    tempRoot,
    userHome,
    openclawHome,
    runtimeRoot,
    profile,
    profileDir,
    configFile,
    authFile,
    uiMetaFile,
  }
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, text, 'utf8')
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  }
}

function createBaseConfig(overrides = {}) {
  return {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://saved.example.com/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
        },
      },
    },
    agents: {
      defaults: {
        model: {
          primary: 'openai/gpt-4o-mini',
        },
      },
    },
    ...overrides,
  }
}

test('GET /api/config/model-routing reads last-saved API config without leaking the API key', async () => {
  const server = await startServer({
    config: createBaseConfig({
      plugins: {
        entries: {
          'opensparrow-router': {
            enabled: true,
            config: {
              baseUrl: 'https://router.example.com/v1',
              apiKey: 'router-secret',
              tierModelMap: {
                SIMPLE: 'mini-fast',
                MEDIUM: 'mid-balanced',
                COMPLEX: 'deep-thinker',
                REASONING: 'reasoning-pro',
              },
              routing: {
                classifierModel: 'gpt-4.1-mini',
                tiers: { coding: 'COMPLEX' },
              },
            },
          },
        },
        allow: ['opensparrow-router'],
      },
    }),
  })

  try {
    const result = await requestJson(server.url, '/api/config/model-routing')
    assert.equal(result.status, 200)
    assert.equal(result.body.ok, true)
    assert.equal(result.body.mode, 'single')
    assert.deepEqual(result.body.connection, {
      baseUrl: 'https://saved.example.com/v1',
      baseUrlConfigured: true,
      apiKeyConfigured: true,
      source: 'last-saved-api-config',
    })
    assert.equal(result.body.singleModeDefaultModel, 'gpt-4o-mini')
    assert.equal(result.body.effectivePrimaryModel, 'openai/gpt-4o-mini')
    assert.equal(result.body.router.providerId, 'opensparrow-router')
    assert.equal(result.body.router.modelTarget, CUSTOM_ROUTER_MODEL_TARGET)
    assert.equal(result.body.router.configPresent, true)
    assert.deepEqual(result.body.tierModelMap, {
      SIMPLE: 'mini-fast',
      MEDIUM: 'mid-balanced',
      COMPLEX: 'deep-thinker',
      REASONING: 'reasoning-pro',
    })
    assert.deepEqual(result.body.routing, {
      classifierModel: 'gpt-4.1-mini',
      tiers: { coding: 'COMPLEX' },
    })
    assert.equal(JSON.stringify(result.body).includes('saved-api-key'), false)
    assert.equal(JSON.stringify(result.body).includes('router-secret'), false)
  } finally {
    await server.stop()
  }
})

test('POST /api/config/model-routing mode=single keeps router config and updates the saved single model', async () => {
  const server = await startServer({
    config: createBaseConfig({
      agents: {
        defaults: {
          model: {
            primary: CUSTOM_ROUTER_MODEL_TARGET,
          },
        },
      },
      plugins: {
        entries: {
          'opensparrow-router': {
            enabled: true,
            config: {
              baseUrl: 'https://saved.example.com/v1',
              apiKey: 'router-secret',
              tierModelMap: {
                SIMPLE: 'mini-fast',
                MEDIUM: 'mid-balanced',
                COMPLEX: 'deep-thinker',
                REASONING: 'reasoning-pro',
              },
              routing: {
                classifierModel: 'gpt-4.1-mini',
                tiers: { coding: 'COMPLEX' },
              },
            },
          },
        },
        allow: ['opensparrow-router'],
      },
    }),
  })

  try {
    const saveResult = await requestJson(server.url, '/api/config/model-routing', {
      method: 'POST',
      body: {
        mode: 'single',
        singleModeDefaultModel: 'gpt-4.1-mini',
      },
    })
    assert.equal(saveResult.status, 200)
    assert.equal(saveResult.body.ok, true)
    assert.equal(saveResult.body.mode, 'single')
    assert.equal(saveResult.body.effectivePrimaryModel, 'openai/gpt-4.1-mini')

    const config = readJson(server.configFile)
    assert.equal(config.agents.defaults.model.primary, 'openai/gpt-4.1-mini')
    assert.equal(config.plugins.entries['opensparrow-router'].config.tierModelMap.SIMPLE, 'mini-fast')
    assert.deepEqual(config.plugins.entries['opensparrow-router'].config.routing, {
      classifierModel: 'gpt-4.1-mini',
      tiers: { coding: 'COMPLEX' },
    })

    const afterGet = await requestJson(server.url, '/api/config/model-routing')
    assert.equal(afterGet.status, 200)
    assert.equal(afterGet.body.mode, 'single')
    assert.equal(afterGet.body.singleModeDefaultModel, 'gpt-4.1-mini')
    assert.equal(afterGet.body.effectivePrimaryModel, 'openai/gpt-4.1-mini')
  } finally {
    await server.stop()
  }
})

test('POST /api/config/model-routing mode=smart derives router credentials from last-saved API config and auto-fills trust config', async () => {
  const server = await startServer({
    config: createBaseConfig({
      plugins: {},
    }),
    uiMeta: {
      modelRouting: {
        singleModeDefaultModel: 'gpt-4.1-mini',
      },
    },
  })

  try {
    const saveResult = await requestJson(server.url, '/api/config/model-routing', {
      method: 'POST',
      body: {
        mode: 'smart',
        tierModelMap: {
          SIMPLE: 'model-simple',
          MEDIUM: 'model-medium',
          COMPLEX: 'model-complex',
          REASONING: 'model-reasoning',
        },
        routing: {
          classifierModel: 'gpt-4.1-mini',
          tiers: {
            coding: 'COMPLEX',
          },
        },
      },
    })
    assert.equal(saveResult.status, 200)
    assert.equal(saveResult.body.ok, true)
    assert.equal(saveResult.body.mode, 'smart')
    assert.equal(saveResult.body.effectivePrimaryModel, CUSTOM_ROUTER_MODEL_TARGET)

    const config = readJson(server.configFile)
    assert.equal(config.agents.defaults.model.primary, CUSTOM_ROUTER_MODEL_TARGET)
    assert.deepEqual(config.plugins.allow, ['opensparrow-router'])
    assert.deepEqual(config.plugins.entries['opensparrow-router'], {
      enabled: true,
      config: {
        baseUrl: 'https://saved.example.com/v1',
        apiKey: 'saved-api-key',
        tierModelMap: {
          SIMPLE: 'model-simple',
          MEDIUM: 'model-medium',
          COMPLEX: 'model-complex',
          REASONING: 'model-reasoning',
        },
        routing: {
          classifierModel: 'gpt-4.1-mini',
          tiers: {
            coding: 'COMPLEX',
          },
        },
      },
    })

    const afterGet = await requestJson(server.url, '/api/config/model-routing')
    assert.equal(afterGet.status, 200)
    assert.equal(afterGet.body.mode, 'smart')
    assert.equal(afterGet.body.connection.baseUrl, 'https://saved.example.com/v1')
    assert.equal(afterGet.body.connection.apiKeyConfigured, true)
    assert.equal(afterGet.body.singleModeDefaultModel, 'gpt-4.1-mini')
  } finally {
    await server.stop()
  }
})

test('POST /api/config/model-routing returns structured errors when saved API config is missing', async () => {
  const server = await startServer({
    config: createBaseConfig({
      models: {
        providers: {
          openai: {
            baseUrl: '',
            models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
          },
        },
      },
    }),
    auth: null,
  })

  try {
    const result = await requestJson(server.url, '/api/config/model-routing', {
      method: 'POST',
      body: {
        mode: 'smart',
        tierModelMap: { ...DEFAULT_CUSTOM_TIER_MODEL_MAP },
        routing: { tiers: {} },
      },
    })
    assert.equal(result.status, 400)
    assert.equal(result.body.ok, false)
    assert.match(result.body.errors.join('\n'), /Base URL/)
    assert.match(result.body.errors.join('\n'), /API Key/)
  } finally {
    await server.stop()
  }
})

test('POST /api/config/model-routing validates single and smart payload fields', async () => {
  const server = await startServer({
    config: createBaseConfig(),
  })

  try {
    const singleResult = await requestJson(server.url, '/api/config/model-routing', {
      method: 'POST',
      body: {
        mode: 'single',
      },
    })
    assert.equal(singleResult.status, 400)
    assert.match(singleResult.body.errors.join('\n'), /singleModeDefaultModel/)

    const smartResult = await requestJson(server.url, '/api/config/model-routing', {
      method: 'POST',
      body: {
        mode: 'smart',
        tierModelMap: {
          SIMPLE: 'model-simple',
          MEDIUM: 'model-medium',
          COMPLEX: '',
          REASONING: 'model-reasoning',
        },
        routing: 'not-an-object',
      },
    })
    assert.equal(smartResult.status, 400)
    assert.match(smartResult.body.errors.join('\n'), /COMPLEX/)
    assert.match(smartResult.body.errors.join('\n'), /routing/i)
  } finally {
    await server.stop()
  }
})

test('POST /api/install copies bundled superpowers skill directories recursively', async () => {
  const superpowersDir = path.join(repoRoot, 'skills', 'superpowers')
  const backupDir = `${superpowersDir}.bak-${process.pid}-${Date.now()}`
  const hadExisting = fs.existsSync(superpowersDir)
  if (hadExisting) {
    fs.renameSync(superpowersDir, backupDir)
  }

  writeText(path.join(superpowersDir, 'README.md'), '# superpowers fixture\n')
  writeText(path.join(superpowersDir, 'agents', 'code-reviewer.md'), '# nested fixture\n')

  const server = await startServer({
    config: createBaseConfig(),
  })

  try {
    const result = await requestJson(server.url, '/api/install', {
      method: 'POST',
      body: {
        channels: [],
        api: {
          baseUrl: 'https://install.example.com/v1',
          apiKey: 'install-api-key',
          model: 'gpt-4o-mini',
        },
      },
    })

    assert.equal(result.status, 200)
    assert.equal(result.body.ok, true)
    assert.equal(
      fs.readFileSync(path.join(server.userHome, '.claude', 'skills', 'superpowers', 'agents', 'code-reviewer.md'), 'utf8'),
      '# nested fixture\n',
    )
    assert.equal(
      fs.readFileSync(path.join(server.userHome, '.codex', 'skills', 'superpowers', 'agents', 'code-reviewer.md'), 'utf8'),
      '# nested fixture\n',
    )
  } finally {
    await server.stop()
    fs.rmSync(superpowersDir, { recursive: true, force: true })
    if (hadExisting) {
      fs.renameSync(backupDir, superpowersDir)
    }
  }
})

test('POST /api/config/api still accepts legacy model field while model-routing stays the single-mode authority', async () => {
  const server = await startServer({
    config: createBaseConfig(),
    uiMeta: {
      modelRouting: {
        singleModeDefaultModel: 'authority-model',
      },
    },
  })

  try {
    const result = await requestJson(server.url, '/api/config/api', {
      method: 'POST',
      body: {
        baseUrl: 'https://new-endpoint.example.com/chat/completions',
        apiKey: 'new-saved-api-key',
        model: 'legacy-client-model',
      },
    })
    assert.equal(result.status, 200)
    assert.equal(result.body.ok, true)

    const config = readJson(server.configFile)
    assert.equal(config.models.providers.openai.baseUrl, 'https://new-endpoint.example.com/v1')
    assert.equal(config.models.providers.openai.models[0].id, 'legacy-client-model')

    const auth = readJson(server.authFile)
    assert.equal(auth.profiles['openai:default'].key, 'new-saved-api-key')

    const modelRouting = await requestJson(server.url, '/api/config/model-routing')
    assert.equal(modelRouting.status, 200)
    assert.equal(modelRouting.body.singleModeDefaultModel, 'authority-model')
    assert.equal(modelRouting.body.effectivePrimaryModel, 'openai/gpt-4o-mini')
  } finally {
    await server.stop()
  }
})
