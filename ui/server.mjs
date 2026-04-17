/**
 * ClawBot (openclaw) Local Management UI Backend
 * Node.js ESM HTTP server - no npm dependencies, uses only built-in modules.
 * Port default: 19000, auto-increments if busy.
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

import {
  getModelRoutingConfig,
  saveModelRoutingConfig,
} from './lib/model-routing-config.mjs'

// ---------------------------------------------------------------------------
// Path setup
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACK_ROOT = path.resolve(__dirname, '..')          // usb-pack/
const PROFILE   = process.env.OPENCLAW_PROFILE ?? 'usb-portable'

function resolvePathFromEnv(rawValue, fallbackPath) {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return fallbackPath
  if (raw === '~') return os.homedir()
  if (raw.startsWith('~/') || raw.startsWith('~\\')) {
    return path.resolve(os.homedir(), raw.slice(2))
  }
  return path.resolve(raw)
}

function resolvePortFromEnv(name, fallback) {
  const raw = Number.parseInt(String(process.env[name] ?? '').trim(), 10)
  if (!Number.isFinite(raw) || raw <= 0) return fallback
  return raw
}

function resolveDefaultRuntimeRoot() {
  const runtimeRoot = path.join(PACK_ROOT, 'runtime')
  if (fs.existsSync(runtimeRoot) && fs.readdirSync(runtimeRoot).length > 0) {
    return runtimeRoot
  }

  if (process.platform === 'win32') return path.join(PACK_ROOT, 'vendor', 'windows-openclaw')
  if (process.platform === 'darwin') return path.join(PACK_ROOT, 'vendor', 'mac-openclaw')
  return path.join(PACK_ROOT, 'vendor', 'linux-openclaw')
}

const RUNTIME_ROOT = resolvePathFromEnv(process.env.USB_RUNTIME_ROOT, resolveDefaultRuntimeRoot())

function resolveOpenClawEntry() {
  const candidates = [
    path.join(RUNTIME_ROOT, 'openclaw', 'openclaw.mjs'),
    path.join(RUNTIME_ROOT, 'node_modules', 'openclaw', 'openclaw.mjs'),
    path.join(RUNTIME_ROOT, 'bin', 'node_modules', 'openclaw', 'openclaw.mjs'),
    path.join(RUNTIME_ROOT, 'lib', 'node_modules', 'openclaw', 'openclaw.mjs'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}

const OC_ENTRY  = resolveOpenClawEntry()

function resolveOpenclawHome() {
  return resolvePathFromEnv(process.env.OPENCLAW_HOME, os.homedir())
}

const OPENCLAW_HOME = resolveOpenclawHome()
const PROFILE_DIR = path.join(OPENCLAW_HOME, `.openclaw-${PROFILE}`)
const CONFIG_FILE = path.join(PROFILE_DIR, 'openclaw.json')
const UI_META_FILE = path.join(PROFILE_DIR, 'ui-meta.json')
const WORKSPACE_DIR = path.join(PROFILE_DIR, 'workspace')
const AUTH_PROFILES_FILE = path.join(PROFILE_DIR, 'agents', 'main', 'agent', 'auth-profiles.json')
const PUBLIC_DIR  = path.join(__dirname, 'public')

const SKILLS_SRC = path.join(PACK_ROOT, 'skills', 'superpowers')
const SKILL_TARGETS = [
  path.join(os.homedir(), '.claude', 'skills', 'superpowers'),
  path.join(os.homedir(), '.codex', 'skills', 'superpowers'),
]

const INDUSTRY_SKILLS_SRC = path.join(PACK_ROOT, 'skills', 'My_Skills')
const INDUSTRY_SKILL_TARGETS = [
  path.join(os.homedir(), '.claude', 'skills', 'My_Skills'),
  path.join(os.homedir(), '.codex', 'skills', 'My_Skills'),
]

const INDUSTRY_SKILL_CATEGORIES = [
  { key: 'Business',   name: '商业', desc: '营销、管理、运营相关' },
  { key: 'Education',  name: '教育', desc: '教学、培训、学习相关' },
  { key: 'Finance',    name: '金融', desc: '投资、财务、风控相关' },
  { key: 'Government', name: '政务', desc: '公文、政策、行政相关' },
  { key: 'Healthcare', name: '医疗', desc: '医学、健康、诊断相关' },
  { key: 'Utilities',  name: '工具', desc: '通用工具、效率提升' },
]

function getIndustrySkillCategoryMeta(key) {
  return INDUSTRY_SKILL_CATEGORIES.find(category => category.key === key) ?? null
}

const DEFAULT_MODEL = process.env.OPENCLAW_MODEL ?? 'openai/gpt-4o-mini'
const DINGTALK_PLUGIN_PACKAGE = '@openclaw-china/channels'
const DINGTALK_PLUGIN_ID = 'channels'
const WECOM_PLUGIN_PACKAGE = '@sunnoy/wecom'
const WECOM_PLUGIN_ID = 'wecom'
const WECOM_MIN_OPENCLAW_VERSION = '2026.3.23'

const DEFAULT_PORT = resolvePortFromEnv('OPENSPARROW_UI_PORT', 19000)
const GATEWAY_PORT = resolvePortFromEnv('OPENCLAW_GATEWAY_PORT', 18889)
const AUTO_OPEN_BROWSER = !['0', 'false', 'no', 'off'].includes(
  String(process.env.OPENSPARROW_AUTO_OPEN ?? '').trim().toLowerCase()
)

const OC_TIMEOUT = {
  DEFAULT: 120000,
  STATUS: 10000,
  CONFIG_SET: 20000,
  MODEL_SET: 20000,
  CHANNEL_PROBE: 20000,
  DAEMON_STOP: 20000,
  DAEMON_UNINSTALL: 20000,
  DAEMON_INSTALL: 45000,
  DAEMON_RESTART: 80000,
  PLUGIN_INSTALL: 180000,
  UNINSTALL_FULL: 90000,
}

function resolveBundledNodeBinary() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(RUNTIME_ROOT, 'node.exe'),
        path.join(RUNTIME_ROOT, 'bin', 'node.exe'),
        path.join(RUNTIME_ROOT, 'node', 'node.exe'),
        path.join(RUNTIME_ROOT, 'node', 'bin', 'node.exe'),
        path.join(RUNTIME_ROOT, 'node', 'bin', 'node'),
      ]
    : [
        path.join(RUNTIME_ROOT, 'bin', 'node'),
        path.join(RUNTIME_ROOT, 'node', 'bin', 'node'),
        path.join(RUNTIME_ROOT, 'node', 'node'),
        path.join(RUNTIME_ROOT, 'node', 'node.exe'),
      ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}

const NODE_BIN = resolveBundledNodeBinary()

// ---------------------------------------------------------------------------
// Utility: run an oc command via the bundled Node binary
// ---------------------------------------------------------------------------

/**
 * Execute an openclaw command.
 * @param {string[]} args  Arguments passed after `openclaw.mjs --profile $PROFILE`
 * @param {{timeoutMs?: number, opName?: string}} [options]
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
async function runOc(args, options = {}) {
  return new Promise((resolve) => {
    const timeoutMs = Number.isFinite(options?.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : OC_TIMEOUT.DEFAULT
    const opName = typeof options?.opName === 'string' && options.opName.trim()
      ? options.opName.trim()
      : `openclaw ${args.join(' ')}`
    let timedOut = false
    let settled = false

    const done = (result) => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      resolve(result)
    }

    const proc = spawn(
      NODE_BIN,
      [OC_ENTRY, '--profile', PROFILE, ...args],
      {
        env: { ...process.env, CI: process.env.CI ?? '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

    const timeoutId = setTimeout(() => {
      timedOut = true
      try {
        proc.kill('SIGTERM')
      } catch {}
      setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {}
      }, 1500).unref()
    }, timeoutMs)

    proc.on('close', (code) => {
      if (timedOut) {
        const timeoutMsg = `Command timed out after ${timeoutMs}ms: ${opName}`
        const mergedErr = stderr ? `${stderr}\n${timeoutMsg}` : timeoutMsg
        done({ stdout, stderr: mergedErr, code: 124 })
        return
      }
      done({ stdout, stderr, code: code ?? 0 })
    })

    proc.on('error', (err) => {
      const mergedErr = [stderr, err.message].filter(Boolean).join('\n')
      done({ stdout, stderr: mergedErr, code: 1 })
    })
  })
}

// ---------------------------------------------------------------------------
// Utility: port availability
// ---------------------------------------------------------------------------

/**
 * Check whether a TCP port is already in use on localhost.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
async function isPortBusy(port) {
  const hosts = ['127.0.0.1', '::1']
  for (const host of hosts) {
    if (await isPortBusyOnHost(port, host)) return true
  }
  return false
}

/**
 * Check whether a TCP port is in use on a specific host.
 * @param {number} port
 * @param {string} host
 * @returns {Promise<boolean>}
 */
async function isPortBusyOnHost(port, host) {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(port, host, () => {
      server.close(() => resolve(false))
    })
    server.on('error', (err) => {
      if (err?.code === 'EADDRINUSE' || err?.code === 'EACCES') {
        resolve(true)
        return
      }
      // e.g. EADDRNOTAVAIL / EAFNOSUPPORT: treat as non-busy for this host.
      resolve(false)
    })
  })
}

/**
 * Find the first available port starting from `start`.
 * @param {number} start
 * @returns {Promise<number>}
 */
async function findPort(start) {
  let port = start
  while (await isPortBusy(port)) {
    port++
  }
  return port
}

/**
 * Strip ANSI escape sequences from text.
 * @param {string} text
 * @returns {string}
 */
function stripAnsi(text) {
  return String(text ?? '').replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Build a compact error summary from openclaw command result.
 * @param {{stdout?: string, stderr?: string, code?: number}} result
 * @param {string} [fallback]
 * @returns {string}
 */
function summarizeOcIssue(result, fallback = 'unknown error') {
  const stderr = stripAnsi(result?.stderr).trim()
  if (stderr) return stderr
  const stdout = stripAnsi(result?.stdout).trim()
  if (stdout) return stdout
  if (Number.isFinite(result?.code)) return `exit code ${result.code}`
  return fallback
}

/**
 * Normalize user-provided OpenAI-compatible base URL.
 * - Host-only input -> append /v1
 * - Endpoint input (e.g. .../chat/completions) -> trim to provider base
 * - Custom non-root path is preserved
 * @param {string | null | undefined} rawInput
 * @param {string} [fallback]
 * @returns {string}
 */
function normalizeOpenAIBaseUrl(rawInput, fallback = 'https://api.openai.com/v1') {
  const fallbackValue = String(fallback || 'https://api.openai.com/v1').trim()
  const raw = String(rawInput ?? '').trim()
  if (!raw) return fallbackValue

  let candidate = raw
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)
  if (!hasScheme && candidate.includes('.')) {
    candidate = `https://${candidate}`
  }

  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    return raw.replace(/\/+$/, '') || fallbackValue
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return raw.replace(/\/+$/, '') || fallbackValue
  }

  let pathname = (parsed.pathname || '/').replace(/\/+$/, '')
  pathname = pathname.replace(
    /\/(chat\/completions|responses|models|completions|embeddings|audio\/transcriptions)$/i,
    ''
  )

  if (!pathname || pathname === '/') pathname = '/v1'

  parsed.pathname = pathname
  parsed.search = ''
  parsed.hash = ''

  return parsed.toString().replace(/\/+$/, '')
}

function extractOpenAIModelId(rawValue, fallback = 'gpt-4o-mini') {
  const value = String(rawValue ?? '').trim()
  if (!value) return fallback
  if (value.startsWith('openai/')) {
    const stripped = value.slice('openai/'.length).trim()
    return stripped || fallback
  }
  return value
}

/**
 * Normalize DingTalk credentials from UI aliases.
 * Accepts:
 * - clientId / appKey / robotCode (same source value)
 * - corpId / cropId
 * - clientSecret / appSecret
 * @param {any} raw
 * @returns {{clientId: string, clientSecret: string, robotCode: string, corpId: string}}
 */
function normalizeDingtalkCredentials(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const rawClientId = String(
    data.clientId ?? data.appKey ?? ''
  ).trim()
  const rawRobotCode = String(
    data.robotCode ?? ''
  ).trim()
  const clientId = rawClientId || rawRobotCode
  const clientSecret = String(
    data.clientSecret ?? data.appSecret ?? ''
  ).trim()
  const corpId = String(
    data.corpId ?? data.cropId ?? ''
  ).trim()
  return {
    clientId,
    clientSecret,
    robotCode: rawRobotCode || rawClientId,
    corpId,
  }
}

/**
 * Read UI-only metadata (safe, never throws).
 * @returns {Record<string, any>}
 */
