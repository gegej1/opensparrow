import http from 'node:http'
import { spawn } from 'node:child_process'

import { BLOCKRUN_MODELS, DEFAULT_ROUTING_CONFIG, route } from '@blockrun/clawrouter'

import {
  CUSTOM_ROUTER_MODEL_ID,
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  buildCurlChatCompletionArgs,
  buildCustomRouterProviderConfig,
  buildCustomRouterUpstreamPayload,
  extractPromptFromMessages,
  extractProviderModelFromResponseText,
  normalizeCustomRouterPort,
  normalizeCustomTierModelMap,
  resolveRequestedMaxTokens,
  sanitizeDebugHeaderValue,
} from './lib.mjs'

let activeHandle = null

function resolvePluginConfig(pluginConfig = {}) {
  const baseUrl = String(pluginConfig?.baseUrl ?? process.env.OPENSPARROW_ROUTER_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const apiKey = String(pluginConfig?.apiKey ?? process.env.OPENSPARROW_ROUTER_API_KEY ?? '').trim()
  const port = normalizeCustomRouterPort(pluginConfig?.port ?? process.env.OPENSPARROW_CUSTOM_ROUTER_PORT, 8412)
  const tierModelMap = normalizeCustomTierModelMap(pluginConfig?.tierModelMap)
  const routing = pluginConfig?.routing && typeof pluginConfig.routing === 'object' ? pluginConfig.routing : DEFAULT_ROUTING_CONFIG
  return { baseUrl, apiKey, port, tierModelMap, routing }
}

function buildPricingMap() {
  const pricing = new Map()
  for (const model of BLOCKRUN_MODELS) {
    pricing.set(model.id, { inputPrice: model.inputPrice, outputPrice: model.outputPrice })
  }
  return pricing
}

function selectModelForTier(tier, tierModelMap) {
  const key = String(tier ?? '').trim().toUpperCase()
  return tierModelMap[key] || tierModelMap.MEDIUM
}

async function runCurl(args) {
  return await new Promise((resolve) => {
    const child = spawn('curl', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function callUpstreamJson({ baseUrl, apiKey, payload }) {
  const payloadJson = JSON.stringify(payload)
  const result = await runCurl(buildCurlChatCompletionArgs({ baseUrl, apiKey, payloadJson }))
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'curl upstream call failed')
  }
  const text = result.stdout
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
  }
  return { status: 200, text, json }
}

async function pipeUpstreamStream({ baseUrl, apiKey, payload, res, headers }) {
  const payloadJson = JSON.stringify(payload)
  return await new Promise((resolve, reject) => {
    const child = spawn('curl', buildCurlChatCompletionArgs({ baseUrl, apiKey, payloadJson, stream: true }), {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let responseStarted = false

    child.on('error', reject)
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
      if (!responseStarted) {
        responseStarted = true
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache',
          ...headers,
        })
      }
      res.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      if (code !== 0) {
        if (!responseStarted) {
          reject(new Error(stderr.trim() || stdout.trim() || 'curl upstream stream call failed'))
          return
        }
        res.end()
        resolve({ status: 502, text: stdout, stderr })
        return
      }
      if (!responseStarted) {
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache',
          ...headers,
        })
      }
      res.end()
      resolve({ status: 200, text: stdout, stderr })
    })
  })
}

function buildDebugHeaders(decision, selectedModel, providerModel = selectedModel) {
  const reasoning = sanitizeDebugHeaderValue(decision.reasoning)
  return {
    'x-opensparrow-tier': String(decision.tier),
    'x-opensparrow-model': selectedModel,
    'x-opensparrow-provider-model': providerModel,
    'x-opensparrow-reasoning': reasoning,
    'x-clawrouter-tier': String(decision.tier),
    'x-clawrouter-model': selectedModel,
    'x-clawrouter-reasoning': reasoning,
  }
}

function logRouting(api, decision, selectedModel, providerModel) {
  const reasoning = sanitizeDebugHeaderValue(decision.reasoning)
  api.logger.info(`[opensparrow-router] [${decision.tier}] ${selectedModel} -> ${providerModel || selectedModel || 'unknown'} | ${reasoning}`)
}

