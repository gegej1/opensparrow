# F-030 Packaged DingTalk / WeCom Support Closure

**Feature ID**: `F-030`  
**Feature Branch**: `030-packaged-dingtalk-wecom-support-closure`  
**Created**: 2026-04-16  
**Status**: Draft (Scope Freeze for Review)  
**Input**: Commander 已明确要求把 DingTalk 与 WeCom 的 packaged 支持收口为一个新的独立 feature；本轮只做 `spec / plan / tasks` 冻结，不做实现、不做 closeout、不更新 longrun、不新开 research。

## F-030 一句话定义

`F-030 = 在不重开 officialization、F-027 packaged support promise、F-026 verified closeout、F-025-B Windows blocked 状态、或 true F-014 bot-first 主链的前提下，把 DingTalk 与 WeCom 的 packaged 支持 closure 冻结成一个新的、按 channel 分别过 gate 的独立 feature。`

## Truth Source / Governance Authority

- authority 顺序仍然是：用户最新指令 → `AGENTS.md` / `.specify/memory/constitution.md` → 本 feature 的 `spec.md / plan.md / tasks.md`。
- `longrun/*` 只作为项目背景与既有冻结事实来源，不是本 feature 的 truth source。
- `F-030` 的 feature-level truth source 只允许来自：
  1. Commander 指定的 packaged candidate lineage；
  2. 本 feature 冻结的 channel-specific passing gate；
  3. fresh packaged evidence；
  4. Commander 对 `PASS / BLOCKED / DECISION REQUIRED / EVIDENCE GAP` 的最终裁决。
- `zip / handoff / bundle / 展开目录` 只是交付载体称呼；本 feature 不争论名词，只冻结“哪一条 packaged evidence 链路足以支撑 DingTalk / WeCom 支持承诺”。

## 为什么必须单开 F-030

`F-027` 已经完成的是当晚 Mac UI-first packaged release surface 的冻结，且该 feature 的 outward promise 明确只承诺 `Feishu / DingTalk`，并对 WeCom 做了 de-scope。  
这不等于：

- DingTalk 已经拥有独立、完整、可复核的 packaged closure；
- WeCom packaged support 已经被证明 ready；
- true `F-014` 失败；
- officialization 可以被顺手并入。

因此 `F-030` 必须单开，作为：

1. **packaged support closure feature**
   - 把 DingTalk / WeCom 的 packaged 支持承诺从 `F-027` 的历史 outward promise 中拆出来，变成独立 gate。
2. **channel-specific evidence feature**
   - DingTalk 与 WeCom 各自独立过 gate，不能相互借证，也不能借 Feishu PASS 冒充 closure。
3. **support-promise feature**
   - 只收口 packaged support promise 与 packaged evidence；
   - 不推进 officialization；
   - 不回写 `F-027` 原本已经完成的 packaged promise。

## 与既有冻结 feature 的关系

### 与 `F-025-B` 的关系

- `F-025-B` 继续保持 `blocked on Windows-specific evidence`。
- `F-030` 不推进 Windows，不改写 `F-025-B` 状态，不把 packaged DingTalk / WeCom closure 倒灌回 Windows 线。
- 若后续需要 Windows packaged DingTalk / WeCom 证据，必须另开 Windows packet，而不是借 `F-030` 偷带。

### 与 true `F-014 = wecom-channel-integration` 的关系

- true `F-014` 已冻结为企业微信 bot-first 长连接主链。
- 最小真实入口仍然是 `Bot ID + Secret`。
- callback / 自建应用增强链路仍是 scenario-specific enhancement，不是默认 blocking gate。
- `F-030` 只能消费这些已冻结事实来判断 packaged WeCom 是否 ready，不能把 true `F-014` 改写成失败，也不能把 callback 重写成默认 blocking gate。

### 与 `F-026` 的关系

- `F-026` 已 verified closeout，不得重开。
- `F-030` 只消费 `F-026` 已冻结的 packaged-lifecycle carryover，例如 `/api/status.gatewayPort` authority 与 `18889` de-hardcoding 收口。
- 若 packaged candidate 与 `F-026` carryover 不一致，只能写成 `F-030` 的 packaged blocker / regression candidate，不得回写 `F-026` 失败。

### 与 `F-027` 的关系

