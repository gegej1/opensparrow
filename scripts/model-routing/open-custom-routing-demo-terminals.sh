#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
demo_dir="$repo_root/dist/model-running-lab/demo-terminals"
mkdir -p "$demo_dir"

gateway_script="$demo_dir/custom-routing-gateway.sh"
chat_script="$demo_dir/custom-routing-chat.sh"
repo_escaped=$(printf '%q' "$repo_root")
base_url="${OPENSPARROW_ROUTER_BASE_URL:-}"
api_key="${OPENSPARROW_ROUTER_API_KEY:-}"
if [[ -z "$base_url" || -z "$api_key" ]]; then
  node_bin="$repo_root/vendor/mac-openclaw/bin/node"
  while IFS='=' read -r key value; do
    case "$key" in
      OPENSPARROW_ROUTER_BASE_URL) base_url="$value" ;;
      OPENSPARROW_ROUTER_API_KEY) api_key="$value" ;;
    esac
  done < <("$node_bin" - <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const configPath = path.join(process.cwd(), 'dist', 'model-running-lab', 'home', '.openclaw-model-routing-lab', 'openclaw.json')
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const cfg = data?.plugins?.entries?.['opensparrow-router']?.config || {}
console.log(`OPENSPARROW_ROUTER_BASE_URL=${cfg.baseUrl || ''}`)
console.log(`OPENSPARROW_ROUTER_API_KEY=${cfg.apiKey || ''}`)
NODE
)
fi

: "${base_url:?missing OPENSPARROW_ROUTER_BASE_URL or profile plugin config}"
: "${api_key:?missing OPENSPARROW_ROUTER_API_KEY or profile plugin config}"

base_escaped=$(printf '%q' "$base_url")
key_escaped=$(printf '%q' "$api_key")

cat > "$gateway_script" <<SCRIPT
#!/bin/bash
cd $repo_escaped
export OPENSPARROW_ROUTER_BASE_URL=$base_escaped
export OPENSPARROW_ROUTER_API_KEY=$key_escaped
bash scripts/model-routing/watch-custom-routing-plugin-log.sh
SCRIPT
chmod +x "$gateway_script"

cat > "$chat_script" <<SCRIPT
#!/bin/bash
cd $repo_escaped
export OPENSPARROW_CUSTOM_ROUTER_PORT=8412
bash scripts/model-routing/wait-chat-custom-routing-plugin.sh
SCRIPT
chmod +x "$chat_script"

osascript <<OSA
set gatewayScript to quoted form of POSIX path of "$gateway_script"
set chatScript to quoted form of POSIX path of "$chat_script"
tell application "Terminal"
  activate
  do script "bash " & gatewayScript
  delay 1
  do script "bash " & chatScript
end tell
OSA

echo "[custom-routing-demo] opened two Terminal windows"
echo "[custom-routing-demo] terminal A = plugin route log"
echo "[custom-routing-demo] terminal B = natural-language chat UI"
