#!/usr/bin/env bash
# =============================================================================
# build-usb-pack.sh — Build the OpenSparrow USB deliverable pack
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

    # a. VERSION and README.md → staging root
    # README.md may be overwritten later with a packaged release-facing version.
    log_info "Copying VERSION and README.md"
    cp "${PROJECT_ROOT}/VERSION"    "${STAGING_DIR}/VERSION"
    cp "${PROJECT_ROOT}/README.md"  "${STAGING_DIR}/README.md"

    # b. ui/ → ui/  (exclude node_modules)
    log_info "Copying ui/"
    rsyncp "${PROJECT_ROOT}/ui" "${STAGING_DIR}/ui" \
        --exclude='node_modules' \
        --exclude='.DS_Store'

    # c. docs/usb-pack/ → docs/
    log_info "Copying docs/usb-pack/ → docs/"
    rsyncp "${PROJECT_ROOT}/docs/usb-pack" "${STAGING_DIR}/docs"

    if [[ -f "${PROJECT_ROOT}/docs/release-checklist.md" ]]; then
        log_info "Copying docs/release-checklist.md → docs/release-checklist.md"
        cp "${PROJECT_ROOT}/docs/release-checklist.md" "${STAGING_DIR}/docs/release-checklist.md"
    fi

    # d. docs/runbooks/ → runbooks/
    log_info "Copying docs/runbooks/ → runbooks/"
    if [[ -d "${PROJECT_ROOT}/docs/runbooks" ]]; then
        rsyncp "${PROJECT_ROOT}/docs/runbooks" "${STAGING_DIR}/runbooks"
    else
        log_warn "docs/runbooks/ not found — skipping"
    fi

    # e. scripts/openclaw-usb/ → scripts/openclaw-usb/
    log_info "Copying scripts/openclaw-usb/"
    rsyncp "${PROJECT_ROOT}/scripts/openclaw-usb" "${STAGING_DIR}/scripts/openclaw-usb"

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

    # Use --info=progress2 for a single-line progress indicator; fall back
    # gracefully if this rsync version doesn't support it.
    if rsync --info=progress2 --version &>/dev/null 2>&1 && \
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
    local npm_bin
    if ! npm_bin="$(resolve_npm_bin)"; then
        log_error "npm not found; cannot bundle offline channel plugins"
        exit 1
    fi

    mkdir -p "$plugins_dst"
    rm -f "$plugins_dst"/openclaw-china-channels-*.tgz "$plugins_dst"/sunnoy-wecom-*.tgz

    (
        cd "$plugins_dst"
        "$npm_bin" pack @openclaw-china/channels >/dev/null
        "$npm_bin" pack @sunnoy/wecom@3.0.0 >/dev/null
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
    else
        log_warn "vendor/mac-openclaw/ not found — skipping"
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
# Step: Generate README.txt quick-start guide at pack root
# ---------------------------------------------------------------------------
generate_readme_txt() {
    log_step "Generating README.txt"

    if [[ "$PLATFORM" == "mac" ]]; then
        cat > "${STAGING_DIR}/README.txt" << 'EOF'
========================================================================
  OpenSparrow — Mac UI-first Deployment Pack
  Version: __VERSION__
========================================================================

TONIGHT'S OFFICIAL SUPPORT SURFACE
  • Platform: macOS
  • Official first-click path: root "01-开始部署.command"
  • Supported channels tonight: Feishu / DingTalk
  • WeCom is NOT part of tonight's packaged support promise
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
  OpenSparrow — USB AI Bot Deployment Pack
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
# OpenSparrow Mac UI-first Deployment Pack

Version: `__VERSION__`

## Tonight's official support surface

- Platform: `macOS`
- Official first-click path: root `01-开始部署.command`
- Supported channels tonight: `飞书`、`钉钉`
- `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` are retained only as advanced compatibility / handoff surfaces
- WeCom is not part of tonight's packaged support promise
- Companion is not part of tonight's official support surface

## Start here

1. Open the package root.
2. Double-click `01-开始部署.command`.
3. Complete installation in the browser wizard.
4. Finish operations in Dashboard.

## Important boundary notes

- Do not treat Windows paths as part of tonight's package surface.
- Do not treat the advanced compatibility wrappers as the main install path.
- Do not treat WeCom as tonight-ready packaged support.

## Included docs

- `README.txt`
- `docs/INSTALL.md`
- `docs/SOP.md`
- `runbooks/F-005-ui-install-reset.md`
- `runbooks/release-process.md`
- `docs/release-checklist.md`
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
    echo -e "${_C_BOLD}║       OpenSparrow USB Pack — Built       ║${_C_RESET}"
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
    echo -e "${_C_BOLD}OpenSparrow USB Pack Builder${_C_RESET}"
    echo -e "Project root: ${PROJECT_ROOT}"
    echo ""

    parse_args "$@"

    log_info "Platform: ${_C_BOLD}${PLATFORM}${_C_RESET}"
    log_info "Skip skills: ${_C_BOLD}${SKIP_SKILLS}${_C_RESET}"

    read_version
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
    generate_readme_txt
    generate_readme_md

    # All done — disable the cleanup trap (success path)
    trap - EXIT

    print_summary
    log_done "USB pack built successfully"
}

main "$@"
