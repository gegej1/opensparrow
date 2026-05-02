import fs from 'node:fs'
import path from 'node:path'

export const MAIN_AGENT_SESSION_KEY = 'agent:main:main'

const SESSION_AUTHORITY_FIELDS = Object.freeze([
  'modelProvider',
  'model',
  'authProfileOverride',
])
const DEFAULT_SMART_ROUTER_MODEL_TARGET = 'opensparrow-router/auto'

/**
 * @param {{ providerConfigWritten: boolean, authProfileWritten: boolean, runtimeRestarted: boolean }} params
 * @returns {boolean}
 */
export function shouldRebindMainSession(params) {
  return Boolean(
    params?.providerConfigWritten
    && params?.authProfileWritten
    && params?.runtimeRestarted,
  )
}

/**
 * @param {string} storePath
 * @returns {Record<string, unknown>}
 */
function readSessionStore(storePath) {
  if (!fs.existsSync(storePath)) return {}

  const raw = JSON.parse(fs.readFileSync(storePath, 'utf8'))
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`invalid session store shape in ${storePath}`)
  }
  return raw
}

/**
 * @param {string} storePath
 * @param {Record<string, unknown>} store
 */
function writeSessionStore(storePath, store) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true })

  const mode = fs.existsSync(storePath)
    ? fs.statSync(storePath).mode & 0o777
    : 0o600
  const tempPath = `${storePath}.${process.pid}.${Date.now()}.tmp`

  try {
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), {
      encoding: 'utf8',
      mode,
    })
    fs.renameSync(tempPath, storePath)
    fs.chmodSync(storePath, mode)
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { force: true })
    }
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isAgentMainSessionKey(sessionKey) {
  return sessionKey === MAIN_AGENT_SESSION_KEY || String(sessionKey ?? '').startsWith('agent:main:')
}

function resolveSessionFamily(sessionKey) {
  if (sessionKey === MAIN_AGENT_SESSION_KEY) return 'main'
  const family = String(sessionKey ?? '').split(':')[2] || 'unknown'
  return family || 'unknown'
}

function hasSessionAuthorityFields(entry) {
  return SESSION_AUTHORITY_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(entry, field))
}

function aggregateProviderModel(aggregate, entry) {
  const provider = String(entry?.modelProvider ?? 'unknown').trim() || 'unknown'
  const model = String(entry?.model ?? 'unknown').trim() || 'unknown'
  const key = `${provider}\u0000${model}`
  const current = aggregate.get(key)
  if (current) {
    current.count += 1
  } else {
    aggregate.set(key, { provider, model, count: 1 })
  }
}

function buildSessionAuthoritySummary({
  changed = false,
  reason = 'no-authority-fields',
  phase = '',
  affectedCount = 0,
  aggregate = new Map(),
  channelFamilies = {},
} = {}) {
  const summary = {
    changed,
    reason,
    affectedCount,
    affectedProviderModelAggregate: [...aggregate.values()]
      .sort((left, right) => (
        left.provider.localeCompare(right.provider)
        || left.model.localeCompare(right.model)
      )),
    channelFamilies: Object.fromEntries(
      Object.entries(channelFamilies).sort(([left], [right]) => left.localeCompare(right)),
    ),
  }
  const normalizedPhase = normalizeDiagnosticLabel(phase)
  if (normalizedPhase) summary.phase = normalizedPhase
  return summary
}

function normalizeDiagnosticLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function isSmartModeAuthority(config = {}, routerModelTarget = DEFAULT_SMART_ROUTER_MODEL_TARGET) {
  const primary = String(config?.agents?.defaults?.model?.primary ?? '').trim()
  return primary === routerModelTarget
}

/**
 * Remove one persisted session binding so the next turn re-creates it with fresh config.
 * Deleting a single sessionKey mapping is an OpenClaw-supported manual reset contract.
 *
 * @param {{ storePath: string, sessionKey?: string }} params
 * @returns {{ changed: boolean, reason: string, removedEntry: Record<string, unknown> | null }}
 */
