#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const THIS_FILE = fileURLToPath(import.meta.url)
const REPO_ROOT = path.resolve(path.dirname(THIS_FILE), '..')
const DEFAULT_PACK_ROOT = path.join(REPO_ROOT, 'dist', 'usb-pack', 'opensparrow-0.1.0-alpha')
const DEFAULT_TIMEOUT_MS = 45000
const REQUIRED_PLUGIN_SPECS = Object.freeze([
  '@openclaw-china/channels',
  '@wecom/wecom-openclaw-plugin',
])

export const ACCEPTANCE_MATRIX = Object.freeze([
  {
    id: 'source-wrapper',
    launchPath: 'platforms/mac/wrappers/01-开始部署.command',
    requiredRole: 'source template / developer debug surface',
    expectedMode: 'source developer/debug',
    expectedPackRoot: 'source/worktree root',
    bundledPluginRequirement: 'off by default unless explicitly requested',
  },
  {
    id: 'package-root-launcher',
    launchPath: 'dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command',
    requiredRole: 'only official packaged first-click path',
    expectedMode: 'packaged runtime hardening',
    expectedPackRoot: 'generated package root',
    bundledPluginRequirement: 'required',
  },
  {
    id: 'package-mac-handoff',
    launchPath: 'dist/usb-pack/opensparrow-0.1.0-alpha/mac/01-开始部署.command',
    requiredRole: 'compatibility / handoff launcher',
    expectedMode: 'handoff to package root launcher',
    expectedPackRoot: 'generated package root after handoff',
    bundledPluginRequirement: 'required after handoff',
  },
])

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function expandUserPath(value) {
  const raw = String(value ?? '').trim()
  if (raw === '~') return os.homedir()
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2))
  return raw
}

function normalizeComparablePath(value) {
  const resolved = path.resolve(expandUserPath(value))
  try {
    return fs.realpathSync.native(resolved)
  } catch {
    return resolved
  }
}

function readTextIfPresent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function envDefaultPattern(envName, defaultValue) {
  return new RegExp(`${escapeRegExp(envName)}=.*\\$\\{${escapeRegExp(envName)}:-${escapeRegExp(defaultValue)}\\}`)
}

function makeCheck(name, pass, detail) {
  return {
    name,
    pass: Boolean(pass),
    detail,
  }
}

function summarizeChecks(checks) {
  return {
    pass: checks.every((check) => check.pass),
    checks,
  }
}

