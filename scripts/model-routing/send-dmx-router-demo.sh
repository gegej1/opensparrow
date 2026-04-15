#!/bin/bash
set -euo pipefail

mode="${1:-simple}"
port="${OPENSPARROW_DMX_ROUTER_PORT:-18602}"
url="http://127.0.0.1:${port}/v1/chat/completions"

case "$mode" in
  simple)
    prompt='Reply with exactly OK.'
    max_tokens=32
    ;;
  medium)
    prompt='Design a fault-tolerant distributed job scheduler for 5000 workers across 3 regions. Compare leader election strategies, failure domains, retry semantics, idempotency guarantees, and observability. End with a concise architecture summary in 3 bullets.'
    max_tokens=180
    ;;
  reasoning)
    prompt='Derive, step by step, an algorithm for exactly-once job execution with deduplication, transactional outbox, redrive safety, quorum write tradeoffs, and formal invariants. Include failure proofs and counterexamples, but keep the answer under 6 bullets.'
    max_tokens=220
    ;;
  custom)
    prompt="${2:-}"
    max_tokens="${3:-220}"
    if [[ -z "$prompt" ]]; then
      echo '[dmx-router-demo] custom mode requires a prompt' >&2
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 <simple|medium|reasoning|custom> [prompt] [max_tokens]" >&2
    exit 1
    ;;
esac

jq -n --arg prompt "$prompt" --argjson max_tokens "$max_tokens" '{model:"auto",messages:[{role:"user",content:$prompt}],temperature:0,max_tokens:$max_tokens}' \
| curl -sS "$url" -H 'Content-Type: application/json' -d @- \
| jq '{providerModel:(.model // null), finishReason:(.choices[0].finish_reason // null), usage:(.usage // null), preview:((.choices[0].message.content // .error.message // "")|gsub("\\s+";" ")|.[0:220])}'
