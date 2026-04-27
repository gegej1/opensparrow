import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-bundled-readiness-status-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function copyStatusServerPackRoot(packRoot) {
  ensureDir(path.join(packRoot, 'ui'))
  ensureDir(path.join(packRoot, 'scripts', 'model-routing', 'lib'))
  fs.copyFileSync(path.join(REPO_ROOT, 'ui', 'server.mjs'), path.join(packRoot, 'ui', 'server.mjs'))
  fs.copyFileSync(path.join(REPO_ROOT, 'ui', 'install-helpers.mjs'), path.join(packRoot, 'ui', 'install-helpers.mjs'))
  fs.cpSync(path.join(REPO_ROOT, 'ui', 'lib'), path.join(packRoot, 'ui', 'lib'), {
    recursive: true,
    force: true,
  })
  fs.copyFileSync(
    path.join(REPO_ROOT, 'scripts', 'model-routing', 'lib', 'custom-plugin-routing.mjs'),
    path.join(packRoot, 'scripts', 'model-routing', 'lib', 'custom-plugin-routing.mjs'),
  )
}

function writeFakeOpenClawRuntime(runtimeRoot) {
  const binDir = path.join(runtimeRoot, 'bin')
  const openclawDir = path.join(runtimeRoot, 'openclaw')
  ensureDir(binDir)
  ensureDir(openclawDir)

  const nodeLinkPath = path.join(binDir, 'node')
  try {
    fs.symlinkSync(process.execPath, nodeLinkPath)
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

process.stderr.write(\`unsupported fake openclaw command: \${args.join(' ')}\\n\`)
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

  return await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`ui server did not become ready within ${timeoutMs}ms\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, timeoutMs)

    const onStdout = (chunk) => {
      stdout += chunk.toString()
      if (stdout.includes(target)) {
        cleanup()
        resolve({ stdout, stderr })
      }
    }
    const onStderr = (chunk) => {
      stderr += chunk.toString()
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`ui server exited before ready (code=${code}, signal=${signal})\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('exit', onExit)
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

function getProfileDir(homeDir, profile = 'usb-portable') {
  return path.join(homeDir, `.openclaw-${profile}`)
}

async function startPackagedStatusServer({ packRoot, homeDir, runtimeRoot, port, gatewayPort }) {
  const child = spawn(process.execPath, [path.join(packRoot, 'ui', 'server.mjs')], {
    cwd: packRoot,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENSPARROW_PACKAGED_RUNTIME: '1',
      OPENSPARROW_REQUIRE_BUNDLED_PLUGINS: '1',
      USB_RUNTIME_ROOT: runtimeRoot,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await waitForServerReady(child, port)
  return child
}

async function getJson(url) {
  const response = await fetch(url)
  const payload = await response.json()
  return { status: response.status, payload }
}

test('/api/status exposes bundled plugin readiness and active packRoot when bundled archives are required', { timeout: 15000 }, async (t) => {
  const packRoot = makeTempDir()
  const realPackRoot = fs.realpathSync(packRoot)
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  copyStatusServerPackRoot(packRoot)
  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(path.join(getProfileDir(homeDir), 'openclaw.json'), {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://example.test/v1',
          models: [{ id: 'gpt-4o-mini' }],
        },
      },
    },
  })

  ensureDir(path.join(packRoot, 'plugins'))
  fs.writeFileSync(path.join(packRoot, 'plugins', 'wecom-wecom-openclaw-plugin-2026.4.22.tgz'), 'x', 'utf8')

  const child = await startPackagedStatusServer({
    packRoot,
    homeDir,
    runtimeRoot,
    port: uiPort,
    gatewayPort,
  })
  t.after(async () => {
    await stopChild(child)
  })

  const result = await getJson(`http://127.0.0.1:${uiPort}/api/status`)

  assert.equal(result.status, 200)
  assert.equal(result.payload.instance.packRoot, realPackRoot)
  assert.ok(result.payload.bundledPlugins, 'status payload should include bundledPlugins')
  assert.equal(result.payload.bundledPlugins.required, true)
  assert.equal(result.payload.bundledPlugins.ready, false)
  assert.equal(result.payload.bundledPlugins.pluginsDir, path.join(realPackRoot, 'plugins'))
  assert.deepEqual(result.payload.bundledPlugins.missing, ['@openclaw-china/channels'])
  assert.deepEqual(result.payload.bundledPlugins.archives['@openclaw-china/channels'], {
    required: true,
    ready: false,
    archive: null,
  })
  assert.deepEqual(result.payload.bundledPlugins.archives['@wecom/wecom-openclaw-plugin'], {
    required: true,
    ready: true,
    archive: 'plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz',
  })
})
