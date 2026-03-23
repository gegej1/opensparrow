#!/usr/bin/env bash

set -euo pipefail

app_root="${OPENSPARROW_APP_ROOT:-/opt/opensparrow}"
runtime_root="${USB_RUNTIME_ROOT:-${app_root}/runtime}"
vendor_root="${app_root}/vendor/linux-openclaw"

mkdir -p "$runtime_root"
ln -sfn "${vendor_root}/bin" "${runtime_root}/node"
ln -sfn "${vendor_root}/bin/node_modules/openclaw" "${runtime_root}/openclaw"

