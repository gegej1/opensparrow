import { execFile } from 'node:child_process'
import path from 'node:path'

const DEFAULT_SCAN_TIMEOUT_MS = 2500
const MAX_BUFFER = 8 * 1024 * 1024

function execFileText(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      timeout: options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS,
      maxBuffer: options.maxBuffer ?? MAX_BUFFER,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
        return
      }
      resolve(String(stdout ?? ''))
    })
  })
}

function normalizePathValue(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return path.normalize(raw).replace(/[\\/]+$/, '')
}

function samePath(a, b) {
  const left = normalizePathValue(a)
  const right = normalizePathValue(b)
  return Boolean(left && right && left === right)
}

function pathIsWithin(child, parent) {
  const normalizedChild = normalizePathValue(child)
  const normalizedParent = normalizePathValue(parent)
  if (!normalizedChild || !normalizedParent) return false
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${path.sep}`)
}

function parseNumber(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function inferRuntimeRoot(processInfo = {}) {
  const candidates = [
    processInfo.executablePath,
    ...(Array.isArray(processInfo.openFiles) ? processInfo.openFiles : []),
  ]

  for (const candidate of candidates) {
    const normalized = normalizePathValue(candidate)
    for (const marker of [
      `${path.sep}vendor${path.sep}mac-openclaw`,
      `${path.sep}vendor${path.sep}linux-openclaw`,
      `${path.sep}vendor${path.sep}windows-openclaw`,
      `${path.sep}runtime`,
    ]) {
      const index = normalized.indexOf(marker)
      if (index >= 0) {
        return normalized.slice(0, index + marker.length)
      }
    }
  }

  return null
}

function inferPackRoot(runtimeRoot) {
  const normalized = normalizePathValue(runtimeRoot)
  if (!normalized) return null
  for (const marker of [
    `${path.sep}vendor${path.sep}mac-openclaw`,
    `${path.sep}vendor${path.sep}linux-openclaw`,
    `${path.sep}vendor${path.sep}windows-openclaw`,
    `${path.sep}runtime`,
  ]) {
    const index = normalized.indexOf(marker)
    if (index > 0) return normalized.slice(0, index)
  }
  return null
}

function inferConfigPath(processInfo = {}) {
  const openFiles = Array.isArray(processInfo.openFiles) ? processInfo.openFiles : []
  const match = openFiles.find((filePath) => path.basename(String(filePath ?? '')) === 'openclaw.json')
  return match ? normalizePathValue(match) : null
}

function inferProfileDir({ configPath, openFiles = [], current = {} }) {
  if (configPath && samePath(configPath, current.configPath)) {
    return normalizePathValue(current.profileDir)
  }

  for (const filePath of openFiles) {
    if (pathIsWithin(filePath, current.profileDir)) return normalizePathValue(current.profileDir)
  }

  const configParent = configPath ? path.dirname(configPath) : ''
  if (configParent && path.basename(configParent).startsWith('.openclaw-')) return normalizePathValue(configParent)

  for (const filePath of openFiles) {
    const normalized = normalizePathValue(filePath)
    const parts = normalized.split(path.sep)
    const index = parts.findIndex((part) => part.startsWith('.openclaw-'))
    if (index >= 0) return parts.slice(0, index + 1).join(path.sep) || path.sep
  }

  return null
}

function inferOpenClawHome({ configPath, profileDir, openFiles = [], current = {} }) {
  if (configPath && samePath(configPath, current.configPath)) {
    return normalizePathValue(current.openclawHome)
  }

  for (const filePath of openFiles) {
    if (pathIsWithin(filePath, current.openclawHome)) return normalizePathValue(current.openclawHome)
  }

  if (configPath) return normalizePathValue(path.dirname(configPath))
  if (profileDir) return normalizePathValue(path.dirname(profileDir))
  return null
}

function commandLabel(command = '') {
  const text = String(command ?? '')
  if (text.includes('ui/server.mjs') || text.includes('server.mjs')) return 'ui-server'
  if (text.includes('openclaw-gateway')) return 'openclaw-gateway'
  if (/(^|\s)openclaw(\s|$)/.test(text)) return 'openclaw-daemon'
  const firstToken = text.trim().split(/\s+/)[0] ?? ''
  return firstToken ? path.basename(firstToken) : 'unknown'
}

function isOpenClawRelated(processInfo = {}, inferred = {}) {
  const haystack = [
    processInfo.command,
    processInfo.executablePath,
    inferred.runtimeRoot,
    inferred.openclawHome,
    inferred.configPath,
    ...(Array.isArray(processInfo.openFiles) ? processInfo.openFiles.slice(0, 8) : []),
  ].join('\n').toLowerCase()

  return (
    haystack.includes('openclaw') ||
    haystack.includes('gtclaw') ||
    haystack.includes('ui/server.mjs') ||
    haystack.includes('server.mjs')
  )
}

function classifyOneProcess(processInfo = {}, current = {}) {
  const pid = parseNumber(processInfo.pid)
  const ppid = parseNumber(processInfo.ppid)
  const openFiles = Array.isArray(processInfo.openFiles)
    ? processInfo.openFiles.map(normalizePathValue).filter(Boolean)
    : []
  const runtimeRoot = normalizePathValue(processInfo.runtimeRoot ?? inferRuntimeRoot({ ...processInfo, openFiles })) || null
  const configPath = normalizePathValue(processInfo.configPath ?? inferConfigPath({ ...processInfo, openFiles })) || null
  const profileDir = normalizePathValue(processInfo.profileDir ?? inferProfileDir({ configPath, openFiles, current })) || null
  const openclawHome = normalizePathValue(processInfo.openclawHome ?? inferOpenClawHome({
    configPath,
    profileDir,
    openFiles,
    current,
  })) || null
  const packRoot = normalizePathValue(processInfo.packRoot ?? inferPackRoot(runtimeRoot)) || null
  const listeningPorts = Array.isArray(processInfo.listeningPorts)
    ? [...new Set(processInfo.listeningPorts.map(parseNumber).filter(Boolean))].sort((a, b) => a - b)
    : []
  const externalTcp443Count = Math.max(0, Number.parseInt(String(processInfo.externalTcp443Count ?? '0'), 10) || 0)

  const hasCurrentState = (
    samePath(configPath, current.configPath) ||
    pathIsWithin(configPath, current.profileDir) ||
    pathIsWithin(profileDir, current.openclawHome) ||
    pathIsWithin(openclawHome, current.openclawHome) ||
    openFiles.some((filePath) => (
      samePath(filePath, current.configPath) ||
      pathIsWithin(filePath, current.profileDir) ||
      pathIsWithin(filePath, current.openclawHome)
    ))
  )
  const isCurrentUi = pid !== null && pid === parseNumber(current.uiPid)
  const classification = (isCurrentUi || hasCurrentState) ? 'current' : 'foreign'

  return {
    pid,
    ppid,
    commandLabel: commandLabel(processInfo.command),
    classification,
    packRoot,
    runtimeRoot,
    openclawHome,
    profileDir,
    configPath,
    listeningPorts,
    externalTcp443Count,
  }
}

function preferCurrentProcess(processes) {
  if (processes.length === 0) return null
  return processes.find((processInfo) => processInfo.classification === 'current') ?? processes[0]
}

function summarizeLiveChannelOwner(candidates) {
  if (candidates.length === 0) return 'none'
  const hasCurrent = candidates.some((candidate) => candidate.classification === 'current')
  const hasForeign = candidates.some((candidate) => candidate.classification === 'foreign')
  if (hasCurrent && hasForeign) return 'ambiguous_with_foreign_candidates'
  if (hasForeign) return 'foreign_only'
  return 'current_only'
}

export function classifyRuntimeOwnership({ current = {}, processes = [] } = {}) {
  const classified = processes
    .map((processInfo) => classifyOneProcess(processInfo, current))
    .filter((processInfo) => processInfo.pid !== null)
    .filter((processInfo) => isOpenClawRelated(processes.find((candidate) => candidate.pid === processInfo.pid) ?? {}, processInfo))

  const currentUi = classified.find((processInfo) => processInfo.pid === parseNumber(current.uiPid)) ?? {
    pid: parseNumber(current.uiPid),
    commandLabel: 'ui-server',
    classification: 'current',
    packRoot: normalizePathValue(current.packRoot) || null,
    runtimeRoot: normalizePathValue(current.runtimeRoot) || null,
    openclawHome: normalizePathValue(current.openclawHome) || null,
    profileDir: normalizePathValue(current.profileDir) || null,
    configPath: normalizePathValue(current.configPath) || null,
    listeningPorts: [parseNumber(current.uiPort)].filter(Boolean),
    externalTcp443Count: 0,
  }

  const gatewayCandidates = classified.filter((processInfo) => processInfo.listeningPorts.includes(parseNumber(current.gatewayPort)))
  const routerCandidates = classified.filter((processInfo) => processInfo.listeningPorts.includes(parseNumber(current.routerPort)))
  const currentGateway = preferCurrentProcess(gatewayCandidates)
  const currentRouter = preferCurrentProcess(routerCandidates)
  const daemonCandidates = classified.filter((processInfo) => {
    if (currentGateway?.ppid && processInfo.pid === currentGateway.ppid) return true
    return (
      processInfo.classification === 'current' &&
      processInfo.pid !== currentGateway?.pid &&
      processInfo.commandLabel === 'openclaw-daemon'
    )
  })
  const currentDaemon = preferCurrentProcess(daemonCandidates)

  const foreignOpenClawProcesses = classified
    .filter((processInfo) => processInfo.classification === 'foreign')
    .filter((processInfo) => processInfo.commandLabel !== 'ui-server')
    .sort((a, b) => a.pid - b.pid)
  const liveChannelOwnerCandidates = classified
    .filter((processInfo) => processInfo.externalTcp443Count > 0)
    .filter((processInfo) => processInfo.commandLabel !== 'ui-server')
    .sort((a, b) => {
      if (a.classification !== b.classification) return a.classification === 'current' ? -1 : 1
      return a.pid - b.pid
    })

  return {
    available: true,
    currentUi,
    currentGateway: currentGateway ?? null,
    currentDaemon: currentDaemon ?? null,
    currentRouter: currentRouter ?? null,
    foreignOpenClawProcesses,
    liveChannelOwnerCandidates,
    summary: {
      gatewayOwner: currentGateway?.classification ?? 'missing',
      daemonOwner: currentDaemon?.classification ?? 'missing',
      routerOwner: currentRouter?.classification ?? 'missing',
      liveChannelOwner: summarizeLiveChannelOwner(liveChannelOwnerCandidates),
      foreignProcessCount: foreignOpenClawProcesses.length,
    },
  }
}

function parsePsOutput(stdout) {
  const map = new Map()
  for (const line of String(stdout ?? '').split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/)
    if (!match) continue
    const pid = Number.parseInt(match[1], 10)
    map.set(pid, {
      pid,
      ppid: Number.parseInt(match[2], 10),
      command: match[3],
      executablePath: null,
      openFiles: [],
      listeningPorts: [],
      externalTcp443Count: 0,
    })
  }
  return map
}

function ensureProcess(processes, pid) {
  if (!processes.has(pid)) {
    processes.set(pid, {
      pid,
      ppid: null,
      command: '',
      executablePath: null,
      openFiles: [],
      listeningPorts: [],
      externalTcp443Count: 0,
    })
  }
  return processes.get(pid)
}

function parseTcpPort(name) {
  const match = String(name ?? '').match(/(?:^|:)(\d+)\s+\(LISTEN\)$/)
  if (!match) return null
  return parseNumber(match[1])
}

function parseLsofOutput(stdout, processes) {
  for (const line of String(stdout ?? '').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('COMMAND ')) continue
    const parts = line.trim().split(/\s+/)
    const pid = parseNumber(parts[1])
    if (!pid) continue
    const fd = parts[3] ?? ''
    const type = parts[4] ?? ''
    const name = parts.slice(8).join(' ')
    const processInfo = ensureProcess(processes, pid)

    if (name.startsWith('/')) {
      const normalized = normalizePathValue(name)
      processInfo.openFiles.push(normalized)
      if (fd === 'txt' && normalized.includes(`${path.sep}bin${path.sep}node`)) {
        processInfo.executablePath ??= normalized
      }
    }

    if (type === 'IPv4' || type === 'IPv6') {
      const port = parseTcpPort(name)
      if (port) processInfo.listeningPorts.push(port)
      if (
        name.includes('->') &&
        name.includes(':443') &&
        name.includes('(ESTABLISHED)') &&
        !name.includes('->127.0.0.1:') &&
        !name.includes('->[::1]:')
      ) {
        processInfo.externalTcp443Count += 1
      }
    }
  }

  for (const processInfo of processes.values()) {
    processInfo.openFiles = [...new Set(processInfo.openFiles)]
    processInfo.listeningPorts = [...new Set(processInfo.listeningPorts)]
  }
}

export async function scanRuntimeOwnershipSnapshot(options = {}) {
  const injectedSnapshot = String(process.env.OPENSPARROW_RUNTIME_OWNERSHIP_SNAPSHOT_JSON ?? '').trim()
  if (injectedSnapshot) {
    try {
      const parsed = JSON.parse(injectedSnapshot)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  if (process.platform === 'win32') return []
  const timeoutMs = options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS
  const psOutput = await execFileText('ps', ['-axo', 'pid=,ppid=,command='], { timeoutMs })
  const psProcesses = parsePsOutput(psOutput)
  const processes = new Map(
    [...psProcesses.entries()].filter(([, processInfo]) => {
      const command = String(processInfo.command ?? '').toLowerCase()
      return command.includes('openclaw') || command.includes('gtclaw') || command.includes('server.mjs')
    }),
  )
  try {
    const pids = [...processes.keys()].filter(Boolean)
    if (pids.length > 0) {
      const lsofOutput = await execFileText('lsof', ['-nP', '-p', pids.join(',')], { timeoutMs })
      parseLsofOutput(lsofOutput, processes)
    }
  } catch {
    // Best effort only; ps data still lets status expose UI identity.
  }

  return [...processes.values()].filter((processInfo) => {
    const text = [
      processInfo.command,
      processInfo.executablePath,
      ...processInfo.openFiles.slice(0, 12),
    ].join('\n').toLowerCase()
    return (
      text.includes('openclaw') ||
      text.includes('gtclaw') ||
      text.includes('ui/server.mjs') ||
      text.includes('server.mjs')
    )
  })
}
