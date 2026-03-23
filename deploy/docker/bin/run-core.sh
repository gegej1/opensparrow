#!/usr/bin/env bash

set -euo pipefail

app_root="${OPENSPARROW_APP_ROOT:-/opt/opensparrow}"
: "${OPENCLAW_HOME:=/var/opensparrow/home}"
: "${OPENCLAW_PROFILE:=container-baseline}"
: "${OPENCLAW_GATEWAY_PORT:=18889}"
: "${OPENCLAW_GATEWAY_BIND:=lan}"
: "${OPENSPARROW_UI_PORT:=19000}"
: "${USB_RUNTIME_ROOT:=${app_root}/runtime}"
: "${LOG_DIR:=/var/opensparrow/logs}"
: "${EVIDENCE_ROOT:=/var/opensparrow/evidence}"

export HOME="$OPENCLAW_HOME"
export OPENCLAW_HOME OPENCLAW_PROFILE OPENCLAW_GATEWAY_PORT OPENCLAW_GATEWAY_BIND OPENSPARROW_UI_PORT USB_RUNTIME_ROOT
export LOG_DIR EVIDENCE_ROOT OPENSPARROW_AUTO_OPEN="0"

mkdir -p "$OPENCLAW_HOME" "$LOG_DIR" "$EVIDENCE_ROOT"
bash "${app_root}/deploy/docker/bin/prepare-runtime.sh"

vendor_node="${app_root}/vendor/linux-openclaw/bin/node"
if [[ -x "$vendor_node" ]] && "$vendor_node" --version >/dev/null 2>&1; then
  ui_node="$vendor_node"
elif command -v node >/dev/null 2>&1; then
  ui_node="$(command -v node)"
else
  echo "[ERROR] Node runtime not found for ui/server.mjs" >&2
  exit 1
fi

config_file="${OPENCLAW_HOME}/.openclaw-${OPENCLAW_PROFILE}/openclaw.json"

cleanup() {
  trap - EXIT INT TERM
  while read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$pid" >/dev/null 2>&1 || true
  done < <(jobs -pr)
}

gateway_loop() {
  while true; do
    until [[ -f "$config_file" ]]; do
      echo "[gateway] waiting for ${config_file}"
      sleep 2
    done

    echo "[gateway] starting foreground runtime (bind=${OPENCLAW_GATEWAY_BIND}, port=${OPENCLAW_GATEWAY_PORT})"
    if bash "${app_root}/deploy/docker/bin/openclaw-wrapper.sh" --profile "$OPENCLAW_PROFILE" gateway run --port "$OPENCLAW_GATEWAY_PORT" --bind "$OPENCLAW_GATEWAY_BIND"; then
      echo "[gateway] exited cleanly; restarting in 2s"
    else
      echo "[gateway] exited with failure; retrying in 2s" >&2
    fi
    sleep 2
  done
}

trap cleanup EXIT INT TERM

gateway_loop &
gateway_pid=$!
"$ui_node" "${app_root}/ui/server.mjs" &
ui_pid=$!

while kill -0 "$gateway_pid" >/dev/null 2>&1 && kill -0 "$ui_pid" >/dev/null 2>&1; do
  sleep 1
done

status=0
if ! kill -0 "$ui_pid" >/dev/null 2>&1; then
  wait "$ui_pid" || status=$?
else
  wait "$gateway_pid" || status=$?
fi

cleanup
wait || true
exit "$status"
