---
type: "manual"
---

# API变更记录

## 📝 说明
本文档记录各AI在开发过程中的API接口变更，用于协调和避免冲突。

## 🔄 变更记录

### [日期] - AI编号 - 变更类型
描述变更内容和影响范围

---

## 🌟 AI-1 (Star系统) 新增API

### 新增端点
- `GET /api/stars/balance` - 获取用户Star余额
- `GET /api/stars/history` - 获取Star交易历史
- `POST /api/stars/earn` - 获得Star
- `POST /api/stars/spend` - 消费Star
- `POST /api/stars/refresh` - 每日刷新

### 接口规范
```typescript
// GET /api/stars/balance?userId=xxx
interface StarBalanceResponse {
  userId: string
  totalStars: number
  availableStars: number
  usedStars: number
  dailyEarned: number
  maxDailyEarn: number
  lastRefreshDate: string
}

// POST /api/stars/spend
interface SpendStarsRequest {
  userId: string
  amount: number
  description: string
  relatedId?: string
}

interface SpendStarsResponse {
  success: boolean
  newBalance: number
  transactionId: string
}
```

---

## 🔔 AI-2 (通知系统) 新增API

### 新增端点
- `GET /api/notifications` - 获取通知列表
- `POST /api/notifications/send` - 发送通知
- `PUT /api/notifications/[id]/read` - 标记已读
- `GET /api/notifications/unread-count` - 未读数量
- `GET /api/notifications/stream` - SSE实时推送

### 接口规范
```typescript
// GET /api/notifications
interface NotificationListResponse {
  notifications: NotificationPayload[]
  total: number
  unreadCount: number
}

// POST /api/notifications/send
interface SendNotificationRequest {
  userId: string
  type: NotificationType
  title: string
  content: string
  senderId?: string
  relatedId?: string
  metadata?: Record<string, any>
}
```

---

## 🌐 AI-3 (多语言) 接口变更

### 现有接口增强
无新增API端点，主要是前端Context增强

### 新增Hook接口
```typescript
// useTranslation Hook增强
interface UseTranslationReturn {
  t: (key: string, params?: Record<string, any>) => string
  i18n: I18nService
  ready: boolean
  language: string
  changeLanguage: (locale: string) => Promise<void>
}
```

---

## 🤝 AI-4 (协作工具) 新增API

### 新增端点
- `POST /api/collaboration/sessions` - 创建协作会话
- `GET /api/collaboration/sessions/[id]` - 获取会话信息
- `POST /api/collaboration/sessions/[id]/join` - 加入会话
- `POST /api/collaboration/sessions/[id]/leave` - 离开会话
- `POST /api/collaboration/files/upload` - 文件上传
- `GET /api/collaboration/files/[id]` - 文件下载

### WebSocket事件
```typescript
// WebSocket事件定义
interface CollaborationEvents {
  'session:created': (session: CollaborationSession) => void
  'session:joined': (userId: string) => void
  'session:left': (userId: string) => void
  'code:change': (change: CodeChange) => void
  'cursor:move': (position: CursorPosition) => void
}
```

---

## 🗳️ 汇总AI (提案系统) 新增API

### 新增端点
- `GET /api/proposals` - 获取提案列表
- `POST /api/proposals` - 创建提案
- `GET /api/proposals/[id]` - 获取单个提案
- `POST /api/proposals/[id]/vote` - 投票
- `PUT /api/proposals/[id]/status` - 更新状态
- `GET /api/proposals/stats` - 提案统计

### 接口规范
```typescript
// POST /api/proposals
interface CreateProposalRequest {
  title: string
  description: string
  category: 'feature' | 'policy' | 'community' | 'other'
  deadline?: string
}

// POST /api/proposals/[id]/vote
interface VoteRequest {
  voteType: 'support' | 'against' | 'neutral'
  starsUsed?: number
}
```

---

## ⚠️ 冲突和注意事项

### 数据库Schema冲突
- AI-1 的 StarBalance 和 StarTransaction 模型
- AI-2 的 Notification 模型已存在，需要扩展
- 汇总AI 的 Proposal 和 Vote 模型

### 类型定义冲突
- Star相关类型 (AI-1)
- Notification相关类型 (AI-2)
- Proposal相关类型 (汇总AI)

### 解决方案
1. 统一类型定义到 `src/types/` 目录
2. 使用命名空间避免冲突
3. 建立统一的错误处理格式

---

## 📋 待协调事项

### 环境变量
```env
# AI-2 需要的邮件配置
EMAIL_SERVER_HOST=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=

# AI-4 需要的WebRTC配置
WEBRTC_STUN_SERVER=
WEBRTC_TURN_SERVER=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_PASSWORD=
```

### 依赖包
```json
{
  "dependencies": {
    // AI-2 新增
    "nodemailer": "^6.10.1",
    
    // AI-4 新增
    "simple-peer": "^9.11.1",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1"
  }
}
```

---

## 🔄 更新记录

### 2024-12-XX - 初始版本
- 创建API变更跟踪文档
- 定义各AI的API接口规范

### 待更新...
各AI在开发过程中如有接口变更，请在此记录。 