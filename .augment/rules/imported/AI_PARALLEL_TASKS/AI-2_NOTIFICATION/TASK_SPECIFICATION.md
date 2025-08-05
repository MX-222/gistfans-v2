---
type: "manual"
---

# AI-2 任务规范：通知系统实现

## 🎯 任务目标

实现完整的实时通知系统，包括应用内通知、邮件通知和实时推送功能。

## 📋 核心要求

### 1. 通知类型定义
扩展现有的通知数据模型，支持以下通知类型：

```typescript
export type NotificationType = 
  | 'COMMENT'          // 评论通知
  | 'LIKE'             // 点赞通知
  | 'FOLLOW'           // 关注通知
  | 'PROPOSAL_UPDATE'  // 提案更新
  | 'STAR_REWARD'      // Star奖励
  | 'SYSTEM_ALERT'     // 系统公告
  | 'MESSAGE'          // 私信通知
  | 'SUBSCRIPTION'     // 订阅通知

export interface NotificationPayload {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  senderId?: string
  relatedId?: string
  metadata?: Record<string, any>
  isRead: boolean
  createdAt: Date
}
```

### 2. 实时推送服务
创建 `src/lib/notificationService.ts`：

```typescript
export interface NotificationService {
  // 发送通知
  send(notification: Omit<NotificationPayload, 'id' | 'createdAt'>): Promise<void>
  
  // 批量发送
  sendBatch(notifications: Omit<NotificationPayload, 'id' | 'createdAt'>[]): Promise<void>
  
  // 获取用户通知
  getUserNotifications(userId: string, options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  }): Promise<NotificationPayload[]>
  
  // 标记已读
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  
  // 获取未读数量
  getUnreadCount(userId: string): Promise<number>
  
  // 实时订阅
  subscribe(userId: string, callback: (notification: NotificationPayload) => void): () => void
}
```

### 3. API端点开发
创建以下API路由：

- `src/app/api/notifications/route.ts` - 获取通知列表
- `src/app/api/notifications/send/route.ts` - 发送通知
- `src/app/api/notifications/[id]/read/route.ts` - 标记已读
- `src/app/api/notifications/unread-count/route.ts` - 未读数量
- `src/app/api/notifications/stream/route.ts` - SSE实时推送

### 4. 前端组件开发

#### 通知中心组件
`src/components/NotificationCenter.tsx`：
```typescript
interface NotificationCenterProps {
  userId: string
  maxItems?: number
  showUnreadOnly?: boolean
  onNotificationClick?: (notification: NotificationPayload) => void
}

export default function NotificationCenter(props: NotificationCenterProps)
```

#### 通知铃铛组件
`src/components/NotificationBell.tsx`：
```typescript
interface NotificationBellProps {
  userId: string
  showBadge?: boolean
  onOpen?: () => void
}

export default function NotificationBell(props: NotificationBellProps)
```

#### 通知项组件
`src/components/NotificationItem.tsx`：
```typescript
interface NotificationItemProps {
  notification: NotificationPayload
  onRead?: (id: string) => void
  onAction?: (action: string, notification: NotificationPayload) => void
}

export default function NotificationItem(props: NotificationItemProps)
```

### 5. Context管理
创建 `src/contexts/NotificationContext.tsx`：

```typescript
interface NotificationContextType {
  notifications: NotificationPayload[]
  unreadCount: number
  isLoading: boolean
  
  // 操作方法
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  
  // 实时更新
  isConnected: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
}
```

## 📁 文件清单

### 必须创建的文件
```
src/app/api/notifications/
├── route.ts
├── send/route.ts
├── [id]/read/route.ts
├── unread-count/route.ts
└── stream/route.ts

src/components/
├── NotificationCenter.tsx
├── NotificationBell.tsx
├── NotificationItem.tsx
└── NotificationToast.tsx

src/contexts/
└── NotificationContext.tsx

src/lib/
├── notificationService.ts
├── emailService.ts
└── sseManager.ts

src/hooks/
├── useNotifications.ts
└── useRealtimeNotifications.ts

src/types/
└── notification.ts
```

### 可以修改的文件
```
src/app/layout.tsx (添加通知Provider)
src/components/ui/ (可以添加新的UI组件)
```

### 禁止修改的文件
```
src/contexts/StarContext.tsx (AI-1负责)
src/app/proposals/ (AI-5负责)
locales/ (AI-3负责)
src/components/remote/ (AI-4负责)
```

## 🔧 技术要求

