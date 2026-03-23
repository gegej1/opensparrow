#!/usr/bin/env bash

set -euo pipefail

app_root="${OPENSPARROW_APP_ROOT:-/opt/opensparrow}"
: "${OPENCLAW_HOME:=/var/opensparrow/home}"
: "${OPENCLAW_PROFILE:=container-baseline}"
: "${OPENCLAW_AGENT_ID:=main}"
: "${OPENCLAW_GATEWAY_PORT:=18889}"
: "${OPENCLAW_GATEWAY_BIND:=lan}"
: "${OPENCLAW_MODEL:=openai/gpt-4o-mini}"
: "${USB_RUNTIME_ROOT:=${app_root}/runtime}"
: "${LOG_DIR:=/var/opensparrow/logs}"
: "${EVIDENCE_ROOT:=/var/opensparrow/evidence}"

export HOME="$OPENCLAW_HOME"
export OPENCLAW_HOME OPENCLAW_GATEWAY_BIND USB_RUNTIME_ROOT LOG_DIR
export OPENCLAW_RUNTIME_MODE="prepare-only"
export EVIDENCE_DIR="${EVIDENCE_ROOT}/$(date +%Y%m%d-%H%M%S)-bootstrap"

missing=()
for name in FEISHU_APP_ID FEISHU_APP_SECRET OPENAI_API_KEY; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf '[ERROR] Missing required envs: %s\n' "${missing[*]}" >&2
  exit 1
fi

bash "${app_root}/deploy/docker/bin/prepare-runtime.sh"

args=(
  --profile "$OPENCLAW_PROFILE"
  --agent "$OPENCLAW_AGENT_ID"
  --port "$OPENCLAW_GATEWAY_PORT"
  --model "$OPENCLAW_MODEL"
  --prepare-only
  --non-interactive
)

if [[ -n "${OPENAI_BASE_URL:-}" ]]; then
  args+=(--base-url "$OPENAI_BASE_URL")
fi

exec bash "${app_root}/scripts/openclaw-usb/install-local-feishu.sh" "${args[@]}"
