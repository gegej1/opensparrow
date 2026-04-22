# WeCom Install Gate Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make packaged WeCom install fail at the correct gate when plugin installation is rejected, without continuing into `channels.wecom.*` writes or fake progress.

**Architecture:** Keep the existing packaged install flow in `ui/server.mjs`, but split WeCom plugin readiness from generic install progress. A rejected WeCom plugin install must become a first-class gate outcome that stops later WeCom config writes, updates install-state truth, and keeps diagnostics/export consistent.

**Tech Stack:** Node.js ESM, node:test, packaged diagnostics surfaces in `ui/server.mjs`

---

## File Structure

- Modify: `specs/030-packaged-dingtalk-wecom-support-closure/wecom-install-gate-hardening-tasks.md`
- Modify: `ui/server.mjs`
- Test: `ui/tests/packaged-wecom-install-gate.test.mjs`

## Task 1: Lock the broken behavior with a failing test

**Files:**
- Create: `ui/tests/packaged-wecom-install-gate.test.mjs`
- Test: `ui/tests/packaged-wecom-install-gate.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('wecom install stops before channel config when plugin install is rejected', () => {
  assert.match(serverSource, /const wecomPluginReady = !requestedHasWecom \|\| errors.length === 0/)
  assert.match(serverSource, /if \(requestedHasWecom && !wecomPluginReady\) \{\s*warnings\.push\('企微插件未安装成功，跳过企业微信渠道配置'\)/)
  assert.doesNotMatch(
    serverSource,
    /case 'wecom':[\s\S]*await oc\('channels\.wecom\.enabled', 'true'\)/,
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test ui/tests/packaged-wecom-install-gate.test.mjs
```

Expected: FAIL because `ui/server.mjs` does not yet expose a dedicated WeCom plugin gate and still proceeds into `channels.wecom.*`.

## Task 2: Implement the WeCom plugin gate with minimal surface change

**Files:**
- Modify: `ui/server.mjs`
- Test: `ui/tests/packaged-wecom-install-gate.test.mjs`

- [ ] **Step 1: Add a dedicated WeCom plugin readiness gate**

Implement in `handleInstall()` by:

```js
const wecomPluginReady = !requestedHasWecom || errors.length === 0
```

and by only allowing `configureChannel(ch)` to receive WeCom channels when `wecomPluginReady === true`.

- [ ] **Step 2: Keep diagnostics truthful when the gate blocks**

When the WeCom plugin gate fails, append a warning explaining that WeCom channel config is being skipped because the plugin never became install-ready. Preserve the original plugin install error in `errors`.

- [ ] **Step 3: Ensure WeCom channel config is not executed after plugin rejection**

Implement the channel loop so WeCom is skipped instead of continuing into:

```js
await oc('plugins.entries.wecom.enabled', 'true')
await oc('channels.wecom.enabled', 'true')
```

when the plugin gate is not ready.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
node --test ui/tests/packaged-wecom-install-gate.test.mjs
```

Expected: PASS

## Task 3: Verify diagnostics regressions do not slip

**Files:**
- Test: `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- Test: `ui/tests/packaged-mac-diagnostics-shell.test.mjs`

- [ ] **Step 1: Run targeted diagnostics tests**

Run:

```bash
node --test \
  ui/tests/packaged-wecom-install-gate.test.mjs \
  ui/tests/packaged-channel-probe-diagnostics.test.mjs \
  ui/tests/packaged-mac-diagnostics-shell.test.mjs
```

Expected: all PASS

- [ ] **Step 2: Run syntax verification**

Run:

```bash
node --check ui/server.mjs
```

Expected: exit 0

## Task 4: Sync packet tracking

**Files:**
- Modify: `specs/030-packaged-dingtalk-wecom-support-closure/wecom-install-gate-hardening-tasks.md`

- [ ] **Step 1: Mark completed steps and verification evidence**

Record:

```md
- [x] Added failing regression coverage for WeCom plugin rejection gate
- [x] Stopped `channels.wecom.*` writes after plugin rejection
- [x] Verified diagnostics shell tests still pass
```

