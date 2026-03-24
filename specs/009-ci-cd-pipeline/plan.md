# Implementation Plan: CI/CD Pipeline Baseline

**Branch**: `009-ci-cd-pipeline` | **Date**: 2026-03-24 | **Spec**: `specs/009-ci-cd-pipeline/spec.md`

## Summary

本次实现为统一真源仓补齐第一版 GitHub Actions CI，目标是把“人工约定的基础校验”固化成 PR / main 分支自动门槛：

1. 把 shell / `.command` 语法检查固化到 `shell-lint`；
2. 把 `ui/server.mjs` 的 Node 语法检查固化到 `node-check`；
3. 把 `deploy/docker/docker-compose.yml` 的解析能力固化到 `docker-validate`；
4. 把 feature list、legacy freeze 校验和冻结标记文件存在性固化到 `repo-health`；
5. 用 spec / runbook / longrun 记录把 CI 维护入口文档化。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **CI platform**: GitHub Actions（private repo, default branch `main`）
- **Workflow file**: `.github/workflows/ci.yml`
- **Node target**: `18.x`
- **Shell scope**: `scripts/openclaw-usb/`, `scripts/verify-legacy-freeze.sh`, `deploy/docker/bin/`, `platforms/linux/companion/`, `platforms/mac/companion/`, `platforms/mac/wrappers/`
- **Repo health anchors**: `longrun/workspaces/opensparrow-unified/feature_list.json`, `docs/legacy-archive-freeze-20260323.md`, `scripts/verify-legacy-freeze.sh`

## Design

### A. Workflow structure

- 使用单一 workflow：`.github/workflows/ci.yml`
- 触发：`push` to `main` + `pull_request`
- job 划分：
  - `shell-lint`
  - `node-check`
  - `docker-validate`
  - `repo-health`

### B. Shell lint strategy

- 用 `find ... -print0 | xargs -0 -r bash -n` 扫描指定路径；
- `platforms/mac/companion/` 目录中存在 Markdown 使用指南，因此需排除 `*.md`，只检查真实脚本文件；
- 不新增 shellcheck 等额外依赖，保持 baseline 轻量。

### C. Repo health strategy

- 用 `python3 -m json.tool` 校验 `feature_list.json`；
- 用 `test -x` 和 `bash scripts/verify-legacy-freeze.sh` 校验 freeze 验证脚本；
- 用 `test -f docs/legacy-archive-freeze-20260323.md` 作为冻结标记文件存在性检查。

### D. Documentation sync

- 新增 `docs/runbooks/F-010-ci-cd-pipeline.md`，说明触发条件、job 含义、本地等价命令和排障方法；
- 在 unified `feature_list.json` 新增 `F-010`；
- 在 unified `claude-progress.txt` 追加本轮会话记录。

## Validation Plan

1. `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`（若本机有 PyYAML）
2. `find scripts/openclaw-usb -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n`
3. `find deploy/docker/bin -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n`
4. `find platforms/linux/companion -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n`
5. `find platforms/mac/companion -maxdepth 1 -type f ! -name '*.md' -print0 | xargs -0 -r bash -n`
6. `find platforms/mac/wrappers -maxdepth 1 -type f -name '*.command' -print0 | xargs -0 -r bash -n`
7. `node --check ui/server.mjs`
8. `docker compose -f deploy/docker/docker-compose.yml config`
9. `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
10. `chmod +x scripts/verify-legacy-freeze.sh && test -x scripts/verify-legacy-freeze.sh && bash scripts/verify-legacy-freeze.sh`

## Deferred

- 单元测试、E2E 测试和产物 build matrix
- deploy / release / secrets scanning
- Windows PowerShell 专项 CI 验证
