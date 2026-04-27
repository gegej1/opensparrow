#!/usr/bin/env bash
# =============================================================================
# build-usb-pack.sh — Build the GTClaw macOS/USB deliverable pack
#
# Usage:
#   scripts/build-usb-pack.sh [--platform mac|windows|all] [--skip-skills]
#
# Output:
#   dist/usb-pack/opensparrow-<version>/
#
# Flags:
#   --platform mac|windows|all   Which platform assets to bundle (default: all)
#   --skip-skills                Skip copying the 424 MB skills/My_Skills/ tree
#                                (useful for CI / fast dev iteration)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers — only emit escape codes when stdout is a real terminal
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    _C_RESET='\033[0m'
    _C_CYAN='\033[0;36m'
    _C_GREEN='\033[0;32m'
    _C_YELLOW='\033[1;33m'
    _C_RED='\033[0;31m'
    _C_BOLD='\033[1m'
else
    _C_RESET='' _C_CYAN='' _C_GREEN='' _C_YELLOW='' _C_RED='' _C_BOLD=''
fi

log_info()  { echo -e "${_C_CYAN}[INFO]${_C_RESET}  $*"; }
log_warn()  { echo -e "${_C_YELLOW}[WARN]${_C_RESET}  $*"; }
log_error() { echo -e "${_C_RED}[ERROR]${_C_RESET} $*" >&2; }
log_done()  { echo -e "${_C_GREEN}[DONE]${_C_RESET}  $*"; }
log_step()  { echo -e "${_C_BOLD}───────────────────────────────────────────${_C_RESET}"; echo -e "${_C_BOLD}▶  $*${_C_RESET}"; }

# ---------------------------------------------------------------------------
# Resolve project root (this script lives at <root>/scripts/build-usb-pack.sh)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
PLATFORM="all"
SKIP_SKILLS=false
STAGING_DIR=""   # set after version is read
MAC_RUNTIME_LIB_VERSION=""
MAC_RUNTIME_BIN_VERSION=""
MAC_RUNTIME_NODE_ARCHITECTURES=""
readonly REQUIRED_PACKAGED_RUNTIME_FILES=(
    'ui/server.mjs'
    'ui/install-helpers.mjs'
    'ui/lib/model-routing-config.mjs'
    'ui/lib/openai-provider.mjs'
    'scripts/model-routing/lib/custom-plugin-routing.mjs'
)

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --platform)
                shift
                PLATFORM="${1:-}"
                if [[ ! "$PLATFORM" =~ ^(mac|windows|all)$ ]]; then
                    log_error "--platform must be one of: mac, windows, all (got: '$PLATFORM')"
                    exit 1
                fi
                ;;
            --skip-skills)
                SKIP_SKILLS=true
                ;;
            -h|--help)
                grep '^# ' "$0" | head -15 | sed 's/^# //'
                exit 0
                ;;
            *)
                log_error "Unknown argument: $1"
                echo "Usage: $0 [--platform mac|windows|all] [--skip-skills]"
                exit 1
                ;;
        esac
        shift
    done
}

# ---------------------------------------------------------------------------
# Cleanup trap — remove incomplete staging dir on unexpected failure
# ---------------------------------------------------------------------------
cleanup_on_error() {
    local exit_code=$?
    if [[ $exit_code -ne 0 && -n "$STAGING_DIR" && -d "$STAGING_DIR" ]]; then
        log_warn "Build failed (exit $exit_code) — removing incomplete staging dir: $STAGING_DIR"
        rm -rf "$STAGING_DIR"
    fi
}
trap cleanup_on_error EXIT

# ---------------------------------------------------------------------------
# Step: Read version
# ---------------------------------------------------------------------------
read_version() {
    local version_file="${PROJECT_ROOT}/VERSION"
    if [[ ! -f "$version_file" ]]; then
        log_error "VERSION file not found at: $version_file"
        exit 1
    fi
    VERSION="$(tr -d '[:space:]' < "$version_file")"
    if [[ -z "$VERSION" ]]; then
        log_error "VERSION file is empty"
        exit 1
    fi
    log_info "Version: ${_C_BOLD}${VERSION}${_C_RESET}"
}