function readUiMetaSafe() {
  try {
    if (!fs.existsSync(UI_META_FILE)) return {}
    const raw = fs.readFileSync(UI_META_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Persist UI-only metadata (safe, never throws).
 * @param {Record<string, any>} meta
 */
function writeUiMetaSafe(meta) {
  try {
    fs.mkdirSync(PROFILE_DIR, { recursive: true })
    fs.writeFileSync(UI_META_FILE, JSON.stringify(meta, null, 2), 'utf8')
  } catch {}
}

/**
 * Read saved DingTalk UI meta fields.
 * @returns {{corpId: string, robotCode: string}}
 */
function getDingtalkUiMeta() {
  const uiMeta = readUiMetaSafe()
  const dingtalk = uiMeta?.dingtalk && typeof uiMeta.dingtalk === 'object'
    ? uiMeta.dingtalk
    : {}
  return {
    corpId: String(dingtalk.corpId ?? dingtalk.cropId ?? '').trim(),
    robotCode: String(dingtalk.robotCode ?? '').trim(),
  }
}

/**
 * Save DingTalk UI-only fields such as corpId/robotCode.
 * @param {{corpId?: string, robotCode?: string}} patch
 */
function saveDingtalkUiMeta(patch = {}) {
  try {
    const current = readUiMetaSafe()
    const currentMeta = current?.dingtalk && typeof current.dingtalk === 'object'
      ? current.dingtalk
      : {}
    const corpId = String(
      patch.corpId ?? patch.cropId ?? currentMeta.corpId ?? ''
    ).trim()
    const robotCode = String(
      patch.robotCode ?? currentMeta.robotCode ?? ''
    ).trim()
    const next = {
      ...current,
      dingtalk: {
        ...currentMeta,
        ...(corpId ? { corpId } : {}),
        ...(robotCode ? { robotCode } : {}),
      },
    }
    writeUiMetaSafe(next)
  } catch {}
}

function resolveDingtalkPluginDistFile() {
  return path.join(
    PROFILE_DIR,
    'extensions',
    'channels',
    'node_modules',
    '@openclaw-china',
    'dingtalk',
    'dist',
    'index.js'
  )
}

function patchDingtalkPluginDist() {
  const file = resolveDingtalkPluginDistFile()
  try {
    if (!fs.existsSync(file)) {
      return { ok: false, changed: false, message: `钉钉插件未找到：${toUserPath(file)}` }
    }

    const originalRaw = fs.readFileSync(file, 'utf8')
    const newline = originalRaw.includes('\r\n') ? '\r\n' : '\n'
    const raw = originalRaw.replace(/\r\n/g, '\n')

    if (
      raw.includes('var SESSION_WEBHOOK_TTL_MS') &&
      raw.includes('function rememberSessionWebhook') &&
      raw.includes('function resolveSessionWebhook') &&
      raw.includes('function sendMarkdownBySessionWebhook') &&
      raw.includes('client.registered === true || connected === true') &&
      raw.includes('keepAlive: false')
    ) {
      return { ok: true, changed: false, message: '钉钉插件已打补丁' }
    }

    let next = raw

    if (!next.includes('var SESSION_WEBHOOK_TTL_MS')) {
      const insertAfter = 'var REQUEST_TIMEOUT = 3e4;\n'
      if (next.includes(insertAfter)) {
        next = next.replace(
          insertAfter,
          `${insertAfter}var SESSION_WEBHOOK_TTL_MS = 18e5;\nvar sessionWebhookCache = /* @__PURE__ */ new Map();\nfunction rememberSessionWebhook(conversationId, sessionWebhook) {\n  const cid = typeof conversationId === "string" ? conversationId.trim() : "";\n  const url = typeof sessionWebhook === "string" ? sessionWebhook.trim() : "";\n  if (!cid || !url) {\n    return;\n  }\n  sessionWebhookCache.set(cid, {\n    url,\n    expiresAt: Date.now() + SESSION_WEBHOOK_TTL_MS\n  });\n}\nfunction resolveSessionWebhook(conversationId) {\n  const cid = typeof conversationId === "string" ? conversationId.trim() : "";\n  if (!cid) {\n    return null;\n  }\n  const entry = sessionWebhookCache.get(cid);\n  if (!entry) {\n    return null;\n  }\n  if (entry.expiresAt <= Date.now()) {\n    sessionWebhookCache.delete(cid);\n    return null;\n  }\n  return entry.url;\n}\nasync function sendMarkdownBySessionWebhook(params) {\n  const { sessionWebhook, title, text } = params;\n  const controller = new AbortController();\n  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);\n  try {\n    const response = await fetch(sessionWebhook, {\n      method: "POST",\n      headers: {\n        "Content-Type": "application/json"\n      },\n      body: JSON.stringify({\n        msgtype: "markdown",\n        markdown: { title, text }\n      }),\n      signal: controller.signal\n    });\n    if (!response.ok) {\n      const errorText = await response.text();\n      throw new Error(\`DingTalk sessionWebhook send failed: HTTP \${response.status} - \${errorText}\`);\n    }\n  } catch (err) {\n    if (err instanceof Error && err.name === "AbortError") {\n      throw new Error(\`DingTalk sessionWebhook send timed out after \${REQUEST_TIMEOUT}ms\`);\n    }\n    throw err;\n  } finally {\n    clearTimeout(timeoutId);\n  }\n}\n`
        )
      }
    }

    if (!next.includes('sendBySession failed, falling back to groupMessages/send')) {
      const anchor = 'async function sendGroupMessage(params) {\n  const { cfg, to, text, accessToken, title } = params;\n'
      if (next.includes(anchor)) {
        next = next.replace(
          anchor,
          `${anchor}  const sessionWebhook = resolveSessionWebhook(to);\n  if (sessionWebhook) {\n    try {\n      await sendMarkdownBySessionWebhook({ sessionWebhook, title, text });\n      return {\n        messageId: \`session_\${Date.now()}\`,\n        conversationId: to\n      };\n    } catch (err) {\n      console.warn(\`[dingtalk] sendBySession failed, falling back to groupMessages/send: \${String(err)}\`);\n    }\n  }\n`
        )
      }
    }

    if (!next.includes('rememberSessionWebhook(rawMessage.conversationId, rawMessage.sessionWebhook)')) {
      next = next.replace(
        /const rawMessage = parseRawMessage\(payload\.data, streamMessageId\);\n(\s+)const senderName =/g,
        (match, indent) => {
          return `const rawMessage = parseRawMessage(payload.data, streamMessageId);\n${indent}if (rawMessage && typeof rawMessage.conversationId === "string" && typeof rawMessage.sessionWebhook === "string") {\n${indent}  rememberSessionWebhook(rawMessage.conversationId, rawMessage.sessionWebhook);\n${indent}}\n${indent}const senderName =`
        }
      )
    }

    next = next.replace(
      'const registered = client.registered === true;',
      'const registered = client.registered === true || connected === true;'
    )

    next = next.replace('keepAlive: true,', 'keepAlive: false,')

    if (next !== raw) {
      try {
        fs.chmodSync(file, 0o666)
      } catch {}
      const dir = path.dirname(file)
      const tmp = path.join(dir, `.dingtalk.dist.${Date.now()}.tmp`)
      try {
        fs.writeFileSync(tmp, next.replace(/\n/g, newline), 'utf8')
        try {
          fs.unlinkSync(file)
        } catch {
          try {
            fs.chmodSync(file, 0o666)
            fs.unlinkSync(file)
          } catch {}
        }
        fs.renameSync(tmp, file)
      } catch {
        try {
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
        } catch {}
        fs.writeFileSync(file, next.replace(/\n/g, newline), 'utf8')
      }
      return { ok: true, changed: true, message: `钉钉插件补丁已应用：${toUserPath(file)}` }
    }
    return { ok: true, changed: false, message: '钉钉插件无需补丁或无法定位补丁点' }
  } catch (e) {
    return { ok: false, changed: false, message: `钉钉插件补丁失败：${e?.message ?? String(e)}` }
  }
}

/**
 * Merge UI meta back into DingTalk channel payload for frontend forms.
 * @param {any} channelCfg
 * @returns {any}
 */
function enrichDingtalkChannelForUi(channelCfg) {
  if (!channelCfg || typeof channelCfg !== 'object') return channelCfg
  const meta = getDingtalkUiMeta()
  const clientId = String(channelCfg.clientId ?? '').trim()
  const robotCode = String(channelCfg.robotCode ?? '').trim() || meta.robotCode || clientId
  const corpId = String(channelCfg.corpId ?? channelCfg.cropId ?? '').trim() || meta.corpId

  return {
    ...channelCfg,
    robotCode,
    ...(corpId ? { corpId } : {}),
  }
}

/**
 * Check whether a value looks like WeCom smart-bot Bot ID.
 * Official examples currently use `aib...` or `aib_...`.
 * @param {string | null | undefined} raw
 * @returns {boolean}
 */
function isLikelyWecomBotId(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return false
  return /^aib(?:[_-]?[A-Za-z0-9][A-Za-z0-9._-]*)$/i.test(value)
}

/**
 * Normalize WeCom credentials from UI aliases or persisted nested config.
 * @param {any} raw
 * @returns {{
 *   botId: string,
 *   secret: string,
 *   corpId: string,
 *   corpSecret: string,
 *   agentId: string,
 *   replyFormat: string,
 *   callbackToken: string,
 *   encodingAESKey: string,
 *   callbackPath: string,
 *   hasAnyAgentFields: boolean,
 *   agentConfigured: boolean,
 *   hasCallbackFields: boolean,
 *   callbackConfigured: boolean,
 * }}
 */
function normalizeWecomCredentials(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const agent = data.agent && typeof data.agent === 'object' ? data.agent : {}
  const rootCallback = data.callback && typeof data.callback === 'object' ? data.callback : {}
  const agentCallback = agent.callback && typeof agent.callback === 'object' ? agent.callback : {}
  const botId = String(data.botId ?? '').trim()
  const secret = String(data.secret ?? '').trim()
  const corpId = String(data.corpId ?? agent.corpId ?? '').trim()
  const corpSecret = String(data.corpSecret ?? agent.corpSecret ?? '').trim()
  const agentId = String(data.agentId ?? agent.agentId ?? '').trim()
  const replyFormat = String(data.replyFormat ?? agent.replyFormat ?? '').trim().toLowerCase()
  const callbackToken = String(data.callbackToken ?? rootCallback.token ?? agentCallback.token ?? '').trim()
  const encodingAESKey = String(data.encodingAESKey ?? rootCallback.encodingAESKey ?? agentCallback.encodingAESKey ?? '').trim()
  const callbackPath = String(data.callbackPath ?? rootCallback.path ?? agentCallback.path ?? '').trim()
  const hasAnyAgentFields = Boolean(corpId || corpSecret || agentId || replyFormat)
  const agentConfigured = Boolean(corpId && corpSecret && agentId)
  const hasCallbackFields = Boolean(callbackToken || encodingAESKey || callbackPath)
  const callbackConfigured = Boolean(callbackToken && encodingAESKey && callbackPath)

  return {
    botId,
    secret,
    corpId,
    corpSecret,
    agentId,
    replyFormat,
    callbackToken,
    encodingAESKey,
    callbackPath,
    hasAnyAgentFields,
    agentConfigured,
    hasCallbackFields,
    callbackConfigured,
  }
}

/**
 * Validate WeCom required and advanced credential groups.
 * @param {any} raw
 * @returns {{errors: string[]} & ReturnType<typeof normalizeWecomCredentials>}
 */
function collectWecomInputErrors(raw) {
  const normalized = normalizeWecomCredentials(raw)
  const {
    botId,
    secret,
    corpId,
    corpSecret,
    agentId,
    replyFormat,
    callbackToken,
    encodingAESKey,
    callbackPath,
    hasAnyAgentFields,
    hasCallbackFields,
  } = normalized
  const errors = []

  if (!botId) errors.push('企业微信需要填写 Bot ID')
  if (botId && !isLikelyWecomBotId(botId)) {
    errors.push('企业微信 Bot ID 格式疑似错误，请填写智能机器人（API+长连接）生成的 Bot ID（通常以 aib 或 aib_ 开头）')
  }
  if (!secret) errors.push('企业微信需要填写 Bot Secret')
  if (hasAnyAgentFields && (!corpId || !corpSecret || !agentId)) {
    errors.push('启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId')
  }
  if (agentId && !/^\d+$/.test(agentId)) {
    errors.push('企业微信 AgentId 必须是正整数')
  }
  if (replyFormat && !['markdown', 'text'].includes(replyFormat)) {
    errors.push('企业微信 Reply Format 仅支持 markdown 或 text')
  }
  if (hasCallbackFields && (!callbackToken || !encodingAESKey || !callbackPath)) {
    errors.push('启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path')
  }
  if (hasCallbackFields && (!corpId || !corpSecret || !agentId)) {
    errors.push('企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId')
  }

  return {
    ...normalized,
    errors,
  }
}

/**
 * Flatten nested WeCom config for UI forms.
 * @param {any} channelCfg
 * @returns {any}
 */
function enrichWecomChannelForUi(channelCfg) {
  if (!channelCfg || typeof channelCfg !== 'object') return channelCfg
  const normalized = normalizeWecomCredentials(channelCfg)
  return {
    ...channelCfg,
    botId: normalized.botId,
    secret: normalized.secret,
    corpId: normalized.corpId,
    corpSecret: normalized.corpSecret,
    agentId: normalized.agentId,
    replyFormat: normalized.replyFormat,
    callbackToken: normalized.callbackToken,
    encodingAESKey: normalized.encodingAESKey,
    callbackPath: normalized.callbackPath,
  }
}

/**
 * Display path with ~ prefix when under user home.
 * @param {string} absolutePath
 * @returns {string}
 */
function toUserPath(absolutePath) {
  const home = os.homedir()
  if (absolutePath.startsWith(home)) {
    return `~${absolutePath.slice(home.length)}`
  }
  return absolutePath
}


/**
 * Compare numeric dotted versions like 2026.3.23.
 * Non-numeric suffixes are ignored.
 * @param {string | null | undefined} raw
 * @returns {number[]}
 */
function parseComparableVersion(raw) {
  return String(raw ?? '')
    .match(/\d+/g)?.map(part => Number.parseInt(part, 10)).filter(Number.isFinite) ?? []
}

/**
 * @param {string | null | undefined} actual
 * @param {string | null | undefined} minimum
 * @returns {boolean}
 */
function isVersionAtLeast(actual, minimum) {
  const left = parseComparableVersion(actual)
  const right = parseComparableVersion(minimum)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return true
}

/**
 * @returns {string}
 */
function getBundledOpenClawVersion() {
  const candidates = [
    path.join(path.dirname(OC_ENTRY), 'package.json'),
    path.join(RUNTIME_ROOT, 'bin', 'node_modules', 'openclaw', 'package.json'),
    path.join(RUNTIME_ROOT, 'lib', 'node_modules', 'openclaw', 'package.json'),
    path.join(RUNTIME_ROOT, 'node_modules', 'openclaw', 'package.json'),
  ]

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue
      const raw = fs.readFileSync(candidate, 'utf8')
      const parsed = JSON.parse(raw)
      const version = String(parsed?.version ?? '').trim()
      if (version) return version
    } catch {
      // continue
    }
  }

  return ''
}

/**
 * Map daemon status token to normalized state.
 * @param {string} raw
 * @returns {'running'|'stopped'|'not_installed'|'unknown'}
 */
function mapDaemonToken(raw) {
  const token = String(raw ?? '').trim().toLowerCase()
  if (!token) return 'unknown'
  if (token === 'not_installed' || token === 'not-installed' || token.includes('not install')) {
    return 'not_installed'
  }
  if (token.includes('stopped') || token.includes('not running')) return 'stopped'
  if (token === 'stopped' || token === 'inactive' || token === 'dead' || token === 'exited') {
    return 'stopped'
  }
  if (token === 'running' || token === 'online' || token === 'active' || token === 'started') {
    return 'running'
  }
  if (token.includes('running') || token.includes('active')) return 'running'
  return 'unknown'
}

/**
 * Parse daemon state from `openclaw daemon status --json` payload.
 * @param {any} parsed
 * @returns {'running'|'stopped'|'not_installed'|'unknown'}
 */
function parseDaemonStateFromJson(parsed) {
  const candidates = [
    parsed?.status,
    parsed?.service?.runtime?.status,
    parsed?.service?.runtime?.state,
  ]
  for (const candidate of candidates) {
    const mapped = mapDaemonToken(candidate)
    if (mapped !== 'unknown') return mapped
  }

  const command = parsed?.service?.command
  if (command === null) return 'not_installed'
  if (command && typeof command === 'object') return 'stopped'

  return 'unknown'
}

/**
 * Parse daemon state from command execution result.
 * @param {{stdout: string, stderr: string, code: number}} result
 * @returns {'running'|'stopped'|'not_installed'|'unknown'}
 */
function parseDaemonStateFromResult(result) {
  const cleanOut = stripAnsi(result.stdout).trim()
  const cleanErr = stripAnsi(result.stderr).trim().toLowerCase()

  if (cleanOut) {
    try {
      const parsed = JSON.parse(cleanOut)
      return parseDaemonStateFromJson(parsed)
    } catch {
      const mapped = mapDaemonToken(cleanOut)
      if (mapped !== 'unknown') return mapped
    }
  }

  if (result.code !== 0) {
    if (cleanErr.includes('not install') || cleanErr.includes('could not find service')) {
      return 'not_installed'
    }
    if (cleanErr.includes('stopped') || cleanErr.includes('not running')) {
      return 'stopped'
    }
  }

  return 'unknown'
}

/**
 * Check whether the current profile gateway responds to health checks.
 * @returns {Promise<boolean>}
 */
async function isGatewayHealthy() {
  try {
    const result = await runOc(['health', '--json', '--timeout', '5000'], {
      timeoutMs: OC_TIMEOUT.STATUS,
      opName: 'health',
    })
    return result.code === 0
  } catch {
    return false
  }
}

/**
 * Resolve daemon/runtime state without treating a busy port as daemon=running.
 * @returns {Promise<{
 *   daemon: 'running'|'stopped'|'not_installed'|'unknown',
 *   runtimeMode: 'daemon'|'gateway-fallback'|'port-occupied'|'stopped'|'unknown',
 *   gatewayHealthy: boolean,
 *   gatewayPortBusy: boolean,
 * }>}
 */
async function resolveRuntimeState() {
  let daemon = 'unknown'
  try {
    const result = await runOc(['daemon', 'status', '--json'], {
      timeoutMs: OC_TIMEOUT.STATUS,
      opName: 'daemon status',
    })
    daemon = parseDaemonStateFromResult(result)
  } catch {
    daemon = 'unknown'
  }

  let gatewayHealthy = false
  try {
    gatewayHealthy = await isGatewayHealthy()
  } catch {
    gatewayHealthy = false
  }

  let gatewayPortBusy = false
  try {
    gatewayPortBusy = gatewayHealthy ? true : await isPortBusy(GATEWAY_PORT)
  } catch {
    gatewayPortBusy = false
  }

  let runtimeMode = 'unknown'
  if (daemon === 'running') {
    runtimeMode = 'daemon'
  } else if (gatewayHealthy) {
    runtimeMode = 'gateway-fallback'
  } else if (gatewayPortBusy) {
    runtimeMode = 'port-occupied'
  } else if (daemon === 'stopped' || daemon === 'not_installed') {
    runtimeMode = 'stopped'
  }

  return {
    daemon,
    runtimeMode,
    gatewayHealthy,
    gatewayPortBusy,
  }
}

/**
 * Read config JSON safely.
 * @returns {any | null}
 */
function readConfigSafe() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Redact sensitive values from text.
 * @param {string} text
 * @param {string[]} secrets
 * @returns {string}
 */
function redactSecrets(text, secrets) {
  let output = String(text ?? '')
  for (const secret of secrets) {
    const token = String(secret ?? '').trim()
    if (!token || token.length < 4) continue
    output = output.split(token).join('***')
  }
  return output
}

/**
 * Keep probe output compact and safe for UI display.
 * @param {string} text
 * @param {string[]} [secrets]
 * @param {number} [maxLines]
 * @returns {string}
 */
function compactProbeOutput(text, secrets = [], maxLines = 16) {
  const clean = stripAnsi(redactSecrets(text, secrets))
  const lines = clean
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  if (lines.length <= maxLines) return lines.join('\n')
  return [...lines.slice(0, maxLines), `...(${lines.length - maxLines} more lines)`].join('\n')
}

async function ensurePluginsAllowIncludes(ids) {
  const want = Array.isArray(ids) ? ids : [ids]
  const pluginIds = want
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
  if (pluginIds.length === 0) return []

  if (!fs.existsSync(CONFIG_FILE)) return []

  let cfg = {}
  let current = []
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed === 'object') cfg = parsed
    }
    const allow = cfg?.plugins?.allow
    if (Array.isArray(allow)) {
      current = allow.map((v) => String(v ?? '').trim()).filter(Boolean)
    }
  } catch {}

  const merged = [...current]
  for (const id of pluginIds) {
    const extDir = path.join(PROFILE_DIR, 'extensions', id)
    const installed = fs.existsSync(extDir)
    if (installed) {
      if (!merged.includes(id)) merged.push(id)
    } else {
      const next = merged.filter((x) => x !== id)
      merged.length = 0
      merged.push(...next)
    }
  }

  if (merged.length === current.length && merged.every((v, i) => v === current[i])) return []

  try {
    fs.mkdirSync(PROFILE_DIR, { recursive: true })
    const plugins = cfg?.plugins && typeof cfg.plugins === 'object' ? cfg.plugins : {}
    const next = {
      ...cfg,
      plugins: {
        ...plugins,
        allow: merged,
      },
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf8')
  } catch (e) {
    return [`writing plugins.allow failed: ${e?.message ?? String(e)}`]
  }
  return []
}


