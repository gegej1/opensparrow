#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  BLOCKRUN_PROVIDER_ID,
  BLOCKRUN_WEB_SEARCH_PROVIDER_ID,
  CLAWROUTER_PLUGIN_ID,
  DEFAULT_CLAWROUTER_VERSION,
  DEFAULT_GATEWAY_PORT,
  DEFAULT_OPENCLAW_VERSION,
  DEFAULT_PROFILE,
  DEFAULT_PROXY_PORT,
  buildAgentProbeArgs,
  buildAgentProbeSessionId,
  buildPluginLabLayout,
  gatewayLogShowsProxyReady,
  cleanupPluginGlobalConfig,
  closeWritableStream,
  cleanupPluginProfileConfig,
  dependencySpecsFromPackageJson,
  patchClawRouterReasoningHeaderSource,
} from './lib/plugin-routing.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = resolveRepoRoot()
const profile = String(process.env.OPENCLAW_PROFILE || process.env.OPENCLAW_PROFILE_NAME || DEFAULT_PROFILE).trim() || DEFAULT_PROFILE
const layout = buildPluginLabLayout(repoRoot, {
  profile,
  labRoot: process.env.OPENSPARROW_MODEL_ROUTING_LAB_ROOT,
})
const openclawVersion = String(process.env.OPENSPARROW_OPENCLAW_VERSION || DEFAULT_OPENCLAW_VERSION).trim() || DEFAULT_OPENCLAW_VERSION
const clawrouterVersion = String(process.env.OPENSPARROW_CLAWROUTER_VERSION || DEFAULT_CLAWROUTER_VERSION).trim() || DEFAULT_CLAWROUTER_VERSION
const gatewayPort = normalizePort(process.env.OPENSPARROW_MODEL_ROUTING_GATEWAY_PORT, DEFAULT_GATEWAY_PORT)
const proxyPort = normalizePort(process.env.OPENSPARROW_CLAWROUTER_PROXY_PORT || process.env.BLOCKRUN_PROXY_PORT, DEFAULT_PROXY_PORT)
const gatewayToken = String(process.env.OPENSPARROW_MODEL_ROUTING_GATEWAY_TOKEN || 'model-routing-lab-token').trim() || 'model-routing-lab-token'
const gatewayLogFile = path.join(layout.logsRoot, 'gateway.log')
const gatewayPidFile = path.join(layout.logsRoot, 'gateway.pid')
const probeAgentId = 'clawrouter-probe'
const probeWorkspaceRoot = path.join(layout.labRoot, 'probe-workspace')
const probeAgentDir = path.join(layout.profileStateRoot, 'agents', probeAgentId, 'agent')
const command = String(process.argv[2] || 'status').trim() || 'status'

