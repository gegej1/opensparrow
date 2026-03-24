#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pass_count=0
fail_count=0
warn_count=0

pass() {
  printf '[PASS] %s\n' "$*"
  pass_count=$((pass_count + 1))
}

fail() {
  printf '[FAIL] %s\n' "$*"
  fail_count=$((fail_count + 1))
}

warn() {
  printf '[WARN] %s\n' "$*"
  warn_count=$((warn_count + 1))
}

section() {
  printf '\n== %s ==\n' "$*"
}

normalize_version() {
  local raw="${1:-}"
  if [[ -z "$raw" ]]; then
    return 0
  fi
  if [[ "$raw" == v* ]]; then
    printf '%s\n' "$raw"
  else
    printf 'v%s\n' "$raw"
  fi
}

sha256_of() {
  local file_path="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
  else
    return 1
  fi
}

file_arch() {
  local file_path="$1"
  local info
  info="$(file "$file_path")"
  if [[ "$info" == *"x86_64"* ]]; then
    printf 'x86_64\n'
  elif [[ "$info" == *"x86-64"* ]]; then
    printf 'x64\n'
  elif [[ "$info" == *"arm64"* ]]; then
    printf 'arm64\n'
  elif [[ "$info" == *"aarch64"* ]]; then
    printf 'arm64\n'
  elif [[ "$info" == *"universal binary"* ]]; then
    printf 'universal\n'
  else
    printf 'unknown\n'
  fi
}

binary_for() {
  case "$1" in
    mac) printf 'vendor/mac-openclaw/bin/node\n' ;;
    linux) printf 'vendor/linux-openclaw/bin/node\n' ;;
    windows) printf 'vendor/windows-openclaw/node.exe\n' ;;
    *) return 1 ;;
  esac
}

hint_for() {
  case "$1" in
    mac) printf 'vendor/mac-openclaw/CHANGELOG.md\n' ;;
    linux) printf 'vendor/linux-openclaw/CHANGELOG.md\n' ;;
    windows) printf 'vendor/windows-openclaw/CHANGELOG.md\n' ;;
    *) return 1 ;;
  esac
}

set_platform_value() {
  local platform="$1"
  local field="$2"
  local value="$3"
  printf -v "${platform}_${field}" '%s' "$value"
}

get_platform_value() {
  local platform="$1"
  local field="$2"
  local var_name="${platform}_${field}"
  printf '%s\n' "${!var_name:-}"
}

probe_version() {
  local binary_path="$1"
  local metadata_hint="${2:-}"
  local version=''
  local source=''

  if [[ -x "$binary_path" ]]; then
    if version="$("$binary_path" --version 2>/dev/null)"; then
      source='exec'
    fi
  fi

  if [[ -z "$version" ]] && command -v strings >/dev/null 2>&1; then
    version="$(LC_ALL=C strings "$binary_path" | awk '/^v[0-9]+\.[0-9]+\.[0-9]+$/{print; exit}')"
    if [[ -n "$version" ]]; then
      source='strings'
    fi
  fi

  if [[ -z "$version" ]] && [[ -n "$metadata_hint" ]] && [[ -f "$metadata_hint" ]]; then
    version="$(LC_ALL=C rg -o -m1 'v?[0-9]+\.[0-9]+\.[0-9]+' "$metadata_hint" | head -n 1 || true)"
    version="$(normalize_version "$version")"
    if [[ -n "$version" ]]; then
      source='metadata'
    fi
  fi

  printf '%s|%s\n' "$version" "$source"
}

check_path() {
  local path="$1"
  local label="$2"
  if [[ -e "$path" ]]; then
    pass "$label present: $path"
  else
    fail "$label missing: $path"
  fi
}

section 'Vendor directory presence'
check_path vendor/mac-openclaw 'mac vendor dir'
check_path vendor/linux-openclaw 'linux vendor dir'
check_path vendor/windows-openclaw 'windows vendor dir'

section 'Key file presence'
check_path vendor/mac-openclaw/bin/node 'mac node binary'
check_path vendor/mac-openclaw/bin/npm 'mac npm'
check_path vendor/mac-openclaw/LICENSE 'mac LICENSE'
check_path vendor/linux-openclaw/bin/node 'linux node binary'
check_path vendor/linux-openclaw/bin/npm 'linux npm'
check_path vendor/linux-openclaw/LICENSE 'linux LICENSE'
check_path vendor/windows-openclaw/node.exe 'windows node binary'
check_path vendor/windows-openclaw/npm 'windows npm'
check_path vendor/windows-openclaw/LICENSE 'windows LICENSE'