- `F-027` 已冻结为当晚 Mac UI-first packaged support surface。
- `F-027` 对 WeCom 的 de-scope 是历史 outward promise narrowing，不是 true `F-014` 失败。
- `F-027` 当晚对 DingTalk 的 outward promise，也不自动构成 `F-030` 的 DingTalk packaged closure PASS。
- `F-030` 必须以新 feature 身份承载 DingTalk / WeCom packaged closure，不能 retroactively 把结果回写成 “`F-027` 早就包含了这件事”。

### 与 `F-024 / F-025-A` 的关系

- `F-024` 与 `F-025-A` 继续提供 channel baseline：
  - DingTalk 最小主链：`clientId + clientSecret`，`corpId` 仍是 optional metadata，`robotCode` 可作为 alias / baggage；
  - WeCom 最小主链：`botId + secret`，callback 非默认 gate。
- `F-030` 不重做 baseline，不重做 replay parity baseline，只验证 packaged support closure 是否沿这些已冻结 contract 成立。

### 与 officialization 的关系

- officialization 是另一条线。
- `F-030` 不负责 officialization contract alignment、对外正式 SLA、品牌级 release policy、或 broader packaged standardization。
- 若某个问题本质属于 officialization，而不是 packaged DingTalk / WeCom closure，必须停包并回 Commander。

## 当前 packaged candidate 与 carryover facts

### 当前主 candidate

- `dist/handoff/opensparrow-mac-ui-full-arm64-20260416-112006/opensparrow-0.1.0-alpha-mac-ui-arm64`
- `dist/handoff/opensparrow-mac-ui-full-arm64-20260416-112006.zip`

### 已吸收的 carryover facts

以下 facts 可作为 `F-030` 的背景前提，但**不是** DingTalk / WeCom closure 的充分证据：

1. packaged launcher 能起；
2. `/api/status` 与 `/dashboard` 可达；
3. packaged lifecycle bug 已修复；
4. cleanup / reset warning 不再写死 `18889`；
5. Feishu live smoke 已 PASS。

### 已吸收的 packaged wording carryover

当前 `20260416-112006` candidate lineage 继续承接了 `F-027` 的 packaged wording carryover：

1. 根目录 `01-开始部署.command` 仍是唯一官方 first-click path；
2. packaged docs 当前仍把 `Feishu / DingTalk` 写成当下支持面；
3. packaged docs 当前仍把 WeCom 写成“不属于今晚 packaged support promise”。

这些 wording carryover 只能作为 `F-030` 的历史背景，不自动构成 DingTalk / WeCom packaged closure 的 passing evidence。

### 当前 channel verdict 背景

#### DingTalk

- 当前不得记为 `PASS`。
- 当前口径：`DECISION REQUIRED`。
- 已有背景证据：
  - packaged root launcher / parser / `/api/status` / `/dashboard` 可达检查已做。
- 仍缺：
  - 本机已有真实 DingTalk profile / state，或
  - 用户已提供真实凭据，
  - 以及基于该真实输入完成的 packaged live install / post-install status / dashboard / lifecycle 全链路 fresh evidence。

#### WeCom

- 当前 packaged 不得记为 tonight-ready support。
- 当前口径：`EVIDENCE GAP`。
- 已有背景证据：
  - bounded probe；
  - existing config 可读；
  - UI / read-back 的有限 packaged surface 可读性。
- 仍缺：
  - packaged bot-first 主链上的 fresh real enablement；
  - packaged post-install status / dashboard / lifecycle evidence；
  - 不低于 true `F-014` floor 的 packaged live evidence。

## Scope

### In Scope

1. 冻结 `F-030` 的 feature 身份、channel-specific support promise、passing gate、admissible evidence 与 packet 顺序。
2. 为 DingTalk 定义 packaged closure implementation packet 与 live verification gate。
3. 为 WeCom 定义 packaged closure implementation packet 与 live verification gate，并显式继承 true `F-014` 的 bot-first floor。
4. 冻结 `bounded probe != packaged ready` 与 `dashboard readable != full channel closure` 的规则。
5. 冻结 implementation / review / verification / closeout 分离。
6. 冻结 noisy workspace 下的 packet attribution 规则。

### Out of Scope

- officialization contract alignment；
- `F-027` 的 retroactive promise rewrite；
- `F-026` / `F-025-B` / true `F-014` 的状态改写；
- Windows 线；
- broad cleanup / generic refactor；
- 全仓 docs parity；
- longrun writeback 的实际执行；
- 任何 secret 落盘或披露。

