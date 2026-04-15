#!/usr/bin/env node

import readline from 'node:readline'

const port = Number.parseInt(String(process.env.OPENSPARROW_CUSTOM_ROUTER_PORT || '8412').trim(), 10) || 8412
const baseUrl = `http://127.0.0.1:${port}/v1/chat/completions`

console.log(`[custom-plugin-chat] connected to ${baseUrl}`)
console.log('[custom-plugin-chat] 直接输入自然语言；输入 /exit 退出')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'plugin> ' })
rl.prompt()

rl.on('line', async (line) => {
  const input = String(line || '').trim()
  if (!input) return rl.prompt()
  if (input === '/exit' || input === '/quit') {
    rl.close()
    return
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ignored' },
      body: JSON.stringify({
        model: 'opensparrow-router/auto',
        messages: [{ role: 'user', content: input }],
        stream: false,
        max_tokens: 220,
      }),
    })
    const data = await response.json()
    console.log(`tier=${response.headers.get('x-opensparrow-tier') || ''}`)
    console.log(`selected=${response.headers.get('x-opensparrow-model') || ''}`)
    console.log(`provider=${response.headers.get('x-opensparrow-provider-model') || ''}`)
    console.log(`reasoning=${response.headers.get('x-opensparrow-reasoning') || ''}`)
    console.log((data?.choices?.[0]?.message?.content || data?.error?.message || '').trim())
  } catch (error) {
    console.error(`[custom-plugin-chat] ${error instanceof Error ? error.message : String(error)}`)
  }
  console.log('----------------------------------------')
  rl.prompt()
})

rl.on('close', () => {
  console.log('[custom-plugin-chat] bye')
  process.exit(0)
})