try {
  switch (command) {
    case 'install-runtime':
      await ensureCompatibleRuntimeInstalled({ quiet: false })
      break
    case 'enable':
      await enablePlugin()
      break
    case 'disable':
      await disablePlugin()
      break
    case 'status':
      await printStatus()
      break
    case 'test':
      await runValidationSuite()
      break
    case 'openclaw-env':
      printOpenClawEnv()
      break
    default:
      printUsage()
      process.exitCode = 1
  }
} catch (error) {
  console.error(`[model-routing-plugin] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

function printUsage() {
  console.log('Usage: manage-clawrouter-plugin.mjs <install-runtime|enable|disable|status|test|openclaw-env>')
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

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return fallback
  return parsed
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function safeRm(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true })
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

function labEnv(extra = {}) {
  return {
    ...process.env,
    HOME: layout.homeRoot,
    OPENCLAW_HOME: layout.homeRoot,
    OPENCLAW_PROFILE: profile,
    BLOCKRUN_PROXY_PORT: String(proxyPort),
    npm_config_cache: path.join(layout.homeRoot, '.npm'),
    ...extra,
  }
}

function resolveBootstrapRuntime() {
  const candidates = [
    String(process.env.USB_RUNTIME_ROOT ?? '').trim(),
    path.join(repoRoot, 'vendor', 'mac-openclaw'),
    path.join(repoRoot, 'runtime'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    const runtime = resolveRuntime(candidate)
    if (runtime) return runtime
  }

  throw new Error('无法找到可用于 bootstrap 的 OpenClaw runtime（已检查 USB_RUNTIME_ROOT、vendor/mac-openclaw、runtime）')
}

function resolveRuntime(runtimeRoot) {
  const root = path.resolve(runtimeRoot)
  const nodeBin = firstExisting([
    path.join(root, 'bin', 'node'),
    path.join(root, 'node', 'bin', 'node'),
  ])
  const npmCli = firstExisting([
    path.join(root, 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(root, 'bin', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ])
  const corepackBin = firstExisting([
    path.join(root, 'bin', 'corepack'),
  ])
  const openclawBin = firstExisting([
    path.join(root, 'bin', 'openclaw'),
  ])
  const packageJsonPath = firstExisting([
    path.join(root, 'lib', 'node_modules', 'openclaw', 'package.json'),
    path.join(root, 'bin', 'node_modules', 'openclaw', 'package.json'),
  ])

  if (!nodeBin || !npmCli || !corepackBin || !openclawBin || !packageJsonPath) return null
  const version = readJson(packageJsonPath, {})?.version ?? ''
  return {
    root,
    nodeBin,
    npmCli,
    corepackBin,
    openclawBin,
    packageJsonPath,
    version,
  }
}

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return ''
}

async function runCommand(commandPath, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(commandPath, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: options.detached || false,
    })

    let stdout = ''
    let stderr = ''

    if (options.stdin) child.stdin.end(options.stdin)
    else child.stdin.end()

    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function ensureCompatibleRuntimeInstalled({ quiet = true } = {}) {
  const existing = resolveRuntime(layout.runtimeRoot)
  if (existing?.version === openclawVersion) {
    if (!quiet) console.log(`[model-routing-plugin] runtime ready: ${existing.version} (${existing.root})`)
    return existing
  }

  const bootstrap = resolveBootstrapRuntime()
  const parent = path.dirname(layout.runtimeRoot)
  const stageRoot = `${layout.runtimeRoot}.stage-${process.pid}`
  safeRm(stageRoot)
  ensureDir(parent)
  ensureDir(layout.homeRoot)

  console.log(`[model-routing-plugin] bootstrapping OpenClaw ${openclawVersion} -> ${layout.runtimeRoot}`)
  fs.cpSync(bootstrap.root, stageRoot, { recursive: true })

  const staged = resolveRuntime(stageRoot)
  if (!staged) throw new Error('复制 bootstrap runtime 后无法解析 node/npm/openclaw 入口')

  const installResult = await runCommand(staged.nodeBin, [
    staged.npmCli,
    'install',
    '-g',
    '--omit=optional',
    '--prefix',
    stageRoot,
    `openclaw@${openclawVersion}`,
  ], {
    cwd: repoRoot,
    env: labEnv({ OPENCLAW_DISABLE_BUNDLED_PLUGIN_POSTINSTALL: '1' }),
  })

  if (installResult.code !== 0) {
    throw new Error(installResult.stderr.trim() || installResult.stdout.trim() || 'OpenClaw runtime 升级失败')
  }

  safeRm(layout.runtimeRoot)
  fs.renameSync(stageRoot, layout.runtimeRoot)
  const ready = resolveRuntime(layout.runtimeRoot)
  if (!ready || ready.version !== openclawVersion) {
    throw new Error(`兼容 runtime 版本校验失败，期待 ${openclawVersion}，实际 ${ready?.version || 'unknown'}`)
  }

  if (!quiet) console.log(`[model-routing-plugin] runtime ready: ${ready.version} (${ready.root})`)
  return ready
}

async function stagePluginTarball(runtime) {
  ensureDir(layout.cacheRoot)
  const tarballPath = path.join(layout.cacheRoot, `blockrun-clawrouter-${clawrouterVersion}.tgz`)
  if (fs.existsSync(tarballPath)) return tarballPath

  console.log(`[model-routing-plugin] downloading @blockrun/clawrouter@${clawrouterVersion}`)
  const packResult = await runCommand(runtime.nodeBin, [
    runtime.npmCli,
    'pack',
    `@blockrun/clawrouter@${clawrouterVersion}`,
  ], {
    cwd: layout.cacheRoot,
    env: labEnv(),
  })

  if (packResult.code !== 0) {
    throw new Error(packResult.stderr.trim() || packResult.stdout.trim() || '下载 ClawRouter plugin 失败')
  }

  const output = `${packResult.stdout}\n${packResult.stderr}`
  const match = output.match(/blockrun-clawrouter-[^\s]+\.tgz/)
  if (!match) throw new Error('未能从 npm pack 输出解析出 ClawRouter tarball')
  return path.join(layout.cacheRoot, match[0])
}

async function extractPluginTarball(tarballPath, targetDir) {
  safeRm(targetDir)
  ensureDir(targetDir)
  const result = await runCommand('tar', ['-xzf', tarballPath, '-C', targetDir, '--strip-components=1'], {
    cwd: repoRoot,
    env: labEnv(),
  })
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || '解压 ClawRouter plugin 失败')
  }
  patchPluginReasoningHeaderBug(targetDir)
}

function patchPluginReasoningHeaderBug(pluginRoot) {
  const targets = [
    path.join(pluginRoot, 'dist', 'index.js'),
    path.join(pluginRoot, 'dist', 'cli.js'),
  ]
  const patched = []

  for (const target of targets) {
    if (!fs.existsSync(target)) continue
    const source = fs.readFileSync(target, 'utf8')
    const result = patchClawRouterReasoningHeaderSource(source)
    if (!result.changed) continue
    fs.writeFileSync(target, result.sourceText, 'utf8')
    patched.push(path.relative(pluginRoot, target))
  }

  if (patched.length > 0) {
    console.log(`[model-routing-plugin] patched non-ascii debug header bug in ${patched.join(', ')}`)
  }
}

async function installPluginDependencies(runtime, pluginRoot) {
  const packageJson = readJson(path.join(pluginRoot, 'package.json'), null)
  if (!packageJson) throw new Error('ClawRouter package.json 缺失，无法安装依赖')
  const deps = dependencySpecsFromPackageJson(packageJson)
  if (deps.length === 0) return

  const runner = resolvePnpmRunner(runtime)
  console.log(`[model-routing-plugin] installing plugin dependencies (${deps.length}) via ${runner.label}`)
  const result = await runCommand(runner.command, [
    ...runner.prefixArgs,
    'install',
    '--dir',
    pluginRoot,
    '--prod',
    '--ignore-scripts',
    '--config.auto-install-peers=false',
  ], {
    cwd: repoRoot,
    env: labEnv(),
  })

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || '安装 ClawRouter plugin 依赖失败')
  }
}

function profileConfigPath() {
  return path.join(layout.profileStateRoot, 'openclaw.json')
}

function globalConfigPath() {
  return path.join(layout.globalStateRoot, 'openclaw.json')
}

function ensurePluginTrustConfig() {
  const filePath = profileConfigPath()
  const config = readJson(filePath, {}) ?? {}
  config.plugins = config.plugins && typeof config.plugins === 'object' ? config.plugins : {}
  config.plugins.entries = config.plugins.entries && typeof config.plugins.entries === 'object' ? config.plugins.entries : {}
  config.plugins.entries[CLAWROUTER_PLUGIN_ID] = { enabled: true }
  const allow = Array.isArray(config.plugins.allow) ? config.plugins.allow : []
  if (!allow.includes(CLAWROUTER_PLUGIN_ID)) allow.push(CLAWROUTER_PLUGIN_ID)
  config.plugins.allow = allow
  writeJson(filePath, config)
}

async function runOpenClaw(runtime, args, options = {}) {
  const result = await runCommand(runtime.openclawBin, ['--profile', profile, ...args], {
    cwd: repoRoot,
    env: labEnv(options.env),
    stdin: options.stdin,
  })
  if (!options.allowFailure && result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `openclaw ${args.join(' ')} failed`)
  }
  return result
}

async function enablePlugin() {
  const runtime = await ensureCompatibleRuntimeInstalled({ quiet: false })
  const tarballPath = await stagePluginTarball(runtime)
  const stageDir = `${layout.pluginRoot}.stage-${process.pid}`
  cleanupPluginStageDirs()
  ensureDir(path.dirname(layout.pluginRoot))

  try {
    await extractPluginTarball(tarballPath, stageDir)
    await installPluginDependencies(runtime, stageDir)
    safeRm(layout.pluginRoot)
    fs.renameSync(stageDir, layout.pluginRoot)
  } catch (error) {
    safeRm(stageDir)
    throw error
  } finally {
    cleanupPluginStageDirs()
  }

  ensurePluginTrustConfig()
  await runOpenClaw(runtime, ['plugins', 'enable', CLAWROUTER_PLUGIN_ID], { allowFailure: true })
  const inspectResult = await runOpenClaw(runtime, ['plugins', 'inspect', CLAWROUTER_PLUGIN_ID, '--json'], { allowFailure: true })
  const inspect = extractLastJsonObject(inspectResult.stdout)

  console.log(JSON.stringify({
    action: 'enable',
    profile,
    runtimeVersion: runtime.version,
    runtimeRoot: runtime.root,
    homeRoot: layout.homeRoot,
    pluginRoot: layout.pluginRoot,
    pluginInstalled: fs.existsSync(path.join(layout.pluginRoot, 'openclaw.plugin.json')),
    pluginStatus: inspect?.plugin?.status ?? inspect?.status ?? 'unknown',
    pluginEnabled: inspect?.plugin?.enabled ?? true,
    walletFile: path.join(layout.globalStateRoot, 'blockrun', 'wallet.key'),
    globalConfig: globalConfigPath(),
    profileConfig: profileConfigPath(),
  }, null, 2))
}

async function disablePlugin() {
  stopManagedGatewayIfRunning()
  safeRm(layout.pluginRoot)
  cleanupPluginStageDirs()
  sanitizeConfigFiles()

  console.log(JSON.stringify({
    action: 'disable',
    profile,
    homeRoot: layout.homeRoot,
    pluginRootRemoved: !fs.existsSync(layout.pluginRoot),
    globalConfig: globalConfigPath(),
    profileConfig: profileConfigPath(),
  }, null, 2))
}

function sanitizeConfigFiles() {
  const globalPath = globalConfigPath()
  const globalConfig = readJson(globalPath, null)
  if (globalConfig) writeJson(globalPath, cleanupPluginGlobalConfig(globalConfig))

  const profilePath = profileConfigPath()
  const profileConfig = readJson(profilePath, null)
  if (profileConfig) writeJson(profilePath, cleanupPluginProfileConfig(profileConfig))
}

async function printStatus() {
  const runtime = resolveRuntime(layout.runtimeRoot)
  const globalConfig = readJson(globalConfigPath(), {}) ?? {}
  const profileConfig = readJson(profileConfigPath(), {}) ?? {}
  const summary = {
    profile,
    runtimeInstalled: Boolean(runtime),
    runtimeVersion: runtime?.version ?? null,
    runtimeRoot: runtime?.root ?? layout.runtimeRoot,
    homeRoot: layout.homeRoot,
    pluginRoot: layout.pluginRoot,
    pluginInstalled: fs.existsSync(path.join(layout.pluginRoot, 'openclaw.plugin.json')),
    pluginEnabled: profileConfig?.plugins?.entries?.[CLAWROUTER_PLUGIN_ID]?.enabled ?? false,
    pluginTrusted: Array.isArray(profileConfig?.plugins?.allow) ? profileConfig.plugins.allow.includes(CLAWROUTER_PLUGIN_ID) : false,
    primaryModel: globalConfig?.agents?.defaults?.model?.primary ?? null,
    hasBlockrunProvider: Boolean(globalConfig?.models?.providers?.[BLOCKRUN_PROVIDER_ID]),
    webSearchProvider: globalConfig?.tools?.web?.search?.provider ?? null,
    walletFile: path.join(layout.globalStateRoot, 'blockrun', 'wallet.key'),
    walletExists: fs.existsSync(path.join(layout.globalStateRoot, 'blockrun', 'wallet.key')),
    gatewayPidFile,
    gatewayRunning: isPidRunning(readPid(gatewayPidFile)),
    gatewayLogFile,
  }

  if (runtime && summary.pluginInstalled) {
    const inspectResult = await runOpenClaw(runtime, ['plugins', 'inspect', CLAWROUTER_PLUGIN_ID, '--json'], { allowFailure: true })
    const inspect = extractLastJsonObject(inspectResult.stdout)
    summary.pluginStatus = inspect?.plugin?.status ?? inspect?.status ?? null
    summary.pluginActivated = inspect?.plugin?.activated ?? null
  }

  console.log(JSON.stringify(summary, null, 2))
}

async function runValidationSuite() {
  const runtime = await ensureCompatibleRuntimeInstalled({ quiet: false })
  await enablePlugin()
  await ensureProbeAgent(runtime)

  const gatewayHandle = await startGateway(runtime)
  try {
    const simple = await runProxyPrompt('simple', 'Reply with exactly OK.', 32)
    const medium = await runProxyPrompt('medium', 'Design a fault-tolerant distributed job scheduler for 5000 workers across 3 regions. Compare leader election strategies, failure domains, retry semantics, idempotency guarantees, and observability. End with a concise architecture summary.', 192)
    const reasoning = await runProxyPrompt('reasoning', 'Derive, step by step, an algorithm for exactly-once job execution with deduplication, transactional outbox, redrive safety, quorum write tradeoffs, and formal invariants. Include failure proofs and counterexamples.', 192)
    const agent = await runAgentProbe(runtime)

    console.log(JSON.stringify({
      action: 'test',
      profile,
      runtimeVersion: runtime.version,
      gatewayPort,
      proxyPort,
      requests: [simple, medium, reasoning],
      agent,
      gatewayLogFile,
    }, null, 2))
  } finally {
    await stopGatewayChild(gatewayHandle)
  }
}

async function startGateway(runtime) {
  ensureDir(layout.logsRoot)
  safeRm(gatewayPidFile)
  safeRm(gatewayLogFile)
  const logStream = fs.createWriteStream(gatewayLogFile, { flags: 'w' })
  const child = spawn(runtime.openclawBin, [
    '--profile',
    profile,
    'gateway',
    'run',
    '--allow-unconfigured',
    '--force',
    '--port',
    String(gatewayPort),
    '--token',
    gatewayToken,
    '--verbose',
  ], {
    cwd: repoRoot,
    env: labEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => logStream.write(chunk))
  child.stderr.on('data', (chunk) => logStream.write(chunk))
  fs.writeFileSync(gatewayPidFile, `${child.pid}\n`, 'utf8')

  const ready = await waitForProxyReady(120000)
  if (!ready) {
    await stopGatewayChild({ child, logStream })
    throw new Error(`等待 ClawRouter 代理就绪超时（端口 ${proxyPort}）`)
  }

  return { child, logStream }
}

async function waitForProxyReady(timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const logText = fs.existsSync(gatewayLogFile) ? fs.readFileSync(gatewayLogFile, 'utf8') : ''
    const logReady = gatewayLogShowsProxyReady(logText, proxyPort)
    if (logReady) {
      try {
        const response = await fetch(`http://127.0.0.1:${proxyPort}/health`)
        if (response.ok) return true
      } catch {
      }
    }
    await sleep(1000)
  }
  return false
}

