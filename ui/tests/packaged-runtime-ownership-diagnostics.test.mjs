import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  classifyRuntimeOwnership,
} from '../lib/runtime-ownership.mjs'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

const CURRENT = {
  uiPid: 4725,
  uiPort: 19000,
  gatewayPort: 18929,
  routerPort: 18412,
  profile: 'gtclaw-portable',
  packRoot: '/pack/current',
  runtimeRoot: '/pack/current/vendor/mac-openclaw',
  openclawHome: '/pack/current/.gtclaw-state',
  profileDir: '/pack/current/.gtclaw-state/.openclaw-gtclaw-portable',
  configPath: '/pack/current/.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json',
}

test('runtime ownership classifies current gateway, daemon, router, and foreign channel candidates', () => {
  const result = classifyRuntimeOwnership({
    current: CURRENT,
    processes: [
      {
        pid: 4725,
        ppid: 4643,
        command: '/pack/current/vendor/mac-openclaw/bin/node /pack/current/ui/server.mjs',
        executablePath: '/pack/current/vendor/mac-openclaw/bin/node',
        openFiles: [
          '/pack/current/ui/server.mjs',
        ],
        listeningPorts: [19000, 18412],
        externalTcp443Count: 0,
      },
      {
        pid: 28834,
        ppid: 1,
        command: 'openclaw',
        executablePath: '/pack/current/vendor/mac-openclaw/bin/node',
        openFiles: [
          '/pack/current/.gtclaw-state/.openclaw-gtclaw-portable/logs/gateway.log',
        ],
        listeningPorts: [],
        externalTcp443Count: 0,
      },
      {
        pid: 28840,
        ppid: 28834,
        command: 'openclaw-gateway',
        executablePath: '/pack/current/vendor/mac-openclaw/bin/node',
        openFiles: [
          '/pack/current/.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json',
          '/pack/current/.gtclaw-state/.openclaw-gtclaw-portable/logs/gateway.log',
        ],
        listeningPorts: [18929],
        externalTcp443Count: 4,
      },
      {
        pid: 23446,
        ppid: 1,
        command: 'openclaw-gateway',
        executablePath: '/source/vendor/mac-openclaw/bin/node',
        openFiles: [
          '/Users/example/.openclaw-usb-portable/openclaw.json',
          '/Users/example/.openclaw-usb-portable/logs/gateway.log',
        ],
        listeningPorts: [18889],
        externalTcp443Count: 1,
      },
    ],
  })

  assert.equal(result.currentUi.pid, 4725)
  assert.equal(result.currentRouter.pid, 4725)
  assert.equal(result.currentGateway.pid, 28840)
  assert.equal(result.currentGateway.classification, 'current')
  assert.equal(result.currentDaemon.pid, 28834)
  assert.equal(result.currentDaemon.classification, 'current')

  assert.equal(result.foreignOpenClawProcesses.length, 1)
  assert.equal(result.foreignOpenClawProcesses[0].pid, 23446)
  assert.equal(result.foreignOpenClawProcesses[0].classification, 'foreign')
  assert.equal(result.foreignOpenClawProcesses[0].openclawHome, '/Users/example/.openclaw-usb-portable')
  assert.equal(result.foreignOpenClawProcesses[0].configPath, '/Users/example/.openclaw-usb-portable/openclaw.json')
  assert.equal(result.foreignOpenClawProcesses[0].runtimeRoot, '/source/vendor/mac-openclaw')

  assert.equal(result.liveChannelOwnerCandidates.length, 2)
  assert.deepEqual(result.liveChannelOwnerCandidates.map((candidate) => candidate.pid), [28840, 23446])
  assert.deepEqual(result.liveChannelOwnerCandidates.map((candidate) => candidate.classification), ['current', 'foreign'])
  assert.equal(result.summary.gatewayOwner, 'current')
  assert.equal(result.summary.daemonOwner, 'current')
  assert.equal(result.summary.routerOwner, 'current')
  assert.equal(result.summary.liveChannelOwner, 'ambiguous_with_foreign_candidates')
})

test('runtime ownership reports foreign gateway listener instead of authoritative current gateway', () => {
  const result = classifyRuntimeOwnership({
    current: CURRENT,
    processes: [
      {
        pid: 23446,
        ppid: 1,
        command: 'openclaw-gateway',
        executablePath: '/source/vendor/mac-openclaw/bin/node',
        openFiles: [
          '/Users/example/.openclaw-usb-portable/openclaw.json',
        ],
        listeningPorts: [18929],
        externalTcp443Count: 1,
      },
    ],
  })

  assert.equal(result.currentGateway.pid, 23446)
  assert.equal(result.currentGateway.classification, 'foreign')
  assert.equal(result.summary.gatewayOwner, 'foreign')
  assert.equal(result.summary.liveChannelOwner, 'foreign_only')
})

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-runtime-ownership-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function getProfileDir(homeDir, profile = 'gtclaw-portable') {
  return path.join(homeDir, `.openclaw-${profile}`)
}