export function parsePrintedUiPort(output) {
  const matches = Array.from(String(output ?? '').matchAll(/(?:^|\n)UI:\s*(\d{1,5})\s*(?:\n|$)/g))
  if (matches.length === 0) {
    throw new Error('Missing launcher-printed UI port; refusing to use localhost:19000 as fallback evidence')
  }

  const port = Number.parseInt(matches[matches.length - 1][1], 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid launcher-printed UI port: ${matches[matches.length - 1][1]}`)
  }
  return port
}

export async function fetchStatusUsingPrintedPort(output, options = {}) {
  const port = parsePrintedUiPort(output)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation available for status verification')
  }

  const host = options.host ?? '127.0.0.1'
  const url = `http://${host}:${port}/api/status`
  const response = await fetchImpl(url)
  if (!response?.ok) {
    throw new Error(`Status request failed on launcher-printed UI port ${port}: HTTP ${response?.status ?? 'unknown'}`)
  }

  return {
    port,
    url,
    statusCode: response.status,
    payload: await response.json(),
  }
}

export function assertStatusPackRoot(statusPayload, expectedPackRoot) {
  const actualPackRoot = statusPayload?.instance?.packRoot
  if (!actualPackRoot) {
    throw new Error('/api/status.instance.packRoot is missing; cannot prove this is the launcher session under verification')
  }

  const actual = normalizeComparablePath(actualPackRoot)
  const expected = normalizeComparablePath(expectedPackRoot)
  if (actual !== expected) {
    throw new Error(
      `stale or wrong UI process: /api/status.instance.packRoot=${actualPackRoot} expected=${expectedPackRoot}`,
    )
  }

  return {
    expectedPackRoot: expected,
    actualPackRoot: actual,
  }
}

export function assertBundledPluginReadiness(statusPayload, options = {}) {
  const bundledPlugins = statusPayload?.bundledPlugins ?? statusPayload
  if (!bundledPlugins || typeof bundledPlugins !== 'object') {
    throw new Error('/api/status.bundledPlugins is missing')
  }

  const expectReady = options.expectReady
  const requiredSpecs = options.requiredSpecs ?? REQUIRED_PLUGIN_SPECS
  const archives = bundledPlugins.archives ?? {}
  const missing = Array.isArray(bundledPlugins.missing) ? bundledPlugins.missing : []

  if (bundledPlugins.required !== true) {
    throw new Error('/api/status.bundledPlugins.required must be true for packaged verification')
  }
  if (typeof expectReady === 'boolean' && bundledPlugins.ready !== expectReady) {
    throw new Error(`/api/status.bundledPlugins.ready=${bundledPlugins.ready}; expected ${expectReady}`)
  }

  for (const spec of requiredSpecs) {
    if (!archives[spec]) {
      throw new Error(`/api/status.bundledPlugins.archives is missing ${spec}`)
    }
    if (expectReady === true && archives[spec].ready !== true) {
      throw new Error(`${spec} bundled archive is not ready`)
    }
    if (expectReady === true && !archives[spec].archive) {
      throw new Error(`${spec} bundled archive path is missing`)
    }
    if (archives[spec].archive && path.isAbsolute(archives[spec].archive)) {
      throw new Error(`${spec} archive evidence must be relative, got ${archives[spec].archive}`)
    }
  }

  const expectedMissing = options.expectedMissing ?? []
  for (const spec of expectedMissing) {
    if (!missing.includes(spec)) {
      throw new Error(`/api/status.bundledPlugins.missing does not include ${spec}`)
    }
  }
  if (expectReady === true && missing.length > 0) {
    throw new Error(`/api/status.bundledPlugins.missing should be empty, got ${missing.join(', ')}`)
  }

  return {
    required: bundledPlugins.required,
    ready: bundledPlugins.ready,
    pluginsDir: bundledPlugins.pluginsDir,
    missing,
    archives,
  }
}

function checkSourceWrapper(sourceRoot) {
  const filePath = path.join(sourceRoot, 'platforms', 'mac', 'wrappers', '01-开始部署.command')
  const source = readTextIfPresent(filePath)
  if (source === null) {
    return {
      path: filePath,
      ...summarizeChecks([makeCheck('exists', false, 'source wrapper file is missing')]),
    }
  }

  const checks = [
    makeCheck('exists', true, filePath),
    makeCheck('developer-role-wording', /source developer\/debug mode|developer\/debug|源码 source/i.test(source)),
    makeCheck('bundled-plugins-off-by-default', envDefaultPattern('OPENSPARROW_REQUIRE_BUNDLED_PLUGINS', '0').test(source)),
    makeCheck('prints-ui-port', /UI:\s*%s\\n/.test(source) || /UI:\s*\$OPENSPARROW_UI_PORT/.test(source)),
  ]

  return {
    path: filePath,
    ...summarizeChecks(checks),
  }
}

function checkPackageRootLauncher(packRoot) {
  const filePath = path.join(packRoot, '01-开始部署.command')
  const source = readTextIfPresent(filePath)
  if (source === null) {
    return {
      path: filePath,
      ...summarizeChecks([makeCheck('exists', false, 'package root launcher is missing')]),
    }
  }

  const checks = [
    makeCheck('exists', true, filePath),
    makeCheck('requires-bundled-plugins-by-default', envDefaultPattern('OPENSPARROW_REQUIRE_BUNDLED_PLUGINS', '1').test(source)),
    makeCheck('prints-ui-port', /UI:\s*%s\\n/.test(source) || /UI:\s*\$OPENSPARROW_UI_PORT/.test(source)),
  ]

  return {
    path: filePath,
    ...summarizeChecks(checks),
  }
}

function checkPackageMacHandoff(packRoot) {
  const filePath = path.join(packRoot, 'mac', '01-开始部署.command')
  const source = readTextIfPresent(filePath)
  if (source === null) {
    return {
      path: filePath,
      ...summarizeChecks([makeCheck('exists', false, 'package mac handoff launcher is missing')]),
    }
  }

  const checks = [
    makeCheck('exists', true, filePath),
    makeCheck('handoff-wording', /compatibility|handoff|转交/i.test(source)),
    makeCheck('hands-off-to-root-launcher', /\.\.\/01-开始部署\.command/.test(source)),
    makeCheck('does-not-run-ui-directly', !/ui\/server\.mjs/.test(source)),
    makeCheck('does-not-own-packaged-hardening', !/OPENSPARROW_REQUIRE_BUNDLED_PLUGINS/.test(source)),
  ]

  return {
    path: filePath,
    ...summarizeChecks(checks),
  }
}

export function collectLauncherEvidence({ sourceRoot = REPO_ROOT, packRoot = DEFAULT_PACK_ROOT } = {}) {
  const sourceWrapper = checkSourceWrapper(sourceRoot)
  const packageRootLauncher = checkPackageRootLauncher(packRoot)
  const packageMacHandoff = checkPackageMacHandoff(packRoot)
  return {
    matrix: ACCEPTANCE_MATRIX,
    sourceRoot: normalizeComparablePath(sourceRoot),
    packRoot: normalizeComparablePath(packRoot),
    sourceWrapper,
    packageRootLauncher,
    packageMacHandoff,
    pass: sourceWrapper.pass && packageRootLauncher.pass && packageMacHandoff.pass,
  }
}

function shouldSkipCopyEntry(src) {
  const base = path.basename(src)
  return base === '.gtclaw-state' || base === '.openclaw' || base.startsWith('.openclaw-')
}

export function createMissingArchiveFixture(sourcePackRoot, options = {}) {
  const workRoot = options.workRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-missing-archive-'))
  const fixtureRoot = path.join(workRoot, path.basename(path.resolve(sourcePackRoot)) || 'pack-root')

  fs.rmSync(fixtureRoot, { recursive: true, force: true })
  fs.cpSync(sourcePackRoot, fixtureRoot, {
    recursive: true,
    force: true,
    dereference: false,
    verbatimSymlinks: true,
    filter: (src) => !shouldSkipCopyEntry(src),
  })

  const pluginsDir = path.join(fixtureRoot, 'plugins')
  const removedArchives = []
  if (fs.existsSync(pluginsDir)) {
    for (const name of fs.readdirSync(pluginsDir)) {
      if (/^openclaw-china-channels-.*\.tgz$/.test(name)) {
        fs.rmSync(path.join(pluginsDir, name), { force: true })
        removedArchives.push(name)
      }
    }
  }

  removedArchives.sort((left, right) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  }))

  return {
    fixtureRoot,
    removedArchives,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
    }, 2000)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