async function runProxyPrompt(label, prompt, maxTokens) {
  const response = await fetch(`http://127.0.0.1:${proxyPort}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer x402',
    },
    body: JSON.stringify({
      model: 'blockrun/auto',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      max_tokens: maxTokens,
    }),
  })

  const body = await response.text()
  return {
    label,
    status: response.status,
    routedTier: response.headers.get('x-clawrouter-tier'),
    routedModel: response.headers.get('x-clawrouter-model'),
    routedReasoning: response.headers.get('x-clawrouter-reasoning'),
    freeModel: response.headers.get('x-free-model'),
    fallbackUsed: response.headers.get('x-fallback-used') ?? 'false',
    preview: body.slice(0, 240),
  }
}

async function ensureProbeAgent(runtime) {
  ensureDir(probeWorkspaceRoot)

  const profileConfig = readJson(profileConfigPath(), {}) ?? {}
  const agentList = Array.isArray(profileConfig?.agents?.list) ? profileConfig.agents.list : []
  const existing = agentList.find((entry) => entry?.id === probeAgentId)
  const alreadyReady = existing?.model === 'blockrun/auto'
    && existing?.workspace === probeWorkspaceRoot
    && existing?.agentDir === probeAgentDir
    && fs.existsSync(probeAgentDir)

  if (alreadyReady) return

  if (existing) {
    profileConfig.agents = profileConfig.agents && typeof profileConfig.agents === 'object' ? profileConfig.agents : {}
    profileConfig.agents.list = agentList.filter((entry) => entry?.id !== probeAgentId)
    writeJson(profileConfigPath(), profileConfig)
    safeRm(path.join(layout.profileStateRoot, 'agents', probeAgentId))
    safeRm(probeWorkspaceRoot)
    ensureDir(probeWorkspaceRoot)
  }

  await runOpenClaw(runtime, [
    'agents',
    'add',
    probeAgentId,
    '--workspace',
    probeWorkspaceRoot,
    '--non-interactive',
    '--model',
    'blockrun/auto',
    '--json',
  ])
}

async function runAgentProbe(runtime) {
  const sessionId = buildAgentProbeSessionId({
    seed: `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 10)}`,
  })
  const result = await runOpenClaw(runtime, buildAgentProbeArgs({
    agentId: probeAgentId,
    sessionId,
    timeoutSeconds: 120,
  }), {
    env: {
      OPENCLAW_GATEWAY_URL: `ws://127.0.0.1:${gatewayPort}`,
      OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    },
  })

  const payload = extractLastJsonObject(result.stdout)
  return {
    agentId: probeAgentId,
    sessionId,
    status: payload?.status ?? null,
    provider: payload?.result?.meta?.agentMeta?.provider ?? null,
    model: payload?.result?.meta?.agentMeta?.model ?? null,
    answer: payload?.result?.finalAssistantVisibleText ?? payload?.result?.payloads?.[0]?.text ?? null,
    executionTrace: payload?.result?.executionTrace ?? null,
  }
}