function getConfigPath(homeDir, profile = 'gtclaw-portable') {
  return path.join(getProfileDir(homeDir, profile), 'openclaw.json')
}

function writeFakeOpenClawRuntime(runtimeRoot) {
  const binDir = path.join(runtimeRoot, 'bin')
  const openclawDir = path.join(runtimeRoot, 'openclaw')
  ensureDir(binDir)
  ensureDir(openclawDir)
  try {
    fs.symlinkSync(process.execPath, path.join(binDir, 'node'))
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  fs.writeFileSync(path.join(openclawDir, 'openclaw.mjs'), `
const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
if (args[0] === 'daemon' && args[1] === 'status') {
  process.stdout.write('{"service":{"runtime":{"status":"running"},"rpc":{"healthy":true}}}')
  process.exit(0)
}
if (args[0] === 'health') {
  process.stdout.write('{"ok":true}')
  process.exit(0)
}
process.stderr.write('unsupported fake openclaw command: ' + args.join(' ') + '\\n')
process.exit(1)
`, 'utf8')
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => {
        if (error) reject(error)
        else resolve(port)
      })
    })
    server.on('error', reject)
  })
}

async function waitForServerReady(child, port, timeoutMs = 15000) {
  const target = `Listening: http://localhost:${port}`
  await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`server did not become ready\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, timeoutMs)
    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('exit', onExit)
    }
    const onStdout = (chunk) => {
      stdout += chunk.toString()
      if (stdout.includes(target)) {
        cleanup()
        resolve()
      }
    }
    const onStderr = (chunk) => {
      stderr += chunk.toString()
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`server exited before ready code=${code} signal=${signal}\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }
    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('exit', onExit)
  })
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
    }, 2000)
    child.once('exit', () => {
      clearTimeout(timeoutId)
      resolve()
    })
  })
}

test('/api/status exposes source-owned runtime ownership diagnostics', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const profile = 'gtclaw-portable'
  const configPath = getConfigPath(homeDir, profile)
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const gatewayPort = await findFreePort()
  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(configPath, {
    agents: { defaults: { model: { primary: 'opensparrow-router/auto' } } },
    models: {
      providers: {
        'opensparrow-router': {
          type: 'openai-compatible',
          baseUrl: `http://127.0.0.1:${routerPort}/v1`,
          models: [{ id: 'auto' }],
        },
      },
    },
  })

  const ownershipSnapshot = [
    {
      pid: 28840,
      ppid: 28834,
      command: 'openclaw-gateway',
      executablePath: path.join(runtimeRoot, 'bin', 'node'),
      openFiles: [
        configPath,
        path.join(getProfileDir(homeDir, profile), 'logs', 'gateway.log'),
      ],
      listeningPorts: [gatewayPort],
      externalTcp443Count: 2,
    },
    {
      pid: 23446,
      ppid: 1,
      command: 'openclaw-gateway',
      executablePath: '/source/vendor/mac-openclaw/bin/node',
      openFiles: [
        '/Users/example/.openclaw-usb-portable/openclaw.json',
      ],
      listeningPorts: [18889],
      externalTcp443Count: 1,
    },
  ]

  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENCLAW_PROFILE: profile,
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENSPARROW_ROUTER_PORT: String(routerPort),
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_AUTO_OPEN: '0',
      USB_RUNTIME_ROOT: runtimeRoot,
      OPENSPARROW_RUNTIME_OWNERSHIP_SNAPSHOT_JSON: JSON.stringify(ownershipSnapshot),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(async () => {
    await stopChild(child)
  })

  await waitForServerReady(child, uiPort)

  const response = await fetch(`http://127.0.0.1:${uiPort}/api/status`)
  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.runtimeOwnership.available, true)
  assert.equal(payload.runtimeOwnership.currentGateway.pid, 28840)
  assert.equal(payload.runtimeOwnership.currentGateway.classification, 'current')
  assert.equal(payload.runtimeOwnership.foreignOpenClawProcesses[0].pid, 23446)
  assert.equal(payload.runtimeOwnership.summary.gatewayOwner, 'current')
  assert.equal(payload.runtimeOwnership.summary.liveChannelOwner, 'ambiguous_with_foreign_candidates')
  assert.equal(payload.modelAuthority.effectivePrimaryModel, 'opensparrow-router/auto')
  assert.equal(payload.modelAuthority.providerId, 'opensparrow-router')
  assert.equal(payload.modelAuthority.modelId, 'auto')
  assert.equal(payload.modelAuthority.routerUrlOrigin, `http://127.0.0.1:${routerPort}`)
  assert.equal(payload.routerInvocation.invokedSinceStart, false)
  assert.equal(payload.routerInvocation.last, null)
  assert.equal(payload.routerInvocation.routerUrlOrigin, `http://127.0.0.1:${routerPort}`)
})