read_package_version() {
    local package_json="$1"
    if [[ ! -f "$package_json" ]]; then
        return 1
    fi
    sed -nE 's/.*"version": "([^"]+)".*/\1/p' "$package_json" | head -n 1
}

read_mach_binary_description() {
    local binary_path="$1"
    if ! command -v file >/dev/null 2>&1; then
        log_error "mac runtime architecture guard failed: 'file' command is unavailable"
        exit 1
    fi
    file "$binary_path"
}

extract_mach_architectures() {
    local file_output="$1"
    printf '%s\n' "$file_output" | grep -Eo 'arm64|x86_64' | awk '!seen[$0]++' | paste -sd, -
}

assert_mac_runtime_version_truth() {
    if [[ "$PLATFORM" == "windows" ]]; then
        return 0
    fi

    local lib_pkg="${PROJECT_ROOT}/vendor/mac-openclaw/lib/node_modules/openclaw/package.json"
    local bin_pkg="${PROJECT_ROOT}/vendor/mac-openclaw/bin/node_modules/openclaw/package.json"
    local lib_version=""
    local bin_version=""

    [[ -f "$lib_pkg" ]] && lib_version="$(read_package_version "$lib_pkg")"
    [[ -f "$bin_pkg" ]] && bin_version="$(read_package_version "$bin_pkg")"

    if [[ -z "$lib_version" ]]; then
        log_error "mac runtime truth guard failed: missing canonical lib runtime package at ${lib_pkg}"
        exit 1
    fi

    if [[ -z "$bin_version" ]]; then
        log_error "mac runtime truth guard failed: missing bin runtime package at ${bin_pkg}"
        exit 1
    fi

    if [[ "$lib_version" != "$bin_version" ]]; then
        log_error "mac runtime version drift guard failed: lib=${lib_version}, bin=${bin_version}"
        log_error "Fix bundled runtime truth before packaging; do not ship split-brain mac artifacts."
        exit 1
    fi

    MAC_RUNTIME_LIB_VERSION="$lib_version"
    MAC_RUNTIME_BIN_VERSION="$bin_version"
    log_info "mac runtime truth: lib/node_modules/openclaw=${lib_version}"
    log_info "mac runtime truth: bin/node_modules/openclaw=${bin_version}"
}

assert_mac_runtime_arch_truth() {
    if [[ "$PLATFORM" == "windows" ]]; then
        return 0
    fi

    local node_bin="${PROJECT_ROOT}/vendor/mac-openclaw/bin/node"
    local host_arch
    local expected_slice
    local file_output
    local arch_list

    if [[ ! -x "$node_bin" ]]; then
        log_error "mac runtime architecture guard failed: missing executable runtime node at ${node_bin}"
        exit 1
    fi

    host_arch="$(uname -m)"
    case "$host_arch" in
        arm64|x86_64)
            expected_slice="$host_arch"
            ;;
        *)
            log_error "mac runtime architecture guard failed: unsupported host arch '${host_arch}'"
            exit 1
            ;;
    esac

    file_output="$(read_mach_binary_description "$node_bin")"
    if [[ "$file_output" != *"Mach-O"* ]]; then
        log_error "mac runtime architecture guard failed: expected a Mach-O runtime binary at ${node_bin}"
        log_error "actual: ${file_output}"
        exit 1
    fi

    if [[ "$file_output" != *"$expected_slice"* ]]; then
        log_error "mac runtime architecture guard failed: expected runtime slice '${expected_slice}' in ${node_bin}"
        log_error "actual: ${file_output}"
        exit 1
    fi

    arch_list="$(extract_mach_architectures "$file_output")"
    if [[ -z "$arch_list" ]]; then
        log_error "mac runtime architecture guard failed: unable to parse runtime node architectures"
        log_error "actual: ${file_output}"
        exit 1
    fi

    MAC_RUNTIME_NODE_ARCHITECTURES="$arch_list"
    log_info "mac runtime node: ${file_output}"
}

require_packaged_file() {
    local relative_path="$1"
    if [[ ! -f "${PROJECT_ROOT}/${relative_path}" ]]; then
        log_error "Required packaged runtime dependency missing: ${relative_path}"
        exit 1
    fi
}