/**
 * Install an OpenClaw plugin package into the current profile.
 * @param {string} spec
 * @param {string} pluginId
 * @param {{pin?: boolean}} [options]
 * @returns {Promise<{ok: boolean, errors: string[]}>}
 */
async function installPluginPackage(spec, pluginId, options = {}) {
  const packageSpec = String(spec ?? '').trim()
  const id = String(pluginId ?? '').trim()
  if (!packageSpec || !id) {
    return { ok: false, errors: ['plugin package spec / id 无效'] }
  }

  const args = ['plugins', 'install', packageSpec]
  if (options?.pin) args.push('--pin')

  const result = await runOc(args, {
    timeoutMs: OC_TIMEOUT.PLUGIN_INSTALL,
    opName: `plugins install ${packageSpec}`,
  })
  if (result.code !== 0) {
    return {
      ok: false,
      errors: [`安装插件 ${packageSpec} 失败：${compactProbeOutput(`${result.stdout}
${result.stderr}`) || `exit code ${result.code}`}`],
    }
  }

  const extDir = path.join(PROFILE_DIR, 'extensions', id)
  if (!fs.existsSync(extDir)) {
    return {
      ok: false,
      errors: [`插件 ${packageSpec} 安装完成，但未找到扩展目录：${toUserPath(extDir)}`],
    }
  }

  return { ok: true, errors: [] }
}

/**
 * Build DingTalk diagnostics report.
 * @returns {Promise<{
 *   status: 'ok'|'warning'|'error',
 *   ready: boolean,
 *   daemon: 'running'|'stopped'|'not_installed'|'unknown',
 *   checks: string[],
 *   warnings: string[],
 *   errors: string[],
 *   probe: {code: number | null, summary: string}
 * }>}
 */
async function buildDingtalkProbeReport() {
  const checks = []
  const warnings = []
  const errors = []
  const config = readConfigSafe()

  const hasChannelConfig = Boolean(config?.channels?.dingtalk && typeof config.channels.dingtalk === 'object')
  const dingtalk = hasChannelConfig ? config.channels.dingtalk : {}
  const enabled = hasChannelConfig && dingtalk?.enabled !== false
  const { clientId, clientSecret, corpId } = normalizeDingtalkCredentials(dingtalk)
  const uiMeta = getDingtalkUiMeta()
  const effectiveCorpId = corpId || uiMeta.corpId

  if (!config) {
    errors.push('配置文件不存在或不可读，请先完成安装')
  } else {
    checks.push('配置文件已加载')
  }

  if (!enabled) {
    errors.push('channels.dingtalk.enabled=false，请先启用钉钉渠道')
  } else {
    checks.push('钉钉渠道已启用')
  }

  if (!clientId || !clientSecret) {
    errors.push('钉钉 AppKey/AppSecret 缺失，请先填写并保存')
  } else {
    checks.push('钉钉凭证字段已写入')
  }

  if (!effectiveCorpId) {
    warnings.push('钉钉 CorpId 未填写：建议在 UI 中补齐，便于按官方文档对照排查')
  } else {
    checks.push('钉钉 CorpId 已填写')
  }

  const { daemon, runtimeMode, gatewayHealthy, gatewayPortBusy } = await resolveRuntimeState()

  if (daemon === 'running') {
    checks.push('daemon 服务运行中')
  } else if (runtimeMode === 'gateway-fallback') {
    checks.push('gateway 健康检查通过')
    warnings.push('当前为 gateway fallback runtime（daemon 未运行）')
    warnings.push(`daemon 当前状态：${daemon}`)
  } else {
    warnings.push(`daemon 当前状态：${daemon}`)
    if (runtimeMode === 'port-occupied' && gatewayPortBusy && !gatewayHealthy) {
      warnings.push(`端口 ${GATEWAY_PORT} 已被占用，但当前 profile gateway 健康检查未通过`)
    }
  }

  let probeCode = null
  let probeSummary = ''
  try {
    const probeResult = await runOc(
      ['channels', 'status', '--probe', '--timeout', '12000'],
      {
        timeoutMs: OC_TIMEOUT.CHANNEL_PROBE,
        opName: 'channels status --probe',
      }
    )
    probeCode = probeResult.code
    probeSummary = compactProbeOutput(
      `${probeResult.stdout}\n${probeResult.stderr}`,
      [clientId, clientSecret]
    )
  } catch (e) {
    probeSummary = `probe 执行异常: ${e?.message ?? String(e)}`
  }

  const summaryLower = probeSummary.toLowerCase()
  if (summaryLower.includes('gateway token mismatch')) {
    warnings.push('检测到 gateway token mismatch：当前端口可能被旧 daemon 占用，请先执行“快速清理/全量重置”再重试')
  }
  if (
    (summaryLower.includes('gateway not reachable') || summaryLower.includes('connect failed'))
    && daemon !== 'running'
  ) {
    warnings.push('Gateway 不可达，请确认服务已启动且 18889 端口被当前 profile 占用')
  }
  if (
    summaryLower.includes('status code 401')
    || summaryLower.includes('invalid client')
    || summaryLower.includes('invalid appkey')
    || summaryLower.includes('invalid appsecret')
  ) {
    warnings.push('钉钉返回 401/凭证错误，请检查 AppKey/AppSecret，并在后台发布最新版本后重试')
  }

  if (
    summaryLower.includes('dingtalk')
    && (summaryLower.includes('enabled, configured') || summaryLower.includes('已配置'))
  ) {
    checks.push('channels status 已识别钉钉为 configured')
  }

  const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  return {
    status,
    ready: status === 'ok',
    daemon,
    checks,
    warnings,
    errors,
    probe: {
      code: probeCode,
      summary: probeSummary,
    },
  }
}

/**
 * Build WeCom diagnostics report.
 * @returns {Promise<{
 *   status: 'ok'|'warning'|'error',
 *   ready: boolean,
 *   daemon: 'running'|'stopped'|'not_installed'|'unknown',
 *   checks: string[],
 *   warnings: string[],
 *   errors: string[],
 *   probe: {code: number | null, summary: string}
 * }>}
 */
