# Windows 旗舰版 PRD 交接稿

**文档类型**：产品 / 开发联合交接文档  
**主题**：Windows 全量设计 + 第一阶段实现  
**适用对象**：产品经理、GPT Pro、开发人员、验证人员  
**当前日期**：2026-04-22  
**状态**：可直接用于 GPT Pro 开工，不代表 Windows 已验证通过

---

## 1. 这份文档要解决什么问题

当前 OpenSparrow unified repo 在 mac packaged 线上已经积累出比较成熟的做法，但 Windows 这条线仍然存在几个问题：

1. 安装入口分散，`.cmd`、`.ps1`、wrapper、companion 的职责边界不够清楚。
2. Windows 的 replay fidelity、diagnostics parity、lifecycle 一直没有被完整梳理。
3. 很多 Windows 问题不是单点 bug，而是“入口、路径、profile、权限、诊断、重启”这些面一起造成的。
4. 之前的设计稿更像内部执行说明，不像产品和开发都能直接消费的交接 PRD。

所以这份文档的目的很明确：

- 把 Windows 这条线改成一份清晰、可执行、可交接的 PRD。
- 让 GPT Pro 可以基于同一份文档直接做 `设计 + 第一阶段实现`。
- 同时保护当前本地正在进行的 `Mac packaged / DingTalk / WeCom` 收口线，避免互相踩踏。

---

## 2. GPT Pro 要基于哪一条代码线工作

### 2.1 GitHub / 根仓基线

GPT Pro 做 Windows 的**主基线**应该看这里：

- 仓库路径：`/Users/eduardogan/Desktop/GHJProject/opensparrow`
- 当前 branch：`017-codespec-framework-adaptation`
- 当前 HEAD：`45868270605da48139d83defe9d7c3fffc518ade`
- upstream：`origin/017-codespec-framework-adaptation`

这条是当前最适合 GPT Pro 读取、设计、修改、提交的 GitHub 视角基线。

### 2.2 本地只读参考线

还有一条**只读参考线**，用于理解当前 mac packaged/channel 最新真相：

- worktree：`/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`
- branch：`feature/p0-packaged-mac-diagnostics`
- latest pushed HEAD：`aa4403ac0fc07bd1563440906a2f1025396b9fed`
- latest pushed commit message：`feat(packaged-mac): close dingtalk and wecom packaged evidence`
- remote branch：`origin/feature/p0-packaged-mac-diagnostics`

这条线**不是 GPT Pro 的开发基线**，只用于理解：

- 当前 mac packaged 的 runtime truth
- DingTalk / WeCom channel 如何定义证据
- diagnostics / export / install-state 应该长什么样

### 2.3 推荐给 GPT Pro 的工作方式

推荐 GPT Pro：

1. 从根仓 branch `017-codespec-framework-adaptation` 开始；
2. 新开自己的 Windows 工作分支，例如：
   - `feature/p0-windows-flagship-design`
3. 以根仓为主做设计和实现；
4. 只把 packaged-mac worktree 当只读参考，不要在那条线直接开发。

---

## 3. GPT Pro 必看交接包（zip / 目录）

### 3.1 必看：最新成功证据包

这是**现在最重要、最应该先看**的交接包：

- [opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass.zip](/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass.zip)
- 对应目录：
  - [opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass](/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass)

这个包的价值：

