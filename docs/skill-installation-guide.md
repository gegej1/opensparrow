# Skill Installation Guide — Research & Current Status

> Last updated: 2026-03-31
> Author: ccB (Skill installation mechanism research)

## 1. Executive Summary

OpenSparrow's skill installation uses **file copy** — not CLI commands or npm packages. The UI server copies bundled skill files from the USB pack's `skills/superpowers/` directory to user-level Claude and Codex skill directories during installation. However, **the source directory `skills/superpowers/` does not exist in the current repo**, making the install step a silent no-op.

## 2. How OpenClaw Skills Work

### 2.1 Skill Format

OpenClaw skills are **plain markdown files** (`.md`) placed in specific directories. There is no compilation, no npm install, no CLI command needed. The AI agents (Claude Code, Codex) read these files as context.

### 2.2 Skill Directories

| Tool | Skill Path |
|------|-----------|
| Claude Code | `~/.claude/skills/superpowers/` |
| Codex | `~/.codex/skills/superpowers/` |

### 2.3 Skill Source

The "superpowers" skills come from [github.com/obra/superpowers](https://github.com/obra/superpowers) — a community skill pack. On the developer machine, they exist at `~/.claude/skills/superpowers/` (27 files, ~150KB total), installed via the global CLAUDE.md configuration.

## 3. Current Installation Mechanism

### 3.1 Code Path (`ui/server.mjs`)

```
SKILLS_SRC = path.join(PACK_ROOT, 'skills', 'superpowers')
SKILL_TARGETS = [
  '~/.claude/skills/superpowers',
  '~/.codex/skills/superpowers',
]

installSkills():
  if SKILLS_SRC does not exist → return (silent skip)
  for each SKILL_TARGET:
    mkdir -p target
    copy all files from SKILLS_SRC to target
```

**Trigger**: Called in `handleInstall()` as "Step 0" before gateway configuration.

**Cleanup**: Factory reset (`handleFactoryReset`) deletes skill directories if `cleanupSkills: true`.

### 3.2 Current Problem

| Item | Status |
|------|--------|
| `skills/superpowers/` in repo | **MISSING** — directory does not exist |
| `skills/openclaw-local-feishu-usb/` | Exists (1 file: SKILL.md — operational guide, not a superpowers skill) |
| `dist/usb-pack/.../skills/superpowers/` | **MISSING** — not included in USB build |
| `~/.claude/skills/superpowers/` | Exists on developer machine (27 files) — but installed globally, not from this repo |
| Build script (build-delivery-pack.sh) | Only copies `skills/openclaw-local-feishu-usb/`, **does not copy superpowers** |

**Result**: `installSkills()` always silently returns empty — no skills are installed during the UI install flow.

### 3.3 What End Users Get

- **No superpowers skills** installed during OpenSparrow setup
- The developer has them because they were installed globally via CLAUDE.md
- End users deploying via USB pack get zero skills

## 4. Install Script Analysis

### 4.1 `scripts/openclaw-usb/install-local-feishu.sh`

- **No skill installation logic** — no mention of "skill" or "superpowers"
- Only handles: profile creation, gateway config, channel setup, daemon install
- Plugin install uses `openclaw config set plugins.entries.feishu.enabled true`

### 4.2 `scripts/openclaw-usb/install-local-feishu.ps1`

- Same as above — no skill installation logic

### 4.3 UI Install Wizard (`/setup` → `POST /api/install`)

- Step 0: `installSkills()` — exists but is a no-op (source missing)
- No UI step for skill selection
- No skill status display on Dashboard

## 5. Dashboard Skill Status

### Current State

- **No skill management UI** on the Dashboard
- Only skill-related UI: factory reset confirmation mentions "删除 superpowers skills"
- No `/api/skills` endpoint
- No skill status display or installation controls

### Assessment

The Dashboard has no awareness of which skills are installed or available.

## 6. Recommendations

### 6.1 Immediate Fix (P0) — Bundle Superpowers in USB Pack

**Problem**: `skills/superpowers/` does not exist in the repo.

**Solution**: Create `skills/superpowers/` in the repo and populate it with the standard superpowers skill files.

**Files to create**:
```
skills/superpowers/
  brainstorming.md
  dispatching-parallel-agents.md
  executing-plans.md
  finishing-a-development-branch.md
  network-workaround.md
  README.md
  receiving-code-review.md
  requesting-code-review.md
  subagent-driven-development.md
  systematic-debugging.md
  test-driven-development.md
  using-git-worktrees.md
  using-superpowers.md
  verification-before-completion.md
  writing-plans.md
  writing-skills.md
```

Plus subdirectories with their contents:
```
  agents/
  brainstorming/
  commands/
  requesting-code-review/
  subagent-driven-development/
  systematic-debugging/
  test-driven-development/
  using-superpowers/
  writing-skills/
```

**Effort**: ~30 minutes (copy from `~/.claude/skills/superpowers/`)

**Impact**: After this fix, `installSkills()` will actually copy skills during USB pack installation.

### 6.2 Build Script Update (P0)

**Problem**: `build-delivery-pack.sh` only copies `skills/openclaw-local-feishu-usb/`.

**Solution**: Add `skills/superpowers/` to the build script's rsync/copy targets.

**Change needed**:
```bash
# In build-delivery-pack.sh, add:
rsync -a --delete "${project_root}/skills/superpowers/" "$stage_dir/skills/superpowers/"
```

**Effort**: 5 minutes

### 6.3 Dashboard Skill Status (P2) — Future Enhancement

**Add a `/api/skills` endpoint** that returns:
```json
{
  "installed": true,
  "location": "~/.claude/skills/superpowers",
  "files": 16,
  "source": "bundled"
}
```

**Add Dashboard widget** showing skill installation status.

**Effort**: 2-3 hours

### 6.4 Skill Selection UI (P3) — Future Enhancement

Allow users to choose which skill packs to install during setup. Not needed for MVP.

## 7. Code Change Checklist

If Commander approves, the following changes are needed:

### Must Do (P0)
- [ ] Create `skills/superpowers/` by copying from `~/.claude/skills/superpowers/`
- [ ] Update `build-delivery-pack.sh` to include superpowers in USB pack build
- [ ] Verify `installSkills()` works with populated source directory
- [ ] Add `skills/superpowers/` to `.gitignore` exclusion (currently skills/ is not ignored, which is correct)

### Should Do (P1)
- [ ] Add basic `/api/skills` status endpoint
- [ ] Update `init.sh` to check for `skills/superpowers/` existence

### Nice to Have (P2)
- [ ] Dashboard skill status widget
- [ ] Skill pack version tracking

## 8. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|-----------|
| Superpowers files are large or contain secrets | Low | They are public open-source markdown files |
| Copying skills overwrites user customizations | Low | `installSkills()` uses `copyFileSync` (overwrite), but skills are rarely customized |
| Skills become outdated in USB pack | Medium | Document update procedure; version tag in skills directory |
| License compliance | Low | Superpowers is MIT licensed |

## 9. References

- OpenSparrow UI Server: `ui/server.mjs` (lines 66-69, 1400-1424, 1642-1645)
- Superpowers repo: https://github.com/obra/superpowers
- Current skill file: `skills/openclaw-local-feishu-usb/SKILL.md`
- Build script: `longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh`
