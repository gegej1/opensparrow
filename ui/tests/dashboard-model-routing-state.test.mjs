import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SMART_MODE_SUCCESS_MESSAGE,
  SINGLE_MODE_SUCCESS_MESSAGE,
  createDashboardModelRoutingState,
} from '../public/dashboard-model-routing-state.mjs'

function createState(overrides = {}) {
  return createDashboardModelRoutingState({
    savedConfig: {
      mode: 'single',
      connection: {
        baseUrl: 'https://saved.example.com/v1',
        baseUrlConfigured: true,
        apiKeyConfigured: true,
      },
      singleModeDefaultModel: 'gpt-4o-mini',
      tierModelMap: {
        SIMPLE: 'model-simple',
        MEDIUM: 'model-medium',
        COMPLEX: 'model-complex',
        REASONING: 'model-reasoning',
      },
      routing: {
        classifierModel: 'gpt-4o-mini',
        tiers: {
          coding: 'COMPLEX',
        },
      },
      effectivePrimaryModel: 'openai/gpt-4o-mini',
      router: {
        providerId: 'opensparrow-router',
        modelTarget: 'opensparrow-router/auto',
        configPresent: true,
      },
    },
    ...overrides,
  })
}

test('single and smart drafts coexist across mode switches', () => {
  const state = createState()

  state.setSingleModeDefaultModel('single-draft-model')
  state.setMode('smart')
  state.setTierModel('SIMPLE', 'smart-simple-draft')
  state.setRoutingText('{"classifierModel":"draft-router","tiers":{"coding":"MEDIUM"}}')

  state.setMode('single')
  assert.equal(state.mode, 'single')
  assert.equal(state.draft.single.singleModeDefaultModel, 'single-draft-model')

  state.setMode('smart')
  assert.equal(state.mode, 'smart')
  assert.equal(state.draft.smart.tierModelMap.SIMPLE, 'smart-simple-draft')
  assert.equal(state.draft.smart.routingText, '{"classifierModel":"draft-router","tiers":{"coding":"MEDIUM"}}')
})

test('routing JSON keeps raw text, parsed result, and parseError tri-state', () => {
  const state = createState()

  state.setMode('smart')
  state.setRoutingText('{"classifierModel":"router-a","tiers":{"coding":"COMPLEX"}}')
  assert.equal(state.draft.smart.routingText, '{"classifierModel":"router-a","tiers":{"coding":"COMPLEX"}}')
  assert.deepEqual(state.draft.smart.routingParsed, {
    classifierModel: 'router-a',
    tiers: {
      coding: 'COMPLEX',
    },
  })
  assert.equal(state.draft.smart.routingParseError, '')
  assert.equal(state.draft.smart.routingTopLevelObject, true)

  state.setRoutingText('{"classifierModel":')
  assert.equal(state.draft.smart.routingParsed, null)
  assert.match(state.draft.smart.routingParseError, /JSON|Unexpected|end/i)
  assert.equal(state.draft.smart.routingTopLevelObject, false)

  state.setRoutingText('[]')
  assert.deepEqual(state.draft.smart.routingParsed, [])
  assert.equal(state.draft.smart.routingParseError, '')
  assert.equal(state.draft.smart.routingTopLevelObject, false)
})

test('single mode save gating requires saved API config, nonempty model, and dirty input', () => {
  const state = createState()

  let view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, true)
  assert.deepEqual(view.disabledReasons, ['noDirtyChanges'])

  state.setSingleModeDefaultModel('')
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, true)
  assert(view.disabledReasons.includes('missingSingleModeDefaultModel'))

  state.setSingleModeDefaultModel('gpt-4.1-mini')
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, false)

  state.setApiSavedSnapshot({
    baseUrl: '',
    baseUrlConfigured: false,
    apiKeyConfigured: false,
  })
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://draft.example.com/v1', apiKey: 'draft-key' } })
  assert.equal(view.connection.baseUrlConfigured, false)
  assert.equal(view.connection.apiKeyConfigured, false)
  assert.equal(view.saveDisabled, true)
  assert(view.disabledReasons.includes('missingSavedBaseUrl'))
  assert(view.disabledReasons.includes('missingSavedApiKey'))
})

