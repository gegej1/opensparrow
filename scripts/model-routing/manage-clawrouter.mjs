#!/usr/bin/env node

import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  CLAWROUTER_MODEL_TARGET,
  CLAWROUTER_PROVIDER,
  DEFAULT_CLAWROUTER_PORT,
  DEFAULT_CLAWROUTER_VERSION,
  buildClawRouterProviderConfig,
  buildRoutingStateSnapshot,
  mergeFallbacksForEnable,
  mergeProviderAuth,
  normalizePort,
  normalizeFallbacks,
  stripProviderAuth,
} from './lib/model-routing.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = resolveRepoRoot()
const openclawHome = path.resolve(process.env.OPENCLAW_HOME || process.env.HOME || os.homedir())
const profile = String(process.env.OPENCLAW_PROFILE || process.env.OPENCLAW_PROFILE_NAME || 'usb-portable').trim() || 'usb-portable'
const routerVersion = String(process.env.OPENSPARROW_CLAWROUTER_VERSION || DEFAULT_CLAWROUTER_VERSION).trim() || DEFAULT_CLAWROUTER_VERSION
const port = normalizePort(process.env.OPENSPARROW_CLAWROUTER_PORT || process.env.BLOCKRUN_PROXY_PORT || DEFAULT_CLAWROUTER_PORT)
const runtime = resolveRuntime()
const profileDir = path.join(openclawHome, `.openclaw-${profile}`)
const routingDir = path.join(profileDir, 'model-routing')
const runtimeDir = path.join(routingDir, 'clawrouter-runtime')
const stateFile = path.join(routingDir, 'clawrouter-state.json')
const pidFile = path.join(routingDir, 'clawrouter.pid')
const logFile = path.join(routingDir, 'clawrouter.log')
const configFile = path.join(profileDir, 'openclaw.json')
const authFile = path.join(profileDir, 'agents', 'main', 'agent', 'auth-profiles.json')

const args = process.argv.slice(2)
const command = String(args[0] ?? 'status').trim() || 'status'

