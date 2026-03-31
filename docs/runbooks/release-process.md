# OpenSparrow Release Process Runbook

> **Purpose**: Step-by-step guide for cutting a release of OpenSparrow.
> Follow this runbook from top to bottom for every release.

**Last Updated**: 2026-03-31
**Owner**: Commander / Release Manager

---

## Table of Contents

1. [Pre-release Preparation](#1-pre-release-preparation)
2. [Build Process](#2-build-process)
3. [Test Process](#3-test-process)
4. [Tag & Release Process](#4-tag--release-process)
5. [Distribution Process](#5-distribution-process)
6. [Post-release](#6-post-release)

---

## 1. Pre-release Preparation

### 1.1 Confirm Scope

- [ ] All specs targeted for this release are status=done
  ```bash
  # Check spec completion in longrun/
  cat longrun/workspaces/opensparrow-unified/feature_list.json | grep -E '"name"|"passes"'
  ```
- [ ] No P0 bugs remain open
- [ ] PRD on Notion reflects the features being released

### 1.2 Branch & Code Freeze

- [ ] Ensure all work is merged to `main`
  ```bash
  git checkout main
  git pull origin main
  git log --oneline -10    # Review recent commits
  ```
- [ ] No in-flight branches targeting this release remain

### 1.3 Update Version Metadata

- [ ] Create or update `VERSION` file at repo root (if version tracking is adopted)
  ```bash
  echo "v0.2.0" > VERSION
  git add VERSION
  ```
- [ ] Update any version references in README.md, if present

### 1.4 Verify Skill Pack Availability

> **Why**: Skills are not tracked in Git (too large). They must exist locally before building.
> See `docs/skill-pack-inventory.md` for full inventory and `skills/README.md` for acquisition instructions.

- [ ] Superpowers base pack exists at project root:
  ```bash
  # Must have ~32 files, ~264KB
  test -d superpowers/ && echo "OK: $(find superpowers/ -type f | wc -l) files" || echo "MISSING"
  ```
- [ ] Industry skill categories exist under `skills/My_Skills/`:
  ```bash
  # Must have 6 directories: Business, Education, Finance, Government, Healthcare, Utilities
  ls skills/My_Skills/ | wc -l    # expect: 6
  find skills/My_Skills/ -type f | wc -l   # expect: ~69,000
  ```
- [ ] If either is missing, follow `skills/README.md` "New Machine" instructions to obtain them

### 1.5 Run Release Checklist

- [ ] Complete ALL items in `docs/release-checklist.md`
- [ ] Record sign-off in the checklist's Final Sign-off table

---

## 2. Build Process

### 2.1 Build USB Pack (Mac)

```bash
# Ensure vendor/ is populated with correct runtime versions
bash scripts/verify-vendor.sh

# Build the delivery pack
bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh

# Verify output
ls -la dist/usb-pack/openclaw-usb-pack/
```

**Expected outcome**: `dist/usb-pack/openclaw-usb-pack/` contains complete USB package.

### 2.2 Build USB Pack (Windows)

```bash
# Windows pack is built from the same scripts but with Windows vendor binaries
# Ensure vendor/node/ contains win-x64 binary
ls vendor/node/*win*

# Build (same script, output includes Windows wrappers)
bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
```

### 2.3 Build Docker Image

```bash
cd deploy/docker
docker compose build --no-cache
docker images | grep opensparrow
```

**Expected outcome**: `opensparrow/core:baseline` image created.

### 2.4 Verify Build Artifacts

```bash
# USB pack structure check
find dist/usb-pack/openclaw-usb-pack -maxdepth 2 -type f | head -30

# Docker image size check (target: < 1GB)
docker images opensparrow/core:baseline --format "{{.Size}}"
```

### 2.5 Verify Skill Packs in Build Output

> **Critical**: Build script maps `superpowers/` (repo root) → `dist/.../skills/superpowers/` (path remapping!).
> Industry skills copy directly: `skills/My_Skills/` → `dist/.../skills/My_Skills/`.

```bash
DIST="dist/usb-pack/openclaw-usb-pack"

# Superpowers (base skills) — MUST exist at skills/superpowers/ inside dist
echo "=== Superpowers ==="
test -d "$DIST/skills/superpowers/" \
  && echo "OK: $(find $DIST/skills/superpowers/ -type f | wc -l) files" \
  || echo "FAIL: skills/superpowers/ missing from build output!"

# Core files spot-check
for f in brainstorming.md writing-plans.md test-driven-development.md; do
  test -f "$DIST/skills/superpowers/$f" && echo "  ✓ $f" || echo "  ✗ $f MISSING"
done

# Industry skills — MUST exist at skills/My_Skills/ inside dist
echo "=== Industry Skills ==="
for cat in Business Education Finance Government Healthcare Utilities; do
  if [ -d "$DIST/skills/My_Skills/$cat" ]; then
    echo "OK: $cat ($(find $DIST/skills/My_Skills/$cat -type f | wc -l) files)"
  else
    echo "FAIL: $cat missing from build output!"
  fi
done
```

- [ ] `skills/superpowers/` present in build output (~32 files)
- [ ] All 6 industry categories present in build output
- [ ] `server.mjs` paths match: `SKILLS_SRC` → `skills/superpowers`, `INDUSTRY_SKILLS_SRC` → `skills/My_Skills`

---

## 3. Test Process

### 3.1 Automated Tests

```bash
# Run CI checks locally
bash -n scripts/openclaw-usb/install-local-feishu.sh
bash -n scripts/openclaw-usb/harden-local-feishu.sh
node --check ui/server.mjs
cd deploy/docker && docker compose config --quiet && cd ../..
bash scripts/verify-vendor.sh
bash scripts/verify-legacy-freeze.sh
```

- [ ] All automated checks pass

### 3.2 Mac USB Smoke Test

1. Copy `dist/usb-pack/openclaw-usb-pack/` to a clean directory (simulate fresh machine)
2. Double-click `platforms/mac/wrappers/01-开始部署.command`
3. Verify browser opens `http://localhost:19000/setup`
4. Complete installation wizard with test credentials
5. Verify `/dashboard` shows Bot status
6. Test reset function

- [ ] Mac smoke test passes

### 3.3 Windows USB Smoke Test

1. Copy USB pack to a Windows machine
2. Run `platforms\windows\wrappers\one-click-deploy.ps1`
3. Verify browser opens `http://localhost:19000/setup`
4. Complete installation wizard
5. Verify Dashboard

- [ ] Windows smoke test passes (or document known issues)

### 3.4 Docker Smoke Test

```bash
cd deploy/docker
cp .env.example .env   # Fill in test credentials
docker compose up -d
# Wait for healthcheck
sleep 15
curl -fsS http://localhost:19000/api/status
docker compose logs --tail 20 opensparrow-core
docker compose down -v
```

- [ ] Docker smoke test passes

### 3.5 E2E Channel Tests (requires real credentials)

| Test | Feishu | DingTalk |
|------|--------|---------|
| Install via UI | [ ] | [ ] |
| Group @Bot chat | [ ] | [ ] |
| Private chat | [ ] | [ ] |
| Gateway restart | [ ] | [ ] |

---

## 4. Tag & Release Process

### 4.1 Create Git Tag

```bash
# Ensure working directory is clean
git status

# Create annotated tag
git tag -a v0.2.0 -m "Release v0.2.0: <brief summary>

Key changes:
- <change 1>
- <change 2>
- <change 3>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Verify tag
git show v0.2.0
```

### 4.2 Push Tag

```bash
git push origin v0.2.0
```

### 4.3 Create GitHub Release (optional)

```bash
gh release create v0.2.0 \
  --title "OpenSparrow v0.2.0" \
  --notes "$(cat <<'EOF'
## What's New

- <feature 1>
- <feature 2>

## Known Issues

- <issue 1>

## Upgrade Notes

- <note 1>

---
Full changelog: <compare URL>
EOF
)"
```

### 4.4 Attach Release Artifacts (optional)

```bash
# If distributing USB pack as zip
cd dist/usb-pack
zip -r opensparrow-v0.2.0-mac.zip openclaw-usb-pack/
gh release upload v0.2.0 opensparrow-v0.2.0-mac.zip
```

---

## 5. Distribution Process

### 5.1 USB Pack Distribution

| Channel | Method | Instructions |
|---------|--------|-------------|
| Physical USB | Copy `dist/usb-pack/openclaw-usb-pack/` to USB drive | Hand to recipient |
| Network share | Copy to shared folder | Provide path to users |
| GitHub Release | Attach zip to release | Users download from GitHub |

### 5.2 Docker Image Distribution

```bash
# Option A: Push to registry (if configured)
docker tag opensparrow/core:baseline registry.example.com/opensparrow/core:v0.2.0
docker push registry.example.com/opensparrow/core:v0.2.0

# Option B: Export as tar (offline distribution)
docker save opensparrow/core:baseline | gzip > opensparrow-core-v0.2.0.tar.gz
```

### 5.3 Notify Stakeholders

- [ ] Post release announcement (internal channel or README)
- [ ] Update Notion PRD with release status
- [ ] Notify users of any breaking changes or upgrade steps

---

## 6. Post-release

### 6.1 Verify Distribution

- [ ] Download released artifact from distribution channel
- [ ] Run smoke test on downloaded artifact (not local build)
- [ ] Confirm GitHub release page is correct (if applicable)

### 6.2 Update Tracking

- [ ] Update `feature_list.json` if any features changed status
- [ ] Close completed specs
- [ ] Update MEMORY.md with release information

### 6.3 Retrospective

Document in release notes or team channel:
- What went well
- What caused friction
- What to improve for next release

---

## Appendix: Version Numbering Convention

```
v<major>.<minor>.<patch>

major: Breaking changes or major feature additions
minor: New features, backward-compatible
patch: Bug fixes, documentation updates
```

| Version | Milestone | Description |
|---------|-----------|-------------|
| v0.1.0 | M1 | Dual-channel Mac baseline |
| v0.2.0 | M2 | Tri-platform stable delivery |
| v0.3.0 | M3 | Enterprise capability enhancement |
| v1.0.0 | M4 | Production-ready GA release |

---

## Appendix: Rollback Procedure

If a release is found to be broken after distribution:

1. **Communicate**: Notify users immediately
2. **Revert tag** (if not yet distributed widely):
   ```bash
   git tag -d v0.2.0
   git push origin :refs/tags/v0.2.0
   ```
3. **Fix forward**: Create a patch release (v0.2.1) with the fix
4. **Re-distribute**: Follow distribution process again
5. **Post-mortem**: Document what went wrong and update checklist

> **Principle**: Prefer fix-forward over rollback. Only delete tags if the release has not been widely distributed.

---

## Appendix: New Developer — Skill File Onboarding

Skill files (`superpowers/` and `skills/My_Skills/`) are **not tracked in Git** because they total ~425 MB. After cloning the repo, you must obtain these files separately.

### Quick Start

```bash
git clone https://github.com/gegej1/opensparrow.git
cd opensparrow

# At this point, superpowers/ and skills/My_Skills/ do not exist.
# Follow one of the methods below to populate them.
```

### Method 1: Copy from USB Pack (Recommended)

If you have a previously-built USB pack:
```bash
cp -r /Volumes/USB/opensparrow/skills/superpowers ./superpowers/
cp -r /Volumes/USB/opensparrow/skills/My_Skills   ./skills/My_Skills/
```

### Method 2: Copy from a Teammate's Machine

```bash
scp -r teammate:/path/to/opensparrow/superpowers    ./superpowers/
scp -r teammate:/path/to/opensparrow/skills/My_Skills ./skills/My_Skills/
```

### Method 3: Copy from Global Claude Installation

If you already have superpowers installed globally via CLAUDE.md:
```bash
cp -r ~/.claude/skills/superpowers ./superpowers/
```

### Verification

```bash
# Should show 32 files, ~264KB
find superpowers/ -type f | wc -l

# Should show 6 categories, ~69,000 files, ~424MB
ls skills/My_Skills/
find skills/My_Skills/ -type f | wc -l
```

> **Reference**: See `skills/README.md` for the authoritative guide and `docs/skill-pack-inventory.md` for the full file listing.
