#!/usr/bin/env node

import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { DEFAULT_CLAWROUTER_VERSION } from './lib/model-routing.mjs'
import {
  DEFAULT_DMX_BASE_URL,
  DEFAULT_DMX_ROUTER_PORT,
  extractPromptFromMessages,
  normalizePreview,
  selectDemoModelForTier,
} from './lib/dmx-demo-routing.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = resolveRepoRoot()
const port = normalizePort(process.env.OPENSPARROW_DMX_ROUTER_PORT, DEFAULT_DMX_ROUTER_PORT)
const routerVersion = String(process.env.OPENSPARROW_CLAWROUTER_VERSION || DEFAULT_CLAWROUTER_VERSION).trim() || DEFAULT_CLAWROUTER_VERSION
const dmxBaseUrl = String(process.env.OPENSPARROW_DMX_BASE_URL || process.env.DMX_BASE_URL || DEFAULT_DMX_BASE_URL).trim().replace(/\/+$/, '')
const dmxApiKey = String(process.env.OPENSPARROW_DMX_API_KEY || process.env.DMX_API_KEY || '').trim()
const runtimeRoot = path.join(repoRoot, 'dist', 'dmx-router-demo', 'clawrouter-runtime')
const stateRoot = path.join(repoRoot, 'dist', 'dmx-router-demo')
const pidFile = path.join(stateRoot, 'dmx-router-demo.pid')

if (!dmxApiKey) {
  console.error('[dmx-router-demo] missing OPENSPARROW_DMX_API_KEY / DMX_API_KEY')
  process.exit(1)
}

const runtime = resolveRuntime()
await ensureClawRouterInstalled()
const clawrouter = await import(pathToFileURL(path.join(runtimeRoot, 'node_modules', '@blockrun', 'clawrouter', 'dist', 'index.js')).href)
const { route, DEFAULT_ROUTING_CONFIG, BLOCKRUN_MODELS } = clawrouter
const modelPricing = new Map()
for (const model of BLOCKRUN_MODELS) {
  modelPricing.set(model.id, { inputPrice: model.inputPrice, outputPrice: model.outputPrice })
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        port,
        baseUrl: dmxBaseUrl,
        task: 'dmx-router-demo',
      })
    }

    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
      return json(res, 404, { error: { message: 'not found' } })
    }

    const body = await readJsonBody(req)
    const prompt = extractPromptFromMessages(body?.messages)
    if (!prompt) {
      return json(res, 400, { error: { message: 'missing user prompt in messages' } })
    }

    const maxTokens = normalizePort(body?.max_tokens, 256)
    const startedAt = Date.now()
    const decision = route(prompt, undefined, maxTokens, {
      config: DEFAULT_ROUTING_CONFIG,
      modelPricing,
    })
    const selectedModel = selectDemoModelForTier(decision.tier)
    const upstream = await callDmxUpstream({
      baseUrl: dmxBaseUrl,
      apiKey: dmxApiKey,
      model: selectedModel,
      prompt,
      maxTokens,
    })

    const durationMs = Date.now() - startedAt
    const preview = normalizePreview(upstream.json?.choices?.[0]?.message?.content ?? upstream.json?.error?.message ?? '')
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      port,
      tier: decision.tier,
      classifierModel: decision.model,
      selectedModel,
      providerModel: upstream.json?.model ?? null,
      finishReason: upstream.json?.choices?.[0]?.finish_reason ?? null,
      status: upstream.status,
      durationMs,
      promptPreview: normalizePreview(prompt, 120),
      responsePreview: preview,
    }))

    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('x-demo-tier', String(decision.tier))
    res.setHeader('x-demo-classifier-model', String(decision.model ?? ''))
    res.setHeader('x-demo-selected-model', String(selectedModel))
    res.setHeader('x-demo-provider-model', String(upstream.json?.model ?? ''))
    res.statusCode = upstream.status
    res.end(`${JSON.stringify(upstream.json)}\n`)
  } catch (error) {
    console.error(`[dmx-router-demo] ${error instanceof Error ? error.message : String(error)}`)
    json(res, 500, { error: { message: error instanceof Error ? error.message : String(error) } })
  }
})

