---
type: "manual"
---

# AI-2 协作标准

## 任务概述
负责通知系统实现，包括实时推送、邮件通知、通知中心UI等功能。

## 代码规范

### 1. 文件命名规范
- API路由：`/api/notifications/[功能]/route.ts`
- 数据库模型：在`prisma/schema-supabase.prisma`中添加
- 服务层：`src/lib/notificationService.ts`
- 组件：`src/components/notifications/[组件名].tsx`
- 类型定义：`src/types/notification.ts`

### 2. 代码风格
- 使用TypeScript严格模式
- 遵循项目现有的ESLint配置
- 使用Prettier格式化代码
- React组件使用函数式组件 + Hooks
- 事件处理函数以`handle`开头

### 3. 数据库规范
```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  type        String   // 'star_received', 'comment_reply', 'proposal_update', etc.
  title       String
  content     String
  data        Json?    // 额外数据
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  // 关联用户表
  user User @relation(fields: [userId], references: [id])
}

model NotificationSettings {
  id            String   @id @default(cuid())
  userId        String   @unique
  emailEnabled  Boolean  @default(true)
  pushEnabled   Boolean  @default(true)
  types         Json     // 允许的通知类型
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // 关联用户表
  user User @relation(fields: [userId], references: [id])
}
```

### 4. 通知类型定义
```typescript
export type NotificationType = 
  | 'star_received'
  | 'comment_reply'
  | 'proposal_update'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'system_announcement'
  | 'welcome_message';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}
```

### 5. 实时推送规范
- 使用Server-Sent Events (SSE)
- 连接端点：`/api/notifications/stream`
- 心跳检测：每30秒发送ping
- 自动重连机制

## 提交标准

### 1. 分支管理
- 基于`main`分支创建`feature/ai-2-notification`分支
- 所有开发在功能分支进行
- 提交前必须通过测试

### 2. 提交信息格式
```
类型(范围): 简短描述

详细描述（可选）

- 变更点1
- 变更点2
```

示例：
```
feat(notification): 添加实时通知推送功能

- 实现SSE通知流
- 添加NotificationCenter组件
- 创建通知设置页面
```

### 3. 代码审查检查清单
- [ ] 代码符合TypeScript类型检查
- [ ] 通过ESLint检查
- [ ] React组件有适当的错误边界
- [ ] 实时连接有重连机制
- [ ] 通知权限正确处理
- [ ] 包含基本测试用例

## 测试要求

### 1. 单元测试
- 为所有服务层函数编写测试
- 测试通知创建、发送、标记已读等功能
- 模拟实时推送场景

### 2. 组件测试
- 测试NotificationCenter组件
- 验证通知显示和交互
- 测试设置页面功能

### 3. 集成测试
- 测试完整的通知流程
- 验证实时推送功能
- 测试邮件发送功能

## 协作要求

### 1. 进度报告
- 每日更新`PROGRESS.md`文件
- 记录完成的任务和遇到的问题
- 标记需要其他AI协助的部分

### 2. 文档更新
- 更新`API_CHANGES.md`记录新增的API
- 在`ISSUES.md`中记录遇到的问题
- 更新相关的README文档

### 3. 与其他AI的协作
- **不要修改**其他AI负责的文件
- 通知触发点需要与其他模块集成
- 在`ISSUES.md`中记录集成需求

### 4. 集成点说明
- **与AI-1协作**：Star获得时发送通知
- **与汇总AI协作**：提案状态变更时发送通知
- **与AI-3协作**：通知内容需要多语言支持

## UI/UX 规范

### 1. 通知中心设计
- 位置：右上角铃铛图标
- 未读通知显示红点
- 支持分页加载
- 支持按类型筛选

### 2. 通知样式
- 使用项目现有的UI组件库
- 不同类型通知有不同图标
- 支持暗色主题
- 响应式设计

### 3. 交互规范
- 点击通知自动标记为已读
- 支持批量标记已读
- 支持删除通知
- 长按显示操作菜单

## 性能要求

### 1. 实时推送
- 连接建立时间 < 1秒
- 通知推送延迟 < 500ms
- 支持1000+并发连接
- 内存使用合理

### 2. 数据库优化
- 通知查询有索引
- 自动清理30天前的已读通知
- 批量操作优化
- 分页查询优化

## 完成标准

### 1. 功能完成度
- [ ] 通知数据模型已添加
- [ ] 实时推送功能已实现
- [ ] 通知中心UI已完成
- [ ] 邮件通知功能已实现
- [ ] 通知设置页面已完成

### 2. 质量标准
- [ ] 代码通过TypeScript编译
- [ ] 通过ESLint检查
- [ ] 单元测试覆盖率 > 80%
- [ ] 组件测试全部通过
- [ ] 实时推送稳定运行

### 3. 用户体验
- [ ] 通知响应速度快
- [ ] UI交互流畅
- [ ] 支持多语言
- [ ] 移动端适配良好

## 安全要求

### 1. 权限控制
- 用户只能接收自己的通知
- 通知设置权限验证
- 防止通知垃圾信息

### 2. 数据保护
- 敏感信息不在通知中显示
- 通知内容XSS防护
- 邮件内容安全处理

## 最终交付

完成后需要提交：
1. 完整的通知功能代码
2. 通知中心UI组件
3. 测试用例和测试报告
4. 通知系统使用文档
5. 性能测试报告 