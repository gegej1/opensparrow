# OpenSparrow Quick Reference

## 一句话层次

- 规则看 `AGENTS.md` + constitution
- feature 看 `specs/`
- 项目事实看 `longrun/`
- 执行方法看当前 `superpowers`
- 派工与收口看 `docs/governance/` + F-019 runbook

## 进入一个新会话先做什么

1. 读 `AGENTS.md`
2. 读 constitution
3. 读 `docs/governance/framework-stack.md`
4. 读 unified `app_spec.md`
5. 读 unified `feature_list.json`
6. 读 unified `claude-progress.txt`
7. 读当前 feature 的 `spec / plan / tasks`

## 小任务 / 中任务 / 战役级任务

### 小任务

推荐编队：
- 1 个规划或侦察 Agent
- 1 个实现 Agent
- 1 个验证 Agent

### 中任务

推荐编队：
- 1 个规划 Agent
- 2 个实现 Agent
- 1 个验证 Agent
- 1 个文档 / 收口 Agent

### 战役级任务

推荐编队：
- 1 个总司令
- 1 个主规划 Agent
- 多个实现 Agent
- 1 个专门验证 Agent
- 1 个文档 / 收口 Agent
- 按需临时扩编侦察 / reviewer / fixer / verifier

## 三条硬规则

- 没有 `spec -> plan -> tasks` 的非 trivial 工作，不要直接下手改代码
- 没有验证证据，不要把长期状态写成完成
- 多个实现 Agent 不要并行改同一文件集

## 什么时候回退

- 缺 `spec`：回到 `specs/`
- 缺项目事实：回到 `longrun/`
- 缺执行路径：回到项目规则 + `superpowers`
- 边界不清：停止并行，先让总司令重新拆解

## 本仓推荐验证入口

- `./longrun/workspaces/opensparrow-unified/init.sh`
- `./longrun/scripts/session_start.sh longrun/workspaces/opensparrow-unified`
- `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- `bash -n ...`
- 对应 Node / test 命令