require_staged_packaged_file() {
    local relative_path="$1"
    if [[ ! -f "${STAGING_DIR}/${relative_path}" ]]; then
        log_error "Required packaged runtime dependency missing from staged pack: ${relative_path}"
        exit 1
    fi
}

verify_required_packaged_source_files() {
    local relative_path
    for relative_path in "${REQUIRED_PACKAGED_RUNTIME_FILES[@]}"; do
        require_packaged_file "$relative_path"
    done
}

verify_required_staged_packaged_source_files() {
    local relative_path
    for relative_path in "${REQUIRED_PACKAGED_RUNTIME_FILES[@]}"; do
        require_staged_packaged_file "$relative_path"
    done
}

write_mac_compatibility_handoff_launcher() {
    mkdir -p "${STAGING_DIR}/mac"
    cat > "${STAGING_DIR}/mac/01-开始部署.command" <<'EOF'
#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
root_launcher="$script_dir/../01-开始部署.command"

if [[ ! -f "$root_launcher" ]]; then
  echo "错误：mac/01-开始部署.command 是 compatibility / handoff 入口，但找不到交付包根目录的 01-开始部署.command。" >&2
  echo "请从包含 01-开始部署.command 的交付包根目录启动，或重新生成完整交付包。" >&2
  read -r -p "按 Enter 关闭..." _ || true
  exit 1
fi

printf '提示：mac/01-开始部署.command 仅作为 compatibility / handoff 入口。\n'
printf '正式 packaged first-click path 是交付包根目录的 01-开始部署.command。\n'
printf '即将转交：%s\n' "$root_launcher"

exec "$root_launcher" "$@"
EOF
}

emit_mac_runtime_truth_manifest() {
    if [[ "$PLATFORM" == "windows" ]]; then
        return 0
    fi

    local manifest_path="${STAGING_DIR}/vendor/mac-openclaw/RUNTIME_TRUTH.json"
    local arch_json=""
    local arch_item

    IFS=',' read -r -a _arch_items <<< "$MAC_RUNTIME_NODE_ARCHITECTURES"
    for arch_item in "${_arch_items[@]}"; do
        [[ -n "$arch_json" ]] && arch_json+=", "
        arch_json+="\"${arch_item}\""
    done

    mkdir -p "$(dirname "$manifest_path")"
    cat > "$manifest_path" <<EOF
{
  "platform": "mac",
  "canonicalRuntimeSource": "lib",
  "libOpenclawVersion": "${MAC_RUNTIME_LIB_VERSION}",
  "binOpenclawVersion": "${MAC_RUNTIME_BIN_VERSION}",
  "nodeBinaryArchitectures": [${arch_json}],
  "versionConsistent": true
}
EOF
    require_staged_packaged_file 'vendor/mac-openclaw/RUNTIME_TRUTH.json'
    log_info "Emitted mac runtime truth manifest: vendor/mac-openclaw/RUNTIME_TRUTH.json"
}

# ---------------------------------------------------------------------------
# Step: Prepare staging directory
# ---------------------------------------------------------------------------
prepare_staging() {
    local dist_root="${PROJECT_ROOT}/dist/usb-pack"
    STAGING_DIR="${dist_root}/opensparrow-${VERSION}"

    log_info "Staging dir: ${STAGING_DIR}"

    # Clean previous build if it exists
    if [[ -d "$STAGING_DIR" ]]; then
        log_warn "Removing previous staging dir…"
        rm -rf "$STAGING_DIR"
    fi

    mkdir -p "$STAGING_DIR"
    log_done "Staging directory ready"
}

# ---------------------------------------------------------------------------
# Helper: rsync wrapper with consistent flags
# Arg1 = source, Arg2 = destination, rest = extra rsync flags
# ---------------------------------------------------------------------------
rsyncp() {
    local src="$1"; shift
    local dst="$1"; shift
    mkdir -p "$dst"
    rsync -a --delete "$@" "${src}/" "${dst}/"
}

