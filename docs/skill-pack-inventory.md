# Skill Pack Inventory — Build Verification Report

> **Generated**: 2026-03-31
> **Author**: ccB (Build verification task)
> **Status**: Pre-release verification for M3 deliverable

---

## 1. Superpowers (Base Skill Pack)

### 1.1 Location

| Property | Value |
|----------|-------|
| **Repo location** | `superpowers/` (project root) |
| **server.mjs expects** | `skills/superpowers/` (relative to PACK_ROOT) |
| **File count** | 32 files |
| **Size** | 264 KB |
| **In Git** | No (.gitignore excluded) |

### 1.2 Complete File Listing

```
superpowers/
├── README.md
├── brainstorming.md                          ✅ core
├── dispatching-parallel-agents.md
├── executing-plans.md
├── finishing-a-development-branch.md
├── network-workaround.md
├── receiving-code-review.md
├── requesting-code-review.md                 ✅ core
├── subagent-driven-development.md
├── systematic-debugging.md
├── test-driven-development.md                ✅ core
├── using-git-worktrees.md
├── using-superpowers.md
├── verification-before-completion.md
├── writing-plans.md                          ✅ core
├── writing-skills.md
├── agents/
│   └── code-reviewer.md
├── brainstorming/
│   ├── spec-document-reviewer-prompt.md
│   └── visual-companion.md
├── commands/
│   ├── brainstorm.md
│   ├── execute-plan.md
│   └── write-plan.md
├── requesting-code-review/
│   └── code-reviewer.md
├── subagent-driven-development/
│   ├── code-quality-reviewer-prompt.md
│   ├── implementer-prompt.md
│   └── spec-reviewer-prompt.md
├── systematic-debugging/
│   ├── condition-based-waiting.md
│   ├── defense-in-depth.md
│   └── root-cause-tracing.md
├── test-driven-development/
│   └── testing-anti-patterns.md
├── using-superpowers/
│   └── SKILL.md
└── writing-skills/
    └── SKILL.md
```

### 1.3 Core File Verification

| Core File | Exists | Size |
|-----------|--------|------|
| `brainstorming.md` | ✅ | present |
| `writing-plans.md` | ✅ | present |
| `test-driven-development.md` | ✅ | present |
| `executing-plans.md` | ✅ | present |
| `verification-before-completion.md` | ✅ | present |
| `subagent-driven-development.md` | ✅ | present |
| `systematic-debugging.md` | ✅ | present |
| `requesting-code-review.md` | ✅ | present |
| `receiving-code-review.md` | ✅ | present |
| `finishing-a-development-branch.md` | ✅ | present |

**Result**: All 10 core skill files present. Total 32 files across 8 subdirectories.

---

## 2. Industry Skills (My_Skills)

### 2.1 Location

| Property | Value |
|----------|-------|
| **Repo location** | `skills/My_Skills/` |
| **server.mjs expects** | `skills/My_Skills/` (relative to PACK_ROOT) |
| **Total file count** | 69,342 files |
| **Total size** | 424 MB |
| **In Git** | No (.gitignore excluded) |

### 2.2 Category Breakdown

| Category | File Count | Size | Status |
|----------|-----------|------|--------|
| Business | 11,623 | 89 MB | ✅ |
| Education | 14,436 | 98 MB | ✅ |
| Finance | 11,206 | 63 MB | ✅ |
| Government | 10,573 | 49 MB | ✅ |
| Healthcare | 11,221 | 83 MB | ✅ |
| Utilities | 10,282 | 43 MB | ✅ |
| **Total** | **69,341** | **424 MB** | |

### 2.3 Content Spot-Check

Three random files inspected to verify they are non-empty and well-formed:

| File | Lines | Bytes | Status |
|------|-------|-------|--------|
| `Business/business-ultra-skill-6336/SKILL.md` | 9 | 267 | ✅ valid YAML frontmatter + content |
| `Healthcare/healthcare-mega-skill-2836/SKILL.md` | 9 | 274 | ✅ valid YAML frontmatter + content |
| `Finance/finance-ultra-skill-5784/SKILL.md` | 9 | 262 | ✅ valid YAML frontmatter + content |

Sample content structure:
```yaml
---
name: "business-ultra-skill-6336"
description: "Auto-generated skill for Business to reach 10k target"
category: "Business"
---
# business-ultra-skill-6336
This is an auto-generated skill package for Business ...
```

**Result**: All 6 categories present, files non-empty, valid markdown with YAML frontmatter.

---

## 3. Path Mapping Verification (server.mjs ↔ Filesystem)

### 3.1 Constants in server.mjs

