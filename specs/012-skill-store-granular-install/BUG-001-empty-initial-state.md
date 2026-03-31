# BUG-001: Skill 商店初始状态为空

## 问题描述

**当前行为**：
- 用户进入 Skill 商店 Tab 后，看到"没有匹配的 Skill"空状态
- 需要手动点击"刷新"或选择分类才能看到 Skill 列表

**期望行为**：
- 进入 Skill 商店后，**自动加载并显示第一页 Skill**（默认 50 个）
- 用户可以立即浏览、搜索、翻页

## 根本原因

`dashboard.html` 的 `loadSkills()` 方法没有在页面加载时自动调用。

## 用户影响

- **严重程度**: P0（核心功能不可用）
- **用户体验**: 用户不知道有哪些 Skill 可用，无法浏览和搜索

## 复现步骤

1. 完成安装向导
2. 进入 Dashboard
3. 点击"Skill 商店" Tab
4. 看到空状态："没有匹配的 Skill"

## 修复方案

### 前端修改（dashboard.html）

在切换到 Skill 商店 Tab 时，自动调用 `loadSkills()`：

```javascript
// 监听 Tab 切换
watch: {
  currentTab(newTab) {
    if (newTab === 'skills' && !this.skillList.length && !this.skillLoading) {
      this.loadSkills(); // 自动加载第一页
    }
  }
}
```

或者在页面初始化时就加载：

```javascript
mounted() {
  // 如果默认 Tab 是 skills，立即加载
  if (this.currentTab === 'skills') {
    this.loadSkills();
  }
}
```

## 验收标准

- [ ] 进入 Skill 商店 Tab 后，自动显示第一页 Skill（50 个）
- [ ] 显示总数统计（如"已安装: 0 / 60300 个 Skill"）
- [ ] 分页控件正常工作
- [ ] 搜索和筛选功能正常

---

**报告人**: Commander
**发现时间**: 2026-03-31
**优先级**: P0
**状态**: Open