export function freshRebindSessionStore(params) {
  const storePath = String(params?.storePath ?? '').trim()
  if (!storePath) throw new Error('storePath is required for session rebind')

  const sessionKey = String(params?.sessionKey ?? MAIN_AGENT_SESSION_KEY).trim() || MAIN_AGENT_SESSION_KEY
  const store = readSessionStore(storePath)

  if (!Object.prototype.hasOwnProperty.call(store, sessionKey)) {
    return { changed: false, reason: 'binding-missing', removedEntry: null }
  }

  const removedEntry = store[sessionKey]
  delete store[sessionKey]
  writeSessionStore(storePath, store)

  return { changed: true, reason: 'binding-removed', removedEntry }
}

/**
 * Clear persisted provider/model authority snapshots for all current main-agent
 * sessions so the next turn resolves from current profile defaults. Session ids,
 * session files, and conversation state are preserved.
 *
 * @param {{ storePath: string }} params
 * @returns {{
 *   changed: boolean,
 *   reason: string,
 *   affectedCount: number,
 *   affectedProviderModelAggregate: Array<{provider: string, model: string, count: number}>,
 *   channelFamilies: Record<string, number>,
 * }}
 */
export function refreshAgentMainSessionAuthority(params) {
  const storePath = String(params?.storePath ?? '').trim()
  if (!storePath) throw new Error('storePath is required for session authority refresh')

  const store = readSessionStore(storePath)
  const aggregate = new Map()
  const channelFamilies = {}
  let affectedCount = 0
  const reason = normalizeDiagnosticLabel(params?.reason) || 'authority-fields-cleared'
  const phase = normalizeDiagnosticLabel(params?.phase)

  for (const [sessionKey, entry] of Object.entries(store)) {
    if (!isAgentMainSessionKey(sessionKey)) continue
    if (!isPlainObject(entry)) continue
    if (!hasSessionAuthorityFields(entry)) continue

    aggregateProviderModel(aggregate, entry)
    const family = resolveSessionFamily(sessionKey)
    channelFamilies[family] = (channelFamilies[family] ?? 0) + 1
    affectedCount += 1

    for (const field of SESSION_AUTHORITY_FIELDS) {
      delete entry[field]
    }
  }

  if (affectedCount === 0) {
    return buildSessionAuthoritySummary({
      changed: false,
      reason: phase ? reason : 'no-authority-fields',
      phase,
    })
  }

  writeSessionStore(storePath, store)
  return buildSessionAuthoritySummary({
    changed: true,
    reason,
    phase,
    affectedCount,
    aggregate,
    channelFamilies,
  })
}

/**
 * In smart mode, persisted main-agent provider/model snapshots are not
 * authoritative. Clear only authority fields so OpenClaw resolves the next turn
 * from agents.defaults.model.primary without deleting session state.
 *
 * @param {{
 *   storePath: string,
 *   config?: Record<string, unknown>,
 *   routerModelTarget?: string,
 *   phase?: 'save-time'|'runtime-start'|'pre-dispatch'|'repeated-cleanup'|string,
 * }} params
 * @returns {{
 *   changed: boolean,
 *   reason: string,
 *   phase?: string,
 *   affectedCount: number,
 *   affectedProviderModelAggregate: Array<{provider: string, model: string, count: number}>,
 *   channelFamilies: Record<string, number>,
 * }}
 */
export function refreshSmartModeChannelSessionAuthority(params) {
  const phase = normalizeDiagnosticLabel(params?.phase) || 'repeated-cleanup'
  if (!isSmartModeAuthority(params?.config, params?.routerModelTarget)) {
    return buildSessionAuthoritySummary({
      changed: false,
      reason: 'smart-mode-inactive',
      phase,
    })
  }

  return refreshAgentMainSessionAuthority({
    storePath: params?.storePath,
    reason: 'smart-mode-channel-authority',
    phase,
  })
}

/**
 * @param {{
 *   storePath: string,
 *   providerConfigWritten: boolean,
 *   authProfileWritten: boolean,
 *   runtimeRestarted: boolean,
 *   sessionKey?: string,
 * }} params
 * @returns {{ changed: boolean, reason: string, removedEntry: Record<string, unknown> | null }}
 */
export function maybeFreshRebindMainSession(params) {
  if (!shouldRebindMainSession(params)) {
    return { changed: false, reason: 'gates-not-satisfied', removedEntry: null }
  }

  return freshRebindSessionStore(params)
}