function extractLastJsonObject(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return null
  const positions = []
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === '{') positions.push(index)
  }
  for (const start of positions.reverse()) {
    const candidate = trimmed.slice(start)
    try {
      return JSON.parse(candidate)
    } catch {
    }
  }
  return null
}

function cleanupPluginStageDirs() {
  const extensionRoot = path.dirname(layout.pluginRoot)
  if (!fs.existsSync(extensionRoot)) return
  for (const entry of fs.readdirSync(extensionRoot)) {
    if (!entry.startsWith(`${CLAWROUTER_PLUGIN_ID}.stage-`)) continue
    safeRm(path.join(extensionRoot, entry))
  }
}

function stopManagedGatewayIfRunning() {
  const pid = readPid(gatewayPidFile)
  if (!isPidRunning(pid)) return
  try {
    process.kill(pid, 'SIGINT')
  } catch {
  }
}

async function stopGatewayChild(handle) {
  const child = handle?.child ?? handle
  const logStream = handle?.logStream
  if (child && !child.killed) {
    try {
      child.kill('SIGINT')
    } catch {
    }
  }
  safeRm(gatewayPidFile)
  await closeWritableStream(logStream)
}

function readPid(filePath) {
  if (!fs.existsSync(filePath)) return 0
  const parsed = Number.parseInt(fs.readFileSync(filePath, 'utf8').trim(), 10)
  return Number.isInteger(parsed) ? parsed : 0
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}


function resolvePnpmRunner(runtime) {
  const systemPnpm = findExecutableInPath('pnpm')
  if (systemPnpm) {
    return { label: 'system pnpm', command: systemPnpm, prefixArgs: [] }
  }
  return { label: 'bundled corepack pnpm', command: runtime.corepackBin, prefixArgs: ['pnpm'] }
}

function findExecutableInPath(name) {
  const pathValue = String(process.env.PATH || '')
  for (const entry of pathValue.split(path.delimiter)) {
    if (!entry) continue
    const candidate = path.join(entry, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return ''
}

function printOpenClawEnv() {
  console.log(`HOME=${layout.homeRoot}`)
  console.log(`OPENCLAW_HOME=${layout.homeRoot}`)
  console.log(`OPENCLAW_PROFILE=${profile}`)
  console.log(`OPENSPARROW_MODEL_ROUTING_LAB_ROOT=${layout.labRoot}`)
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}