async function buildWecomProbeReport() {
  const checks = []
  const warnings = []
  const errors = []
  const config = readConfigSafe()

  const hasChannelConfig = Boolean(config?.channels?.wecom && typeof config.channels.wecom === 'object')
  const wecom = hasChannelConfig ? config.channels.wecom : {}
  const enabled = hasChannelConfig && wecom?.enabled !== false
  const normalized = normalizeWecomCredentials(wecom)
  const { botId, secret, corpSecret, callbackToken, encodingAESKey } = normalized
  const dmPolicy = String(wecom?.dmPolicy ?? '').trim().toLowerCase()
  const allowFrom = Array.isArray(wecom?.allowFrom) ? wecom.allowFrom.map(v => String(v ?? '').trim()) : []
  const pluginsAllow = Array.isArray(config?.plugins?.allow)
    ? config.plugins.allow.map(v => String(v ?? '').trim())
    : []
  const pluginEntryValue = config?.plugins?.entries?.wecom?.enabled
  const groupChat = wecom?.groupChat && typeof wecom.groupChat === 'object' ? wecom.groupChat : {}
  const groupChatEnabled = groupChat.enabled !== false
  const requireMention = groupChat.requireMention !== false

  if (!config) {
    errors.push('配置文件不存在或不可读，请先完成安装')
  } else {
    checks.push('配置文件已加载')
  }

  if (!enabled) {
    errors.push('channels.wecom.enabled=false，请先启用企业微信渠道')
  } else {
    checks.push('企业微信渠道已启用')
  }

  if (pluginEntryValue === false) {
    errors.push('plugins.entries.wecom.enabled=false，请重新保存企业微信配置或重新安装企微插件')
  } else if (pluginEntryValue === true) {
    checks.push('企业微信插件入口已启用')
  } else if (config) {
    warnings.push('plugins.entries.wecom.enabled 未显式写入：建议重新保存企业微信配置以固定插件入口')
  }

  if (pluginsAllow.length === 0) {
    warnings.push('plugins.allow 为空：当前依赖 OpenClaw auto-load 发现企微插件，建议显式包含 wecom')
  } else if (pluginsAllow.includes(WECOM_PLUGIN_ID)) {
    checks.push('plugins.allow 已显式包含 wecom')
  } else {
    warnings.push('plugins.allow 未显式包含 wecom，可能在更严格的 profile 中导致插件不加载')
  }

  if (!botId || !secret) {
    errors.push('企业微信 Bot ID / Bot Secret 缺失，请先填写并保存')
  } else {
    checks.push('企业微信凭证字段已写入')
    if (!isLikelyWecomBotId(botId)) {
      warnings.push('Bot ID 格式疑似错误：请填写“智能机器人（API+长连接）”生成的 Bot ID（通常以 aib 或 aib_ 开头）')
    }
  }

  if (hasChannelConfig) {
    if (groupChatEnabled) {
      checks.push('企业微信群聊处理已启用')
    } else {
      warnings.push('channels.wecom.groupChat.enabled=false，群聊 @Bot 将不会触发')
    }

    if (requireMention) {
      checks.push('企业微信群聊 requireMention 已启用')
    } else {
      warnings.push('channels.wecom.groupChat.requireMention=false，群聊中未 @Bot 也会触发回复')
    }

    if (dmPolicy === 'open') {
      checks.push('企业微信 DM 策略为 open（无需 CLI pairing）')
      if (allowFrom.includes('*')) {
        checks.push('企业微信 DM allowFrom 包含 *')
      } else {
        warnings.push('channels.wecom.allowFrom 未包含 *，可能导致部分单聊无法触发')
      }
    } else {
      warnings.push(`channels.wecom.dmPolicy 当前为 ${dmPolicy || '未设置'}，网页一键部署建议设为 open（否则可能需要 CLI pairing）`)
    }
  }

  const { daemon, runtimeMode, gatewayHealthy, gatewayPortBusy } = await resolveRuntimeState()

  if (daemon === 'running') {
    checks.push('daemon 服务运行中')
  } else if (runtimeMode === 'gateway-fallback') {
    checks.push('gateway 健康检查通过')
    warnings.push('当前为 gateway fallback runtime（daemon 未运行）')
    warnings.push(`daemon 当前状态：${daemon}`)
  } else {
    warnings.push(`daemon 当前状态：${daemon}`)
    if (runtimeMode === 'port-occupied' && gatewayPortBusy && !gatewayHealthy) {
      warnings.push(`端口 ${GATEWAY_PORT} 已被占用，但当前 profile gateway 健康检查未通过`)
    }
  }

  let probeCode = null
  let probeSummary = ''
  try {
    const probeResult = await runOc(
      ['channels', 'status', '--probe', '--timeout', '12000'],
      {
        timeoutMs: OC_TIMEOUT.CHANNEL_PROBE,
        opName: 'channels status --probe',
      }
    )
    probeCode = probeResult.code
    probeSummary = compactProbeOutput(
      `${probeResult.stdout}\n${probeResult.stderr}`,
      [botId, secret, corpSecret, callbackToken, encodingAESKey]
    )
  } catch (e) {
    probeSummary = `probe 执行异常: ${e?.message ?? String(e)}`
  }

  const summaryLower = probeSummary.toLowerCase()
  if (summaryLower.includes('gateway token mismatch')) {
    warnings.push('检测到 gateway token mismatch：当前端口可能被旧 daemon 占用，请先执行“快速清理/全量重置”再重试')
  }
  if (
    (summaryLower.includes('gateway not reachable') || summaryLower.includes('connect failed'))
    && daemon !== 'running'
  ) {
    warnings.push('Gateway 不可达，请确认服务已启动且 18889 端口被当前 profile 占用')
  }

  if (normalized.agentConfigured) {
    checks.push('企业微信自建应用增强出站已配置')
    if (normalized.replyFormat) {
      checks.push(`企业微信自建应用 replyFormat=${normalized.replyFormat}`)
    }
  } else if (normalized.hasAnyAgentFields) {
    warnings.push('企业微信自建应用字段未完整配置：当前仅保留 AI Bot 主链路可用')
  }

  if (normalized.callbackConfigured) {
    checks.push('企业微信回调入站字段已配置')
  } else if (normalized.hasCallbackFields) {
    warnings.push('企业微信回调入站字段不完整：如需回调，请同时填写 Token、EncodingAESKey、Callback Path')
  }
  const hasWecomAuthContext =
    summaryLower.includes('channels.wecom')
    || summaryLower.includes('wecom:')
    || summaryLower.includes('qywx:')
    || summaryLower.includes('enterprise wechat')

  if (
    hasWecomAuthContext
    && (
      summaryLower.includes('status code 401')
      || summaryLower.includes('invalid credential')
      || summaryLower.includes('invalid secret')
      || summaryLower.includes('unauthorized')
    )
  ) {
    warnings.push('企业微信返回鉴权错误，请检查 Bot ID / Bot Secret；若启用了自建应用回调，再同时检查 CorpSecret / Token / EncodingAESKey')
  }

  if (
    summaryLower.includes('wecom')
    && (summaryLower.includes('enabled, configured') || summaryLower.includes('已配置'))
  ) {
    checks.push('channels status 已识别企业微信为 configured')
  }

  const status = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  return {
    status,
    ready: status === 'ok',
    daemon,
    checks,
    warnings,
    errors,
    probe: {
      code: probeCode,
      summary: probeSummary,
    },
  }
}

/**
 * Whether daemon install/restart failure indicates schtasks permission denial.
 * @param {string} detail
 * @returns {boolean}
 */
function isSchtasksPermissionDenied(detail) {
  const text = stripAnsi(detail).toLowerCase()
  if (!text.includes('schtasks')) return false
  return (
    text.includes('access is denied') ||
    text.includes('denied') ||
    text.includes('拒绝访问') ||
    text.includes('�ܾ')
  )
}

/**
 * Whether daemon operation failed because service is missing/not installed.
 * @param {string} detail
 * @returns {boolean}
 */
function isDaemonNotInstalledIssue(detail) {
  const text = stripAnsi(detail).toLowerCase()
  return (
    text.includes('not install') ||
    text.includes('cannot find') ||
    text.includes('could not find service')
  )
}

/**
 * Whether daemon restart failure is timeout/health-check like.
 * @param {string} detail
 * @returns {boolean}
 */
function isRestartTimeoutLikeIssue(detail) {
  const text = stripAnsi(detail).toLowerCase()
  return (
    text.includes('timed out') ||
    text.includes('timeout') ||
    text.includes('health check')
  )
}

/**
 * Wait until a TCP port reaches the desired busy state.
 * @param {number} port
 * @param {boolean} targetBusy
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitForPortState(port, targetBusy, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const busy = await isPortBusy(port)
    if (busy === targetBusy) return true
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return (await isPortBusy(port)) === targetBusy
}

/**
 * Start gateway runtime in background process (no daemon/schtasks).
 * @returns {Promise<{alreadyRunning: boolean, pid: number | null}>}
 */
async function startGatewayFallbackRuntime() {
  if (await isPortBusy(GATEWAY_PORT)) {
    return { alreadyRunning: true, pid: null }
  }

  const child = spawn(
    NODE_BIN,
    [OC_ENTRY, '--profile', PROFILE, 'gateway', 'run', '--port', String(GATEWAY_PORT), '--bind', 'loopback'],
    {
      env: { ...process.env, CI: process.env.CI ?? '1' },
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      cwd: PACK_ROOT,
    }
  )
  child.unref()

  const ready = await waitForPortState(GATEWAY_PORT, true, 20000)
  if (!ready) {
    throw new Error(`gateway fallback process did not open port ${GATEWAY_PORT}`)
  }

  return { alreadyRunning: false, pid: child.pid ?? null }
}

/**
 * Install daemon; on Windows permission-denied schtasks, fallback to background gateway.
 * @returns {Promise<{ok: boolean, mode?: 'daemon'|'gateway-fallback', warning?: string, error?: string}>}
 */
async function installGatewayRuntimeWithFallback() {
  const r = await runOc(['daemon', 'install', '--force', '--port', String(GATEWAY_PORT)], {
    timeoutMs: OC_TIMEOUT.DAEMON_INSTALL,
    opName: 'daemon install',
  })
  if (r.code === 0) return { ok: true, mode: 'daemon' }

  const detail = summarizeOcIssue(r)
  if (process.platform === 'win32' && isSchtasksPermissionDenied(detail)) {
    try {
      await startGatewayFallbackRuntime()
      return {
        ok: true,
        mode: 'gateway-fallback',
        warning: `daemon install skipped (schtasks permission denied): ${detail}`,
      }
    } catch (e) {
      return {
        ok: false,
        error: `daemon install failed: ${detail}; gateway fallback failed: ${e?.message ?? String(e)}`,
      }
    }
  }

  return { ok: false, error: `daemon install failed: ${detail}` }
}

/**
 * Restart gateway runtime, with fallback when daemon is unavailable on Windows.
 * @returns {Promise<{ok: boolean, mode?: 'daemon'|'gateway-fallback', warning?: string, error?: string}>}
 */