test('smart mode save gating enforces tier completeness, object JSON, saved API config, and dirty input', () => {
  const state = createState({
    savedConfig: {
      mode: 'smart',
      connection: {
        baseUrl: 'https://saved.example.com/v1',
        baseUrlConfigured: true,
        apiKeyConfigured: true,
      },
      singleModeDefaultModel: 'gpt-4o-mini',
      tierModelMap: {
        SIMPLE: 'model-simple',
        MEDIUM: 'model-medium',
        COMPLEX: 'model-complex',
        REASONING: 'model-reasoning',
      },
      routing: {
        classifierModel: 'router-a',
      },
      effectivePrimaryModel: 'opensparrow-router/auto',
    },
  })

  state.setMode('smart')
  let view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, true)
  assert.deepEqual(view.disabledReasons, ['noDirtyChanges'])

  state.setTierModel('COMPLEX', '')
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, true)
  assert(view.disabledReasons.includes('missingTierModel:COMPLEX'))

  state.setTierModel('COMPLEX', 'new-complex-model')
  state.setRoutingText('[]')
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, true)
  assert(view.disabledReasons.includes('routingTopLevelNotObject'))

  state.setRoutingText('{"classifierModel":"router-b"}')
  view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })
  assert.equal(view.saveDisabled, false)
})

test('API draft warning and connection state depend on the saved snapshot, not unsaved form input', () => {
  const state = createState({
    savedConfig: {
      mode: 'single',
      connection: {
        baseUrl: 'https://saved.example.com/v1',
        baseUrlConfigured: true,
        apiKeyConfigured: false,
      },
      singleModeDefaultModel: 'gpt-4o-mini',
      tierModelMap: {
        SIMPLE: 'model-simple',
        MEDIUM: 'model-medium',
        COMPLEX: 'model-complex',
        REASONING: 'model-reasoning',
      },
      routing: {
        classifierModel: 'gpt-4o-mini',
      },
      effectivePrimaryModel: 'openai/gpt-4o-mini',
    },
  })

  const view = state.getActiveView({
    apiDraft: {
      baseUrl: 'https://draft.example.com/v1',
      apiKey: 'draft-secret',
    },
  })

  assert.equal(view.connection.baseUrl, 'https://saved.example.com/v1')
  assert.equal(view.connection.baseUrlConfigured, true)
  assert.equal(view.connection.apiKeyConfigured, false)
  assert.equal(view.connection.apiDraftDirty, true)
  assert.equal(view.connection.showUnsavedDraftNotice, true)
})

test('payload builder splits single and smart modes correctly', () => {
  const state = createState()

  state.setSingleModeDefaultModel('gpt-4.1-mini')
  assert.deepEqual(state.buildSavePayload({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }), {
    mode: 'single',
    singleModeDefaultModel: 'gpt-4.1-mini',
  })

  state.setMode('smart')
  state.setTierModel('SIMPLE', 'simple-updated')
  state.setRoutingText('{"classifierModel":"router-b","tiers":{"writing":"MEDIUM"}}')
  assert.deepEqual(state.buildSavePayload({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }), {
    mode: 'smart',
    tierModelMap: {
      SIMPLE: 'simple-updated',
      MEDIUM: 'model-medium',
      COMPLEX: 'model-complex',
      REASONING: 'model-reasoning',
    },
    routing: {
      classifierModel: 'router-b',
      tiers: {
        writing: 'MEDIUM',
      },
    },
  })
})

test('switching from saved smart mode to single mode becomes dirty and emits single payload without field edits', () => {
  const state = createState({
    savedConfig: {
      mode: 'smart',
      connection: {
        baseUrl: 'https://saved.example.com/v1',
        baseUrlConfigured: true,
        apiKeyConfigured: true,
      },
      singleModeDefaultModel: 'gpt-4o-mini',
      tierModelMap: {
        SIMPLE: 'model-simple',
        MEDIUM: 'model-medium',
        COMPLEX: 'model-complex',
        REASONING: 'model-reasoning',
      },
      routing: {
        classifierModel: 'router-a',
        tiers: {
          coding: 'COMPLEX',
        },
      },
      effectivePrimaryModel: 'opensparrow-router/auto',
    },
  })

  state.setMode('single')
  const view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })

  assert.equal(view.mode, 'single')
  assert.equal(view.singleModeDefaultModel, 'gpt-4o-mini')
  assert.equal(view.dirty, true)
  assert.equal(view.saveDisabled, false)
  assert.deepEqual(state.buildSavePayload({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }), {
    mode: 'single',
    singleModeDefaultModel: 'gpt-4o-mini',
  })
})