section 'Version probes'
for platform in mac linux windows; do
  binary_path="$(binary_for "$platform")"
  metadata_hint="$(hint_for "$platform")"

  if [[ ! -f "$binary_path" ]]; then
    fail "$platform version probe skipped because binary is missing: $binary_path"
    continue
  fi

  probe_output="$(probe_version "$binary_path" "$metadata_hint")"
  version="${probe_output%%|*}"
  source="${probe_output##*|}"
  set_platform_value "$platform" version "$version"
  set_platform_value "$platform" source "$source"

  if [[ -n "$version" ]]; then
    pass "$platform node version: $version (source=$source)"
  else
    fail "$platform node version could not be determined"
  fi
done

section 'Architecture probes'
for platform in mac linux windows; do
  binary_path="$(binary_for "$platform")"
  if [[ ! -f "$binary_path" ]]; then
    continue
  fi

  arch="$(file_arch "$binary_path")"
  set_platform_value "$platform" arch "$arch"

  if [[ "$platform" == 'mac' ]]; then
    if [[ "$arch" == 'x86_64' || "$arch" == 'arm64' || "$arch" == 'universal' ]]; then
      pass "mac binary architecture: $arch"
    else
      fail "mac binary architecture unexpected: $arch"
    fi
  else
    if [[ "$arch" == 'x64' || "$arch" == 'x86_64' || "$arch" == 'arm64' ]]; then
      pass "$platform binary architecture: $arch"
    else
      warn "$platform binary architecture reported as: $arch"
    fi
  fi
done

section 'Version consistency'
mac_version="$(get_platform_value mac version)"
linux_version="$(get_platform_value linux version)"
windows_version="$(get_platform_value windows version)"

if [[ -n "$mac_version" && -n "$linux_version" && -n "$windows_version" ]]; then
  unique_count="$(printf '%s\n' "$mac_version" "$linux_version" "$windows_version" | sort -u | wc -l | tr -d ' ')"
  if [[ "$unique_count" == '1' ]]; then
    pass "all vendor node versions match: $mac_version"
  else
    fail "vendor node version mismatch: mac=$mac_version, linux=$linux_version, windows=$windows_version"
  fi
else
  fail 'unable to collect all three platform versions'
fi

section 'Local SHA256 summary'
for platform in mac linux windows; do
  binary_path="$(binary_for "$platform")"
  if [[ ! -f "$binary_path" ]]; then
    continue
  fi

  if sha_value="$(sha256_of "$binary_path")"; then
    set_platform_value "$platform" sha "$sha_value"
    pass "$platform binary sha256: $sha_value"
  else
    warn "$platform binary sha256 could not be computed (missing shasum/sha256sum)"
  fi
done

section 'Optional checksum manifest'
if [[ -f vendor/checksums.sha256 ]]; then
  if command -v shasum >/dev/null 2>&1; then
    if shasum -a 256 -c vendor/checksums.sha256; then
      pass 'vendor/checksums.sha256 verification passed via shasum -a 256 -c'
    else
      fail 'vendor/checksums.sha256 verification failed'
    fi
  elif command -v sha256sum >/dev/null 2>&1; then
    warn 'shasum not found; falling back to sha256sum -c for vendor/checksums.sha256'
    if sha256sum -c vendor/checksums.sha256; then
      pass 'vendor/checksums.sha256 verification passed via sha256sum -c'
    else
      fail 'vendor/checksums.sha256 verification failed'
    fi
  else
    fail 'vendor/checksums.sha256 exists but neither shasum nor sha256sum is available'
  fi
else
  warn 'vendor/checksums.sha256 not found; checksum manifest verification skipped'
fi

section 'Summary report'
printf '%-10s %-10s %-10s %-12s %-64s\n' 'Platform' 'Version' 'Arch' 'Source' 'Local Binary SHA256'
printf '%-10s %-10s %-10s %-12s %-64s\n' '--------' '-------' '----' '------' '-------------------'
for platform in mac linux windows; do
  version="$(get_platform_value "$platform" version)"
  arch="$(get_platform_value "$platform" arch)"
  source="$(get_platform_value "$platform" source)"
  sha_value="$(get_platform_value "$platform" sha)"
  printf '%-10s %-10s %-10s %-12s %-64s\n' \
    "$platform" \
    "${version:-unknown}" \
    "${arch:-unknown}" \
    "${source:-unknown}" \
    "${sha_value:-n/a}"
done

printf '\nPASS=%s WARN=%s FAIL=%s\n' "$pass_count" "$warn_count" "$fail_count"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