## 支持承诺模型

### Feature-level rule

- DingTalk 与 WeCom 必须分别过各自的 packaged passing gate。
- 一个 channel 的 PASS 不能替代另一个 channel 的 PASS。
- Feishu PASS 只能作为 shared packaged baseline control，不得作为 DingTalk / WeCom packaged closure 的代理证据。
- 只要 DingTalk 或 WeCom 仍处于 `BLOCKED / DECISION REQUIRED / EVIDENCE GAP`，`F-030` 就不得做 feature-level PASS closeout。

### Shared packaged baseline prerequisites

以下只是两个 channel 的共同前置，不构成 channel closure 本身：

1. Commander 指定的 packaged candidate lineage 明确；
2. 根目录 `01-开始部署.command` 可作为唯一官方 packaged first-click path 启动；
3. packaged `/api/status` 与 `/dashboard` 可达；
4. packaged lifecycle carryover 与 `gatewayPort` authority 沿 `F-026/F-027` 冻结结论成立。

## DingTalk passing gate

`F-030` 允许 DingTalk 进入 `PASS`，前提是以下条件全部被 fresh packaged evidence 支撑：

1. **artifact lineage 固定**
   - 证据必须来自 Commander 指定的 packaged candidate root 或其显式 recut successor。
2. **真实输入 route 明确**
   - 只能使用“用户已提供的真实凭据”或“本机已有真实 profile / state”；
   - 不得把假数据、占位 profile、纯 parser 成功、或旧截图当作真实输入 route。
3. **主链 contract 沿已冻结 baseline**
   - 最小主链仍是 `clientId + clientSecret`；
   - `corpId` 继续只是 optional metadata；
   - `robotCode` 只允许作为 alias / baggage，不得反向升级成默认 gate。
4. **packaged install / update fresh evidence**
   - 必须在 packaged artifact 上完成 DingTalk live install 或等价的 Commander-accepted fresh state activation；
   - source tree 安装、旧 candidate 安装、或纯 config reread 都不算。
5. **post-install status / dashboard closure**
   - packaged `/api/status`、Dashboard read-back、以及 install result 必须对同一 DingTalk state 给出一致结论；
   - `dashboard readable` 本身不算 closure，必须与 live install / live state activation 绑定。
6. **packaged lifecycle closure**
   - 在 relaunch / handoff / cleanup-reset 相关 packaged lifecycle 中，DingTalk 状态仍能被 fresh packaged evidence 解释；
   - 不能依赖旧 state、硬编码 `18889`、或 source-side patch 解释成功。

当前在满足以上 gate 之前，DingTalk 只能维持 `DECISION REQUIRED` 或 `EVIDENCE GAP`，不得写成 `PASS`。

## WeCom passing gate

`F-030` 允许 WeCom 进入 `PASS`，前提是以下条件全部被 fresh packaged evidence 支撑：

1. **artifact lineage 固定**
   - 证据必须来自 Commander 指定的 packaged candidate root 或其显式 recut successor。
2. **true `F-014` floor 不得下降**
   - packaged WeCom 不能低于 true `F-014` 已冻结的 bot-first 主链 floor；
   - 最小真实入口仍是 `Bot ID + Secret`；
   - callback / 自建应用 enhancement 仍不是默认 blocking gate。
3. **真实输入 route 明确**
   - 只能使用“用户已提供的真实凭据”或“本机已有真实 bot-first profile / state”；
   - 不得把 bounded probe、existing config readable、或 UI 可见字段当作真实 packaged support evidence。
4. **packaged bot-first enablement**
   - packaged install / update / activation 必须在 bot-first 主链上成立；
   - packaged runtime / plugin pair 不得依赖 source fallback 或未声明的外部修补。
5. **post-install status / dashboard closure**
   - packaged `/api/status`、Dashboard read-back、probe / readiness surface 必须指向同一 bot-first packaged state；
   - `bounded probe` 本身不算 ready，必须与真实 enablement 绑定。
6. **packaged lifecycle closure**
   - relaunch / handoff / cleanup-reset 后，WeCom packaged state 仍与 bot-first mainline 一致；
   - 不能借 lifecycle 结果把 callback 写成默认 gate。