test('switching from saved single mode to smart mode becomes dirty and emits smart payload without field edits', () => {
  const state = createState({
    savedConfig: {
      mode: 'single',
      connection: {
        baseUrl: 'https://saved.example.com/v1',
        baseUrlConfigured: true,
        apiKeyConfigured: true,
      },
      singleModeDefaultModel: 'gpt-4o-mini',
      tierModelMap: {
        SIMPLE: 'model-simple',
        MEDIUM: 'model-medium',
        COMPLEX: 'model-complex',
        REASONING: 'model-reasoning',
      },
      routing: {
        classifierModel: 'router-a',
        tiers: {
          coding: 'COMPLEX',
        },
      },
      effectivePrimaryModel: 'openai/gpt-4o-mini',
    },
  })

  state.setMode('smart')
  const view = state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } })

  assert.equal(view.mode, 'smart')
  assert.deepEqual(view.tierModelMap, {
    SIMPLE: 'model-simple',
    MEDIUM: 'model-medium',
    COMPLEX: 'model-complex',
    REASONING: 'model-reasoning',
  })
  assert.equal(view.routingText, '{\n  "classifierModel": "router-a",\n  "tiers": {\n    "coding": "COMPLEX"\n  }\n}')
  assert.equal(view.dirty, true)
  assert.equal(view.saveDisabled, false)
  assert.deepEqual(state.buildSavePayload({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }), {
    mode: 'smart',
    tierModelMap: {
      SIMPLE: 'model-simple',
      MEDIUM: 'model-medium',
      COMPLEX: 'model-complex',
      REASONING: 'model-reasoning',
    },
    routing: {
      classifierModel: 'router-a',
      tiers: {
        coding: 'COMPLEX',
      },
    },
  })
})

test('save success and failure update saved and dirty state without dropping drafts', () => {
  const state = createState()

  state.setSingleModeDefaultModel('gpt-4.1-mini')
  state.beginSave()
  state.applySaveSuccess({
    mode: 'single',
    effectivePrimaryModel: 'openai/gpt-4.1-mini',
    message: SINGLE_MODE_SUCCESS_MESSAGE,
  })
  assert.equal(state.saveState.loading, false)
  assert.equal(state.saveState.error, '')
  assert.equal(state.saveState.success, SINGLE_MODE_SUCCESS_MESSAGE)
  assert.equal(state.saved.singleModeDefaultModel, 'gpt-4.1-mini')
  assert.equal(state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }).dirty, false)

  state.setMode('smart')
  state.setTierModel('MEDIUM', 'medium-draft')
  state.setRoutingText('{"classifierModel":"router-c"}')
  const failedDraftText = state.draft.smart.routingText
  state.beginSave()
  state.applySaveFailure(['后端错误'])
  assert.equal(state.saveState.loading, false)
  assert.equal(state.saveState.success, '')
  assert.match(state.saveState.error, /后端错误/)
  assert.equal(state.draft.smart.routingText, failedDraftText)
  assert.equal(state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }).dirty, true)

  state.beginSave()
  state.applySaveSuccess({
    mode: 'smart',
    effectivePrimaryModel: 'opensparrow-router/auto',
    message: SMART_MODE_SUCCESS_MESSAGE,
  })
  assert.equal(state.saved.mode, 'smart')
  assert.equal(state.saved.effectivePrimaryModel, 'opensparrow-router/auto')
  assert.equal(state.saveState.success, SMART_MODE_SUCCESS_MESSAGE)
  assert.equal(state.getActiveView({ apiDraft: { baseUrl: 'https://saved.example.com/v1', apiKey: '' } }).dirty, false)
})
