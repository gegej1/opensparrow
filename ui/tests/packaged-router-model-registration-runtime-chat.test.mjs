import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  getModelRoutingConfig,
  saveModelRoutingConfig,
} from '../lib/model-routing-config.mjs'
import {
  buildCustomRouterBaseUrl,
  CUSTOM_ROUTER_MODEL_ID,
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  OPENAI_COMPAT_API,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

const TIERS = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']
const ROUTER_AUTH_PROFILE_ID = `${CUSTOM_ROUTER_PROVIDER_ID}:default`

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-router-registration-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function buildTierConnectionMap(suffix = 'registration') {
  return Object.fromEntries(TIERS.map((tier) => [
    tier,
    {
      baseUrl: `https://${tier.toLowerCase()}.example.invalid/v1`,
      apiKey: `${tier.toLowerCase()}-${suffix}-key`,
      model: `${tier.toLowerCase()}-${suffix}-model`,
    },
  ]))
}

function buildLegacySmartShape(tierConnectionMap = buildTierConnectionMap()) {
  return {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://existing.example.invalid/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: OPENAI_COMPAT_API }],
        },
      },
      default: 'openai/gpt-4o-mini',
    },
    agents: {
      defaults: {
        model: {
          primary: CUSTOM_ROUTER_MODEL_TARGET,
        },
      },
    },
    plugins: {
      allow: [CUSTOM_ROUTER_PROVIDER_ID],
      entries: {
        [CUSTOM_ROUTER_PROVIDER_ID]: {
          enabled: true,
          config: {
            tierConnectionMap,
            tierModelMap: Object.fromEntries(TIERS.map((tier) => [
              tier,
              tierConnectionMap[tier].model,
            ])),
            routing: {},
          },
        },
      },
    },
  }
}

function resolveGatewayModel(config, modelTarget) {
  const [providerId, ...modelParts] = String(modelTarget ?? '').trim().split('/')
  const modelId = modelParts.join('/')
  const provider = config?.models?.providers?.[providerId]
  const model = Array.isArray(provider?.models)
    ? provider.models.find((entry) => String(entry?.id ?? '').trim() === modelId)
    : null

  if (!provider || !model) {
    return {
      ok: false,
      error: `Unknown model: ${modelTarget}`,
    }
  }

  return { ok: true, provider, model }
}

test('smart save registers opensparrow-router/auto through supported schema without models.default', () => {
  const root = makeTempDir()
  const configFile = path.join(root, 'openclaw.json')
  const authFile = path.join(root, 'agents', 'main', 'agent', 'auth-profiles.json')
  const uiMetaFile = path.join(root, 'ui-meta.json')
  const routerPort = 19429
  const tierConnectionMap = buildTierConnectionMap('saved')

  const legacyShape = buildLegacySmartShape(tierConnectionMap)
  const legacyResolution = resolveGatewayModel(legacyShape, CUSTOM_ROUTER_MODEL_TARGET)
  assert.equal(legacyResolution.ok, false)
  assert.equal(legacyResolution.error, `Unknown model: ${CUSTOM_ROUTER_MODEL_TARGET}`)

  writeJson(configFile, {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://existing.example.invalid/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: OPENAI_COMPAT_API }],
        },
      },
      default: 'openai/gpt-4o-mini',
    },
  })
  writeJson(authFile, {
    version: 1,
    profiles: {
      'openai:default': { type: 'api_key', provider: 'openai', key: 'synthetic-existing-openai-key' },
    },
    order: { openai: ['openai:default'] },
  })

  const result = saveModelRoutingConfig({
    configFile,
    authFile,
    uiMetaFile,
    routerPort,
  }, {
    mode: 'smart',
    tierConnectionMap,
    routing: { default: 'SIMPLE' },
  })

  assert.equal(result.ok, true)
  assert.equal(result.effectivePrimaryModel, CUSTOM_ROUTER_MODEL_TARGET)

  const config = readJson(configFile)
  assert.equal(config.agents.defaults.model.primary, CUSTOM_ROUTER_MODEL_TARGET)
  assert.equal(Object.hasOwn(config.models, 'default'), false)
  assert.equal(config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID].config.tierConnectionMap.SIMPLE.model, 'simple-saved-model')
  assert.equal(config.plugins.allow.includes(CUSTOM_ROUTER_PROVIDER_ID), false)

  const resolution = resolveGatewayModel(config, CUSTOM_ROUTER_MODEL_TARGET)
  assert.equal(resolution.ok, true, resolution.error)
  assert.equal(resolution.provider.baseUrl, buildCustomRouterBaseUrl(routerPort))
  assert.equal(resolution.provider.api, OPENAI_COMPAT_API)
  assert.equal(resolution.model.id, CUSTOM_ROUTER_MODEL_ID)
  assert.equal(resolution.model.api, OPENAI_COMPAT_API)

  const auth = readJson(authFile)
  const routerAuth = auth.profiles[ROUTER_AUTH_PROFILE_ID]
  assert.equal(routerAuth.provider, CUSTOM_ROUTER_PROVIDER_ID)
  assert.equal(routerAuth.type, 'api_key')
  assert.equal(typeof routerAuth.key, 'string')
  assert.ok(routerAuth.key.length > 0)
  assert.deepEqual(auth.order[CUSTOM_ROUTER_PROVIDER_ID], [ROUTER_AUTH_PROFILE_ID])

  const readBack = getModelRoutingConfig({
    configFile,
    authFile,
    uiMetaFile,
    routerPort,
  })
  assert.equal(readBack.mode, 'smart')
  assert.equal(readBack.router.providerId, CUSTOM_ROUTER_PROVIDER_ID)
  assert.equal(readBack.router.modelTarget, CUSTOM_ROUTER_MODEL_TARGET)
  assert.equal(readBack.tierConnectionMap.SIMPLE.apiKeyConfigured, true)
  assert.equal(Object.hasOwn(readBack.tierConnectionMap.SIMPLE, 'apiKey'), false)
  assert.equal(JSON.stringify(readBack).includes(tierConnectionMap.SIMPLE.apiKey), false)
})