7. **真实 channel-side evidence**
   - 由于 true `F-014` 的 passing floor已经包含 real enablement、successful readiness、以及至少一次真实消息往返，`F-030` 不得在缺少同级 packaged evidence 时宣称 packaged WeCom support ready。

当前在满足以上 gate 之前，WeCom 只能维持 `EVIDENCE GAP`、`DECISION REQUIRED` 或 `BLOCKED`，不得写成 `PASS`。

## 什么证据算 admissible

### Admissible evidence

以下证据才允许被 `F-030` 接受：

1. Commander 指定 packaged candidate lineage 上的 fresh packaged evidence；
2. 根目录 `01-开始部署.command` 启动出来的 packaged UI-first session；
3. 基于“用户已提供的真实凭据”或“本机已有真实 profile / state”的 channel-specific fresh evidence；
4. 与同一次 packaged session 绑定的 install / update / activation、`/api/status`、Dashboard read-back、lifecycle 证据；
5. 与当前 packet write-set 明确可归因的 packaged docs / UI / runtime / plugin / wrapper surface 变化；
6. WeCom bot-first 主链上的 real enablement / readiness / message-side evidence；
7. DingTalk minimal mainline上的 live install / post-install / lifecycle evidence。

### Inadmissible evidence

以下内容明确**不算** `F-030` closure evidence：

1. `bounded probe`；
2. `dashboard readable`；
3. `/api/status` 可达；
4. root launcher / parser / UI reachability；
5. Feishu PASS；
6. 历史截图、旧 longrun、旧 closeout 文本、旧 source-level run；
7. source tree 上的 install / runtime / plugin 成功；
8. 只看到 existing config 可读；
9. 没有真实输入 route 的 dry-run / placeholder profile；
10. 把 dirty workspace 整仓状态直接当成当前 packet 越界证明。

## Explicit Rules

### `bounded probe != packaged ready`

- `bounded probe` 只能证明某个有限 probe surface 可响应；
- 它不能证明 packaged install / post-install status / dashboard / lifecycle 全链路已经闭合；
- 对 WeCom 而言，bounded probe 更不能替代 true `F-014` floor。

### `dashboard readable != full channel closure`

- Dashboard 可读只能说明 packaged read surface 能打开；
- 它不能证明 install / activation / lifecycle / runtime-plugin readiness 已经成立；
- 只有与同一次 packaged live chain 绑定时，dashboard evidence 才有 closure 价值。

## Execution Discipline

### implementation / review / verification / closeout 必须分离

- `PKT-030-A` 只做 feature freeze，不做实现。
- `PKT-030-B` 与 `PKT-030-C` 只做 implementation closure，不给 PASS。
- `PKT-030-D` 只做 fresh live verification，不补实现。
- `PKT-030-E` 只做 facts-only closeout / longrun writeback，不制造新 authority。
- 同一 packet 的 owner、reviewer、verifier 不能由同一人兼任。

### noisy workspace 下的 packet attribution

- packet 只能按其声明的 write-set 与 read-set评估。
- unrelated dirty files、历史生成物、或其他 packet 的未清理状态，不自动构成当前 packet 越界。
- reviewer / verifier 若要认定 scope drift，必须指出：
  1. 具体文件或 artifact surface；
  2. 它为什么落在当前 packet write-set 之外；
  3. 它如何影响当前 packet 的结论。
- 默认不允许把整仓 dirty state 当作当前 packet 的失败证据。

## 推荐 packet 切分

1. **`PKT-030-A = feature freeze / support promise / channel-specific evidence gate`**
   - 只冻结 feature 身份、support promise、per-channel passing gate、evidence gate、role boundary 与 packet attribution 规则。

2. **`PKT-030-B = DingTalk packaged closure implementation`**
   - 只收口直接服务 DingTalk packaged closure 的实现 / wording / artifact-generation gap；
   - 不给 PASS，只把 DingTalk 推到“ready for fresh live verification”或明确 blocker。

3. **`PKT-030-C = WeCom packaged closure implementation`**
   - 只收口直接服务 WeCom packaged closure 的实现 / wording / runtime-plugin / artifact-generation gap；
   - 必须始终沿 true `F-014` bot-first 主链，不给 PASS。

4. **`PKT-030-D = fresh live verification-only`**
   - 只用 fresh packaged evidence给 DingTalk 与 WeCom分别出 verdict；
   - 不补实现，不重写 support promise。

