# Skills 目录说明（维护者必读）

> **重要**：Skills 文件不提交 Git（太大），但 USB 交付包里必须包含。
> 本文档说明 Skill 文件应该放在哪里，以及构建 USB 包时如何处理。

---

## 目录结构

```
opensparrow/                        ← 项目根目录
├── skills/
│   ├── My_Skills/                  ← ⚠️ 行业技能包（不提交 Git）
│   │   ├── Business/               ← ~11,000 个技能
│   │   ├── Education/              ← ~11,000 个技能
│   │   ├── Finance/                ← ~10,600 个技能
│   │   ├── Government/             ← ~10,300 个技能
│   │   ├── Healthcare/             ← ~10,400 个技能
│   │   └── Utilities/              ← ~10,100 个技能
│   └── openclaw-local-feishu-usb/  ← OpenClaw 飞书技能（已提交 Git）
├── superpowers/                    ← 基础技能包（不提交 Git）
│   ├── brainstorming.md
│   ├── writing-plans.md
│   ├── test-driven-development.md
│   └── ...（共 27 个文件）
```

## 什么在 Git 里，什么不在

| 目录 | 在 Git 里？ | 大小 | 说明 |
|------|------------|------|------|
| `skills/My_Skills/` | ❌ 不在 | ~424MB | .gitignore 排除 |
| `superpowers/` | ❌ 不在 | ~200KB | .gitignore 排除 |
| `skills/openclaw-local-feishu-usb/` | ✅ 在 | 很小 | 已提交 |

## 新人 / 新机器 / 重新 clone 后怎么办

当你 `git clone` 项目后，`skills/My_Skills/` 和 `superpowers/` 是空的。
你需要手动把技能文件放回来：

### 方法 1：从 USB 包拷贝（推荐）
如果你有一份已经构建好的 USB 包，从里面拷贝：
```bash
# 拷贝行业技能包
cp -r /Volumes/USB包/opensparrow/skills/My_Skills ./skills/

# 拷贝基础技能包
cp -r /Volumes/USB包/opensparrow/skills/superpowers ./superpowers/
```

### 方法 2：从另一台已有的机器拷贝
```bash
scp -r 同事机器:/path/to/opensparrow/skills/My_Skills ./skills/
scp -r 同事机器:/path/to/opensparrow/superpowers ./superpowers/
```

## 构建 USB 包时的处理

运行 `bash scripts/build-usb-pack.sh` 时，脚本会：
1. 从 `superpowers/` 复制基础包到 `dist/usb-pack/opensparrow/skills/superpowers/`
2. 从 `skills/My_Skills/` 复制行业包到 `dist/usb-pack/opensparrow/skills/My_Skills/`
3. 如果这些目录不存在，脚本会警告但不会失败

## 用户安装时会发生什么

用户双击安装后，OpenSparrow 自动把技能文件复制到用户目录：
- superpowers → `~/.claude/skills/superpowers/` 和 `~/.codex/skills/superpowers/`
- 用户选择的行业包 → `~/.claude/skills/My_Skills/<分类>/` 和 `~/.codex/skills/My_Skills/<分类>/`

用户不需要知道这些细节，一切自动完成。