function spawnLauncher(launcherPath, options = {}) {
  const env = {
    ...process.env,
    OPENSPARROW_AUTO_OPEN: '0',
    ...options.env,
  }
  return spawn('bash', [launcherPath], {
    cwd: options.cwd ?? path.dirname(launcherPath),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function waitForLauncherStatus(child, expectedPackRoot, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startedAt = Date.now()
  let stdout = ''
  let stderr = ''
  let lastError = null

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  while (Date.now() - startedAt < timeoutMs) {
    const combinedOutput = `${stdout}\n${stderr}`
    if (child.exitCode !== null) {
      throw new Error(`launcher exited before status verification (code=${child.exitCode})\nstdout:\n${stdout}\nstderr:\n${stderr}`)
    }

    try {
      const status = await fetchStatusUsingPrintedPort(combinedOutput, {
        fetchImpl: options.fetchImpl,
      })
      const packRootEvidence = assertStatusPackRoot(status.payload, expectedPackRoot)
      return {
        ...status,
        stdout,
        stderr,
        packRootEvidence,
      }
    } catch (error) {
      lastError = error
      await sleep(250)
    }
  }

  throw new Error(`timed out waiting for launcher status on printed UI port: ${lastError?.message ?? 'no status evidence'}\nstdout:\n${stdout}\nstderr:\n${stderr}`)
}

export async function runLauncherStatusVerification({ launcherPath, expectedPackRoot, env = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!launcherPath) throw new Error('launcherPath is required')
  if (!expectedPackRoot) throw new Error('expectedPackRoot is required')

  const openclawHome = env.OPENCLAW_HOME ?? fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-entry-contract-home-'))
  const child = spawnLauncher(launcherPath, {
    env: {
      ...env,
      OPENCLAW_HOME: openclawHome,
    },
  })

  try {
    return await waitForLauncherStatus(child, expectedPackRoot, { timeoutMs })
  } finally {
    await stopChild(child)
  }
}

export async function startStalePortStatusServer({ port = 19000, stalePackRoot = REPO_ROOT } = {}) {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/status') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        installed: false,
        bundledPlugins: {
          required: true,
          ready: false,
          pluginsDir: path.join(stalePackRoot, 'plugins'),
          archives: {},
          missing: REQUIRED_PLUGIN_SPECS,
        },
        instance: {
          packRoot: stalePackRoot,
          uiPort: port,
          staleFixture: true,
        },
      }))
      return
    }
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  })

  return await new Promise((resolve, reject) => {
    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        resolve({
          started: false,
          port,
          reason: 'port already occupied before verifier stale-port fixture started',
          close: async () => {},
        })
        return
      }
      reject(error)
    })
    server.listen(port, '127.0.0.1', () => {
      resolve({
        started: true,
        port,
        reason: 'verifier stale-port fixture started',
        close: async () => {
          await new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()))
          })
        },
      })
    })
  })
}

