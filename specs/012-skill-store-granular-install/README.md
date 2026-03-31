# spec-012: Skill 商店与细粒度安装

## 📋 基本信息

- **Spec ID**: 012
- **标题**: Skill 商店与细粒度安装
- **状态**: 📝 Planning
- **优先级**: P0（M3 阻塞）
- **负责人**: Commander
- **创建日期**: 2026-03-31
- **目标里程碑**: M3

---

## 🎯 目标

将当前"安装向导中批量选择 Skill 分类"的模式，改造为"安装后在 Dashboard 中按需安装单个 Skill"的模式。

### 核心问题
1. **当前问题**: Step 4 选择分类后，一次性复制 100+ MB，包含数千个 Skill 文件
2. **用户痛点**: 安装时间长，用户可能不需要这么多 Skill，无法动态管理
3. **体验问题**: 安装向导应该快速完成基础配置，Skill 应该是可选的增值功能

### 期望结果
1. 安装向导简化为 3 步（渠道 + 凭证 + API），跳过 Skill 选择
2. Dashboard 新增"Skill 商店"页面，展示所有可用 Skill
3. 用户可以浏览、搜索、安装、卸载单个 Skill
4. 支持查看 Skill 详情（描述、参数、示例）

---

## 📊 现状分析

### 当前架构

**Skill 来源**:
- `superpowers/` - 核心 Skill（32 文件，264KB）
- `skills/My_Skills/` - 行业 Skill（6 分类，69,342 文件，424MB）

**当前流程**:
1. 安装向导 Step 4: 用户勾选分类（如"开发者工具"、"数据分析"）
2. 点击"安装"时，`installSkills()` 批量复制整个分类目录
3. 复制到 `~/.openclaw/skills/` 和 `~/.codex/skills/`

**问题**:
- 分类粒度太粗（一个分类包含数千个 Skill）
- 无法查看单个 Skill 的详情
- 安装后无法管理（增删改）

---

## 🎨 设计方案

### 方案 A: Skill 商店（推荐）

**安装向导简化**:
- Step 1: 渠道选择
- Step 2: 凭证配置
- Step 3: API 配置
- ~~Step 4: Skill 选择~~（移除）
- 默认仅安装 `superpowers/`（264KB）

**Dashboard 新增 Skill 商店**:
- 新增 Tab: "Skill 商店"
- 展示所有可用 Skill（从 `skills/My_Skills/` 扫描）
- 支持按分类筛选、搜索
- 每个 Skill 显示：名称、描述、分类、状态（已安装/未安装）
- 点击"安装"按钮 → 仅复制该 Skill 文件
- 点击"卸载"按钮 → 删除该 Skill 文件

---

## 🔧 技术实现

### 1. 前端改造

**ui/public/index.html**:
- 移除 Step 4 相关代码（行 539-600）
- 修改步骤导航为 3 步
- 移除 `selectedSkillCategories` 数据
- 移除 `toggleSkillCategory()` 方法

**ui/public/dashboard.html**:
- 新增 Tab: "Skill 商店"
- 新增 Skill 列表组件（表格或卡片）
- 新增搜索框、分类筛选器
- 新增安装/卸载按钮

### 2. 后端改造

**ui/server.mjs**:

修改 `/api/install`:
```javascript
// 移除 selectedSkillCategories 参数
// 默认仅安装 superpowers/
async function installSkills(selectedCategories = []) {
  // 仅复制 superpowers/
  // 不再批量复制 My_Skills/
}
```

新增 API:
```javascript
// GET /api/skills/list - 列出所有可用 Skill
// POST /api/skills/install - 安装单个 Skill
// DELETE /api/skills/uninstall - 卸载单个 Skill
```

### 3. Skill 元数据扫描

需要扫描 `skills/My_Skills/` 目录，提取每个 Skill 的元数据：
- Skill 名称（从文件名或 frontmatter 提取）
- 描述（从 frontmatter 提取）
- 分类（从目录结构推断）
- 文件路径

---

## 📝 实现任务

### Task 1: 简化安装向导（P0）
- [ ] 移除 index.html Step 4 代码
- [ ] 修改步骤导航为 3 步
- [ ] 修改 server.mjs `/api/install` 默认不装 industry skills
- [ ] 测试安装流程

### Task 2: Skill 商店 UI（P0）
- [ ] dashboard.html 新增"Skill 商店" Tab
- [ ] 实现 Skill 列表展示（表格或卡片）
- [ ] 实现搜索和分类筛选
- [ ] 实现安装/卸载按钮

### Task 3: Skill 商店 API（P0）
- [ ] 实现 GET /api/skills/list
- [ ] 实现 POST /api/skills/install
- [ ] 实现 DELETE /api/skills/uninstall
- [ ] 测试 API 功能

### Task 4: E2E 验证（P1）
- [ ] Mac 端验证完整流程
- [ ] Windows 端验证完整流程
- [ ] 更新测试报告

---

## 🎯 验收标准

### 功能验收
- [ ] 安装向导为 3 步，无 Skill 选择
- [ ] 安装完成后仅包含 superpowers/（~264KB）
- [ ] Dashboard 有"Skill 商店" Tab
- [ ] 可以浏览所有可用 Skill（~69k 个）
- [ ] 可以搜索 Skill（按名称）
- [ ] 可以按分类筛选（6 个分类）
- [ ] 可以安装单个 Skill（复制到 ~/.openclaw/skills/）
- [ ] 可以卸载单个 Skill（删除文件）
- [ ] 安装/卸载后状态实时更新

### 性能验收
- [ ] 安装向导完成时间 < 30 秒（不含 Skill）
- [ ] Skill 列表加载时间 < 3 秒
- [ ] 单个 Skill 安装时间 < 5 秒

---

## 📅 时间规划

- **Task 1**: 2 小时（前端 + 后端简化）
- **Task 2**: 3 小时（Skill 商店 UI）
- **Task 3**: 3 小时（Skill 商店 API）
- **Task 4**: 1 小时（E2E 验证）
- **总计**: 9 小时

---

## 🚨 风险与依赖

### 风险
1. **Skill 元数据提取**: My_Skills/ 中的 Skill 可能没有统一的 frontmatter 格式
2. **性能问题**: 69k 个 Skill 的列表渲染可能卡顿
3. **兼容性**: 需要确保 Windows/Mac 路径处理一致

### 缓解措施
1. 使用简单的文件名作为 Skill 名称，描述可选
2. 前端分页或虚拟滚动，每页显示 50 个
3. 使用 path.join() 统一路径处理

---

## 📚 参考资料

- 现有代码: `ui/server.mjs` (installSkills 函数)
- 现有代码: `ui/public/index.html` (Step 4)
- Skill 清点报告: `docs/skill-pack-inventory.md`