async function restartGatewayRuntimeWithFallback() {
  const r = await runOc(['daemon', 'restart'], {
    timeoutMs: OC_TIMEOUT.DAEMON_RESTART,
    opName: 'daemon restart',
  })
  if (r.code === 0) return { ok: true, mode: 'daemon' }

  const detail = summarizeOcIssue(r)

  // Slow machines may hit restart timeout while gateway is already back online.
  if (isRestartTimeoutLikeIssue(detail)) {
    try {
      if (await isPortBusy(GATEWAY_PORT)) {
        return {
          ok: true,
          mode: 'daemon',
          warning: `daemon restart timeout-like result ignored because gateway is reachable: ${detail}`,
        }
      }
    } catch {
      // ignore probing failure, continue with normal error flow
    }
  }

  const canFallback = process.platform === 'win32' && (
    isSchtasksPermissionDenied(detail) || isDaemonNotInstalledIssue(detail)
  )
  if (!canFallback) {
    return { ok: false, error: `daemon restart failed: ${detail}` }
  }

  try {
    await startGatewayFallbackRuntime()
    return {
      ok: true,
      mode: 'gateway-fallback',
      warning: `daemon restart skipped, using fallback runtime: ${detail}`,
    }
  } catch (e) {
    return {
      ok: false,
      error: `daemon restart failed: ${detail}; gateway fallback failed: ${e?.message ?? String(e)}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Utility: HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Parse the JSON body from an incoming request.
 * @param {http.IncomingMessage} req
 * @returns {Promise<any>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk.toString() })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

/**
 * Send a JSON response.
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {any} data
 */
function sendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(body)
}

/**
 * Send a static file from the public directory.
 * @param {http.ServerResponse} res
 * @param {string} filePath  Absolute path to the file
 */
function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
  }
  const contentType = mimeMap[ext] ?? 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
    })
    res.end(data)
  })
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** GET /api/status */
async function handleStatus(res) {
  const configExists = fs.existsSync(CONFIG_FILE)
  const profileDirExists = fs.existsSync(PROFILE_DIR)
  const { daemon, runtimeMode, gatewayHealthy, gatewayPortBusy } = await resolveRuntimeState()
  const installed = configExists && daemon === 'running'

  sendJson(res, 200, {
    installed,
    daemon,
    runtimeMode,
    configExists,
    profileDirExists,
    gatewayHealthy,
    gatewayPortBusy,
    profile: PROFILE,
    configPath: `~/.openclaw-${PROFILE}/openclaw.json`,
  })
}

/**
 * Recursively copy a directory tree from src to dest.
 * Requires Node 16.7+ (fs.cpSync with recursive option).
 * @param {string} src
 * @param {string} dest
 */
function copyDirRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true })
}

/**
 * Copy bundled superpowers skills to user's Claude and Codex skill directories.
 * Industry skills are NOT installed here — use the Skill Store APIs instead.
 * @returns {Promise<string[]>} list of error messages (empty if all OK)
 */
async function installSkills() {
  const errors = []

  // Check if source skills directory exists
  if (!fs.existsSync(SKILLS_SRC)) {
    // Not bundled — skip silently (optional component)
  } else {
    for (const dest of SKILL_TARGETS) {
      try {
        fs.mkdirSync(dest, { recursive: true })
        const entries = fs.readdirSync(SKILLS_SRC, { withFileTypes: true })
        for (const entry of entries) {
          const src = path.join(SKILLS_SRC, entry.name)
          const dst = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            copyDirRecursive(src, dst)
            continue
          }
          fs.copyFileSync(src, dst)
        }
      } catch (e) {
        errors.push(`skills copy to ${dest} failed: ${e.message}`)
      }
    }
  }

  // NOTE: Industry skills (My_Skills) are no longer bulk-installed during setup.
  // Use GET /api/skills/list, POST /api/skills/install, DELETE /api/skills/uninstall
  // to manage individual industry skills via the Skill Store.

  return errors
}

/**
 * Remove a directory recursively if it exists.
 * @param {string} target
 * @returns {{removed: boolean, error: string | null}}
 */
function removeDirIfExists(target) {
  try {
    if (!fs.existsSync(target)) return { removed: false, error: null }
    fs.rmSync(target, { recursive: true, force: true })
    return { removed: true, error: null }
  } catch (e) {
    return { removed: false, error: e?.message ?? String(e) }
  }
}

/**
 * Before install/cleanup/reset, attempt to stop and remove existing openclaw daemon,
 * then release fixed gateway port if still occupied.
 * Does not throw — failures are logged only.
 * @param {{port?: number, graceful?: boolean, forceKill?: boolean}} [options]
 * @returns {Promise<{cleaned: boolean, portBusy: boolean, log: string[]}>}
 */
async function cleanupOldDaemon(options = {}) {
  const PORT = Number.isFinite(options?.port) ? options.port : GATEWAY_PORT
  const graceful = options?.graceful !== false
  const forceKill = options?.forceKill !== false
  const log = []
  let cleaned = false

  const busyBefore = await isPortBusy(PORT) // true = occupied
  if (busyBefore) {
    log.push(`Port ${PORT} is occupied before cleanup`)
  } else {
    log.push(`Port ${PORT} is free before cleanup`)
  }

  // 1) Graceful cleanup always runs first to clear stale daemon state even if port is currently free.
  if (graceful) {
    try {
      const stopResult = await runOc(['daemon', 'stop'], {
        timeoutMs: OC_TIMEOUT.DAEMON_STOP,
        opName: 'daemon stop',
      })
      if (stopResult.code === 0) {
        cleaned = true
        log.push('daemon stop: OK')
      } else {
        log.push(`daemon stop: failed (${summarizeOcIssue(stopResult)})`)
      }
    } catch (e) {
      log.push(`daemon stop error: ${e?.message ?? String(e)}`)
    }

    try {
      const uninstallResult = await runOc(['daemon', 'uninstall'], {
        timeoutMs: OC_TIMEOUT.DAEMON_UNINSTALL,
        opName: 'daemon uninstall',
      })
      if (uninstallResult.code === 0) {
        cleaned = true
        log.push('daemon uninstall: OK')
      } else {
        log.push(`daemon uninstall: failed (${summarizeOcIssue(uninstallResult)})`)
      }
    } catch (e) {
      log.push(`daemon uninstall error: ${e?.message ?? String(e)}`)
    }
  }

  // 2) Wait briefly for listener to exit after graceful cleanup.
  for (let i = 0; i < 6; i++) {
    const busy = await isPortBusy(PORT)
    if (!busy) {
      log.push(`Port ${PORT} is free after graceful cleanup`)
      return { cleaned, portBusy: false, log }
    }
    await new Promise(r => setTimeout(r, 500))
  }

  const busyAfterGraceful = await isPortBusy(PORT)
  if (!busyAfterGraceful) {
    log.push(`Port ${PORT} is free after cleanup checks`)
    return { cleaned, portBusy: false, log }
  }

  if (!forceKill) {
    log.push(`Port ${PORT} still occupied; force kill disabled`)
    return { cleaned, portBusy: true, log }
  }

  // 3) Force kill if still busy — platform-specific and strictly port-bound.
  log.push(`Port ${PORT} still occupied — attempting force kill...`)
  try {
    const platform = process.platform
    if (platform === 'win32') {
      // Windows: netstat + taskkill
      const { stdout } = await new Promise((resolve) => {
        const proc = spawn('netstat', ['-ano'], { env: { ...process.env } })
        let out = ''
        proc.stdout.on('data', d => { out += d.toString() })
        proc.on('close', () => resolve({ stdout: out }))
        proc.on('error', () => resolve({ stdout: '' }))
      })
      const lines = stdout.split(/\r?\n/)
      const pids = new Set()
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const localAddress = parts[1] ?? ''
        const state = (parts[3] ?? '').toUpperCase()
        const pid = parts[parts.length - 1] ?? ''
        if (state === 'LISTENING' && localAddress.endsWith(`:${PORT}`) && /^\d+$/.test(pid)) {
          pids.add(pid)
        }
      }
      for (const pid of pids) {
        const r = await new Promise((resolve) => {
          const proc = spawn('taskkill', ['/PID', pid, '/F'], { env: { ...process.env } })
          proc.on('close', (code) => resolve(code))
          proc.on('error', () => resolve(1))
        })
        log.push(`taskkill PID ${pid}: ${r === 0 ? 'OK' : 'failed'}`)
      }
      if (pids.size === 0) {
        log.push(`No LISTENING PID found via netstat for port ${PORT}`)
      }
    } else {
      // Mac/Linux: lsof listener PIDs only
      const { stdout } = await new Promise((resolve) => {
        const proc = spawn('lsof', ['-nP', `-tiTCP:${PORT}`, '-sTCP:LISTEN'], { env: { ...process.env } })
        let out = ''
        proc.stdout.on('data', d => { out += d.toString() })
        proc.on('close', () => resolve({ stdout: out }))
        proc.on('error', () => resolve({ stdout: '' }))
      })
      const pids = [...new Set(
        stdout.trim().split(/\r?\n/).map(p => p.trim()).filter(p => /^\d+$/.test(p))
      )]
      for (const pid of pids) {
        const r = await new Promise((resolve) => {
          const proc = spawn('kill', ['-9', pid], { env: { ...process.env } })
          proc.on('close', (code) => resolve(code))
          proc.on('error', () => resolve(1))
        })
        log.push(`kill -9 PID ${pid}: ${r === 0 ? 'OK' : 'failed'}`)
      }
      if (pids.length === 0) {
        log.push(`No LISTENING PID found via lsof for port ${PORT}`)
      }
    }
  } catch (e) {
    log.push(`force kill error: ${e.message}`)
  }

  // 4) Final check
  await new Promise(r => setTimeout(r, 800))
  const stillBusy = await isPortBusy(PORT)
  if (!stillBusy) {
    log.push(`Port ${PORT} freed after force kill`)
    return { cleaned: true, portBusy: false, log }
  }

  log.push(`WARNING: Port ${PORT} still occupied after all cleanup attempts`)
  return { cleaned, portBusy: true, log }
}

/** POST /api/install */
async function handleInstall(res, body) {
  const channels = Array.isArray(body?.channels) ? body.channels : []
  const api = body?.api && typeof body.api === 'object' ? body.api : {}
  const baseUrlRaw = typeof api.baseUrl === 'string' ? api.baseUrl.trim() : ''
  const baseUrl = normalizeOpenAIBaseUrl(baseUrlRaw)
  const apiKey = typeof api.apiKey === 'string' ? api.apiKey.trim() : ''
  const model = typeof api.model === 'string' && api.model.trim() ? api.model.trim() : DEFAULT_MODEL
  // NOTE: selectedSkillCategories removed — industry skills are no longer bulk-installed.
  // Use Skill Store APIs (/api/skills/install, /api/skills/uninstall) instead.

  const errors = []
  const warnings = []
  const inputErrors = []

  if (!apiKey) {
    inputErrors.push('API Key 不能为空，请在网页中填写后再安装')
  }
  for (const ch of channels) {
    const type = typeof ch?.type === 'string' ? ch.type : ''
    if (!type) {
      inputErrors.push('渠道类型无效，请重新选择渠道')
      continue
    }
    if (type === 'feishu') {
      if (!String(ch.appId ?? '').trim()) inputErrors.push('飞书 App ID 不能为空')
      if (!String(ch.appSecret ?? '').trim()) inputErrors.push('飞书 App Secret 不能为空')
    } else if (type === 'dingtalk') {
      const { clientId, clientSecret, corpId } = normalizeDingtalkCredentials(ch)
      if (!clientId) inputErrors.push('钉钉 AppKey（Client ID / Robot Code）不能为空')
      if (!clientSecret) inputErrors.push('钉钉 AppSecret（Client Secret）不能为空')
    } else if (type === 'wecom') {
      inputErrors.push(...collectWecomInputErrors(ch).errors)
    }
  }
  if (inputErrors.length > 0) {
    sendJson(res, 400, { ok: false, errors: inputErrors })
    return
  }

  const requestedHasDingtalk = channels.some((ch) => ch.type === 'dingtalk')
  const requestedHasWecom = channels.some((ch) => ch.type === 'wecom')

  if (requestedHasWecom) {
    const bundledVersion = getBundledOpenClawVersion()
    if (bundledVersion && !isVersionAtLeast(bundledVersion, WECOM_MIN_OPENCLAW_VERSION)) {
      sendJson(res, 409, {
        ok: false,
        errors: [
          `当前打包 OpenClaw 版本 ${bundledVersion} 低于企业微信插件最低要求 ${WECOM_MIN_OPENCLAW_VERSION}。请先升级当前平台 bundled runtime，再继续企业微信安装。`,
        ],
        warnings: [
          `检测到的版本：${bundledVersion}。请确认 vendor 目录已更新到 ${WECOM_MIN_OPENCLAW_VERSION} 或更高版本。`,
        ],
      })
      return
    }
  }

  // Step -1: Cleanup stale daemon/service state before install.
  {
    try {
      const { log, portBusy } = await cleanupOldDaemon({ graceful: true, forceKill: true })
      console.log('[cleanup]', log.join(' | '))
      if (portBusy) {
        console.log(`[cleanup] warning: Port ${GATEWAY_PORT} is still occupied after pre-install cleanup`)
      }
    } catch (e) {
      console.log(`[cleanup] unexpected error: ${e?.message ?? String(e)}`)
    }
  }

  // Step 0: Install bundled superpowers skills (industry skills skipped — use Skill Store)
  {
    const skillErrors = await installSkills()
    errors.push(...skillErrors)
  }

  if (requestedHasDingtalk) {
    const dingtalkInstall = await installPluginPackage(DINGTALK_PLUGIN_PACKAGE, DINGTALK_PLUGIN_ID)
    errors.push(...dingtalkInstall.errors)
    if (dingtalkInstall.ok) {
      const patch = patchDingtalkPluginDist()
      if (!patch.ok) warnings.push(patch.message)
      if (patch.ok && patch.changed) warnings.push(patch.message)
    }
  }

  if (requestedHasWecom) {
    const wecomInstall = await installPluginPackage(WECOM_PLUGIN_PACKAGE, WECOM_PLUGIN_ID, { pin: true })
    errors.push(...wecomInstall.errors)
  }

  // Step 2: Write base gateway config
  const baseConfigs = [
    ['gateway.mode',   '"local"'],
    ['gateway.bind',   '"loopback"'],
    ['gateway.port',   String(GATEWAY_PORT)],
  ]
  for (const [key, value] of baseConfigs) {
    const r = await runOc(['config', 'set', key, value, '--strict-json'], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: `config set ${key}`,
    })
    if (r.code !== 0) errors.push(`config set ${key} failed: ${r.stderr}`)
  }

  // Step 2.1: Set gateway.auth.mode for v2026.3.7+ compatibility
  {
    const rAuthMode = await runOc(['config', 'set', 'gateway.auth.mode', '"token"', '--strict-json'], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: 'config set gateway.auth.mode',
    })
    if (rAuthMode.code !== 0) {
      warnings.push(`config set gateway.auth.mode failed: ${rAuthMode.stderr}`)
    }
  }

  // Step 3: Write API (model provider) config
  // Always write baseUrl and models together — openclaw validates both fields simultaneously
  const effectiveModel = model
  const providerJson = JSON.stringify({
    baseUrl,
    models: [{ id: effectiveModel, name: effectiveModel, api: 'openai-completions' }],
  })
  {
    const r = await runOc([
      'config', 'set',
      'models.providers.openai',
      providerJson,
      '--strict-json',
    ], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: 'config set models.providers.openai',
    })
    if (r.code !== 0) errors.push(`config set models.providers.openai failed: ${r.stderr}`)
  }
  {
    const modelForSet = effectiveModel.includes('/') ? effectiveModel : `openai/${effectiveModel}`
    const r = await runOc(['models', 'set', modelForSet], {
      timeoutMs: OC_TIMEOUT.MODEL_SET,
      opName: `models set ${modelForSet}`,
    })
    if (r.code !== 0) errors.push(`models set ${modelForSet} failed: ${r.stderr}`)
  }

  // Step 4: Write auth-profiles.json with the API key
  if (apiKey) {
    const authDir  = path.join(OPENCLAW_HOME, `.openclaw-${PROFILE}`, 'agents', 'main', 'agent')
    const authFile = path.join(authDir, 'auth-profiles.json')
    try {
      fs.mkdirSync(authDir, { recursive: true })
      const authData = {
        version: 1,
        profiles: {
          'openai:default': { type: 'api_key', provider: 'openai', key: apiKey },
        },
        order: { openai: ['openai:default'] },
      }
      fs.writeFileSync(authFile, JSON.stringify(authData, null, 2), 'utf8')
    } catch (e) {
      errors.push(`writing auth-profiles.json failed: ${e.message}`)
    }
  }

  // Step 5: Write per-channel config
  for (const ch of channels) {
    const chErrors = await configureChannel(ch)
    errors.push(...chErrors)
  }

  // Step 6: Install daemon
  let runtimeMode = 'daemon'
  {
    const runtimeInstall = await installGatewayRuntimeWithFallback()
    if (!runtimeInstall.ok) {
      errors.push(runtimeInstall.error ?? 'daemon install failed')
    } else if (runtimeInstall.mode) {
      runtimeMode = runtimeInstall.mode
    }
    if (runtimeInstall.warning) warnings.push(runtimeInstall.warning)
  }

  // Step 7: Restart daemon
  if (errors.length === 0 && runtimeMode === 'daemon') {
    const runtimeRestart = await restartGatewayRuntimeWithFallback()
    if (!runtimeRestart.ok) {
      errors.push(runtimeRestart.error ?? 'daemon restart failed')
    } else if (runtimeRestart.mode) {
      runtimeMode = runtimeRestart.mode
    }
    if (runtimeRestart.warning) warnings.push(runtimeRestart.warning)
  }

  if (runtimeMode === 'gateway-fallback') {
    warnings.push('Windows current permission blocks schtasks; running gateway in background fallback mode.')
  }

  const hasDingtalk = channels.some((ch) => ch.type === 'dingtalk')
  const hasWecom = channels.some((ch) => ch.type === 'wecom')
  let dingtalkProbe = null
  let wecomProbe = null
  if (hasDingtalk) {
    try {
      dingtalkProbe = await buildDingtalkProbeReport()
      if (dingtalkProbe.status === 'warning') {
        warnings.push(...dingtalkProbe.warnings.map(msg => `钉钉检测告警：${msg}`))
      } else if (dingtalkProbe.status === 'error') {
        warnings.push(...dingtalkProbe.errors.map(msg => `钉钉检测错误：${msg}`))
      }
    } catch (e) {
      warnings.push(`钉钉检测执行失败：${e?.message ?? String(e)}`)
    }
  }
  if (hasWecom) {
    try {
      wecomProbe = await buildWecomProbeReport()
      if (wecomProbe.status === 'warning') {
        warnings.push(...wecomProbe.warnings.map(msg => `企微检测告警：${msg}`))
      } else if (wecomProbe.status === 'error') {
        warnings.push(...wecomProbe.errors.map(msg => `企微检测错误：${msg}`))
      }
    } catch (e) {
      warnings.push(`企微检测执行失败：${e?.message ?? String(e)}`)
    }
  }

  if (errors.length > 0) {
    sendJson(res, 500, { ok: false, errors, warnings, runtimeMode, dingtalkProbe, wecomProbe })
  } else {
    sendJson(res, 200, { ok: true, warnings, runtimeMode, dingtalkProbe, wecomProbe })
  }
}

/**
 * Write configuration for a single channel.
 * @param {{type: string, [key: string]: any}} channel
 * @returns {Promise<string[]>} list of error messages (empty if all OK)
 */
async function configureChannel(channel) {
  const errors = []

  async function oc(...args) {
    const r = await runOc(['config', 'set', ...args, '--strict-json'], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: `config set ${args[0]}`,
    })
    if (r.code !== 0) errors.push(`config set ${args[0]} failed: ${r.stderr}`)
  }

  async function ocUnset(pathKey) {
    const r = await runOc(['config', 'unset', pathKey], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: `config unset ${pathKey}`,
    })
    const text = `${r.stdout}\n${r.stderr}`.toLowerCase()
    if (r.code !== 0 && !text.includes('config path not found')) {
      errors.push(`config unset ${pathKey} failed: ${r.stderr}`)
    }
  }

  switch (channel.type) {
    case 'feishu': {
      const { appId = '', appSecret = '' } = channel
      await oc('channels.feishu.enabled',        'true')
      await oc('channels.feishu.connectionMode', '"websocket"')
      await oc('channels.feishu.domain',         '"feishu"')
      await oc('channels.feishu.appId',          JSON.stringify(appId))
      await oc('channels.feishu.appSecret',      JSON.stringify(appSecret))
      await oc('channels.feishu.dmPolicy',       '"open"')
      await oc('channels.feishu.allowFrom',      '["*"]')
      await oc('channels.feishu.requireMention', 'false')
      await oc('plugins.entries.feishu.enabled', 'true')
      break
    }

    case 'dingtalk': {
      errors.push(...await ensurePluginsAllowIncludes(['channels']))
      const { clientId, clientSecret, robotCode, corpId } = normalizeDingtalkCredentials(channel)
      await oc('channels.dingtalk.enabled',                          'true')
      await oc('channels.dingtalk.clientId',                         JSON.stringify(clientId))
      await oc('channels.dingtalk.clientSecret',                     JSON.stringify(clientSecret))
      await oc('channels.dingtalk.robotCode',                        JSON.stringify(robotCode))
      await oc('channels.dingtalk.connectionMode',                   '"stream"')
      await oc('channels.dingtalk.dmPolicy',                         '"open"')
      await oc('channels.dingtalk.allowFrom',                        '["*"]')
      await oc('channels.dingtalk.groupPolicy',                      '"open"')
      await oc('channels.dingtalk.requireMention',                   'true')
      await oc('gateway.http.endpoints.chatCompletions.enabled',     'true')
      if (corpId || robotCode) {
        saveDingtalkUiMeta({ corpId, robotCode })
      }
      {
        const patch = patchDingtalkPluginDist()
        if (!patch.ok) console.log(patch.message)
      }
      break
    }

    case 'wecom': {
      errors.push(...await ensurePluginsAllowIncludes([WECOM_PLUGIN_ID]))
      const wecom = normalizeWecomCredentials(channel)
      const { botId, secret } = wecom
      await oc('plugins.entries.wecom.enabled', 'true')
      await oc('channels.wecom.enabled', 'true')
      await oc('channels.wecom.botId', JSON.stringify(botId))
      await oc('channels.wecom.secret', JSON.stringify(secret))
      await oc('channels.wecom.dmPolicy', '"open"')
      await oc('channels.wecom.allowFrom', '["*"]')
      await oc('channels.wecom.groupPolicy', '"open"')
      await oc('channels.wecom.groupChat.enabled', 'true')
      await oc('channels.wecom.groupChat.requireMention', 'true')
      await oc('channels.wecom.groupChat.mentionPatterns', '["@"]')
      await ocUnset('channels.wecom.mode')
      await ocUnset('channels.wecom.requireMention')

      if (wecom.agentConfigured) {
        await oc('channels.wecom.agent.corpId', JSON.stringify(wecom.corpId))
        await oc('channels.wecom.agent.corpSecret', JSON.stringify(wecom.corpSecret))
        await oc('channels.wecom.agent.agentId', String(wecom.agentId))
        if (wecom.replyFormat) {
          await oc('channels.wecom.agent.replyFormat', JSON.stringify(wecom.replyFormat))
        } else {
          await ocUnset('channels.wecom.agent.replyFormat')
        }
      } else {
        await ocUnset('channels.wecom.agent.corpId')
        await ocUnset('channels.wecom.agent.corpSecret')
        await ocUnset('channels.wecom.agent.agentId')
        await ocUnset('channels.wecom.agent.replyFormat')
      }

      if (wecom.callbackConfigured && wecom.agentConfigured) {
        await oc('channels.wecom.agent.callback.token', JSON.stringify(wecom.callbackToken))
        await oc('channels.wecom.agent.callback.encodingAESKey', JSON.stringify(wecom.encodingAESKey))
        await oc('channels.wecom.agent.callback.path', JSON.stringify(wecom.callbackPath))
      } else {
        await ocUnset('channels.wecom.agent.callback.token')
        await ocUnset('channels.wecom.agent.callback.encodingAESKey')
        await ocUnset('channels.wecom.agent.callback.path')
      }
      break
    }

    default:
      errors.push(`Unknown channel type: ${channel.type}`)
  }

  return errors
}

/** GET /api/config */
function handleGetConfig(res) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    const config = JSON.parse(raw)
    if (config?.channels?.dingtalk && typeof config.channels.dingtalk === 'object') {
      config.channels.dingtalk = enrichDingtalkChannelForUi(config.channels.dingtalk)
    }
    if (config?.channels?.wecom && typeof config.channels.wecom === 'object') {
      config.channels.wecom = enrichWecomChannelForUi(config.channels.wecom)
    }
    sendJson(res, 200, config)
  } catch (e) {
    sendJson(res, 404, { error: `Cannot read config: ${e.message}` })
  }
}

function createModelRoutingHelperOptions() {
  return {
    configFile: CONFIG_FILE,
    authFile: AUTH_PROFILES_FILE,
    uiMetaFile: UI_META_FILE,
    defaultModel: DEFAULT_MODEL,
  }
}

/** GET /api/config/model-routing */
function handleGetModelRouting(res) {
  try {
    const payload = getModelRoutingConfig(createModelRoutingHelperOptions())
    sendJson(res, 200, payload)
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      errors: [`读取模型智能路由配置失败：${error?.message ?? String(error)}`],
    })
  }
}

/** POST /api/config/api */
async function handleUpdateApi(res, body) {
  const { baseUrl, apiKey, model } = body
  const errors = []

  // Keep legacy compatibility for the old dashboard API form:
  // it may still submit baseUrl/apiKey/model together, and provider model updates
  // must continue to work even though model-routing owns the new authority surface.
  if (baseUrl !== undefined || model !== undefined) {
    let currentBaseUrl = baseUrl
    let currentModel = model

    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      const cfg = JSON.parse(raw)
      const openai = cfg?.models?.providers?.openai ?? {}
      if (currentBaseUrl === undefined) {
        currentBaseUrl = typeof openai.baseUrl === 'string' ? openai.baseUrl.trim() : ''
      }
      if (currentModel === undefined) {
        const savedModel = Array.isArray(openai.models) ? openai.models[0]?.id : null
        currentModel = typeof savedModel === 'string' ? savedModel.trim() : ''
      }
    } catch {
      currentBaseUrl = currentBaseUrl ?? ''
      currentModel = currentModel ?? ''
    }

    currentBaseUrl = normalizeOpenAIBaseUrl(currentBaseUrl)
    currentModel = extractOpenAIModelId(currentModel, extractOpenAIModelId(DEFAULT_MODEL))

    const providerJson = JSON.stringify({
      baseUrl: currentBaseUrl,
      models: [{ id: currentModel, name: currentModel, api: 'openai-completions' }],
    })
    const r = await runOc([
      'config', 'set',
      'models.providers.openai',
      providerJson,
      '--strict-json',
    ], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: 'config set models.providers.openai',
    })
    if (r.code !== 0) errors.push(`config set models.providers.openai failed: ${r.stderr}`)
  }

  if (apiKey !== undefined) {
    try {
      fs.mkdirSync(path.dirname(AUTH_PROFILES_FILE), { recursive: true })
      const authData = {
        version: 1,
        profiles: {
          'openai:default': { type: 'api_key', provider: 'openai', key: apiKey },
        },
        order: { openai: ['openai:default'] },
      }
      fs.writeFileSync(AUTH_PROFILES_FILE, JSON.stringify(authData, null, 2), 'utf8')
    } catch (e) {
      errors.push(`writing auth-profiles.json failed: ${e.message}`)
    }
  }

  // Restart daemon to apply changes
  const restartResult = await restartGatewayRuntimeWithFallback()
  if (!restartResult.ok) {
    errors.push(restartResult.error ?? 'daemon restart failed')
  }

  if (errors.length > 0) {
    sendJson(res, 500, { ok: false, errors })
  } else {
    sendJson(res, 200, { ok: true })
  }
}

/** POST /api/config/model-routing */
async function handleUpdateModelRouting(res, body) {
  const result = saveModelRoutingConfig(createModelRoutingHelperOptions(), body)
  if (!result.ok) {
    sendJson(res, result.status ?? 400, {
      ok: false,
      errors: Array.isArray(result.errors) ? result.errors : ['模型智能路由保存失败'],
    })
    return
  }

  const restartResult = await restartGatewayRuntimeWithFallback()
  if (!restartResult.ok) {
    sendJson(res, 500, {
      ok: false,
      errors: [restartResult.error ?? 'daemon restart failed'],
    })
    return
  }

  const payload = {
    ok: true,
    mode: result.mode,
    effectivePrimaryModel: result.effectivePrimaryModel,
    message: result.message,
  }
  if (restartResult.mode && restartResult.mode !== 'daemon') {
    payload.runtimeMode = restartResult.mode
  }
  if (restartResult.warning) {
    payload.warning = restartResult.warning
  }
  sendJson(res, 200, payload)
}

/** GET /api/config/channels */
function handleGetChannels(res) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    const config = JSON.parse(raw)
    const channels = config.channels ?? {}
    if (channels?.dingtalk && typeof channels.dingtalk === 'object') {
      channels.dingtalk = enrichDingtalkChannelForUi(channels.dingtalk)
    }
    if (channels?.wecom && typeof channels.wecom === 'object') {
      channels.wecom = enrichWecomChannelForUi(channels.wecom)
    }
    sendJson(res, 200, channels)
  } catch (e) {
    sendJson(res, 404, { error: `Cannot read config: ${e.message}` })
  }
}

/**
 * Count all files recursively under a directory (no directories counted).
 * @param {string} dir
 * @returns {number}
 */
function countFilesRecursive(dir) {
  let count = 0
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFilesRecursive(path.join(dir, entry.name))
      } else {
        count++
      }
    }
  } catch (_) {
    // ignore unreadable subdirectories
  }
  return count
}

/** GET /api/skill-categories */
function handleGetSkillCategories(res) {
  if (!fs.existsSync(INDUSTRY_SKILLS_SRC)) {
    sendJson(res, 200, { categories: [] })
    return
  }

  const categories = []
  try {
    const entries = fs.readdirSync(INDUSTRY_SKILLS_SRC, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const categoryPath = path.join(INDUSTRY_SKILLS_SRC, entry.name)
        const fileCount = countFilesRecursive(categoryPath)
        categories.push({ name: entry.name, fileCount, available: true })
      }
    }
  } catch (e) {
    sendJson(res, 500, { error: `Cannot read skill categories: ${e.message}` })
    return
  }

  sendJson(res, 200, { categories })
}

/** GET /api/skill-status */
function handleGetSkillStatus(res) {
  // Check superpowers installation (use first target as canonical)
  const superpowersTarget = SKILL_TARGETS[0]
  let superpowersInstalled = false
  try {
    if (fs.existsSync(superpowersTarget)) {
      const entries = fs.readdirSync(superpowersTarget)
      superpowersInstalled = entries.length > 0
    }
  } catch (_) {}

  // Check which industry categories are installed
  const industryTarget = INDUSTRY_SKILL_TARGETS[0]
  const installedCategories = []
  const availableCategories = []

  if (fs.existsSync(INDUSTRY_SKILLS_SRC)) {
    try {
      const srcEntries = fs.readdirSync(INDUSTRY_SKILLS_SRC, { withFileTypes: true })
      for (const entry of srcEntries) {
        if (entry.isDirectory()) availableCategories.push(entry.name)
      }
    } catch (_) {}
  }

  if (fs.existsSync(industryTarget)) {
    try {
      const destEntries = fs.readdirSync(industryTarget, { withFileTypes: true })
      for (const entry of destEntries) {
        if (entry.isDirectory()) {
          const categoryPath = path.join(industryTarget, entry.name)
          try {
            const files = fs.readdirSync(categoryPath)
            if (files.length > 0) installedCategories.push(entry.name)
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  sendJson(res, 200, {
    superpowers: {
      installed: superpowersInstalled,
      location: toUserPath(superpowersTarget),
      source: 'bundled',
    },
    industrySkills: {
      installed: installedCategories,
      location: toUserPath(industryTarget),
      availableCategories,
    },
  })
}

// ---------------------------------------------------------------------------
// Skill Store — in-memory cache
// ---------------------------------------------------------------------------

/**
 * Cached skill list. Invalidated by install/uninstall operations.
 * Structure: { skills: Array, categories: Array, total: number, builtAt: number }
 * @type {{ skills: Array<{name:string,category:string,path:string,size:number}>, categories: Array<{key:string,count:number}>, total: number, builtAt: number } | null}
 */
let _skillsCache = null

/**
 * Invalidate the in-memory skills cache.
 * Call after any install or uninstall operation.
 */
function invalidateSkillsCache() {
  _skillsCache = null
}

/**
 * Build (or return cached) full skill list from INDUSTRY_SKILLS_SRC.
 * Scans all category subdirectories and their immediate files.
 * @returns {{ skills: Array, categories: Array, total: number, builtAt: number }}
 */
function getSkillsCache() {
  if (_skillsCache) return _skillsCache

  const skills = []
  const categoryMap = new Map() // key -> count

  if (!fs.existsSync(INDUSTRY_SKILLS_SRC)) {
    _skillsCache = { skills: [], categories: [], total: 0, builtAt: Date.now() }
    return _skillsCache
  }

  try {
    const categoryEntries = fs.readdirSync(INDUSTRY_SKILLS_SRC, { withFileTypes: true })
    for (const catEntry of categoryEntries) {
      if (!catEntry.isDirectory()) continue
      const category = catEntry.name
      const categoryDir = path.join(INDUSTRY_SKILLS_SRC, category)
      let catCount = 0

      try {
        const skillDirEntries = fs.readdirSync(categoryDir, { withFileTypes: true })
        for (const skillDirEntry of skillDirEntries) {
          if (!skillDirEntry.isDirectory()) continue
          const skillName = skillDirEntry.name
          const skillDir = path.join(categoryDir, skillName)

          // Try to find SKILL.md or any markdown file in the skill directory
          let skillFilePath = null
          try {
            const skillFiles = fs.readdirSync(skillDir)
            for (const file of skillFiles) {
              if (file.toLowerCase() === 'skill.md' || file.endsWith('.md')) {
                skillFilePath = path.join(skillDir, file)
                break
              }
            }
          } catch (_) {
            // unable to read skill directory
            continue
          }

          if (!skillFilePath) continue // no markdown file found

          let size = 0
          try {
            size = fs.statSync(skillFilePath).size
          } catch (_) {}
          skills.push({
            name: skillName,
            category,
            path: `${category}/${skillName}`,
            size,
          })
          catCount++
        }
      } catch (_) {
        // ignore unreadable category directory
      }

      categoryMap.set(category, catCount)
    }
  } catch (e) {
    // If top-level scan fails, return empty
    _skillsCache = { skills: [], categories: [], total: 0, builtAt: Date.now() }
    return _skillsCache
  }

  const categories = Array.from(categoryMap.entries()).map(([key, count]) => ({ key, count }))
  categories.sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'))

  _skillsCache = { skills, categories, total: skills.length, builtAt: Date.now() }
  return _skillsCache
}

/**
 * GET /api/skills/list?category=xxx&search=yyy&page=1&pageSize=50
 * List available industry skills with pagination, search, and category filter.
 * "installed" flag is checked against the first INDUSTRY_SKILL_TARGETS entry.
 */
function handleSkillsList(res, searchParams) {
  const categoryFilter = (searchParams.get('category') ?? '').trim()
  const searchQuery    = (searchParams.get('search') ?? '').trim().toLowerCase()
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10) || 1)
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10) || 50)

  const cache = getSkillsCache()
  const installBase = INDUSTRY_SKILL_TARGETS[0]

  // Filter skills
  let filtered = cache.skills
  if (categoryFilter) {
    filtered = filtered.filter(s => s.category === categoryFilter)
  }
  if (searchQuery) {
    filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize) || 1
  const offset = (page - 1) * pageSize
  const paged = filtered.slice(offset, offset + pageSize)

  // Annotate with installed flag
  const skills = paged.map(s => {
    const installedPath = path.join(installBase, s.category, s.name)
    const installed = fs.existsSync(installedPath)
    return { ...s, installed }
  })

  // Count total installed skills across all categories
  let installedCount = 0
  try {
    if (fs.existsSync(installBase)) {
      const catDirs = fs.readdirSync(installBase, { withFileTypes: true })
      for (const catDir of catDirs) {
        if (!catDir.isDirectory()) continue
        try {
          const entries = fs.readdirSync(path.join(installBase, catDir.name), { withFileTypes: true })
          installedCount += entries.filter(entry => entry.isDirectory()).length
        } catch (_) {}
      }
    }
  } catch (_) {}

  const categories = cache.categories.map(category => {
    const meta = getIndustrySkillCategoryMeta(category.key)
    return {
      ...category,
      label: meta?.name ?? category.key,
      description: meta?.desc ?? '',
    }
  })

  sendJson(res, 200, {
    skills,
    total,
    page,
    pageSize,
    totalPages,
    categories,
    installedCount,
  })
}

/**
 * POST /api/skills/install
 * Body: { "skill": "category/filename.md" }
 * Install a single skill file from INDUSTRY_SKILLS_SRC to all INDUSTRY_SKILL_TARGETS.
 */
async function handleSkillInstall(res, body) {
  const skillPath = typeof body?.skill === 'string' ? body.skill.trim() : ''
  if (!skillPath) {
    sendJson(res, 400, { ok: false, error: '缺少 skill 字段，格式: "category/skillname"' })
    return
  }

  // Safely parse "category/skillname" — reject traversal attempts
  const parts = skillPath.split('/')
  if (parts.length !== 2 || parts.some(p => !p || p.includes('..') || p.includes('\\'))) {
    sendJson(res, 400, { ok: false, error: 'skill 格式无效，需为 "category/skillname"（不含路径穿越字符）' })
    return
  }
  const [category, skillName] = parts

  const srcDir = path.join(INDUSTRY_SKILLS_SRC, category, skillName)
  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    sendJson(res, 404, { ok: false, error: `源目录不存在: ${skillPath}` })
    return
  }

  const copyErrors = []
  for (const targetBase of INDUSTRY_SKILL_TARGETS) {
    const destDir = path.join(targetBase, category, skillName)
    try {
      fs.mkdirSync(destDir, { recursive: true })
      // Copy all files from source skill directory to destination
      const files = fs.readdirSync(srcDir)
      for (const file of files) {
        const srcFile = path.join(srcDir, file)
        const destFile = path.join(destDir, file)
        const stat = fs.statSync(srcFile)
        if (stat.isFile()) {
          fs.copyFileSync(srcFile, destFile)
        }
      }
    } catch (e) {
      copyErrors.push(`copy to ${destDir} failed: ${e.message}`)
    }
  }

  if (copyErrors.length > 0) {
    sendJson(res, 500, { ok: false, error: copyErrors.join('; ') })
    return
  }

  invalidateSkillsCache()
  sendJson(res, 200, { ok: true, message: `已安装: ${skillPath}` })
}

/**
 * DELETE /api/skills/uninstall
 * Body: { "skill": "category/skillname" }
 * Remove a single skill directory from all INDUSTRY_SKILL_TARGETS (idempotent).
 */
async function handleSkillUninstall(res, body) {
  const skillPath = typeof body?.skill === 'string' ? body.skill.trim() : ''
  if (!skillPath) {
    sendJson(res, 400, { ok: false, error: '缺少 skill 字段，格式: "category/skillname"' })
    return
  }

  const parts = skillPath.split('/')
  if (parts.length !== 2 || parts.some(p => !p || p.includes('..') || p.includes('\\'))) {
    sendJson(res, 400, { ok: false, error: 'skill 格式无效，需为 "category/skillname"（不含路径穿越字符）' })
    return
  }
  const [category, skillName] = parts

  const deleteErrors = []
  for (const targetBase of INDUSTRY_SKILL_TARGETS) {
    const destDir = path.join(targetBase, category, skillName)
    try {
      if (fs.existsSync(destDir)) {
        // Recursively delete the entire skill directory
        fs.rmSync(destDir, { recursive: true, force: true })
      }
      // Idempotent: no error if directory doesn't exist
    } catch (e) {
      deleteErrors.push(`delete ${destDir} failed: ${e.message}`)
    }
  }

  if (deleteErrors.length > 0) {
    sendJson(res, 500, { ok: false, error: deleteErrors.join('; ') })
    return
  }

  invalidateSkillsCache()
  sendJson(res, 200, { ok: true, message: `已卸载: ${skillPath}` })
}

/** POST /api/config/channels */
async function handleUpdateChannel(res, body) {
  const errors = []

  if (body?.type === 'wecom' && body?.enabled !== false) {
    const inputErrors = collectWecomInputErrors(body).errors
    if (inputErrors.length > 0) {
      sendJson(res, 400, {
        ok: false,
        errors: inputErrors,
      })
      return
    }
  }
  if (body?.type === 'dingtalk' && body?.enabled !== false) {
    const { clientId, clientSecret, corpId } = normalizeDingtalkCredentials(body)
    const inputErrors = []
    if (!clientId) inputErrors.push('钉钉 AppKey（Client ID / Robot Code）不能为空')
    if (!clientSecret) inputErrors.push('钉钉 AppSecret（Client Secret）不能为空')
    if (inputErrors.length > 0) {
      sendJson(res, 400, { ok: false, errors: inputErrors })
      return
    }
  }

  // Handle enabled toggle — if explicitly set to false, just disable the channel
  if (body.enabled === false) {
    const key = `channels.${body.type}.enabled`
    const r = await runOc(['config', 'set', key, 'false', '--strict-json'], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: `config set ${key}`,
    })
    if (r.code !== 0) errors.push(`config set ${key} failed: ${r.stderr}`)
  } else {
    const chErrors = await configureChannel(body)
    errors.push(...chErrors)
  }

  // Restart daemon to apply changes
  const restartResult = await restartGatewayRuntimeWithFallback()
  if (!restartResult.ok) {
    errors.push(restartResult.error ?? 'daemon restart failed')
  }

  if (errors.length > 0) {
    sendJson(res, 500, { ok: false, errors })
  } else {
    sendJson(res, 200, { ok: true })
  }
}

/** POST /api/daemon */
async function handleDaemon(res, body) {
  const { action } = body
  const allowed = ['start', 'stop', 'restart']
  if (!allowed.includes(action)) {
    sendJson(res, 400, { error: `Invalid action. Use one of: ${allowed.join(', ')}` })
    return
  }

  if (action === 'restart') {
    const result = await restartGatewayRuntimeWithFallback()
    if (!result.ok) {
      sendJson(res, 500, { ok: false, error: result.error })
      return
    }
    sendJson(res, 200, { ok: true, mode: result.mode ?? 'daemon', warning: result.warning ?? null })
    return
  }

  if (action === 'start') {
    const timeoutMs = OC_TIMEOUT.DAEMON_RESTART
    const r = await runOc(['daemon', 'start'], {
      timeoutMs,
      opName: 'daemon start',
    })
    if (r.code === 0) {
      sendJson(res, 200, { ok: true, mode: 'daemon', stdout: r.stdout })
      return
    }

    const detail = summarizeOcIssue(r)
    const canFallback = process.platform === 'win32' && (
      isSchtasksPermissionDenied(detail) || isDaemonNotInstalledIssue(detail)
    )
    if (!canFallback) {
      sendJson(res, 500, { ok: false, error: detail })
      return
    }

    try {
      const fallback = await startGatewayFallbackRuntime()
      sendJson(res, 200, {
        ok: true,
        mode: 'gateway-fallback',
        pid: fallback.pid,
        warning: `daemon start failed, using fallback runtime: ${detail}`,
      })
      return
    } catch (e) {
      sendJson(res, 500, { ok: false, error: `daemon start failed: ${detail}; fallback failed: ${e?.message ?? String(e)}` })
      return
    }
  }

  // action === 'stop'
  const r = await runOc(['daemon', 'stop'], {
    timeoutMs: OC_TIMEOUT.DAEMON_STOP,
    opName: 'daemon stop',
  })
  if (r.code === 0) {
    sendJson(res, 200, { ok: true, mode: 'daemon', stdout: r.stdout })
    return
  }

  const detail = summarizeOcIssue(r)
  const mayFallbackRuntime = process.platform === 'win32' && (
    isDaemonNotInstalledIssue(detail) || isSchtasksPermissionDenied(detail)
  )
  if (!mayFallbackRuntime) {
    sendJson(res, 500, { ok: false, error: detail })
    return
  }

  try {
    const cleanup = await cleanupOldDaemon({ port: GATEWAY_PORT, graceful: false, forceKill: true })
    if (cleanup.portBusy) {
      sendJson(res, 500, { ok: false, error: `gateway fallback stop failed: port ${GATEWAY_PORT} still busy`, log: cleanup.log })
      return
    }
    sendJson(res, 200, {
      ok: true,
      mode: 'gateway-fallback',
      warning: `daemon stop failed (${detail}); fallback runtime stopped by port cleanup`,
      log: cleanup.log,
    })
  } catch (e) {
    sendJson(res, 500, { ok: false, error: `daemon stop failed: ${detail}; fallback stop failed: ${e?.message ?? String(e)}` })
  }
}

/** POST /api/cleanup */
async function handleCleanup(res) {
  const errors = []
  const log = []

  try {
    const cleanupResult = await cleanupOldDaemon({ graceful: true, forceKill: true })
    log.push(...cleanupResult.log)
    if (cleanupResult.portBusy) {
      errors.push('Port 18889 is still occupied after cleanup')
    }
  } catch (e) {
    log.push(`cleanupOldDaemon error: ${e?.message ?? String(e)}`)
  }

  console.log('[cleanup:manual]', log.join(' | '))

  if (errors.length > 0) {
    sendJson(res, 500, { ok: false, errors, log })
  } else {
    sendJson(res, 200, { ok: true, log })
  }
}

/** POST /api/reset */
async function handleFactoryReset(res, body) {
  const cleanupSkills = body?.cleanupSkills !== false
  const errors = []
  const warnings = []
  const log = []
  const removed = []

  try {
    const uninstallResult = await runOc([
      'uninstall',
      '--service',
      '--state',
      '--workspace',
      '--yes',
      '--non-interactive',
    ], {
      timeoutMs: OC_TIMEOUT.UNINSTALL_FULL,
      opName: 'openclaw uninstall --service --state --workspace',
    })
    if (uninstallResult.code === 0) {
      log.push('openclaw uninstall --service --state --workspace: OK')
    } else {
      const detail = stripAnsi(uninstallResult.stderr).trim() || `exit code ${uninstallResult.code}`
      log.push(`openclaw uninstall --service --state --workspace: failed (${detail})`)
      errors.push('OpenClaw 全量卸载失败，请查看日志并重试')
    }
  } catch (e) {
    const detail = e?.message ?? String(e)
    log.push(`openclaw uninstall exception: ${detail}`)
    errors.push('OpenClaw 全量卸载执行异常')
  }

  // Clear stale/foreign daemon occupying fixed gateway port.
  try {
    const cleanupResult = await cleanupOldDaemon({ graceful: true, forceKill: true })
    log.push(...cleanupResult.log)
    if (cleanupResult.portBusy) {
      warnings.push('Port 18889 is still occupied after factory reset cleanup')
    }
  } catch (e) {
    log.push(`cleanupOldDaemon error: ${e?.message ?? String(e)}`)
  }

  // Ensure profile state/workspace are gone; remove manually as a fallback.
  const profileRemoval = removeDirIfExists(PROFILE_DIR)
  if (profileRemoval.error) {
    errors.push(`删除 profile 目录失败: ${toUserPath(PROFILE_DIR)} (${profileRemoval.error})`)
  } else if (profileRemoval.removed) {
    removed.push(toUserPath(PROFILE_DIR))
    log.push(`removed directory: ${toUserPath(PROFILE_DIR)}`)
  }

  const workspaceRemoval = removeDirIfExists(WORKSPACE_DIR)
  if (workspaceRemoval.error) {
    errors.push(`删除 workspace 目录失败: ${toUserPath(WORKSPACE_DIR)} (${workspaceRemoval.error})`)
  } else if (workspaceRemoval.removed) {
    removed.push(toUserPath(WORKSPACE_DIR))
    log.push(`removed directory: ${toUserPath(WORKSPACE_DIR)}`)
  }

  if (cleanupSkills) {
    for (const target of SKILL_TARGETS) {
      const skillRemoval = removeDirIfExists(target)
      if (skillRemoval.error) {
        errors.push(`删除 skills 目录失败: ${toUserPath(target)} (${skillRemoval.error})`)
      } else if (skillRemoval.removed) {
        removed.push(toUserPath(target))
        log.push(`removed directory: ${toUserPath(target)}`)
      } else {
        log.push(`skills directory not found: ${toUserPath(target)}`)
      }
    }

    // Also clean up industry skills
    for (const target of INDUSTRY_SKILL_TARGETS) {
      const industryRemoval = removeDirIfExists(target)
      if (industryRemoval.error) {
        errors.push(`删除 industry skills 目录失败: ${toUserPath(target)} (${industryRemoval.error})`)
      } else if (industryRemoval.removed) {
        removed.push(toUserPath(target))
        log.push(`removed directory: ${toUserPath(target)}`)
      } else {
        log.push(`industry skills directory not found: ${toUserPath(target)}`)
      }
    }
  }

  if (fs.existsSync(CONFIG_FILE)) {
    errors.push(`配置文件仍存在: ${toUserPath(CONFIG_FILE)}`)
  }
  if (await isPortBusy(18889)) {
    warnings.push('Port 18889 is still occupied after factory reset')
  }

  console.log('[cleanup:factory-reset]', log.join(' | '))
  if (warnings.length > 0) {
    console.log('[cleanup:factory-reset:warning]', warnings.join(' | '))
  }

  const resetComplete = !fs.existsSync(PROFILE_DIR) && !fs.existsSync(CONFIG_FILE)

  const payload = {
    ok: errors.length === 0,
    errors,
    warnings,
    log,
    removed,
    resetComplete,
    profile: PROFILE,
    cleanupSkills,
  }
  sendJson(res, errors.length > 0 ? 500 : 200, payload)
}

/** GET /api/skill-categories */
function handleSkillCategories(res) {
  const result = INDUSTRY_SKILL_CATEGORIES.map(cat => {
    const catDir = path.join(INDUSTRY_SKILLS_SRC, cat.key)
    let count = 0
    try {
      if (fs.existsSync(catDir)) {
        // Count immediate subdirectories as skill count (each subfolder = 1 skill)
        const entries = fs.readdirSync(catDir, { withFileTypes: true })
        count = entries.filter(e => e.isDirectory()).length
      }
    } catch (_) { /* ignore */ }
    return { ...cat, count }
  })

  sendJson(res, 200, { categories: result })
}

/** POST /api/dingtalk/probe */
async function handleDingtalkProbe(res) {
  try {
    const report = await buildDingtalkProbeReport()
    sendJson(res, 200, { ok: true, ...report })
  } catch (e) {
    sendJson(res, 200, {
      ok: false,
      status: 'error',
      ready: false,
      daemon: 'unknown',
      checks: [],
      warnings: [],
      errors: [`钉钉检测失败：${e?.message ?? String(e)}`],
      probe: { code: null, summary: '' },
    })
  }
}

/** POST /api/wecom/probe */
async function handleWecomProbe(res) {
  try {
    const report = await buildWecomProbeReport()
    sendJson(res, 200, { ok: true, ...report })
  } catch (e) {
    sendJson(res, 200, {
      ok: false,
      status: 'error',
      ready: false,
      daemon: 'unknown',
      checks: [],
      warnings: [],
      errors: [`企微检测失败：${e?.message ?? String(e)}`],
      probe: { code: null, summary: '' },
    })
  }
}

// ---------------------------------------------------------------------------
// Main request router
// ---------------------------------------------------------------------------

async function requestHandler(req, res) {
  const { method, url } = req

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  // Parse URL (ignore query string for routing)
  const parsedUrl = new URL(url, `http://localhost`)
  const pathname  = parsedUrl.pathname

  // --- Static file routes ---
  if (method === 'GET' && pathname === '/') {
    sendFile(res, path.join(PUBLIC_DIR, 'index.html'))
    return
  }

  if (method === 'GET' && pathname === '/dashboard') {
    sendFile(res, path.join(PUBLIC_DIR, 'dashboard.html'))
    return
  }

  if (method === 'GET' && pathname === '/setup') {
    sendFile(res, path.join(PUBLIC_DIR, 'index.html'))
    return
  }

  if (method === 'GET' && (pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.mjs'))) {
    // Serve only from the public directory, prevent path traversal
    const safeName = path.basename(pathname)
    sendFile(res, path.join(PUBLIC_DIR, safeName))
    return
  }

  // --- API routes ---
  try {
    if (method === 'GET' && pathname === '/api/status') {
      await handleStatus(res)
      return
    }

    if (method === 'POST' && pathname === '/api/install') {
      const body = await readBody(req)
      await handleInstall(res, body)
      return
    }

    if (method === 'GET' && pathname === '/api/config') {
      handleGetConfig(res)
      return
    }

    if (method === 'GET' && pathname === '/api/config/model-routing') {
      handleGetModelRouting(res)
      return
    }

    if (method === 'POST' && pathname === '/api/config/api') {
      const body = await readBody(req)
      await handleUpdateApi(res, body)
      return
    }

    if (method === 'POST' && pathname === '/api/config/model-routing') {
      const body = await readBody(req)
      await handleUpdateModelRouting(res, body)
      return
    }

    if (method === 'GET' && pathname === '/api/config/channels') {
      handleGetChannels(res)
      return
    }

    if (method === 'POST' && pathname === '/api/config/channels') {
      const body = await readBody(req)
      await handleUpdateChannel(res, body)
      return
    }

    if (method === 'POST' && pathname === '/api/daemon') {
      const body = await readBody(req)
      await handleDaemon(res, body)
      return
    }

    if (method === 'POST' && pathname === '/api/cleanup') {
      await handleCleanup(res)
      return
    }

    if (method === 'POST' && pathname === '/api/reset') {
      const body = await readBody(req)
      await handleFactoryReset(res, body)
      return
    }

    if (method === 'GET' && pathname === '/api/skill-categories') {
      handleSkillCategories(res)
      return
    }

    if (method === 'POST' && pathname === '/api/dingtalk/probe') {
      await handleDingtalkProbe(res)
      return
    }

    if (method === 'POST' && pathname === '/api/wecom/probe') {
      await handleWecomProbe(res)
      return
    }

    if (method === 'GET' && pathname === '/api/skill-categories') {
      handleGetSkillCategories(res)
      return
    }

    if (method === 'GET' && pathname === '/api/skill-status') {
      handleGetSkillStatus(res)
      return
    }

    if (method === 'GET' && pathname === '/api/skills/list') {
      handleSkillsList(res, parsedUrl.searchParams)
      return
    }

    if (method === 'POST' && pathname === '/api/skills/install') {
      const body = await readBody(req)
      await handleSkillInstall(res, body)
      return
    }

    if (method === 'DELETE' && pathname === '/api/skills/uninstall') {
      const body = await readBody(req)
      await handleSkillUninstall(res, body)
      return
    }

    // 404 fallback
    sendJson(res, 404, { error: 'Not Found' })
  } catch (err) {
    console.error('[server] Unhandled error:', err)
    sendJson(res, 500, { error: err.message ?? 'Internal Server Error' })
  }
}

// ---------------------------------------------------------------------------
// Open browser helper
// ---------------------------------------------------------------------------

/**
 * Open a URL in the default browser.
 * @param {string} url
 */
function openBrowser(url) {
  const platform = process.platform
  let cmd, args

  if (platform === 'darwin') {
    cmd  = 'open'
    args = [url]
  } else if (platform === 'win32') {
    cmd  = 'cmd'
    args = ['/c', 'start', url]
  } else {
    // Linux / other: try xdg-open
    cmd  = 'xdg-open'
    args = [url]
  }

  const child = spawn(cmd, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  })
  child.unref()
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

async function startServer() {
  try {
    const allowErrors = await ensurePluginsAllowIncludes([DINGTALK_PLUGIN_ID, WECOM_PLUGIN_ID])
    if (allowErrors.length > 0) {
      console.log(`[plugins] ${allowErrors.join('; ')}`)
    }
  } catch (e) {
    console.log(`[plugins] plugins.allow bootstrap failed: ${e?.message ?? String(e)}`)
  }

  try {
    const patch = patchDingtalkPluginDist()
    if (patch.ok && patch.changed) {
      console.log(`[dingtalk] ${patch.message}`)
    } else if (!patch.ok) {
      console.log(`[dingtalk] ${patch.message}`)
    }
  } catch (e) {
    console.log(`[dingtalk] 自动补丁检查失败：${e?.message ?? String(e)}`)
  }

  const port = await findPort(DEFAULT_PORT)

  const server = http.createServer(requestHandler)

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    console.log(`\nClawBot UI server started`)
    console.log(`  Profile  : ${PROFILE}`)
    console.log(`  Node Bin : ${NODE_BIN}`)
    console.log(`  Config   : ${CONFIG_FILE}`)
    console.log(`  Listening: ${url}\n`)

    if (AUTO_OPEN_BROWSER) {
      openBrowser(url)
    } else {
      console.log('  Browser  : auto-open disabled by OPENSPARROW_AUTO_OPEN\n')
    }
  })

  server.on('error', (err) => {
    console.error('[server] Fatal error:', err)
    process.exit(1)
  })
}

// Start the server
startServer()