async function ensureProxyRunning(api, config) {
  if (activeHandle?.server) return activeHandle

  const pricing = buildPricingMap()
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          ok: true,
          provider: CUSTOM_ROUTER_PROVIDER_ID,
          model: CUSTOM_ROUTER_MODEL_ID,
          port: config.port,
          baseUrl: config.baseUrl,
        }))
        return
      }

      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: { message: 'not found' } }))
        return
      }

      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      const prompt = extractPromptFromMessages(body?.messages)
      if (!prompt) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: { message: 'missing user prompt in messages' } }))
        return
      }
      if (!config.baseUrl || !config.apiKey) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: { message: 'custom router plugin missing baseUrl/apiKey' } }))
        return
      }

      const maxTokens = resolveRequestedMaxTokens(body, 220)
      const decision = route(prompt, undefined, maxTokens, {
        config: config.routing,
        modelPricing: pricing,
      })
      const selectedModel = selectModelForTier(decision.tier, config.tierModelMap)
      const upstreamPayload = buildCustomRouterUpstreamPayload(body, selectedModel)

      if (body?.stream === true) {
        const upstream = await pipeUpstreamStream({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          payload: upstreamPayload,
          res,
          headers: buildDebugHeaders(decision, selectedModel),
        })
        const providerModel = extractProviderModelFromResponseText(upstream.text, selectedModel)
        logRouting(api, decision, selectedModel, providerModel)
        return
      }

      const upstream = await callUpstreamJson({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        payload: upstreamPayload,
      })
      const providerModel = upstream.json?.model || extractProviderModelFromResponseText(upstream.text, selectedModel)
      res.writeHead(upstream.status, {
        'content-type': 'application/json; charset=utf-8',
        ...buildDebugHeaders(decision, selectedModel, providerModel),
      })
      res.end(upstream.text)
      logRouting(api, decision, selectedModel, providerModel)
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: { message: error instanceof Error ? error.message : String(error) } }))
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(config.port, '127.0.0.1', () => resolve())
  })
  api.logger.info(`OpenSparrow custom router proxy listening on port ${config.port}`)
  activeHandle = { server, config }
  return activeHandle
}

async function closeProxy() {
  if (!activeHandle?.server) return
  const handle = activeHandle
  activeHandle = null
  await new Promise((resolve) => handle.server.close(() => resolve()))
}

const plugin = {
  id: CUSTOM_ROUTER_PROVIDER_ID,
  name: 'OpenSparrow Router',
  description: 'Custom model-routing plugin with external OpenAI-compatible upstream execution.',
  version: '0.1.0',
  register(api) {
    const config = resolvePluginConfig(api.pluginConfig)
    if (!api.config.models) api.config.models = { providers: {} }
    if (!api.config.models.providers) api.config.models.providers = {}
    api.config.models.providers[CUSTOM_ROUTER_PROVIDER_ID] = buildCustomRouterProviderConfig({ port: config.port })

    if (!api.config.agents) api.config.agents = {}
    if (!api.config.agents.defaults) api.config.agents.defaults = {}
    if (!api.config.agents.defaults.model) api.config.agents.defaults.model = {}
    api.config.agents.defaults.model.primary = CUSTOM_ROUTER_MODEL_TARGET

    api.registerService?.({
      id: 'opensparrow-router-proxy',
      start: async () => {
        ensureProxyRunning(api, config).catch((error) => {
          api.logger.warn(`OpenSparrow Router proxy startup failed: ${error instanceof Error ? error.message : String(error)}`)
        })
      },
      stop: async () => {
        await closeProxy()
      },
    })

    ensureProxyRunning(api, config).catch((error) => {
      api.logger.warn(`OpenSparrow Router proxy startup failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  },
  async deactivate(api) {
    await closeProxy()
    if (api?.config?.models?.providers?.[CUSTOM_ROUTER_PROVIDER_ID]) {
      delete api.config.models.providers[CUSTOM_ROUTER_PROVIDER_ID]
    }
    if (api?.config?.agents?.defaults?.model?.primary === CUSTOM_ROUTER_MODEL_TARGET) {
      delete api.config.agents.defaults.model.primary
    }
  },
}

export default plugin
