export const DEFAULT_DMX_ROUTER_PORT = 18602
export const DEFAULT_DMX_BASE_URL = 'https://www.dmxapi.cn/v1'
export const DEFAULT_DMX_TIER_MODEL_MAP = Object.freeze({
  SIMPLE: 'gemini-2.0-flash-ssvip',
  MEDIUM: 'kimi-k2-0711-preview',
  COMPLEX: 'deepseek-r1-250528',
  REASONING: 'deepseek-r1-250528',
})

export const DEMO_TASKS = Object.freeze({
  simple: {
    label: 'simple',
    prompt: 'Reply with exactly OK.',
    maxTokens: 32,
  },
  medium: {
    label: 'medium',
    prompt: 'Design a fault-tolerant distributed job scheduler for 5000 workers across 3 regions. Compare leader election strategies, failure domains, retry semantics, idempotency guarantees, and observability. End with a concise architecture summary in 3 bullets.',
    maxTokens: 180,
  },
  reasoning: {
    label: 'reasoning',
    prompt: 'Derive, step by step, an algorithm for exactly-once job execution with deduplication, transactional outbox, redrive safety, quorum write tradeoffs, and formal invariants. Include failure proofs and counterexamples, but keep the answer under 6 bullets.',
    maxTokens: 220,
  },
})

export function selectDemoModelForTier(tier, modelMap = DEFAULT_DMX_TIER_MODEL_MAP) {
  const normalizedTier = String(tier ?? '').trim().toUpperCase()
  return modelMap[normalizedTier] || modelMap.MEDIUM || DEFAULT_DMX_TIER_MODEL_MAP.MEDIUM
}

export function extractPromptFromMessages(messages) {
  if (!Array.isArray(messages)) return ''
  const parts = []
  for (const message of messages) {
    if (String(message?.role ?? '') !== 'user') continue
    const content = message?.content
    if (typeof content === 'string') {
      parts.push(content)
      continue
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block?.text === 'string') {
          parts.push(block.text)
        }
      }
    }
  }
  return parts.join('\n').trim()
}

export function normalizePreview(text, maxChars = 220) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

export function getDemoTask(name) {
  const key = String(name ?? '').trim().toLowerCase()
  return DEMO_TASKS[key] ? { ...DEMO_TASKS[key] } : null
}

export function listDemoTaskNames() {
  return Object.keys(DEMO_TASKS)
}