# ---------------------------------------------------------------------------
# Step: Copy common files (platform-independent)
# ---------------------------------------------------------------------------
copy_common() {
    log_step "Copying common files"
    verify_required_packaged_source_files

    # a. VERSION and README.md → staging root
    # README.md may be overwritten later with a packaged release-facing version.
    log_info "Copying VERSION and README.md"
    cp "${PROJECT_ROOT}/VERSION"    "${STAGING_DIR}/VERSION"
    cp "${PROJECT_ROOT}/README.md"  "${STAGING_DIR}/README.md"

    # b. ui/ → ui/  (exclude dev/test-only files)
    log_info "Copying ui/"
    rsyncp "${PROJECT_ROOT}/ui" "${STAGING_DIR}/ui" \
        --exclude='node_modules' \
        --exclude='tests' \
        --exclude='*.test.mjs' \
        --exclude='.DS_Store'

    # c. release-facing docs only
    log_info "Copying release-facing docs"
    mkdir -p "${STAGING_DIR}/docs"
    for doc_file in INSTALL.md SOP.md; do
        if [[ -f "${PROJECT_ROOT}/docs/usb-pack/${doc_file}" ]]; then
            cp "${PROJECT_ROOT}/docs/usb-pack/${doc_file}" "${STAGING_DIR}/docs/${doc_file}"
        else
            log_warn "docs/usb-pack/${doc_file} not found — skipping"
        fi
    done

    # d. release-facing runbook only
    log_info "Copying release-facing runbook"
    mkdir -p "${STAGING_DIR}/runbooks"
    if [[ -f "${PROJECT_ROOT}/docs/runbooks/F-005-ui-install-reset.md" ]]; then
        cp "${PROJECT_ROOT}/docs/runbooks/F-005-ui-install-reset.md" "${STAGING_DIR}/runbooks/F-005-ui-install-reset.md"
    else
        log_warn "docs/runbooks/F-005-ui-install-reset.md not found — skipping"
    fi

    # e. scripts/openclaw-usb/ → scripts/openclaw-usb/
    log_info "Copying scripts/openclaw-usb/"
    rsyncp "${PROJECT_ROOT}/scripts/openclaw-usb" "${STAGING_DIR}/scripts/openclaw-usb"

    # e2. scripts/model-routing/ → scripts/model-routing/
    # F-034 live router runtime imports this tree at package runtime.
    if [[ -d "${PROJECT_ROOT}/scripts/model-routing" ]]; then
        log_info "Copying scripts/model-routing/"
        rsyncp "${PROJECT_ROOT}/scripts/model-routing" "${STAGING_DIR}/scripts/model-routing" \
            --exclude='.DS_Store'
    else
        log_warn "scripts/model-routing/ not found — smart routing runtime may be incomplete"
    fi

    # f. skills/openclaw-local-feishu-usb/ → skills/openclaw-local-feishu-usb/
    log_info "Copying skills/openclaw-local-feishu-usb/"
    rsyncp "${PROJECT_ROOT}/skills/openclaw-local-feishu-usb" \
           "${STAGING_DIR}/skills/openclaw-local-feishu-usb"

    # g. skills/README.md → skills/README.md
    log_info "Copying skills/README.md"
    mkdir -p "${STAGING_DIR}/skills"
    cp "${PROJECT_ROOT}/skills/README.md" "${STAGING_DIR}/skills/README.md"

    # h. repo-root superpowers/ → skills/superpowers/
    local superpowers_src="${PROJECT_ROOT}/superpowers"
    if [[ -d "$superpowers_src" ]]; then
        log_info "Copying superpowers/ → skills/superpowers/"
        rsyncp "$superpowers_src" "${STAGING_DIR}/skills/superpowers"
    else
        log_warn "superpowers/ not found — skipping"
    fi

    verify_required_staged_packaged_source_files
    log_done "Common files copied"
}