1. 它证明最新 fresh mac artifact 上，DingTalk 和 WeCom 都已经走通 real `/api/install`。
2. 它证明 `/api/install`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics/export` 这些面如何保持一致。
3. 它是 Windows 设计时最重要的“方法论参考”，尤其适合拿来定义 Windows diagnostics parity。
4. 它对应的 packaged-mac 代码参考提交是：
   - branch：`feature/p0-packaged-mac-diagnostics`
   - commit：`aa4403ac0fc07bd1563440906a2f1025396b9fed`
   - remote：`origin/feature/p0-packaged-mac-diagnostics`

### 3.2 次优先：WeCom 历史堵塞演进包

如果 GPT Pro 需要理解“一个 channel 是怎么从 blocker 变成 pass 的”，可以再看：

- [opensparrow-gptpro-handoff-20260422-1247-wecom-gate-hardening.zip](/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1247-wecom-gate-hardening.zip)
- [opensparrow-gptpro-handoff-20260422-1136-wecom-plugin-block](/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1136-wecom-plugin-block)

这两个包的意义：

1. 说明“第一真实 gate 失败时，系统应该怎么停住”；
2. 说明“follow-on error” 为什么比真实 blocker 更糟；
3. 可作为 Windows 侧错误设计的反例参考。

### 3.3 可以忽略的旧包

下面这些更早的 handoff，默认不是 GPT Pro 的首选输入：

- `opensparrow-gptpro-handoff-20260421-2354`
- `opensparrow-gptpro-handoff-20260422-0033`
- `opensparrow-gptpro-handoff-20260422-1103-wecom`

除非要回溯历史，否则不建议优先看它们。

---

## 4. 这次 Windows 要交付什么

这次不是“修几个 Windows 脚本”，而是做一条**健康的、可维护的、可验证的 Windows 旗舰版方案**。

### 4.1 本轮交付目标

本轮要交付两部分：

1. `Windows 全量设计`
2. `Windows 第一阶段实现`

### 4.2 第一阶段实现是什么意思

第一阶段不是“只做文档”，也不是“什么都不敢动”。  
第一阶段的真实含义是：

- 先把 Windows 自己最核心、最独立的那部分问题收口；
- 先把入口、路径、profile、wrapper、diagnostics、lifecycle 做健康；
- 必要时可以碰公共 helper 或前端逻辑；
- 但不要去碰当前本地正在进行的 mac packaged/channel 收口文档和代码。

换句话说，这一轮不是保守，而是要避免 GPT Pro 浪费时间在和本地 Mac 线冲突的面上。

---

## 5. 产品目标

### 5.1 总目标

让 Windows 版本达到下面这几个标准：

1. 用户一键安装行为稳定；
2. 安装后的 replay 行为与产品定义一致；
3. 出问题时能导出可信的诊断信息；
4. 重启、重装、重置、多 profile、多实例等场景不再混乱；
5. Windows 不再依赖“经验主义试错”，而是有可执行的 truth inventory 和 test matrix。

### 5.2 成功后用户实际能得到什么

如果这轮做对，最终用户会看到这些改进：

1. 双击 `.cmd` / `.ps1` 后，安装流程更稳定，不容易卡死或误报成功；
2. Windows 上的 channel replay 字段不再漂移；
3. 即使失败，也能通过 `install-state.json`、`install.log`、`diagnostic-bundle.json`、`/api/diagnostics/export` 明确看出失败在哪一层；
4. 多次安装 / 切 profile / 换目录 / 重开服务，不会更容易把系统带乱；
5. 验证人员拿到包后，不需要靠口头解释猜系统状态。

---

## 6. 这次 Windows 需要重点解决的模块

下面这些是 GPT Pro 需要重点梳理和改造的模块面。

### 6.1 安装入口与 wrapper

目标：

1. `.cmd` 与 `.ps1` 的入口职责清楚；
2. wrapper 不再自创第二套 authority；
3. wrapper 输出和后端 authoritative truth 对齐。

重点关注：

- `platforms/windows/wrappers/*.cmd`
- `platforms/windows/wrappers/*.ps1`
- Windows companion / bootstrap 相关脚本

### 6.2 路径、home、profile、实例定位

目标：

1. 稳定解析 `HOME / USERPROFILE / HOMEDRIVE / HOMEPATH`；
2. 支持非标准目录；
3. 支持多 profile；
4. 避免多实例 / 多 worktree / 多进程 attach 错目标。

### 6.3 Replay fidelity

目标：

1. 保住 Feishu 基线；
2. 保住 DingTalk / WeCom 的字段契约；
3. 不因 Windows wrapper 的重组逻辑导致 payload 漂移。

特别要记住：

- DingTalk 最小主链还是 `clientId + clientSecret`
- `corpId` 是 metadata，不是默认 blocker
- WeCom 最小主链还是 `botId + secret`
- true `F-014` 仍然是 bot-first / 长连接主链

### 6.4 Diagnostics parity

目标：

让 Windows 拥有和当前成功 mac packaged 线同等级的诊断面：

1. `/api/install/status`
2. `/api/diagnostics`
3. `/api/diagnostics/export`
4. `install-state.json`
5. `install.log`
6. `diagnostic-bundle.json`

要求：

- 这些面必须尽量描述同一份 truth；
- 不能每个面说一套不同故事；
- 失败时也要能导出。

### 6.5 Lifecycle

目标：

Windows 不只要“第一次安装能跑”，还要明确这些生命周期：

1. first install
2. relaunch
3. reset
4. reinstall
5. handoff unpack then run
6. stop / uninstall / restart

### 6.6 Host reality

目标：

把 Windows 的真实宿主环境当约束，而不是假定“大家都在理想环境”。

必须覆盖：

1. PowerShell 5 / 7 差异
2. `schtasks`
3. UAC
4. Defender / SmartScreen
5. 路径编码
6. CRLF / UTF-8 / BOM
7. 提权用户与普通用户

---

## 7. GPT Pro 可以改哪里

这次不要再把范围写得很死。  
原则应该是：

- **除了当前本地正在收口的 Mac 代码和 Mac channel 文档外，Windows 相关面都可以改。**

### 7.1 可以改的范围

原则上，下面这些都允许 GPT Pro 动：

1. `platforms/windows/**`
2. `scripts/**` 里与 Windows 交付、安装、验证相关的部分
3. `ui/**` 里为 Windows replay / diagnostics / lifecycle 服务的前端或 helper
4. `specs/025-channel-replay-doc-parity/**`
5. `docs/**` 中与 Windows 交付、使用、验证直接相关的文档
6. Windows 需要的测试文件

### 7.2 不要改的范围

只保护下面这些面：

1. 不要改当前本地正在工作的 mac packaged worktree：
   - `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics/**`
2. 不要改当前 Mac channel 收口文档：
   - `specs/030-packaged-dingtalk-wecom-support-closure/**`
3. 不要主动改我当前本地 Mac packaged 这条线的结论文档与证据材料。

### 7.3 对公共代码面的真实要求

如果 GPT Pro 判断 Windows 要健康，必须改到公共 helper、UI 辅助层、映射层，那是允许的。  
唯一要求是：

1. 不能把当前 Mac packaged 行为搞回归；
2. 不能去改本地 worktree 的 Mac 收口线；
3. 改完必须给 fresh verification 证据。

---

## 8. 改完之后应该达到什么效果

这部分是这份 PRD 最关键的“结果视角”。

### 8.1 对产品经理的结果

产品经理看结果时，应该能得到：

1. Windows 这条线的范围被讲清楚了；
2. 为什么要改这些地方、不是别的地方，被讲清楚了；
3. 改完后用户能得到什么、失败时能看到什么，被讲清楚了；
4. 哪些还没验证、哪些已经具备验证条件，被讲清楚了。

### 8.2 对开发的结果

开发看结果时，应该能得到：

1. 哪些文件最值得先改；
2. 改动优先顺序是什么；
3. 改完要跑哪些验证；
4. 哪些 bug 是本轮必须消掉的；
5. 哪些风险是本轮先不碰、但要在文档里留口子的。

### 8.3 对验证的结果

验证看结果时，应该能得到：

1. 一份清楚的 test matrix；
2. 一份清楚的 evidence checklist；
3. 一份清楚的 admissible / non-admissible evidence 标准；
4. 一套可落地的 fresh verification 路径。

---

## 9. 这次要避免哪些 bug / 反模式

这部分是给 GPT Pro 和开发看的“防踩坑清单”。

### 9.1 authority split

不要一边看根仓、一边看 worktree 草稿、一边自己脑补 authority。  
要先把规则统一，再实现。

### 9.2 wrapper 成第二套 authority

不要让 Windows wrapper 自己重新发明配置契约、成功判定、状态语义。

### 9.3 把 callback 升格成默认 blocker

true `F-014` 还是 bot-first / 长连接主链。  
WeCom callback 不应被写成默认阻断条件。

### 9.4 把 mac 证据当 Windows 证据

mac 的 fresh evidence 只能借方法，不能借结论。

### 9.5 只看 UI，不看真实证据面

`dashboard readable` 不等于通过。  
必须看 `install-state / diagnostics / export / probe`。

### 9.6 失败停错层级

不要让系统在第一真实 gate 已经失败后，还继续往后跑，制造 follow-on error。

### 9.7 gateway-fallback 误判

在 Windows 某些权限环境里，`gateway-fallback` 可能是可接受状态，不一定等于失败。

---

## 10. 验证要求

### 10.1 设计验证

设计至少要能回答这些问题：

1. 哪些地方要改；
2. 为什么改；
3. 改完达到什么；
4. 防什么 bug；
5. 怎么验证。

### 10.2 实现验证

GPT Pro 改完之后，至少要给出这些 fresh verification：

1. PowerShell 语法检查或 dry-run
2. `.cmd` / `.ps1` 入口验证
3. replay fidelity 相关验证
4. diagnostics parity 相关验证
5. lifecycle 相关验证
6. 如果有不能验证的项，要明确写“未验证”

### 10.3 不允许的说法

在没有 fresh Windows-specific evidence 之前，不允许写：

1. PASS
2. DONE
3. ready for close
4. F-025-B 已解封

可以写的说法是：

1. design complete
2. implementation phase 1 complete
3. ready for Windows-specific verification
4. remaining evidence gap

---

## 11. 建议 GPT Pro 交付的输出结构

GPT Pro 最后不要给一堆零散信息，而是按下面结构交付：

1. 产品目标与设计决策
2. 改动范围与主要文件
3. 为什么这样改
4. 改完达到的效果
5. 避免了哪些 bug / 风险
6. fresh verification 跑了什么
7. 哪些还没有 Windows-specific evidence

---

## 12. 一句话交接结论

你可以把这次 Windows 任务理解成：

> 基于根仓 `017-codespec-framework-adaptation @ 45868270605da48139d83defe9d7c3fffc518ade`，参考最新成功的 mac packaged 证据包 `opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass.zip`，以及 packaged-mac 只读参考提交 `feature/p0-packaged-mac-diagnostics @ aa4403ac0fc07bd1563440906a2f1025396b9fed`，完成一份面向产品和开发都能消费的 Windows 旗舰版设计，并直接推进第一阶段实现；除当前本地正在收口的 Mac packaged / Mac channel 文档与代码外，其余 Windows 相关范围都可以调整，但必须用 fresh verification 证明改动有效，且不能把 Windows 写成已通过验证。
