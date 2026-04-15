#!/usr/bin/env node

import readline from 'node:readline'

const port = Number.parseInt(String(process.env.OPENSPARROW_DMX_ROUTER_PORT || '18602').trim(), 10) || 18602
const baseUrl = `http://127.0.0.1:${port}/v1/chat/completions`

console.log(`[dmx-router-chat] connected to ${baseUrl}`)
console.log('[dmx-router-chat] 直接输入内容发送；输入 /simple /medium /reasoning 用预设；输入 /exit 退出')

const presets = {
  '/simple': { prompt: 'Reply with exactly OK.', max_tokens: 32 },
  '/medium': { prompt: 'Design a fault-tolerant distributed job scheduler for 5000 workers across 3 regions. Compare leader election strategies, failure domains, retry semantics, idempotency guarantees, and observability. End with a concise architecture summary in 3 bullets.', max_tokens: 180 },
  '/reasoning': { prompt: 'Derive, step by step, an algorithm for exactly-once job execution with deduplication, transactional outbox, redrive safety, quorum write tradeoffs, and formal invariants. Include failure proofs and counterexamples, but keep the answer under 6 bullets.', max_tokens: 220 },
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'dmx> ' })
rl.prompt()

rl.on('line', async (line) => {
  const input = String(line || '').trim()
  if (!input) return rl.prompt()
  if (input === '/exit' || input === '/quit') {
    rl.close()
    return
  }

  const preset = presets[input]
  const payload = preset
    ? { model: 'auto', messages: [{ role: 'user', content: preset.prompt }], temperature: 0, max_tokens: preset.max_tokens }
    : { model: 'auto', messages: [{ role: 'user', content: input }], temperature: 0, max_tokens: 220 }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    console.log(`tier=${response.headers.get('x-demo-tier') || ''}`)
    console.log(`selected=${response.headers.get('x-demo-selected-model') || ''}`)
    console.log(`provider=${response.headers.get('x-demo-provider-model') || ''}`)
    console.log((data?.choices?.[0]?.message?.content || data?.error?.message || '').trim())
  } catch (error) {
    console.error(`[dmx-router-chat] ${error instanceof Error ? error.message : String(error)}`)
  }
  rl.prompt()
})

rl.on('close', () => {
  console.log('[dmx-router-chat] bye')
  process.exit(0)
})
