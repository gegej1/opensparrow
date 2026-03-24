# F-002 Runbook - Skill 打磨

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`

## 概述
- 让新成员仅依据 Skill 就能完成安装、验证、排障和收口。
- 本文是内容补齐型 runbook，用来统一 Skill 必须覆盖的最小信息集合。

## 前置条件
- 已有 `skills/openclaw-local-feishu-usb/SKILL.md` 可供修改。
- 最好先完成一次 F-001 实跑，这样 Skill 中可以直接引用真实命令、证据路径和排障经验。
- 需要同时对照安装 runbook 与安全收口 runbook，避免 Skill 只讲安装、不讲验证和收口。

## 操作步骤
1. 打开 Skill 与关联 runbook 对照阅读

   ```bash
   sed -n '1,220p' skills/openclaw-local-feishu-usb/SKILL.md
   sed -n '1,220p' docs/runbooks/F-001-install-and-configure.md
   sed -n '1,220p' docs/runbooks/F-004-security-hardening.md
   ```

   - 先确认 Skill 当前是否已经覆盖完整的安装、验证、排障与收口链路。

2. 按清单补齐必补内容

   ```bash
   # 无固定命令，按下列清单补齐 Skill 文档内容
   ```

   - 必补内容：
     - 隔离 profile 与独立端口说明
     - 实际执行命令
     - 证据文件路径
     - 常见失败场景与日志查看方式
     - 收口命令入口

## 验证方法
- 逐项核对 Skill 是否明确包含以上 5 类信息。
- 让新成员仅根据 Skill 执行时，不应再额外追问“profile 用哪个”“证据放哪里”“怎么收口”。
- 若 Skill 已能独立支撑一次安装与收口演练，则视为通过。

## 故障排查
- Skill 只有安装没有验证：补引用 `docs/runbooks/F-001-install-and-configure.md` 的通过标准和证据路径。
- Skill 缺少收口动作：补引用 `docs/runbooks/F-004-security-hardening.md` 的 harden 命令和复验命令。
- Skill 缺少排障线索：至少补日志查看路径、常见失败场景和检查命令。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `docs/runbooks/F-001-install-and-configure.md`
- `docs/runbooks/F-004-security-hardening.md`
- `skills/openclaw-local-feishu-usb/SKILL.md`
