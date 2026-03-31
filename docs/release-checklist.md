# OpenSparrow Release Checklist

> **Purpose**: Pre-release verification checklist to ensure every release is reliable.
> Run through ALL sections before tagging a release.

**Last Updated**: 2026-03-31
**Applicable From**: M2 milestone onward

---

## 1. Code Checks

### 1.1 Shell Script Syntax

```bash
# Validate all shell scripts (must exit 0 with no output)
bash -n scripts/openclaw-usb/install-local-feishu.sh
bash -n scripts/openclaw-usb/harden-local-feishu.sh
bash -n scripts/verify-vendor.sh
bash -n scripts/verify-legacy-freeze.sh
bash -n platforms/mac/wrappers/01-开始部署.command
bash -n longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
bash -n scripts/build-usb-pack.sh
```

- [ ] All `bash -n` checks pass with exit code 0

### 1.2 Node.js Syntax

```bash
node --check ui/server.mjs
```

- [ ] `node --check ui/server.mjs` passes

### 1.3 Docker Compose Validation

```bash
cd deploy/docker && docker compose config --quiet
```

- [ ] `docker compose config` passes with no errors

### 1.4 CI Pipeline

- [ ] GitHub Actions CI — all 4 jobs pass on latest commit:
  - [ ] Lint
  - [ ] Test
  - [ ] Build
  - [ ] Verify

---

## 2. Functional Verification

### 2.1 Mac USB Mode

```bash
# From USB pack or extracted dist/
double-click platforms/mac/wrappers/01-开始部署.command
# Or: bash platforms/mac/wrappers/01-开始部署.command
```

- [ ] Mac USB mode launches UI at `http://localhost:19000`
- [ ] `/setup` page renders correctly
- [ ] Installation wizard completes without errors (mock or real credentials)

### 2.2 Windows USB Mode

```powershell
# From USB pack or extracted dist/
.\platforms\windows\wrappers\one-click-deploy.ps1
```

- [ ] Windows USB mode launches UI at `http://localhost:19000`
- [ ] `/setup` page renders correctly
- [ ] Installation wizard completes without errors

### 2.3 Feishu Channel

- [ ] Feishu channel selectable in `/setup`
- [ ] App ID + App Secret fields validate correctly
- [ ] Installation with Feishu credentials succeeds
- [ ] Bot responds to group @mention (requires real credentials)
- [ ] Bot responds to private chat (requires real credentials)

### 2.4 DingTalk Channel

- [ ] DingTalk channel selectable in `/setup`
- [ ] AppKey + AppSecret + CorpId fields validate correctly
- [ ] Installation with DingTalk credentials succeeds
- [ ] Bot responds to group @mention (requires real credentials)

### 2.5 Dashboard

- [ ] `/dashboard` shows correct Bot status (online/offline)
- [ ] Current channel configuration displayed
- [ ] Current model configuration displayed
- [ ] Start / Stop / Restart buttons work
- [ ] Status refreshes after gateway restart

### 2.6 Reset Function

- [ ] Reset button on Dashboard triggers factory reset
- [ ] After reset, `/setup` wizard is shown again
- [ ] Previous configuration is cleared
- [ ] Gateway process is stopped before reset

---

## 3. Documentation Verification

### 3.1 Version Tracking

- [ ] `VERSION` file exists and contains correct version string (if applicable)
- [ ] Version string matches the release tag to be created

### 3.2 Installation Docs

- [ ] `README.md` quick-start steps match actual behavior
- [ ] `README.md` links are valid (no broken URLs)
- [ ] `docs/usb-pack/solution-architecture.md` is up-to-date with current directory structure

### 3.3 Runbook Coverage

Check that runbooks exist and are current for all completed features:

- [ ] `docs/runbooks/F-001-install-and-configure.md`
- [ ] `docs/runbooks/F-003-usb-delivery-pack.md`
- [ ] `docs/runbooks/F-004-security-hardening.md`
- [ ] `docs/runbooks/F-005-ui-install-reset.md`
- [ ] `docs/runbooks/F-007-legacy-archive-docker-baseline.md`
- [ ] `docs/runbooks/F-010-ci-cd-pipeline.md`

### 3.4 PRD Sync

- [ ] `docs/product/opensparrow-prd.md` matches Notion source of truth
- [ ] PRD version/date header is current

---

## 4. Package Verification

### 4.1 Build USB Pack

```bash
# M3+ recommended build script (supports --platform, --skip-skills)
bash scripts/build-usb-pack.sh

# Legacy build script (M2, Feishu-only)
# bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
```

- [ ] Build script exits with code 0
- [ ] Output directory `dist/usb-pack/openclaw-usb-pack/` is created

### 4.2 Package Structure Integrity

```bash
# Verify expected structure exists
ls dist/usb-pack/openclaw-usb-pack/
```

Expected contents (at minimum):
- [ ] Platform entry scripts present (`.command` for Mac, `.ps1` for Windows)
- [ ] `vendor/node/` — Node.js binary for target platform(s)
- [ ] `vendor/openclaw/` — OpenClaw CLI and core extensions
- [ ] `ui/server.mjs` — UI backend
- [ ] `ui/public/` — UI frontend assets
- [ ] `scripts/openclaw-usb/` — Installation scripts
- [ ] `docs/` — User-facing documentation

### 4.3 Vendor Version Verification

```bash
bash scripts/verify-vendor.sh
```

- [ ] `verify-vendor.sh` passes
- [ ] Node.js version matches expected (v24.14.0)
- [ ] OpenClaw version matches expected (v2026.3.23+)

### 4.4 Frozen Directory Integrity

```bash
bash scripts/verify-legacy-freeze.sh
```

- [ ] `verify-legacy-freeze.sh` passes
- [ ] No modifications to frozen directories (`archive/legacy-*`)

---

## 5. Docker Verification (if applicable)

```bash
cd deploy/docker
docker compose build
docker compose up -d
# Wait for healthcheck
docker compose ps
curl -fsS http://localhost:19000/api/status
docker compose down
```

- [ ] Docker image builds successfully
- [ ] Container starts and passes healthcheck within 30 seconds
- [ ] `/api/status` returns valid JSON
- [ ] Container shuts down cleanly

---

## 6. Final Sign-off

| Check | Signed by | Date |
|-------|-----------|------|
| Code checks pass | | |
| Mac functional verification | | |
| Windows functional verification | | |
| Documentation current | | |
| Package verified | | |
| Docker verified (if applicable) | | |

**Release approved**: [ ] Yes / [ ] No — blocked by: _______________

---

## Quick Reference: One-liner Automated Checks

```bash
# Run all automated checks in sequence
bash -n scripts/openclaw-usb/install-local-feishu.sh && \
bash -n scripts/openclaw-usb/harden-local-feishu.sh && \
bash -n scripts/verify-vendor.sh && \
bash -n scripts/verify-legacy-freeze.sh && \
bash -n scripts/build-usb-pack.sh && \
node --check ui/server.mjs && \
cd deploy/docker && docker compose config --quiet && cd ../.. && \
bash scripts/verify-vendor.sh && \
bash scripts/verify-legacy-freeze.sh && \
echo "✅ All automated checks passed"
```

> **Note**: Functional verification (Section 2) requires manual testing with real IM credentials.