server.on('error', async (error) => {
  if (error && error.code === 'EADDRINUSE') {
    const running = await checkHealth(port)
    if (running) {
      console.error(`[dmx-router-demo] already running on http://127.0.0.1:${port}`)
      process.exit(0)
    }
    console.error(`[dmx-router-demo] port ${port} already in use by another process`)
    process.exit(1)
  }
  console.error(`[dmx-router-demo] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})

server.listen(port, '127.0.0.1', () => {
  ensureDir(stateRoot)
  fs.writeFileSync(pidFile, `${process.pid}
`, 'utf8')
  console.log(`[dmx-router-demo] listening on http://127.0.0.1:${port}`)
  console.log(`[dmx-router-demo] upstream=${dmxBaseUrl}`)
  console.log('[dmx-router-demo] send requests to POST /v1/chat/completions')
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile)
    } catch {}
    server.close(() => process.exit(0))
  })
}

function resolveRepoRoot() {
  let current = path.resolve(__dirname, '..', '..')
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return path.resolve(__dirname, '..', '..')
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback
}

function resolveRuntimeRoot() {
  const candidates = [
    String(process.env.USB_RUNTIME_ROOT ?? '').trim(),
    path.join(repoRoot, 'vendor', 'mac-openclaw'),
    path.join(repoRoot, 'runtime'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return path.resolve(candidate)
  }
  throw new Error('cannot find bundled runtime')
}

function resolveRuntime() {
  const root = resolveRuntimeRoot()
  const nodeBin = firstExisting([
    path.join(root, 'bin', 'node'),
    path.join(root, 'node', 'bin', 'node'),
    path.join(root, 'node', 'node'),
  ])
  const npmCli = firstExisting([
    path.join(root, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(root, 'bin', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ])
  if (!nodeBin || !npmCli) throw new Error('bundled runtime missing node/npm')
  return { root, nodeBin, npmCli }
}

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return ''
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

async function runCommand(commandPath, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(commandPath, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function ensureClawRouterInstalled() {
  const pkgFile = path.join(runtimeRoot, 'node_modules', '@blockrun', 'clawrouter', 'package.json')
  const installed = readJsonFile(pkgFile)
  if (installed?.version === routerVersion) return
  ensureDir(runtimeRoot)
  const result = await runCommand(runtime.nodeBin, [
    runtime.npmCli,
    'install',
    '--prefix',
    runtimeRoot,
    '--no-audit',
    '--no-fund',
    `@blockrun/clawrouter@${routerVersion}`,
  ], {
    env: { ...process.env, HOME: process.env.HOME || os.homedir() },
  })
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'failed to install clawrouter runtime')
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

async function callDmxUpstream({ baseUrl, apiKey, model, prompt, maxTokens }) {
  const payload = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: maxTokens,
  })
  const marker = '__HTTP_STATUS__:'
  const result = await runCommand('curl', [
    '--retry', '3',
    '--retry-delay', '1',
    '--retry-all-errors',
    '--connect-timeout', '15',
    '--max-time', '120',
    '-sS',
    '-H', `Authorization: Bearer ${apiKey}`,
    '-H', 'Content-Type: application/json',
    '-d', payload,
    '-w', `\n${marker}%{http_code}`,
    `${baseUrl}/chat/completions`,
  ])
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'dmx upstream request failed')
  }
  const output = String(result.stdout)
  const index = output.lastIndexOf(marker)
  if (index === -1) throw new Error('cannot parse upstream status marker')
  const rawBody = output.slice(0, index).trim()
  const status = Number.parseInt(output.slice(index + marker.length).trim(), 10) || 200
  return {
    status,
    json: rawBody ? JSON.parse(rawBody) : {},
  }
}

function json(res, status, data) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(`${JSON.stringify(data)}\n`)
}

async function checkHealth(targetPort) {
  return await new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port: targetPort, path: '/health', method: 'GET', timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200)
      res.resume()
    })
    req.on('timeout', () => { req.destroy(); resolve(false) })
    req.on('error', () => resolve(false))
    req.end()
  })
}
