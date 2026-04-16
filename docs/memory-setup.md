# OpenSparrow Memory Setup

## 目标

把 OpenSparrow 的长期记忆拆成两层：

1. **项目规则层**：稳定流程、authority、边界，写在 `AGENTS.md`
2. **项目长期记忆层**：稳定事实、冻结结论、长期偏好、环境发现，写入 Mem0

`longrun/` 继续保留为项目记忆与交接台账，但它不是 authority，不替代 `specs/` 或 fresh verification evidence。

## 当前接入方式

### Codex

- 通过本机 `~/.codex/config.toml` 注册官方 Mem0 HTTP MCP：
  - `url = "https://mcp.mem0.ai/mcp/"`
  - `env_http_headers.Authorization = "MEM0_AUTH_HEADER"`
- `MEM0_AUTH_HEADER` 在本机环境中提供 `Authorization: Token ...` 的值。
- secret 只留在环境变量和本机配置，不写进 repo。

### Mem0 CLI

- 本机安装官方 `@mem0/cli`
- 当前默认配置：
  - `defaults.user_id = opensparrow-memory`
  - `defaults.app_id = opensparrow`
- 平台 API key 仍来自环境变量；不写回仓库。

## 为什么统一用 `opensparrow-memory`

- 避免多个项目共用同一个 Mem0 key 时发生 scope 污染。
- 所有检索、导入、写入都先落在稳定的项目 user scope 上。
- metadata 统一写 `project = opensparrow`，便于后续筛选、纠错和再迁移。

## A / B / C 分类规则

### A. 永久规则类

写入 `AGENTS.md`，不写成散落 memory：

- authority order
- `spec -> plan -> tasks` 前置要求
- longrun subordinate memory 边界
- Commander mode 激活与角色边界
- review / verification / closeout 分离
- PASS / DONE 必须依赖 fresh verification evidence
- Memory Operating Rules

### B. 长期经验类

写入 Mem0：

- 仓库定位与关键目录职责
- 冻结目录边界
- 已冻结 feature 结论
- 当前长期有效约定
- 用户/项目偏好
- 环境发现与可重复操作经验

这些内容先整理成 `memory/mem0_import.json`，再导入。

### C. 过期 / 噪音类

只保留原位，不导入 active memory：

- 一次性对话与临时 prompt
- 长日志、命令回显、event 列表
- 重复进度片段
- 旧任务碎片与历史 open questions
- 截图、图片、打包产物路径、一次性 candidate 文件名
- `demo-longrun` 等演示样例

## 这次 legacy memory 来源

本轮主要从这些来源抽取 durable memory：

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/README.md`
- `docs/governance/framework-stack.md`
- `docs/项目持久化说明.md`
- `docs/runbooks/F-005-ui-install-reset.md`
- `docs/runbooks/F-019-commander-orchestration-governance.md`
- `specs/003-opensparrow-ui-reset-hardening/spec.md`
- `specs/014-mac-arm64-installer-hardening/spec.md`
- `specs/026-mac-first-platform-parity/spec.md`
- `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
- `specs/027-mac-ui-first-release-readiness/spec.md`
- `longrun/workspaces/opensparrow-unified/app_spec.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `longrun/METHOD.zh-CN.md`
- legacy workspace `app_spec / feature_list / claude-progress`

## 哪些内容进入了哪里

### 进入项目规则文件

- `AGENTS.md` 新增 `## Memory Operating Rules`

### 进入 Mem0

- `memory/mem0_import.json` 中的 durable memories
- system test memory（用于验收）

### 只保留原位 / 不导入

- 历史长日志
- `claude-progress.txt` 里的命令回显
- `demo-longrun`
- `My_Skills/` 内第三方 skill 自带的 `AGENTS.md` / `CLAUDE.md`
- 图片、截图、候选包路径、临时 markdown

## 后续怎么用

### 开始新任务前

先检索相关记忆，至少做一条：

```bash
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory
```

如问题更具体，优先搜 feature id、目录名、冻结边界、用户偏好。

注意：当前 `mem0` CLI v0.2.3 在显式传 `--user-id` 时不会自动补默认 `app_id`。  
如果你需要严格命中项目命名空间，优先使用：

```bash
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory --app-id opensparrow
```

### 关键工作完成后

只写 durable facts，优先这些类型：

- `decision`
- `task_learning`
- `anti_pattern`
- `convention`
- `environmental`
- `user_preference`
- `session_state`（仅在上下文即将丢失且确实重要时）

### 修正错误记忆

1. 先定位旧记忆：

   ```bash
   mem0 search "关键词" --user-id opensparrow-memory --keyword --threshold 0
   ```

2. 拿到 `id` 后更新，而不是新增冲突 truth：

   ```bash
   mem0 update <memory-id> "修正后的文本" -m '{"project":"opensparrow","status":"active"}'
   ```

3. 若旧记忆完全错误且不应保留，再删除：

   ```bash
   mem0 delete <memory-id>
   ```

## 如何重新导入 legacy 资料

### 默认资料文件

```bash
memory/mem0_import.json
```

### 推荐的可靠导入方式

当前 `mem0` CLI 的 `add/import` 是异步 background event 模式。  
如果需要“导入后立刻可验证”，用官方 API 做同步写入，再用 CLI 验证：

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs';

const apiKey = process.env.MEM0_API_KEY;
const items = JSON.parse(fs.readFileSync('memory/mem0_import.json', 'utf8'));

for (const item of items) {
  const res = await fetch('https://api.mem0.ai/v1/memories/', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Mem0-Source': 'opensparrow-memory-import'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: item.memory }],
      user_id: 'opensparrow-memory',
      app_id: 'opensparrow',
      infer: false,
      async_mode: false,
      metadata: item.metadata
    })
  });
  if (!res.ok) throw new Error(`Import failed: ${res.status} ${await res.text()}`);
}
NODE
```

导入后立刻抽查：

```bash
mem0 list --user-id opensparrow-memory
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory
```

若返回空结果，补上 app scope 再查：

```bash
mem0 list --user-id opensparrow-memory --app-id opensparrow
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory --app-id opensparrow
```

## 如何验证这套 memory 还在工作

至少跑以下命令：

```bash
mem0 status
mem0 list --user-id opensparrow-memory
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory
codex mcp get mem0
```

如果 `list/search` 用上面的最小命令返回空结果，再用项目完整 scope 复核：

```bash
mem0 list --user-id opensparrow-memory --app-id opensparrow
mem0 search "OpenSparrow authority order" --user-id opensparrow-memory --app-id opensparrow
```

如果需要验证写入链：

1. 用同步 API 或现有 memory id 做一条 system test memory
2. 用 `mem0 search` 搜到它
3. 用 `mem0 get <id>` 读到它
4. 用 `mem0 update <id> ...` 改掉它

## 当前落地结论

- Codex 侧已经有可用的 Mem0 MCP 入口
- CLI 已可用于状态检查、检索、读取、更新
- 对“必须立刻可验证”的写入与批量迁移，当前优先使用官方 API 的同步模式
- 规则层和长期记忆层已分开，不再把所有 durable knowledge 混在 longrun 或对话里