try {
  switch (command) {
    case 'enable':
      await enableRouting()
      break
    case 'disable':
      await disableRouting()
      break
    case 'status':
      await printStatus()
      break
    case 'start-proxy':
      await ensureProxyRunning({ allowInstall: true })
      await printStatus()
      break
    case 'stop-proxy':
      await stopProxy({ ownedOnly: false })
      await printStatus()
      break
    default:
      printUsage()
      process.exitCode = 1
  }
} catch (error) {
  console.error(`[model-routing] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

function printUsage() {
  console.log(`Usage: manage-clawrouter.mjs <enable|disable|status|start-proxy|stop-proxy>`)
}

function resolveRepoRoot() {
  const envRoot = String(process.env.OPENSPARROW_ROOT ?? '').trim()
  if (envRoot && fs.existsSync(path.join(envRoot, 'AGENTS.md'))) return path.resolve(envRoot)

  let current = path.resolve(__dirname, '..', '..')
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return path.resolve(__dirname, '..', '..')
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

  throw new Error('无法找到 OpenClaw bundled runtime（已检查 USB_RUNTIME_ROOT、vendor/mac-openclaw、runtime）')
}

function resolveRuntime() {
  const runtimeRoot = resolveRuntimeRoot()
  const nodeBin = findFirstExisting([
    path.join(runtimeRoot, 'bin', 'node'),
    path.join(runtimeRoot, 'node', 'bin', 'node'),
    path.join(runtimeRoot, 'node', 'node'),
  ])
  const npmCli = findFirstExisting([
    path.join(runtimeRoot, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(runtimeRoot, 'bin', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ])
  const openclawEntry = findFirstExisting([
    path.join(runtimeRoot, 'lib', 'node_modules', 'openclaw', 'openclaw.mjs'),
    path.join(runtimeRoot, 'bin', 'node_modules', 'openclaw', 'openclaw.mjs'),
    path.join(runtimeRoot, 'bin', 'openclaw'),
  ])

  if (!nodeBin || !npmCli || !openclawEntry) {
    throw new Error('bundled runtime 缺少 node / npm / openclaw 入口，无法继续')
  }

  return { runtimeRoot, nodeBin, npmCli, openclawEntry }
}

function findFirstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return ''
}

function childEnv(extra = {}) {
  return {
    ...process.env,
    HOME: openclawHome,
    OPENCLAW_HOME: openclawHome,
    BLOCKRUN_PROXY_PORT: String(port),
    ...extra,
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function readConfig() {
  return readJson(configFile, {}) ?? {}
}

function currentPrimary(config = readConfig()) {
  return String(config?.agents?.defaults?.model?.primary ?? '').trim()
}

function currentFallbacks(config = readConfig()) {
  return normalizeFallbacks(config?.agents?.defaults?.model?.fallbacks)
}

function currentProviderConfig(config = readConfig()) {
  return config?.models?.providers?.[CLAWROUTER_PROVIDER] ?? null
}

function currentAuthProfiles() {
  return readJson(authFile, null)
}

function pruneManagedAliasFromConfig() {
  const config = readConfig()
  const models = config?.agents?.defaults?.models
  if (!models || typeof models !== 'object') return

  const primary = currentPrimary(config)
  const fallbacks = currentFallbacks(config)
  if (primary === CLAWROUTER_MODEL_TARGET || fallbacks.includes(CLAWROUTER_MODEL_TARGET)) return
  if (!Object.prototype.hasOwnProperty.call(models, CLAWROUTER_MODEL_TARGET)) return

  delete models[CLAWROUTER_MODEL_TARGET]
  writeJson(configFile, config)
}

async function runCommand(commandPath, commandArgs, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(commandPath, commandArgs, {
      cwd: options.cwd || repoRoot,
      env: childEnv(options.env),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function runOpenClaw(args, options = {}) {
  const result = await runCommand(runtime.nodeBin, [runtime.openclawEntry, '--profile', profile, ...args], options)
  if (!options.allowFailure && result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `openclaw ${args.join(' ')} failed`)
  }
  return result
}

async function runNpmInstall() {
  ensureDir(runtimeDir)
  const spec = `@blockrun/clawrouter@${routerVersion}`
  const result = await runCommand(runtime.nodeBin, [
    runtime.npmCli,
    'install',
    '--prefix',
    runtimeDir,
    '--no-audit',
    '--no-fund',
    spec,
  ])
  if (result.code !== 0) {
    throw new Error(`安装 ClawRouter 失败：${result.stderr.trim() || result.stdout.trim()}`)
  }
}

async function ensureRuntimeInstall() {
  const pkgFile = path.join(runtimeDir, 'node_modules', '@blockrun', 'clawrouter', 'package.json')
  const installed = readJson(pkgFile, null)
  if (installed?.version === routerVersion) return installed
  await runNpmInstall()
  const pkg = readJson(pkgFile, null)
  if (!pkg?.version) throw new Error('ClawRouter 安装后未找到 package.json')
  return pkg
}

function routerCliPath() {
  return path.join(runtimeDir, 'node_modules', '@blockrun', 'clawrouter', 'dist', 'cli.js')
}

function isPidRunning(pid) {
  const parsed = Number.parseInt(String(pid ?? ''), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return false
  try {
    process.kill(parsed, 0)
    return true
  } catch {
    return false
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchHealth(timeoutMs = 1500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal })
    const text = await response.text()
    const data = text ? JSON.parse(text) : null
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

async function isPortBusy(targetPort) {
  return await new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (error) => {
      const code = error && typeof error === 'object' ? error.code : ''
      resolve(code === 'EADDRINUSE' || code === 'EACCES')
    })
    server.once('listening', () => {
      server.close(() => resolve(false))
    })
    server.listen({ host: '127.0.0.1', port: targetPort, exclusive: true })
  })
}

async function waitForHealth(timeoutMs = 20000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const health = await fetchHealth()
    if (health.ok) return health
    await sleep(500)
  }
  return { ok: false, status: 0, error: 'timeout' }
}

async function startProxy() {
  ensureDir(routingDir)

  const health = await fetchHealth()
  if (health.ok) return { started: false, reused: true, proxyOwned: false, health }

  if (await isPortBusy(port)) {
    throw new Error(`端口 ${port} 已被其他进程占用，且不是可复用的 ClawRouter /health`) 
  }

  await ensureRuntimeInstall()
  const cliPath = routerCliPath()
  if (!fs.existsSync(cliPath)) throw new Error('ClawRouter CLI 不存在，安装不完整')

  const logFd = fs.openSync(logFile, 'a')
  const child = spawn(runtime.nodeBin, [cliPath, '--port', String(port)], {
    cwd: runtimeDir,
    env: childEnv({ BLOCKRUN_PROXY_PORT: String(port) }),
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })
  child.unref()
  fs.closeSync(logFd)
  fs.writeFileSync(pidFile, `${child.pid}\n`, 'utf8')

  const nextHealth = await waitForHealth()
  if (!nextHealth.ok) {
    throw new Error(`ClawRouter 启动后健康检查失败；请查看 ${logFile}`)
  }

  return { started: true, reused: false, proxyOwned: true, health: nextHealth }
}

async function stopProxy(options = {}) {
  const ownedOnly = options.ownedOnly !== false
  const state = readJson(stateFile, null)
  if (ownedOnly && state && !state.proxyOwned) {
    return { stopped: false, skipped: true, reason: 'proxy-not-owned' }
  }

  const pid = fs.existsSync(pidFile) ? Number.parseInt(fs.readFileSync(pidFile, 'utf8'), 10) : 0
  if (!isPidRunning(pid)) {
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile)
    return { stopped: false, skipped: true, reason: 'pid-missing' }
  }

  process.kill(pid, 'SIGTERM')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isPidRunning(pid)) break
    await sleep(250)
  }
  if (isPidRunning(pid)) {
    process.kill(pid, 'SIGKILL')
  }
  if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile)
  return { stopped: true, skipped: false }
}

async function ensureProxyRunning(options = {}) {
  const health = await fetchHealth()
  if (health.ok) return { proxyOwned: false, health, installed: false, reused: true }
  if (await isPortBusy(port)) {
    throw new Error(`端口 ${port} 已被其他进程占用，无法为 ClawRouter 启动代理`) 
  }
  if (options.allowInstall !== false) {
    await ensureRuntimeInstall()
  }
  return await startProxy()
}

async function setFallbacks(fallbacks) {
  await runOpenClaw(['models', 'fallbacks', 'clear'], { allowFailure: true })
  for (const fallback of normalizeFallbacks(fallbacks)) {
    await runOpenClaw(['models', 'fallbacks', 'add', fallback])
  }
}

async function applyProviderConfig(providerConfig) {
  await runOpenClaw([
    'config', 'set',
    `models.providers.${CLAWROUTER_PROVIDER}`,
    JSON.stringify(providerConfig),
    '--strict-json',
  ])
}

async function removeProviderConfig() {
  const result = await runOpenClaw(['config', 'unset', `models.providers.${CLAWROUTER_PROVIDER}`], { allowFailure: true })
  const message = `${result.stdout}\n${result.stderr}`
  if (result.code !== 0 && !message.includes('config path not found')) {
    throw new Error(message.trim() || `config unset models.providers.${CLAWROUTER_PROVIDER} failed`)
  }
}

async function bestEffortRollback(state) {
  try {
    if (state?.previousAuthProfiles) {
      writeJson(authFile, state.previousAuthProfiles)
    }
    if (state?.previousProviderConfig) {
      await applyProviderConfig(state.previousProviderConfig)
    } else {
      await removeProviderConfig()
    }
    if (state?.previousPrimary) {
      await runOpenClaw(['models', 'set', state.previousPrimary], { allowFailure: true })
    }
    if (state) {
      await setFallbacks(state.previousFallbacks)
    }
    pruneManagedAliasFromConfig()
  } catch {}
}

async function enableRouting() {
  ensureDir(routingDir)
  const config = readConfig()
  const existingState = readJson(stateFile, null)
  const previousPrimary = currentPrimary(config)
  const previousFallbacks = currentFallbacks(config)
  const previousProviderConfig = currentProviderConfig(config)
  const previousAuthProfiles = currentAuthProfiles()
  const baselineState = existingState ?? buildRoutingStateSnapshot({
    port,
    routerVersion,
    previousPrimary: previousPrimary === CLAWROUTER_MODEL_TARGET ? '' : previousPrimary,
    previousFallbacks: previousPrimary === CLAWROUTER_MODEL_TARGET && existingState ? existingState.previousFallbacks : previousFallbacks,
    previousProviderConfig,
    previousAuthProfiles,
  })

  let proxyInfo = null
  try {
    proxyInfo = await ensureProxyRunning({ allowInstall: true })
    const mergedAuth = mergeProviderAuth(previousAuthProfiles, { provider: CLAWROUTER_PROVIDER })
    writeJson(authFile, mergedAuth)

    await applyProviderConfig(buildClawRouterProviderConfig({ port }))
    await runOpenClaw(['models', 'set', CLAWROUTER_MODEL_TARGET])
    await setFallbacks(mergeFallbacksForEnable(baselineState.previousPrimary, baselineState.previousFallbacks))

    writeJson(stateFile, buildRoutingStateSnapshot({
      ...baselineState,
      port,
      routerVersion,
      proxyOwned: Boolean(proxyInfo?.proxyOwned),
      enabledAt: new Date().toISOString(),
    }))
  } catch (error) {
    await bestEffortRollback(baselineState)
    if (proxyInfo?.proxyOwned) await stopProxy({ ownedOnly: false })
    throw error
  }

  await printStatus({ action: 'enabled' })
}

async function disableRouting() {
  const state = readJson(stateFile, null)
  if (!state) {
    const currentAuth = currentAuthProfiles()
    if (currentAuth) {
      writeJson(authFile, stripProviderAuth(currentAuth, CLAWROUTER_PROVIDER))
    }
    await removeProviderConfig()
    await stopProxy({ ownedOnly: false })
    await printStatus({ action: 'disabled-without-state' })
    return
  }

  if (state.previousAuthProfiles) {
    writeJson(authFile, state.previousAuthProfiles)
  } else {
    const currentAuth = currentAuthProfiles()
    if (currentAuth) writeJson(authFile, stripProviderAuth(currentAuth, CLAWROUTER_PROVIDER))
  }

  if (state.previousProviderConfig) {
    await applyProviderConfig(state.previousProviderConfig)
  } else {
    await removeProviderConfig()
  }

  if (state.previousPrimary) {
    await runOpenClaw(['models', 'set', state.previousPrimary])
  }
  await setFallbacks(state.previousFallbacks)
  pruneManagedAliasFromConfig()

  if (state.proxyOwned) {
    await stopProxy({ ownedOnly: false })
  }
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile)

  await printStatus({ action: 'disabled' })
}

async function printStatus(extra = {}) {
  const config = readConfig()
  const state = readJson(stateFile, null)
  const health = await fetchHealth()
  const installedPkg = readJson(path.join(runtimeDir, 'node_modules', '@blockrun', 'clawrouter', 'package.json'), null)

  const output = {
    ok: true,
    action: extra.action || 'status',
    profile,
    openclawHome,
    repoRoot,
    port,
    enabled: currentPrimary(config) === CLAWROUTER_MODEL_TARGET,
    primaryModel: currentPrimary(config),
    fallbacks: currentFallbacks(config),
    providerConfigured: Boolean(currentProviderConfig(config)),
    proxyHealthy: Boolean(health.ok),
    proxyStatus: health.status || 0,
    proxyOwned: Boolean(state?.proxyOwned),
    stateFile: fs.existsSync(stateFile) ? stateFile : null,
    runtimeInstalled: Boolean(installedPkg?.version),
    clawrouterVersion: installedPkg?.version || null,
    previousPrimary: state?.previousPrimary || null,
    logFile: fs.existsSync(logFile) ? logFile : null,
  }

  console.log(JSON.stringify(output, null, 2))
}