5. **`PKT-030-E = facts-only closeout / longrun writeback`**
   - 只搬运 `D` 已证实的事实；
   - 不能借 closeout 回写 `F-025-B`、`F-026`、`F-027`、true `F-014`、或 officialization。

## Requirements

### Functional Requirements

- **FR-001**: 必须把 `F-030` 写成新的独立 feature，而不是 `F-027` 的补注、officialization 的子包、或 true `F-014` rewrite。
- **FR-002**: 必须明确 `F-025-B` 继续保持 `blocked on Windows-specific evidence`。
- **FR-003**: 必须明确 true `F-014` 仍然是 bot-first 长连接主链，`Bot ID + Secret` 是最小真实入口，callback 不是默认 blocking gate。
- **FR-004**: 必须明确 `F-026` 与 `F-027` 的冻结结论不得回退。
- **FR-005**: 必须把 DingTalk 与 WeCom 的 packaged passing gate 分开写清楚。
- **FR-006**: 必须明确 `bounded probe != packaged ready`。
- **FR-007**: 必须明确 `dashboard readable != full channel closure`。
- **FR-008**: 必须把 admissible / inadmissible evidence 写清楚。
- **FR-009**: 必须明确 implementation / review / verification / closeout 分离。
- **FR-010**: 必须明确 noisy workspace 下只能做 packet attribution，不能把整仓 dirty state 当作当前 packet 越界。
- **FR-011**: `PKT-030-B` 与 `PKT-030-C` 必须只做 implementation closure，不得自行宣告 `PASS`。
- **FR-012**: `PKT-030-D` 必须是 verification-only packet，且 feature-level PASS 只能来自 `D` 的 fresh evidence。
- **FR-013**: `PKT-030-E` 必须是 facts-only closeout / longrun writeback packet，不能制造新 truth。

### Non-Goals

- **NG-001**: 不推进 officialization。
- **NG-002**: 不 retroactively 改写 `F-027` 的 packaged support promise。
- **NG-003**: 不重写 true `F-014`、`F-026`、`F-025-B` 的状态。
- **NG-004**: 不推进 Windows。
- **NG-005**: 不做 broad cleanup / generic refactor / broader docs parity。
- **NG-006**: 不把 Feishu PASS 借给 DingTalk / WeCom。

## Success Criteria

- **SC-001**: Commander 阅读 `spec / plan / tasks` 后，可以直接派发 `PKT-030-A` 到 `PKT-030-E`，无需再补 scope freeze。
- **SC-002**: 阅读文档的人不会把 `F-030` 误读成 officialization、`F-027` rewrite、或 true `F-014` failure。
- **SC-003**: 文档明确把 DingTalk 与 WeCom 的 packaged passing gate、admissible evidence 与 inadmissible evidence 分开写清楚。
- **SC-004**: 文档明确禁止使用 `bounded probe`、`dashboard readable`、`/api/status` reachability、或 Feishu PASS 伪造 closure。
- **SC-005**: 文档明确把 implementation / review / verification / closeout 分层。
- **SC-006**: 文档明确规定 noisy workspace 只能做 packet attribution，不能整仓归罪。
- **SC-007**: 文档明确 feature-level PASS 需要两个 channel 都完成自身 gate，或者 Commander 显式拆出后续 feature，而不是默认借用历史 promise。

## Commander Decision Points

以下事项允许进入 Commander 最终裁决，但不得由 worker 自行扩 scope：

1. **candidate lineage selection**
   - 当前主 candidate 已冻结为 `20260416-112006` lineage；
   - 若需要 recut successor，必须由 Commander 显式指定。

2. **DingTalk real-input route**
   - 使用“用户已提供的真实凭据”，还是“本机已有真实 profile / state”作为 live verification 起点。

3. **WeCom packaged promise path**
   - 是继续补 WeCom packaged closure，还是在 gap 明确前维持 de-scope；
   - 该裁决不能改写 true `F-014` 的成功事实。

4. **B/C execution serialization**
   - `PKT-030-B` 与 `PKT-030-C` 默认按 serial 执行；
   - 只有在 Commander 明确切出 disjoint write-set 时才允许并行。

5. **feature closeout threshold**
   - 若只有一个 channel 过 gate，Commander 只能维持 feature open 或显式切新 feature，不得默认把 `F-030` 记成完成。