# ---------------------------------------------------------------------------
# Step: Copy skills/My_Skills (optional — 424 MB, 60k+ files)
# ---------------------------------------------------------------------------
copy_skills() {
    log_step "Copying AI Skills (My_Skills)"

    local skills_src="${PROJECT_ROOT}/skills/My_Skills"
    local skills_dst="${STAGING_DIR}/skills/My_Skills"

    if $SKIP_SKILLS; then
        log_warn "--skip-skills flag set — skipping skills/My_Skills/ copy"
        return
    fi

    if [[ ! -d "$skills_src" ]]; then
        log_warn "skills/My_Skills/ not found at ${skills_src} — skipping"
        return
    fi

    log_info "Syncing 424 MB / 60k+ files — this may take a minute…"
    mkdir -p "$skills_dst"

    # In non-interactive runs, keep output quiet so automation/log review stays usable.
    if [[ ! -t 1 ]]; then
        rsync -a --delete \
            --exclude='.DS_Store' \
            "${skills_src}/" "${skills_dst}/"
    # Use --info=progress2 for a single-line progress indicator; fall back
    # gracefully if this rsync version doesn't support it.
    elif rsync --info=progress2 --version &>/dev/null 2>&1 && \
         rsync --info=progress2 -a --dry-run "${skills_src}/" "${skills_dst}/" &>/dev/null 2>&1; then
        rsync -a --delete \
            --info=progress2 \
            --exclude='.DS_Store' \
            "${skills_src}/" "${skills_dst}/"
    else
        rsync -a --delete \
            --progress \
            --exclude='.DS_Store' \
            "${skills_src}/" "${skills_dst}/"
    fi

    log_done "skills/My_Skills copied"
}

