import fs from 'node:fs'
import path from 'node:path'

export const MAIN_AGENT_SESSION_KEY = 'agent:main:main'

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
