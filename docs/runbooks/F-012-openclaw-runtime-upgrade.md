# F-012: OpenClaw Runtime Upgrade to v2026.3.23

**Feature ID**: F-012
**Priority**: P0 (Security)
**Category**: Maintenance
**Date**: 2026-03-25

## Overview

Upgrade OpenClaw runtime from v2026.3.7/3.12 to v2026.3.23 across all three vendor platforms (Mac/Windows/Linux), addressing 20+ CVE fixes and 2 breaking changes.

## Prerequisites

- Access to Mac/Windows/Linux environments for vendor upgrades
- Git branch: `010-openclaw-runtime-upgrade`

## Upgrade Steps

### 1. Mac Vendor Upgrade

```bash
cd /path/to/opensparrow
export PATH="$PWD/vendor/mac-openclaw/bin:$PATH"
cd vendor/mac-openclaw
npm config set prefix "$PWD"
npm install -g openclaw@2026.3.23
```

Verify:
```bash
cat lib/node_modules/openclaw/package.json | grep version
# Expected: "version": "2026.3.23"
```

### 2. Linux Vendor Upgrade

```bash
cd vendor/linux-openclaw
npm config set prefix "$PWD"
npm install -g openclaw@2026.3.23
```

Verify:
```bash
cat lib/node_modules/openclaw/package.json | grep version
```

### 3. Windows Vendor Upgrade

```powershell
cd vendor\windows-openclaw
.\npm.cmd install openclaw@2026.3.23
```

Verify:
```powershell
node -e "console.log(require('./node_modules/openclaw/package.json').version)"
```

## Breaking Changes Addressed

### 1. gateway.auth.mode (v2026.3.7+)

**Change**: `ui/server.mjs` now explicitly sets `gateway.auth.mode: "token"` during installation.

**Location**: `ui/server.mjs` line ~1653

**Impact**: Prevents gateway startup failure when both token and password exist.

### 2. DEFAULT_MODEL Environment Variable

**Change**: Extracted hardcoded `gpt-4o-mini` to `DEFAULT_MODEL` constant.

**Files Modified**:
- `ui/server.mjs`: 4 locations (lines 1553, 1878, 1882, 1888)
- `platforms/windows/wrappers/one-click-deploy.ps1`: line 355

**Environment Variable**: `OPENCLAW_MODEL` (default: `openai/gpt-4o-mini`)

## Validation

### Syntax Checks
```bash
node --check ui/server.mjs
bash -n scripts/openclaw-usb/*.sh
bash -n deploy/docker/bin/*.sh
./longrun/workspaces/opensparrow-unified/init.sh
```

### Docker Config
```bash
docker compose -f deploy/docker/docker-compose.yml config
```

### Version Verification
```bash
# Mac
vendor/mac-openclaw/lib/node_modules/openclaw/package.json

# Linux
vendor/linux-openclaw/lib/node_modules/openclaw/package.json

# Windows
vendor/windows-openclaw/node_modules/openclaw/package.json
```

## Rollback Plan

### Code Rollback
```bash
git revert <commit-sha>
```

### Vendor Rollback

**Mac**:
```bash
cd vendor/mac-openclaw
npm config set prefix "$PWD"
npm install -g openclaw@2026.3.7
```

**Windows**:
```powershell
cd vendor\windows-openclaw
.\npm.cmd install openclaw@2026.3.12
```

**Linux**:
```bash
cd vendor/linux-openclaw
npm config set prefix "$PWD"
npm install -g openclaw@2026.3.12
```

## Known Issues

1. **Windows vendor upgrade requires Windows environment** - Cannot be performed on macOS/Linux
2. **ClawHub-first plugin install** - DingTalk plugin may need npm fallback (verified working)
3. **Vendor binaries not in git** - Upgrades must be performed manually on each platform

## Security Fixes Included

- GHSA-g353-mgv3-8pcj: Feishu webhook signature validation (High)
- GHSA-m69h-jm2f-2pv8: Feishu reaction group auth bypass (High)
- GHSA-5wcw-8jjv-m286: WebSocket cross-site hijacking (Critical)
- GHSA-4jpw-hj22-2xmc: Pairing device token privilege escalation (Critical)
- GHSA-99qw-6mr3-36qr: Workspace plugin auto-load security risk (High)
- 15+ additional CVE fixes

## References

- Spec: `specs/010-openclaw-runtime-upgrade/spec.md`
- Plan: `specs/010-openclaw-runtime-upgrade/plan.md`
- Tasks: `specs/010-openclaw-runtime-upgrade/tasks.md`
- Research: `research/openclaw-version-diff-report-20260324.md`
