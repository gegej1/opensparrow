#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_OPENCLAW_VERSION,
  DEFAULT_PROFILE,
  buildPluginLabLayout,
} from './lib/plugin-routing.mjs'
import {
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  normalizeCustomTierModelMap,
} from './lib/custom-plugin-routing.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = resolveRepoRoot()
const profile = String(process.env.OPENCLAW_PROFILE || process.env.OPENCLAW_PROFILE_NAME || DEFAULT_PROFILE).trim() || DEFAULT_PROFILE
const layoutBase = buildPluginLabLayout(repoRoot, {
  profile,
  labRoot: process.env.OPENSPARROW_MODEL_ROUTING_LAB_ROOT,
})
const layout = {
  ...layoutBase,
  pluginRoot: path.join(layoutBase.profileStateRoot, 'extensions', CUSTOM_ROUTER_PROVIDER_ID),
}
const sourcePluginRoot = path.join(repoRoot, 'scripts', 'model-routing', 'custom-plugin')
const openclawVersion = String(process.env.OPENSPARROW_OPENCLAW_VERSION || DEFAULT_OPENCLAW_VERSION).trim() || DEFAULT_OPENCLAW_VERSION
const defaultTestEntry = path.join(repoRoot, 'scripts', 'tests', 'custom-model-routing-plugin.test.mjs')
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
      await runTests()
      break
    case 'help':
    case '--help':
    case '-h':
      printUsage()
      break
    case 'openclaw-env':
      printOpenClawEnv()
      break
    default:
      printUsage()
      process.exitCode = 1
  }
} catch (error) {
  console.error(`[custom-routing-plugin] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
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

function toRepoRelative(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join('/')
}

function defaultTestEntryRelative() {
  return toRepoRelative(defaultTestEntry)
}

function resolveTestEntry() {
  const override = String(process.env.OPENSPARROW_CUSTOM_ROUTING_PLUGIN_TEST_FILE || '').trim()
  const resolved = override
    ? (path.isAbsolute(override) ? override : path.resolve(repoRoot, override))
    : defaultTestEntry
  if (!fs.existsSync(resolved)) {
    throw new Error(`custom routing plugin test entry 不存在: ${resolved}`)
  }
  return resolved
}

function describeTestCommand() {
  return `node --test ${defaultTestEntryRelative()}`
}

function printUsage() {
  console.log([
    'Usage: manage-custom-routing-plugin.mjs <install-runtime|enable|disable|status|test|openclaw-env|help>',
    '',
    'Commands:',
    '  install-runtime  Install or refresh the OpenClaw lab runtime',
    '  enable           Install and trust the custom routing plugin in the lab profile',
    '  disable          Remove the custom routing plugin from the lab profile',
    '  status           Print runtime/plugin status JSON',
    `  test             Run repo-local tests (${describeTestCommand()})`,
    '  openclaw-env     Print the lab environment exports',
    '  help             Show this help',
  ].join('\n'))
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

function profileConfigPath() {
  return path.join(layout.profileStateRoot, 'openclaw.json')
}

function globalConfigPath() {
  return path.join(layout.globalStateRoot, 'openclaw.json')
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
  return { root, nodeBin, npmCli, corepackBin, openclawBin, packageJsonPath, version }
}

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return ''
}

function labEnv(extra = {}) {
  return {
    ...process.env,
    HOME: layout.homeRoot,
    OPENCLAW_HOME: layout.homeRoot,
    OPENCLAW_PROFILE: profile,
    npm_config_cache: path.join(layout.homeRoot, '.npm'),
    ...extra,
  }
}

async function runCommand(commandPath, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(commandPath, args, {
      cwd: options.cwd || repoRoot,
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdin.end(options.stdin || '')
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
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
  throw new Error('无法找到 bootstrap runtime')
}

async function ensureCompatibleRuntimeInstalled({ quiet = true } = {}) {
  const existing = resolveRuntime(layout.runtimeRoot)
  if (existing?.version === openclawVersion) {
    if (!quiet) console.log(`[custom-routing-plugin] runtime ready: ${existing.version} (${existing.root})`)
    return existing
  }
  const bootstrap = resolveBootstrapRuntime()
  const stageRoot = `${layout.runtimeRoot}.stage-${process.pid}`
  safeRm(stageRoot)
  ensureDir(path.dirname(layout.runtimeRoot))
  ensureDir(layout.homeRoot)
  fs.cpSync(bootstrap.root, stageRoot, { recursive: true })
  const staged = resolveRuntime(stageRoot)
  if (!staged) throw new Error('复制 bootstrap runtime 后无法解析入口')
  const installResult = await runCommand(staged.nodeBin, [
    staged.npmCli,
    'install',
    '-g',
    '--omit=optional',
    '--prefix',
    stageRoot,
    `openclaw@${openclawVersion}`,
  ], {
    env: labEnv({ OPENCLAW_DISABLE_BUNDLED_PLUGIN_POSTINSTALL: '1' }),
  })
  if (installResult.code !== 0) {
    throw new Error(installResult.stderr.trim() || installResult.stdout.trim() || 'OpenClaw runtime 升级失败')
  }
  safeRm(layout.runtimeRoot)
  fs.renameSync(stageRoot, layout.runtimeRoot)
  const ready = resolveRuntime(layout.runtimeRoot)
  if (!ready || ready.version !== openclawVersion) {
    throw new Error(`runtime 版本校验失败，期待 ${openclawVersion}，实际 ${ready?.version || 'unknown'}`)
  }
  if (!quiet) console.log(`[custom-routing-plugin] runtime ready: ${ready.version} (${ready.root})`)
  return ready
}

function resolvePnpmRunner(runtime) {
  const systemPnpm = findExecutableInPath('pnpm')
  if (systemPnpm) return { label: 'system pnpm', command: systemPnpm, prefixArgs: [] }
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

function buildPluginConfig() {
  const existing = readJson(profileConfigPath(), {})?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID]?.config ?? {}
  const baseUrl = String(process.env.OPENSPARROW_ROUTER_BASE_URL || process.env.OPENSPARROW_DMX_BASE_URL || existing.baseUrl || '').trim().replace(/\/+$/, '')
  const apiKey = String(process.env.OPENSPARROW_ROUTER_API_KEY || process.env.OPENSPARROW_DMX_API_KEY || existing.apiKey || '').trim()
  return {
    baseUrl,
    apiKey,
    tierModelMap: normalizeCustomTierModelMap({
      SIMPLE: process.env.OPENSPARROW_ROUTER_MODEL_SIMPLE || existing?.tierModelMap?.SIMPLE,
      MEDIUM: process.env.OPENSPARROW_ROUTER_MODEL_MEDIUM || existing?.tierModelMap?.MEDIUM,
      COMPLEX: process.env.OPENSPARROW_ROUTER_MODEL_COMPLEX || existing?.tierModelMap?.COMPLEX,
      REASONING: process.env.OPENSPARROW_ROUTER_MODEL_REASONING || existing?.tierModelMap?.REASONING,
    }),
  }
}

function ensurePluginTrustConfig() {
  const filePath = profileConfigPath()
  const config = readJson(filePath, {}) ?? {}
  const pluginConfig = buildPluginConfig()
  config.plugins = config.plugins && typeof config.plugins === 'object' ? config.plugins : {}
  config.plugins.entries = config.plugins.entries && typeof config.plugins.entries === 'object' ? config.plugins.entries : {}
  config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID] = { enabled: true, config: pluginConfig }
  const allow = Array.isArray(config.plugins.allow) ? config.plugins.allow : []
  if (!allow.includes(CUSTOM_ROUTER_PROVIDER_ID)) allow.push(CUSTOM_ROUTER_PROVIDER_ID)
  config.plugins.allow = allow
  writeJson(filePath, config)
}

function sanitizeConfigFiles() {
  const globalPath = globalConfigPath()
  const globalConfig = readJson(globalPath, null)
  if (globalConfig?.models?.providers?.[CUSTOM_ROUTER_PROVIDER_ID]) {
    delete globalConfig.models.providers[CUSTOM_ROUTER_PROVIDER_ID]
  }
  if (globalConfig?.agents?.defaults?.model?.primary === CUSTOM_ROUTER_MODEL_TARGET) {
    delete globalConfig.agents.defaults.model.primary
  }
  if (globalConfig) writeJson(globalPath, globalConfig)

  const profilePath = profileConfigPath()
  const profileConfig = readJson(profilePath, null)
  if (profileConfig?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID]) {
    delete profileConfig.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID]
  }
  if (Array.isArray(profileConfig?.plugins?.allow)) {
    profileConfig.plugins.allow = profileConfig.plugins.allow.filter((item) => item !== CUSTOM_ROUTER_PROVIDER_ID)
  }
  if (profileConfig) writeJson(profilePath, profileConfig)
}

async function runOpenClaw(runtime, args, options = {}) {
  const result = await runCommand(runtime.openclawBin, ['--profile', profile, ...args], {
    env: labEnv(options.env),
  })
  if (!options.allowFailure && result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `openclaw ${args.join(' ')} failed`)
  }
  return result
}

async function enablePlugin() {
  const runtime = await ensureCompatibleRuntimeInstalled({ quiet: false })
  if (!fs.existsSync(sourcePluginRoot)) throw new Error(`plugin 源码目录不存在: ${sourcePluginRoot}`)
  const stageDir = `${layout.pluginRoot}.stage-${process.pid}`
  safeRm(stageDir)
  ensureDir(path.dirname(layout.pluginRoot))
  fs.cpSync(sourcePluginRoot, stageDir, { recursive: true })

  const runner = resolvePnpmRunner(runtime)
  const installResult = await runCommand(runner.command, [
    ...runner.prefixArgs,
    'install',
    '--dir',
    stageDir,
    '--prod',
    '--ignore-scripts',
    '--config.auto-install-peers=false',
  ], { env: labEnv() })
  if (installResult.code !== 0) {
    throw new Error(installResult.stderr.trim() || installResult.stdout.trim() || '安装 custom plugin 依赖失败')
  }

  safeRm(layout.pluginRoot)
  fs.renameSync(stageDir, layout.pluginRoot)
  ensurePluginTrustConfig()
  console.log(JSON.stringify({
    action: 'enable',
    profile,
    runtimeVersion: runtime.version,
    pluginRoot: layout.pluginRoot,
    pluginInstalled: fs.existsSync(path.join(layout.pluginRoot, 'openclaw.plugin.json')),
    pluginConfig: { ...buildPluginConfig(), apiKey: buildPluginConfig().apiKey ? '***' : '' },
  }, null, 2))
}

async function disablePlugin() {
  safeRm(layout.pluginRoot)
  sanitizeConfigFiles()
  console.log(JSON.stringify({
    action: 'disable',
    profile,
    pluginRootRemoved: !fs.existsSync(layout.pluginRoot),
  }, null, 2))
}

async function runTests() {
  const testEntry = resolveTestEntry()
  const testEnv = { ...process.env }
  delete testEnv.NODE_TEST_CONTEXT
  const result = await runCommand(process.execPath, ['--test', testEntry], {
    cwd: repoRoot,
    env: testEnv,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.code !== 0) {
    throw new Error(`custom routing plugin tests failed with exit code ${result.code}`)
  }
}

async function printStatus() {
  const runtime = resolveRuntime(layout.runtimeRoot)
  const profileConfig = readJson(profileConfigPath(), {}) ?? {}
  const globalConfig = readJson(globalConfigPath(), {}) ?? {}
  let inspectText = null
  if (runtime && fs.existsSync(path.join(layout.pluginRoot, 'openclaw.plugin.json'))) {
    const inspectResult = await runOpenClaw(runtime, ['plugins', 'inspect', CUSTOM_ROUTER_PROVIDER_ID, '--json'], { allowFailure: true })
    inspectText = inspectResult.stdout.trim() || inspectResult.stderr.trim() || null
  }
  console.log(JSON.stringify({
    profile,
    runtimeInstalled: Boolean(runtime),
    runtimeVersion: runtime?.version ?? null,
    pluginRoot: layout.pluginRoot,
    pluginInstalled: fs.existsSync(path.join(layout.pluginRoot, 'openclaw.plugin.json')),
    pluginEnabled: profileConfig?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID]?.enabled ?? false,
    pluginTrusted: Array.isArray(profileConfig?.plugins?.allow) ? profileConfig.plugins.allow.includes(CUSTOM_ROUTER_PROVIDER_ID) : false,
    primaryModel: globalConfig?.agents?.defaults?.model?.primary ?? null,
    pluginConfig: {
      ...profileConfig?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID]?.config,
      apiKey: profileConfig?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID]?.config?.apiKey ? '***' : '',
    },
    testEntry: defaultTestEntryRelative(),
    testCommand: describeTestCommand(),
    inspect: inspectText,
  }, null, 2))
}

function printOpenClawEnv() {
  console.log(`HOME=${layout.homeRoot}`)
  console.log(`OPENCLAW_HOME=${layout.homeRoot}`)
  console.log(`OPENCLAW_PROFILE=${profile}`)
  console.log(`OPENSPARROW_MODEL_ROUTING_LAB_ROOT=${layout.labRoot}`)
}
