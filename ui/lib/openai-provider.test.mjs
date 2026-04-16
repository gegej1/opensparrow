import test from 'node:test'
import assert from 'node:assert/strict'

import {
  OPENAI_COMPAT_API,
  buildOpenAIBaseUrlCandidates,
  buildOpenAIModelTarget,
  buildOpenAIProviderConfig,
  normalizeOpenAIBaseUrl,
} from './openai-provider.mjs'

test('normalizeOpenAIBaseUrl appends /v1 for host-only inputs', () => {
  assert.equal(normalizeOpenAIBaseUrl('https://api.openai.com'), 'https://api.openai.com/v1')
})

test('normalizeOpenAIBaseUrl trims endpoint suffixes back to provider base', () => {
  assert.equal(
    normalizeOpenAIBaseUrl('https://example.com/custom/v1/chat/completions'),
    'https://example.com/custom/v1'
  )
})

test('buildOpenAIBaseUrlCandidates adds /v1 fallback for custom non-root paths', () => {
  assert.deepEqual(
    buildOpenAIBaseUrlCandidates('https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api'),
    [
      'https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api',
      'https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api/v1',
    ]
  )
})

test('buildOpenAIProviderConfig writes provider-level and model-level api fields', () => {
  assert.deepEqual(
    buildOpenAIProviderConfig('https://example.com/v1', 'Qwen3-32B'),
    {
      baseUrl: 'https://example.com/v1',
      api: OPENAI_COMPAT_API,
      models: [{ id: 'Qwen3-32B', name: 'Qwen3-32B', api: OPENAI_COMPAT_API }],
    }
  )
})

test('buildOpenAIModelTarget prefixes openai when provider prefix is absent', () => {
  assert.equal(buildOpenAIModelTarget('Qwen3-32B'), 'openai/Qwen3-32B')
  assert.equal(buildOpenAIModelTarget('openai/gpt-4o-mini'), 'openai/gpt-4o-mini')
})
