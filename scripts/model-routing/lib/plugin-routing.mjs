import path from 'node:path'

export const DEFAULT_OPENCLAW_VERSION = '2026.4.14'
export const DEFAULT_CLAWROUTER_VERSION = '0.12.149'
export const DEFAULT_PROFILE = 'model-routing-lab'
export const DEFAULT_GATEWAY_PORT = 19191
export const DEFAULT_PROXY_PORT = 8402
export const BLOCKRUN_PROVIDER_ID = 'blockrun'
export const BLOCKRUN_WEB_SEARCH_PROVIDER_ID = 'blockrun-exa'
export const BLOCKRUN_MCP_SERVER_ID = 'blockrun'
export const CLAWROUTER_PLUGIN_ID = 'clawrouter'

export function buildPluginLabLayout(repoRoot, options = {}) {
  const profile = String(options.profile ?? DEFAULT_PROFILE).trim() || DEFAULT_PROFILE
  const labRoot = path.resolve(options.labRoot ?? path.join(repoRoot, 'dist', 'model-running-lab'))
  const runtimeRoot = path.join(labRoot, 'runtime')
  const homeRoot = path.join(labRoot, 'home')
  const cacheRoot = path.join(labRoot, 'cache')
  const logsRoot = path.join(labRoot, 'logs')
  const profileStateRoot = path.join(homeRoot, `.openclaw-${profile}`)
  const globalStateRoot = path.join(homeRoot, '.openclaw')
  const pluginRoot = path.join(profileStateRoot, 'extensions', CLAWROUTER_PLUGIN_ID)

  return {
    profile,
    labRoot,
    runtimeRoot,
    homeRoot,
    cacheRoot,
    logsRoot,
    profileStateRoot,
    globalStateRoot,
    pluginRoot,
  }
}

export function dependencySpecsFromPackageJson(packageJson = {}) {
  return Object.entries(packageJson?.dependencies ?? {})
    .map(([name, version]) => `${name}@${version}`)
    .sort((left, right) => left.localeCompare(right))
}

export function cleanupPluginGlobalConfig(config = {}) {
  const next = cloneJson(config)

  if (next.models?.providers && typeof next.models.providers === 'object') {
    delete next.models.providers[BLOCKRUN_PROVIDER_ID]
  }

  if (next.agents?.defaults?.model?.primary?.startsWith?.(`${BLOCKRUN_PROVIDER_ID}/`)) {
    delete next.agents.defaults.model.primary
  }

  if (next.agents?.defaults?.models && typeof next.agents.defaults.models === 'object') {
    for (const key of Object.keys(next.agents.defaults.models)) {
      if (key.startsWith(`${BLOCKRUN_PROVIDER_ID}/`)) {
        delete next.agents.defaults.models[key]
      }
    }
    if (Object.keys(next.agents.defaults.models).length === 0) {
      delete next.agents.defaults.models
    }
  }

  if (next.tools?.web?.search?.provider === BLOCKRUN_WEB_SEARCH_PROVIDER_ID) {
    delete next.tools.web.search.provider
  }

  if (next.mcp?.servers && typeof next.mcp.servers === 'object') {
    delete next.mcp.servers[BLOCKRUN_MCP_SERVER_ID]
    if (Object.keys(next.mcp.servers).length === 0) {
      delete next.mcp.servers
    }
  }

  return next
}

export function cleanupPluginProfileConfig(config = {}) {
  const next = cloneJson(config)
  if (next.plugins?.entries && typeof next.plugins.entries === 'object') {
    delete next.plugins.entries[CLAWROUTER_PLUGIN_ID]
    if (Object.keys(next.plugins.entries).length === 0) delete next.plugins.entries
  }
  if (next.plugins?.installs && typeof next.plugins.installs === 'object') {
    delete next.plugins.installs[CLAWROUTER_PLUGIN_ID]
    if (Object.keys(next.plugins.installs).length === 0) delete next.plugins.installs
  }
  if (Array.isArray(next.plugins?.allow)) {
    next.plugins.allow = next.plugins.allow.filter((item) => item !== CLAWROUTER_PLUGIN_ID)
    if (next.plugins.allow.length === 0) delete next.plugins.allow
  }
  if (next.plugins && Object.keys(next.plugins).length === 0) delete next.plugins
  return next
}

export function buildAgentProbeArgs(options = {}) {
  const sessionId = String(options.sessionId ?? '').trim()
  if (!sessionId) {
    throw new Error('Agent probe requires an explicit sessionId')
  }

  const agentId = String(options.agentId ?? 'clawrouter-probe').trim() || 'clawrouter-probe'
  const message = String(options.message ?? 'Reply with exactly OK.').trim() || 'Reply with exactly OK.'
  const thinking = String(options.thinking ?? 'off').trim() || 'off'
  const timeoutSeconds = normalizeTimeoutSeconds(options.timeoutSeconds, 120)

  return [
    'agent',
    '--agent',
    agentId,
    '--session-id',
    sessionId,
    '--message',
    message,
    '--thinking',
    thinking,
    '--timeout',
    String(timeoutSeconds),
    '--json',
  ]
}

export function buildAgentProbeSessionId(options = {}) {
  const prefix = normalizeSessionToken(options.prefix, 'clawrouter-probe')
  const seed = normalizeSessionToken(options.seed, `${Date.now()}-${process.pid}`)
  return `${prefix}-${seed}`
}

export function sanitizeAsciiHttpHeaderValue(value, maxLength = 512) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\t\x20-\x7e]+/g, '?')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function patchClawRouterReasoningHeaderSource(sourceText = '') {
  const source = String(sourceText ?? '')
  const assignment = 'responseHeaders["x-clawrouter-reasoning"] = routingDecision.reasoning;'
  const patchedAssignment = 'responseHeaders["x-clawrouter-reasoning"] = sanitizeAsciiHttpHeaderValue(routingDecision.reasoning);'
  const helperDefinition = String.raw`const sanitizeAsciiHttpHeaderValue = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/[^\t\x20-\x7e]+/g, '?').replace(/\s+/g, ' ').trim().slice(0, 512);`
  const helperAnchor = '      const responseHeaders = {};'

  if (!source.includes(assignment)) {
    return { changed: false, sourceText: source }
  }

  let next = source.replaceAll(assignment, patchedAssignment)
  if (!next.includes(helperDefinition)) {
    if (next.includes(helperAnchor)) {
      next = next.replace(helperAnchor, `      ${helperDefinition}\n      const responseHeaders = {};`)
    } else {
      next = `${helperDefinition}\n${next}`
    }
  }

  return { changed: next !== source, sourceText: next }
}

export function gatewayLogShowsProxyReady(logText, proxyPort) {
  const normalizedPort = Number.parseInt(String(proxyPort ?? '').trim(), 10)
  if (!Number.isInteger(normalizedPort) || normalizedPort <= 0) return false
  return String(logText ?? '').includes(`BlockRun x402 proxy listening on port ${normalizedPort}`)
}


export async function closeWritableStream(stream) {
  if (!stream || stream.destroyed || stream.writableEnded) return
  await new Promise((resolve) => {
    const finish = () => resolve()
    stream.once('finish', finish)
    stream.end()
  })
}

function normalizeTimeoutSeconds(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

function normalizeSessionToken(value, fallback) {
  const input = String(value ?? '').trim() || fallback
  const normalized = input.replace(/[^a-zA-Z0-9._:-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return normalized || fallback
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}))
}