### 实时推送实现
选择以下方案之一：
1. **Server-Sent Events (SSE)** - 推荐，简单易实现
2. **WebSocket** - 更强大，但复杂度更高
3. **轮询** - 备用方案

### 邮件通知集成
创建 `src/lib/emailService.ts`：
```typescript
export interface EmailService {
  sendNotificationEmail(
    to: string,
    notification: NotificationPayload
  ): Promise<void>
  
  sendDigestEmail(
    to: string,
    notifications: NotificationPayload[]
  ): Promise<void>
}
```

支持的邮件模板：
- 即时通知邮件
- 每日摘要邮件
- 每周摘要邮件

### 性能优化
- 通知列表虚拟滚动
- 实时连接断线重连
- 通知去重和合并
- 缓存策略

### 用户偏好设置
创建通知设置界面：
```typescript
interface NotificationPreferences {
  email: {
    enabled: boolean
    types: NotificationType[]
    frequency: 'instant' | 'daily' | 'weekly'
  }
  push: {
    enabled: boolean
    types: NotificationType[]
  }
  inApp: {
    enabled: boolean
    sound: boolean
    desktop: boolean
  }
}
```

## 🧪 测试要求

### 单元测试
```
src/lib/__tests__/
├── notificationService.test.ts
├── emailService.test.ts
└── sseManager.test.ts

src/components/__tests__/
├── NotificationCenter.test.tsx
├── NotificationBell.test.tsx
└── NotificationItem.test.tsx
```

### 集成测试
- API端点测试
- 实时推送测试
- 邮件发送测试
- 用户偏好测试

### 测试用例
- 通知发送和接收流程
- 实时推送连接管理
- 邮件模板渲染
- 通知去重逻辑
- 用户偏好应用

## 📊 验收标准

### 功能完整性
- ✅ 支持所有定义的通知类型
- ✅ 实时通知推送正常工作
- ✅ 邮件通知发送成功
- ✅ 通知标记已读功能正常
- ✅ 用户偏好设置生效

### 性能标准
- ✅ 通知推送延迟 < 1秒
- ✅ 通知列表加载时间 < 500ms
- ✅ 邮件发送成功率 > 95%
- ✅ 实时连接稳定性 > 99%

### 用户体验
- ✅ 通知界面友好易用
- ✅ 通知分类清晰
- ✅ 支持批量操作
- ✅ 响应式设计

### 代码质量
- ✅ TypeScript类型完整
- ✅ ESLint检查通过
- ✅ 测试覆盖率 > 80%
- ✅ 组件可复用性好

## 🔄 交付物

### 代码交付
1. **Git分支**: `feature/notification-system`
2. **Pull Request**: 包含完整的代码变更
3. **邮件模板**: HTML邮件模板文件

### 文档交付
1. **API文档**: 通知相关接口说明
2. **组件文档**: 通知组件使用指南
3. **配置指南**: 邮件服务配置说明

### 集成说明
1. **环境变量**: 邮件服务配置
2. **数据库**: 通知表结构说明
3. **部署要求**: 实时推送服务部署

## ⚠️ 注意事项

1. **隐私保护**: 通知内容不包含敏感信息
2. **频率控制**: 防止通知轰炸用户
3. **优雅降级**: 实时推送失败时的备用方案
4. **国际化**: 通知内容支持多语言

## 📅 时间安排

- **Day 1**: 数据模型设计 + API框架搭建
- **Day 2**: 实时推送服务 + 核心组件开发
- **Day 3**: 邮件服务集成 + 用户偏好设置
- **Day 4**: 测试优化 + 文档完善

## 🤝 与其他AI的接口

### 接收来自AI-1 (Star系统)
```typescript
// 监听Star变化事件
onStarChange(userId: string, amount: number, action: string): void
```

### 接收来自AI-5 (提案系统)
```typescript
// 监听提案相关事件
onProposalCreated(proposal: Proposal): void
onProposalVoted(proposalId: string, userId: string): void
onProposalStatusChanged(proposalId: string, status: string): void
```

### 提供给其他AI
```typescript
// 发送通知接口
sendNotification(notification: NotificationPayload): Promise<void>
```

## 🎨 UI设计要求

### 通知中心设计
- 现代化的卡片式布局
- 清晰的通知类型图标
- 未读/已读状态区分
- 滑动操作支持

### 通知铃铛设计
- 红点未读提示
- 数字徽章显示
- 悬停预览功能
- 动画效果

### 通知Toast设计
- 非侵入式显示
- 自动消失机制
- 操作按钮支持
- 多通知堆叠

预计完成时间: 4个工作日
优先级: 🟡 中等 (独立功能模块) 