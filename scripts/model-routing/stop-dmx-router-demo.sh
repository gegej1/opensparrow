#!/bin/bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
pid_file="$repo_root/dist/dmx-router-demo/dmx-router-demo.pid"
if [[ ! -f "$pid_file" ]]; then
  echo '[dmx-router-demo] no pid file'
  exit 0
fi
pid="$(cat "$pid_file")"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "[dmx-router-demo] stopped pid=$pid"
else
  echo "[dmx-router-demo] stale pid file removed"
fi
rm -f "$pid_file"