function flattenFailedChecks(evidence) {
  const groups = [
    ['sourceWrapper', evidence.sourceWrapper],
    ['packageRootLauncher', evidence.packageRootLauncher],
    ['packageMacHandoff', evidence.packageMacHandoff],
  ]
  return groups.flatMap(([groupName, group]) => (
    group.checks
      .filter((check) => !check.pass)
      .map((check) => `${groupName}.${check.name}: ${check.detail ?? 'failed'}`)
  ))
}

export async function runVerification(options = {}) {
  const sourceRoot = options.sourceRoot ?? REPO_ROOT
  const packRoot = options.packRoot ?? DEFAULT_PACK_ROOT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const evidence = {
    sourceRoot: normalizeComparablePath(sourceRoot),
    packRoot: normalizeComparablePath(packRoot),
    static: collectLauncherEvidence({ sourceRoot, packRoot }),
    integration: [],
  }

  if (!evidence.static.pass) {
    evidence.pass = false
    evidence.failures = flattenFailedChecks(evidence.static)
    if (options.skipLive) return evidence
    throw new Error(`static launcher evidence failed:\n${evidence.failures.join('\n')}`)
  }

  if (options.skipLive) {
    evidence.pass = true
    return evidence
  }

  const stalePort = await startStalePortStatusServer({
    port: options.stalePort ?? 19000,
    stalePackRoot: sourceRoot,
  })
  evidence.integration.push({
    id: 'stale-port-fixture',
    ...stalePort,
  })

  try {
    const rootLauncherEvidence = await runLauncherStatusVerification({
      launcherPath: path.join(packRoot, '01-开始部署.command'),
      expectedPackRoot: packRoot,
      timeoutMs,
    })
    assertBundledPluginReadiness(rootLauncherEvidence.payload, { expectReady: true })
    evidence.integration.push({
      id: 'package-root-launcher',
      port: rootLauncherEvidence.port,
      url: rootLauncherEvidence.url,
      packRoot: rootLauncherEvidence.packRootEvidence.actualPackRoot,
      bundledPluginsReady: true,
    })

    const macHandoffEvidence = await runLauncherStatusVerification({
      launcherPath: path.join(packRoot, 'mac', '01-开始部署.command'),
      expectedPackRoot: packRoot,
      timeoutMs,
    })
    if (!/compatibility|handoff|转交/i.test(`${macHandoffEvidence.stdout}\n${macHandoffEvidence.stderr}`)) {
      throw new Error('mac/01 launcher did not print compatibility / handoff role evidence')
    }
    assertBundledPluginReadiness(macHandoffEvidence.payload, { expectReady: true })
    evidence.integration.push({
      id: 'package-mac-handoff',
      port: macHandoffEvidence.port,
      url: macHandoffEvidence.url,
      packRoot: macHandoffEvidence.packRootEvidence.actualPackRoot,
      bundledPluginsReady: true,
    })

    if (!options.skipNegative) {
      const fixture = createMissingArchiveFixture(packRoot)
      if (fixture.removedArchives.length === 0) {
        throw new Error('missing archive negative fixture could not remove openclaw-china-channels-*.tgz')
      }
      const negativeEvidence = await runLauncherStatusVerification({
        launcherPath: path.join(fixture.fixtureRoot, '01-开始部署.command'),
        expectedPackRoot: fixture.fixtureRoot,
        timeoutMs,
      })
      const bundledEvidence = assertBundledPluginReadiness(negativeEvidence.payload, {
        expectReady: false,
        expectedMissing: ['@openclaw-china/channels'],
      })
      evidence.integration.push({
        id: 'missing-dingtalk-archive-negative',
        port: negativeEvidence.port,
        url: negativeEvidence.url,
        packRoot: negativeEvidence.packRootEvidence.actualPackRoot,
        removedArchives: fixture.removedArchives,
        bundledPluginsReady: bundledEvidence.ready,
        missing: bundledEvidence.missing,
      })
    }
  } finally {
    await stalePort.close()
  }

  evidence.pass = true
  return evidence
}