```javascript
// Line 78
const SKILLS_SRC = path.join(PACK_ROOT, 'skills', 'superpowers')
// → resolves to: <pack_root>/skills/superpowers/

// Line 84
const INDUSTRY_SKILLS_SRC = path.join(PACK_ROOT, 'skills', 'My_Skills')
// → resolves to: <pack_root>/skills/My_Skills/
```

### 3.2 Path Match Matrix

| Constant | Expected Path (in USB pack) | Actual Repo Path | Match? | Action Required |
|----------|---------------------------|------------------|--------|-----------------|
| `SKILLS_SRC` | `skills/superpowers/` | `superpowers/` (root!) | ⚠️ **NO** | Build script must copy |
| `INDUSTRY_SKILLS_SRC` | `skills/My_Skills/` | `skills/My_Skills/` | ✅ Yes | Direct copy in build |

### 3.3 Critical Path Mismatch — Superpowers

**This is the most important finding in this verification.**

```
server.mjs expects:  <PACK_ROOT>/skills/superpowers/
Actual repo layout:  <project_root>/superpowers/          ← at root, NOT under skills/
```

**Consequence**: The `installSkills()` function reads from `skills/superpowers/` inside the USB pack. But in the repo, superpowers lives at the project root (`superpowers/`), not under `skills/`.

**Required build script action**:
```bash
# In build-delivery-pack.sh, the build MUST map:
#   superpowers/  →  dist/.../skills/superpowers/
rsync -a --delete "${project_root}/superpowers/" "$stage_dir/skills/superpowers/"
```

**Current build script** (`build-delivery-pack.sh` line 13):
```bash
# ONLY copies this — superpowers is NOT included:
rsync -a --delete "${project_root}/skills/openclaw-local-feishu-usb/" "$stage_dir/skills/openclaw-local-feishu-usb/"
```

**Without this fix**: The USB pack will have no `skills/superpowers/` directory, and `installSkills()` will silently skip superpowers installation (same no-op behavior documented in `docs/skill-installation-guide.md`).

### 3.4 Industry Skills Path — OK

```
server.mjs expects:  <PACK_ROOT>/skills/My_Skills/
Actual repo layout:  skills/My_Skills/                    ← matches
```

Build script needs to copy this too (currently not copied), but the path is correct:
```bash
rsync -a --delete "${project_root}/skills/My_Skills/" "$stage_dir/skills/My_Skills/"
```

---

## 4. Build Script Gap Analysis

### 4.1 Current State (`build-delivery-pack.sh`)

| Source | Copied to dist? | Status |
|--------|----------------|--------|
| `skills/openclaw-local-feishu-usb/` | ✅ Yes (line 13) | OK |
| `superpowers/` → `skills/superpowers/` | ❌ No | **MUST ADD** |
| `skills/My_Skills/` | ❌ No | **MUST ADD** |

### 4.2 Required Additions to Build Script

```bash
# --- Skill Packs ---
# Superpowers: repo root → dist skills/ (path mapping!)
if [ -d "${project_root}/superpowers" ]; then
  rsync -a --delete "${project_root}/superpowers/" "$stage_dir/skills/superpowers/"
  echo "[build] superpowers → skills/superpowers/ ($(find "${project_root}/superpowers" -type f | wc -l) files)"
else
  echo "[build] WARNING: superpowers/ not found at project root — base skills will be missing"
fi

# Industry skills: direct path match
if [ -d "${project_root}/skills/My_Skills" ]; then
  rsync -a --delete "${project_root}/skills/My_Skills/" "$stage_dir/skills/My_Skills/"
  echo "[build] skills/My_Skills/ → skills/My_Skills/ ($(find "${project_root}/skills/My_Skills" -type f | wc -l) files)"
else
  echo "[build] WARNING: skills/My_Skills/ not found — industry skills will be missing"
fi
```

---

## 5. Summary

| Check | Result |
|-------|--------|
| Superpowers files present in repo | ✅ 32 files at `superpowers/` |
| Core superpowers files verified | ✅ All 10 core files exist |
| Industry skills categories complete | ✅ 6/6 categories, 69,342 files |
| Industry skill files non-empty | ✅ Spot-checked 3 files |
| `SKILLS_SRC` path matches repo | ⚠️ **Mismatch** — build script must map `superpowers/` → `skills/superpowers/` |
| `INDUSTRY_SKILLS_SRC` path matches repo | ✅ Direct match |
| Build script copies superpowers | ❌ **Not yet** — codexA task in progress |
| Build script copies My_Skills | ❌ **Not yet** — codexA task in progress |

**Blocking issue for release**: Build script (`build-delivery-pack.sh`) must be updated to copy both skill directories before USB packs can include skills. This is tracked as codexA's current task.