# ---------------------------------------------------------------------------
# Step: Bundle plugin archives for offline / rate-limit-safe install
# ---------------------------------------------------------------------------
resolve_npm_bin() {
    if command -v npm >/dev/null 2>&1; then
        command -v npm
        return 0
    fi
    local candidates=(
        "${PROJECT_ROOT}/vendor/mac-openclaw/bin/npm"
        "${PROJECT_ROOT}/vendor/linux-openclaw/bin/npm"
    )
    local candidate
    for candidate in "${candidates[@]}"; do
        if [[ -x "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done
    return 1
}

bundle_plugin_archives() {
    log_step "Bundling offline channel plugin archives"

    local plugins_dst="${STAGING_DIR}/plugins"
    local wecom_version="2026.4.22"
    local npm_bin
    if ! npm_bin="$(resolve_npm_bin)"; then
        log_error "npm not found; cannot bundle offline channel plugins"
        exit 1
    fi

    mkdir -p "$plugins_dst"
    rm -f "$plugins_dst"/openclaw-china-channels-*.tgz "$plugins_dst"/wecom-wecom-openclaw-plugin-*.tgz

    (
        cd "$plugins_dst"
        "$npm_bin" pack @openclaw-china/channels >/dev/null
        "$npm_bin" pack @wecom/wecom-openclaw-plugin@${wecom_version} >/dev/null
    )

    log_done "Offline plugin archives bundled"
}

# ---------------------------------------------------------------------------
# Step: Copy Mac platform assets
# ---------------------------------------------------------------------------
copy_mac() {
    log_step "Copying Mac platform assets"

    # vendor/mac-openclaw/ → vendor/mac-openclaw/
    local vendor_src="${PROJECT_ROOT}/vendor/mac-openclaw"
    if [[ -d "$vendor_src" ]]; then
        log_info "Copying vendor/mac-openclaw/"
        rsyncp "$vendor_src" "${STAGING_DIR}/vendor/mac-openclaw"
        emit_mac_runtime_truth_manifest
    else
        log_error "vendor/mac-openclaw/ not found — cannot build packaged mac artifact"
        exit 1
    fi

    # platforms/mac/wrappers/* → mac/
    local wrappers_src="${PROJECT_ROOT}/platforms/mac/wrappers"
    if [[ -d "$wrappers_src" ]]; then
        log_info "Copying mac wrappers → mac/"
        mkdir -p "${STAGING_DIR}/mac"
        # Copy all files (not a recursive directory sync — flat glob)
        for f in "${wrappers_src}"/*; do
            [[ -f "$f" ]] && cp "$f" "${STAGING_DIR}/mac/"
        done
    else
        log_warn "platforms/mac/wrappers/ not found — skipping"
    fi

    # j. Copy 01-开始部署.command to pack ROOT as primary double-click entry point
    local main_entry="${PROJECT_ROOT}/platforms/mac/wrappers/01-开始部署.command"
    if [[ -f "$main_entry" ]]; then
        log_info "Placing 01-开始部署.command at pack root (main entry point)"
        cp "$main_entry" "${STAGING_DIR}/01-开始部署.command"
        log_info "Generating mac/01-开始部署.command compatibility handoff"
        write_mac_compatibility_handoff_launcher
    else
        log_warn "01-开始部署.command not found — skipping root copy"
    fi

    log_done "Mac assets copied"
}

# ---------------------------------------------------------------------------
# Step: Copy Windows platform assets
# ---------------------------------------------------------------------------
copy_windows() {
    log_step "Copying Windows platform assets"

    # vendor/windows-openclaw/ → vendor/windows-openclaw/
    local vendor_src="${PROJECT_ROOT}/vendor/windows-openclaw"
    if [[ -d "$vendor_src" ]]; then
        log_info "Copying vendor/windows-openclaw/"
        rsyncp "$vendor_src" "${STAGING_DIR}/vendor/windows-openclaw"
    else
        log_warn "vendor/windows-openclaw/ not found — skipping"
    fi

    # platforms/windows/wrappers/* → windows/
    local wrappers_src="${PROJECT_ROOT}/platforms/windows/wrappers"
    if [[ -d "$wrappers_src" ]]; then
        log_info "Copying windows wrappers → windows/"
        mkdir -p "${STAGING_DIR}/windows"
        for f in "${wrappers_src}"/*; do
            [[ -f "$f" ]] && cp "$f" "${STAGING_DIR}/windows/"
        done

        # i. one-click-deploy.* → pack root (primary double-click entry for Windows)
        for ext in cmd ps1; do
            local entry="${wrappers_src}/one-click-deploy.${ext}"
            if [[ -f "$entry" ]]; then
                log_info "Placing one-click-deploy.${ext} at pack root"
                cp "$entry" "${STAGING_DIR}/one-click-deploy.${ext}"
            fi
        done
    else
        log_warn "platforms/windows/wrappers/ not found — skipping"
    fi

    log_done "Windows assets copied"
}

# ---------------------------------------------------------------------------
# Step: Fix permissions — ensure all shell and command files are executable
# ---------------------------------------------------------------------------
fix_permissions() {
    log_step "Fixing file permissions"

    # Find all .command and .sh files and chmod +x
    while IFS= read -r -d '' file; do
        chmod +x "$file"
        log_info "chmod +x $(basename "$file")"
    done < <(find "$STAGING_DIR" \( -name '*.command' -o -name '*.sh' \) -print0)

    log_done "Permissions set"
}

# ---------------------------------------------------------------------------
# Step: Strip runtime state and local machine residue from the pack
# ---------------------------------------------------------------------------
strip_runtime_state() {
    log_step "Stripping runtime state and local residue"

    find "$STAGING_DIR" -type f \
        \( -name 'auth-profiles.json' \
        -o -name 'openclaw.json' \
        -o -name 'ui-meta.json' \
        -o -name 'openclaw-ui.pid' \
        -o -name 'openclaw-gateway.pid' \
        -o -name '.DS_Store' \) \
        -print -delete | while IFS= read -r removed; do
            log_info "Removed state file: ${removed#${STAGING_DIR}/}"
        done

    find "$STAGING_DIR" -type d \
        \( -name 'test-results' \
        -o -name '.pytest_cache' \) \
        -print0 | while IFS= read -r -d '' removed_dir; do
            rm -rf "$removed_dir"
            log_info "Removed state dir: ${removed_dir#${STAGING_DIR}/}"
        done

    find "$STAGING_DIR" -type d \
        \( -name '.gtclaw-state' \
        -o -name '.openclaw' \
        -o -name '.openclaw-*' \) \
        -print0 | while IFS= read -r -d '' removed_dir; do
            rm -rf "$removed_dir"
            log_info "Removed package-local state dir: ${removed_dir#${STAGING_DIR}/}"
        done

    log_done "Runtime residue stripped"
}

# ---------------------------------------------------------------------------
# Step: Generate README.txt quick-start guide at pack root
# ---------------------------------------------------------------------------
generate_readme_txt() {
    log_step "Generating README.txt"

    if [[ "$PLATFORM" == "mac" ]]; then
        cat > "${STAGING_DIR}/README.txt" << 'EOF'
========================================================================
  GTClaw — macOS Release Pack
  Version: __VERSION__
========================================================================

TONIGHT'S OFFICIAL SUPPORT SURFACE
  • Platform: macOS
  • Official first-click path: root "01-开始部署.command"
  • Supported channels tonight: Feishu / DingTalk / WeCom
  • Dashboard includes GTClaw API configuration + model smart routing
  • WeCom packaged route uses the bundled official plugin archive
  • Companion is NOT part of tonight's official support surface

QUICK START — macOS
  1. Open the package root.
  2. Double-click "01-开始部署.command".
  3. If macOS shows a security warning, open it from:
       System Settings → Privacy & Security → Open Anyway
  4. Follow the UI installer in your browser.
  5. Finish setup in Dashboard.

ADVANCED COMPATIBILITY / HANDOFF
  • mac/run-openclaw-usb.command
  • mac/harden-openclaw-usb.command
  These files remain shipped, but they are NOT the primary install path.
  They must hand off back to root "01-开始部署.command".

DOCUMENTATION
  • README.md
  • docs/INSTALL.md
  • docs/SOP.md
  • runbooks/F-005-ui-install-reset.md

SUPPORT BOUNDARY
  • Do not treat Windows paths as part of tonight's package surface.
  • Do not treat WeCom as tonight-ready packaged support.

========================================================================
EOF
    else
        cat > "${STAGING_DIR}/README.txt" << 'EOF'
========================================================================
  GTClaw — USB AI Bot Deployment Pack
  Version: __VERSION__
========================================================================

SUPPORTED CHANNELS
  • Feishu (飞书)
  • DingTalk (钉钉)
  • WeCom (企业微信)

QUICK START — macOS
  1. Double-click "01-开始部署.command" at the root of this drive.
  2. If macOS shows a security warning, go to:
       System Preferences → Privacy & Security → Open Anyway
  3. Follow the on-screen installer prompts.
  4. When complete, your bot endpoint will be printed in the terminal.

QUICK START — Windows
  1. Double-click "one-click-deploy.cmd" at the root of this drive.
     (Or right-click "one-click-deploy.ps1" → Run with PowerShell)
  2. If Windows Defender SmartScreen appears, click "More info" →
     "Run anyway".
  3. Follow the on-screen installer prompts.

WHAT GETS INSTALLED
  • OpenClaw runtime (isolated, no system-level changes)
  • Bot bridge for Feishu / DingTalk / WeCom
  • 60,000+ AI Skills covering:
      Business · Education · Finance · Government · Healthcare · Utilities

HARDENING (OPTIONAL)
  macOS:   double-click  mac/harden-openclaw-usb.command
  Windows: run           windows/harden-openclaw-usb.cmd

UNINSTALL
  Delete the openclaw-local directory created during installation.
  No registry keys or system files are modified.

DOCUMENTATION
  Full install guide:  docs/INSTALL.md
  Architecture notes:  docs/solution-architecture.md
  Operator runbooks:   runbooks/

SUPPORT
  Please refer to the runbooks/ directory for troubleshooting guides.

========================================================================
EOF
    fi

    # Substitute the actual version string into the file
    # (heredoc variable expansion is disabled above to avoid shell interpretation)
    if command -v sed &>/dev/null; then
        sed -i.bak "s/__VERSION__/${VERSION}/g" "${STAGING_DIR}/README.txt"
        rm -f "${STAGING_DIR}/README.txt.bak"
    fi

    log_done "README.txt written"
}

# ---------------------------------------------------------------------------
# Step: Generate README.md for packaged release-facing surface
# ---------------------------------------------------------------------------
generate_readme_md() {
    if [[ "$PLATFORM" != "mac" ]]; then
        return
    fi

    log_step "Generating packaged README.md"

    cat > "${STAGING_DIR}/README.md" << 'EOF'
# GTClaw macOS Release Pack

Version: `__VERSION__`

## Tonight's official support surface

- Platform: `macOS`
- Official first-click path: root `01-开始部署.command`
- Supported channels tonight: `飞书`、`钉钉`、`企业微信`
- Dashboard includes GTClaw API configuration and model smart routing
- `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` are retained only as advanced compatibility / handoff surfaces
- WeCom packaged route uses the bundled official plugin archive
- Companion is not part of tonight's official support surface

## Start here

1. Open the package root.
2. Double-click `01-开始部署.command`.
3. Complete installation in the browser wizard.
4. Finish operations in Dashboard.

## Important boundary notes

- Do not treat Windows paths as part of tonight's package surface.
- Do not treat the advanced compatibility wrappers as the main install path.
- Do not bypass the UI-first install flow when configuring WeCom.

## Included docs

- `README.txt`
- `docs/INSTALL.md`
- `docs/SOP.md`
- `runbooks/F-005-ui-install-reset.md`
EOF

    if command -v sed &>/dev/null; then
        sed -i.bak "s/__VERSION__/${VERSION}/g" "${STAGING_DIR}/README.md"
        rm -f "${STAGING_DIR}/README.md.bak"
    fi

    log_done "Packaged README.md written"
}

# ---------------------------------------------------------------------------
# Step: Count skills and compute total pack size for the summary
# ---------------------------------------------------------------------------
print_summary() {
    log_step "Build Summary"

    local skill_count=0
    local skills_path="${STAGING_DIR}/skills/My_Skills"
    if [[ -d "$skills_path" ]]; then
        # Count regular files only (avoid counting directories)
        skill_count=$(find "$skills_path" -type f | wc -l | tr -d ' ')
    fi

    # Compute total pack size (du -sh: human-readable)
    local total_size
    total_size=$(du -sh "$STAGING_DIR" 2>/dev/null | awk '{print $1}')

    echo ""
    echo -e "${_C_BOLD}╔══════════════════════════════════════════╗${_C_RESET}"
    echo -e "${_C_BOLD}║          GTClaw Pack — Built            ║${_C_RESET}"
    echo -e "${_C_BOLD}╠══════════════════════════════════════════╣${_C_RESET}"
    printf "${_C_BOLD}║${_C_RESET}  %-10s  %-30s${_C_BOLD}║${_C_RESET}\n" "Platform:"  "$PLATFORM"
    printf "${_C_BOLD}║${_C_RESET}  %-10s  %-30s${_C_BOLD}║${_C_RESET}\n" "Version:"   "$VERSION"
    printf "${_C_BOLD}║${_C_RESET}  %-10s  %-30s${_C_BOLD}║${_C_RESET}\n" "Skills:"    "${skill_count} files"
    printf "${_C_BOLD}║${_C_RESET}  %-10s  %-30s${_C_BOLD}║${_C_RESET}\n" "Pack size:" "$total_size"
    echo -e "${_C_BOLD}╠══════════════════════════════════════════╣${_C_RESET}"
    echo -e "${_C_BOLD}║${_C_RESET}  Output: ${_C_GREEN}${STAGING_DIR}${_C_RESET}"
    echo -e "${_C_BOLD}╚══════════════════════════════════════════╝${_C_RESET}"
    echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo ""
    echo -e "${_C_BOLD}GTClaw Pack Builder${_C_RESET}"
    echo -e "Project root: ${PROJECT_ROOT}"
    echo ""

    parse_args "$@"

    log_info "Platform: ${_C_BOLD}${PLATFORM}${_C_RESET}"
    log_info "Skip skills: ${_C_BOLD}${SKIP_SKILLS}${_C_RESET}"

    read_version
    assert_mac_runtime_version_truth
    assert_mac_runtime_arch_truth
    prepare_staging
    copy_common
    copy_skills
    bundle_plugin_archives

    case "$PLATFORM" in
        mac)
            copy_mac
            ;;
        windows)
            copy_windows
            ;;
        all)
            copy_mac
            copy_windows
            ;;
    esac

    fix_permissions
    strip_runtime_state
    generate_readme_txt
    generate_readme_md

    # All done — disable the cleanup trap (success path)
    trap - EXIT

    print_summary
    log_done "USB pack built successfully"
}

main "$@"