function parseArgs(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--dry-run' || arg === '--skip-live') options.skipLive = true
    else if (arg === '--json') options.json = true
    else if (arg === '--skip-negative') options.skipNegative = true
    else if (arg === '--pack-root') options.packRoot = path.resolve(argv[++index])
    else if (arg === '--source-root') options.sourceRoot = path.resolve(argv[++index])
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10)
    else if (arg === '--stale-port') options.stalePort = Number.parseInt(argv[++index], 10)
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-packaged-mac-entry-contract.mjs [options]

Options:
  --pack-root <path>     Package root to verify.
                         Default: dist/usb-pack/opensparrow-0.1.0-alpha
  --source-root <path>   Source/worktree root used for source wrapper and stale-port evidence.
                         Default: current repository root
  --dry-run              Collect static acceptance matrix evidence only; do not launch wrappers.
  --skip-negative        Skip the missing DingTalk archive negative fixture.
  --timeout-ms <ms>      Live launcher/status timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --stale-port <port>    Port to occupy as stale UI fixture. Default: 19000
  --json                 Print JSON evidence.
  --help                 Show this help.

Live verification intentionally uses the launcher-printed "UI: <port>" line
and then requires /api/status.instance.packRoot to equal the root under
verification. It never treats localhost:19000 as authoritative by default.`)
}

function printSummary(result) {
  console.log(`packaged mac entry contract verification: ${result.pass ? 'PASS' : 'FAIL'}`)
  console.log(`sourceRoot: ${result.sourceRoot}`)
  console.log(`packRoot: ${result.packRoot}`)
  for (const row of ACCEPTANCE_MATRIX) {
    console.log(`matrix: ${row.id} -> ${row.requiredRole}`)
  }
  if (result.failures?.length) {
    console.log('failures:')
    for (const failure of result.failures) console.log(`- ${failure}`)
  }
  if (result.integration?.length) {
    console.log('integration evidence:')
    for (const item of result.integration) {
      console.log(`- ${item.id}: ${JSON.stringify(item)}`)
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const result = await runVerification(options)
  if (options.json) console.log(JSON.stringify(result, null, 2))
  else printSummary(result)
  if (!result.pass) process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error))
    process.exitCode = 1
  })
}
