import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-static-assets-'))
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

    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('exit', onExit)
    }
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`ui server did not become ready within ${timeoutMs}ms\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, timeoutMs)
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
      reject(new Error(`ui server exited before ready (code=${code}, signal=${signal})\nstdout:\n${stdout}\nstderr:\n${stderr}`))
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

async function startUiServer(testContext) {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const gatewayPort = await findFreePort()

  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_ROUTER_PORT: String(routerPort),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await waitForServerReady(child, uiPort)
  testContext.after(async () => {
    await stopChild(child)
  })

  return `http://127.0.0.1:${uiPort}`
}

test('dashboard server keeps logo.png reachable as a public static resource', { timeout: 15000 }, async (t) => {
  const baseUrl = await startUiServer(t)

  const response = await fetch(`${baseUrl}/logo.png`)
  const body = await response.arrayBuffer()

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') ?? '', /^image\/png\b/)
  assert.equal(body.byteLength > 0, true)
})
