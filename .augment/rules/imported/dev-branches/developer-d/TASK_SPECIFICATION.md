---
type: "manual"
---

# Developer D - 管理员系统和私信功能任务规格

## 🎯 任务概览

**负责人**: Developer D  
**模块**: 管理员系统和私信功能 (Admin System & Messaging)  
**优先级**: 🟢 中等优先级 (独立开发，最小依赖)  
**预估工期**: 5-6天  
**Git分支**: `feature/admin-messaging`  

## 📋 功能需求分析

### 🔐 管理员权限需求
1. **用户管理权限**
   - 给用户发送私信 (系统消息)
   - 用户禁言/解禁功能
   - 用户封号/解封功能
   - 为用户赠送Star奖励

2. **内容管理权限**
   - 审批社区提案 (通过/拒绝)
   - 删除违规帖子和评论
   - 置顶重要帖子
   - 管理社区公告

3. **系统管理权限**
   - 查看系统统计数据
   - 管理邀请码系统
   - 配置系统参数
   - 查看操作日志

### 💬 私信系统需求
1. **基础私信功能**
   - 用户间互相发送私信
   - 私信会话管理 (类似邮箱)
   - 私信已读/未读状态
   - 私信删除

2. **通知中心功能**
   - 通过顶部铃铛图标访问
   - 创建专门的通知页面 (类似邮箱界面)
   - 整合系统通知、活动通告、用户私信
   - 通知分类和过滤功能

3. **用户交互功能**
   - 通过用户profile页面发送私信
   - 私信按钮 (英语界面)
   


## 🏗️ 技术架构设计

### 权限系统设计
```typescript
// 用户角色枚举
enum UserRole {
  USER = 'USER',           // 普通用户
  SUPER_ADMIN = 'SUPER_ADMIN' // 超级管理员
}

// 权限定义
interface Permission {
  id: string
  name: string
  description: string
  category: PermissionCategory
}

enum PermissionCategory {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  CONTENT_MANAGEMENT = 'CONTENT_MANAGEMENT',
  SYSTEM_MANAGEMENT = 'SYSTEM_MANAGEMENT',
  MESSAGING = 'MESSAGING'
}

// 角色权限映射
const ROLE_PERMISSIONS = {
  [UserRole.USER]: [],
  [UserRole.MODERATOR]: [
    'DELETE_COMMENT',
    'BAN_USER_TEMPORARY',
    'SEND_SYSTEM_MESSAGE'
  ],
  [UserRole.ADMIN]: [
    'DELETE_POST',
    'BAN_USER_PERMANENT',
    'GRANT_STARS',
    'MANAGE_PROPOSALS',
    'VIEW_ADMIN_PANEL'
  ],
  [UserRole.SUPER_ADMIN]: ['ALL_PERMISSIONS']
}
```

### 消息系统设计
```typescript
// 消息数据结构
interface Message {
  id: string
  conversationId: string
  senderId: string
  receiverId?: string    // 私信接收者
  content: string
  type: MessageType
  status: MessageStatus
  
  // 关联数据
  sender: User
  receiver?: User
  conversation: Conversation
  attachments?: MessageAttachment[]
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
  readAt?: Date
  deletedAt?: Date
}

enum MessageType {
  PRIVATE = 'PRIVATE',         // 私信
  SYSTEM = 'SYSTEM',           // 系统消息
  ANNOUNCEMENT = 'ANNOUNCEMENT', // 公告
  NOTIFICATION = 'NOTIFICATION'  // 通知
}

enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  DELETED = 'DELETED'
}

// 会话数据结构
interface Conversation {
  id: string
  type: ConversationType
  title?: string
  participants: User[]
  lastMessage?: Message
  lastActivity: Date
  
  // 统计数据
  messageCount: number
  unreadCount: Record<string, number> // userId -> unreadCount
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
}

enum ConversationType {
  PRIVATE = 'PRIVATE',     // 私人对话
  GROUP = 'GROUP',         // 群组对话
  SYSTEM = 'SYSTEM'        // 系统对话
}
```

### 通知系统设计
```typescript
// 通知数据结构
interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  data?: Record<string, any> // 额外数据
  
  // 关联数据
  user: User
  relatedEntity?: {
    type: string // 'post', 'comment', 'user', etc.
    id: string
  }
  
  // 状态
  isRead: boolean
  isArchived: boolean
  priority: NotificationPriority
  
  // 时间戳
  createdAt: Date
  readAt?: Date
  expiresAt?: Date
}

enum NotificationType {
  COMMENT_REPLY = 'COMMENT_REPLY',
  POST_LIKED = 'POST_LIKED',
  STAR_RECEIVED = 'STAR_RECEIVED',
  MENTION = 'MENTION',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  ADMIN_MESSAGE = 'ADMIN_MESSAGE',
  PROPOSAL_UPDATE = 'PROPOSAL_UPDATE'
}

enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}
```

## 🔧 开发阶段规划

### 阶段一：权限系统基础 (Day 1)
- [ ] **权限系统架构**
  - 设计用户角色和权限模型
  - 实现权限检查中间件
  - 扩展NextAuth配置支持角色
  - 创建权限管理工具函数

- [ ] **数据库设计**
  - 扩展User表添加角色字段
  - 创建Permission和RolePermission表
  - 设计管理员操作日志表
  - 添加必要的数据库索引

### 阶段二：管理员面板开发 (Day 2-3)
- [ ] **管理员界面框架**
  - 创建管理员面板布局
  - 实现权限路由保护
  - 设计管理员导航菜单
  - 创建权限检查组件

- [ ] **用户管理功能**
  - 用户列表和搜索功能
  - 用户详情查看页面
  - 用户禁言/解禁功能
  - 用户封号/解封功能
  - Star赠送功能

- [ ] **内容管理功能**
  - 帖子和评论管理界面
  - 内容审核和删除功能
  - 社区提案审批功能
  - 系统公告管理

### 阶段三：私信系统开发 (Day 4-5)
- [ ] **私信基础功能**
  - 私信发送和接收API
  - 私信会话管理
  - 私信已读状态管理
  - 私信删除和归档

- [ ] **私信界面开发**
  - 私信列表页面
  - 私信对话界面
  - 私信发送表单
  - 私信搜索功能

### 阶段四：通知中心开发 (Day 5-6)
- [ ] **通知系统基础**
  - 通知创建和管理API
  - 通知推送机制
  - 通知分类和过滤
  - 通知已读状态管理

- [ ] **通知中心界面**
  - 通知中心页面 (类似邮箱)
  - 通知铃铛组件优化
  - 通知分类标签
  - 通知搜索和过滤

### 阶段五：集成和优化 (Day 6)
- [ ] **系统集成**
  - 与其他模块的通知集成
  - 权限系统与现有功能集成
  - 私信与用户profile集成
  - 管理员功能测试

- [ ] **性能优化**
  - 通知推送性能优化
  - 私信加载性能优化
  - 管理员面板查询优化
  - 实时更新机制优化

## 🗄️ 数据库设计

### User表扩展
```sql
-- 用户表扩展
ALTER TABLE User ADD COLUMN role UserRole DEFAULT 'USER';
ALTER TABLE User ADD COLUMN permissions Json?;
ALTER TABLE User ADD COLUMN isBanned Boolean DEFAULT false;
ALTER TABLE User ADD COLUMN banReason String?;
ALTER TABLE User ADD COLUMN banExpiresAt DateTime?;
ALTER TABLE User ADD COLUMN lastActiveAt DateTime?;

-- 添加索引
CREATE INDEX idx_user_role ON User(role);
CREATE INDEX idx_user_banned ON User(isBanned);
CREATE INDEX idx_user_active ON User(lastActiveAt);
```

### Message表 (新增)
```sql
-- 消息表
CREATE TABLE Message (
  id String @id @default(cuid())
  conversationId String
  senderId String
  receiverId String?
  content String
  type MessageType
  status MessageStatus DEFAULT 'SENT'
  readAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  
  @@index([conversationId, createdAt])
  @@index([senderId, createdAt])
  @@index([receiverId, status])
);
```

### Conversation表 (新增)
```sql
-- 会话表
CREATE TABLE Conversation (
  id String @id @default(cuid())
  type ConversationType
  title String?
  lastMessageId String?
  lastActivity DateTime @default(now())
  messageCount Int DEFAULT 0
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([lastActivity])
  @@index([type, lastActivity])
);
```

### Notification表 (新增)
```sql
-- 通知表
CREATE TABLE Notification (
  id String @id @default(cuid())
  userId String
  type NotificationType
  title String
  content String
  data Json?
  isRead Boolean DEFAULT false
  isArchived Boolean DEFAULT false
  priority NotificationPriority DEFAULT 'NORMAL'
  relatedEntityType String?
  relatedEntityId String?
  createdAt DateTime @default(now())
  readAt DateTime?
  expiresAt DateTime?
  
  @@index([userId, isRead, createdAt])
  @@index([type, createdAt])
  @@index([priority, createdAt])
);
```

### AdminLog表 (新增)
```sql
-- 管理员操作日志表
CREATE TABLE AdminLog (
  id String @id @default(cuid())
  adminId String
  action String
  targetType String
  targetId String
  details Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  
  @@index([adminId, createdAt])
  @@index([action, createdAt])
  @@index([targetType, targetId])
);
```

## 🔌 API设计规范

### 管理员API
```typescript
// 用户管理API
POST   /api/admin/users/ban           // 禁言用户
POST   /api/admin/users/unban         // 解禁用户
POST   /api/admin/users/grant-stars   // 赠送Star
GET    /api/admin/users               // 用户列表
GET    /api/admin/users/[id]          // 用户详情

// 内容管理API
DELETE /api/admin/posts/[id]          // 删除帖子
DELETE /api/admin/comments/[id]       // 删除评论
POST   /api/admin/proposals/approve   // 审批提案
GET    /api/admin/reports             // 举报列表

// 系统管理API
GET    /api/admin/stats               // 系统统计
GET    /api/admin/logs                // 操作日志
POST   /api/admin/announcements       // 发布公告
```

### 私信API
```typescript
// 私信管理API
POST   /api/messages                  // 发送私信
GET    /api/messages/conversations    // 获取会话列表
GET    /api/messages/conversations/[id] // 获取会话消息
PUT    /api/messages/[id]/read        // 标记已读
DELETE /api/messages/[id]             // 删除消息

// 会话管理API
POST   /api/conversations             // 创建会话
GET    /api/conversations/[id]        // 获取会话详情
PUT    /api/conversations/[id]        // 更新会话
DELETE /api/conversations/[id]        // 删除会话
```

### 通知API
```typescript
// 通知管理API
GET    /api/notifications             // 获取通知列表
PUT    /api/notifications/[id]/read   // 标记已读
PUT    /api/notifications/read-all    // 全部已读
DELETE /api/notifications/[id]        // 删除通知
GET    /api/notifications/unread-count // 未读数量

// 通知推送API
POST   /api/notifications/send        // 发送通知 (管理员)
POST   /api/notifications/broadcast   // 广播通知 (管理员)
```

## 🧩 组件架构设计

### 管理员面板组件
```typescript
// 管理员面板组件层级
AdminLayout                          // 管理员布局
├── AdminSidebar                    // 侧边栏导航
├── AdminHeader                     // 顶部导航
└── AdminContent                    // 主要内容区
    ├── UserManagement              // 用户管理
    │   ├── UserList               // 用户列表
    │   ├── UserDetail             // 用户详情
    │   └── UserActions            // 用户操作
    ├── ContentManagement          // 内容管理
    │   ├── PostManagement         // 帖子管理
    │   ├── CommentManagement      // 评论管理
    │   └── ProposalManagement     // 提案管理
    └── SystemManagement           // 系统管理
        ├── SystemStats            // 系统统计
        ├── AdminLogs              // 操作日志
        └── AnnouncementManager    // 公告管理
```

### 私信系统组件
```typescript
// 私信系统组件层级
MessagingLayout                      // 私信布局
├── ConversationList                // 会话列表
├── ConversationView                // 会话视图
│   ├── MessageList                // 消息列表
│   ├── MessageInput               // 消息输入
│   └── MessageActions             // 消息操作
└── MessageComposer                 // 新消息编写
```

### 通知中心组件
```typescript
// 通知中心组件层级
NotificationCenter                   // 通知中心
├── NotificationBell                // 通知铃铛
├── NotificationPanel               // 通知面板
├── NotificationList                // 通知列表
│   ├── NotificationItem           // 通知项
│   ├── NotificationFilter         // 通知过滤
│   └── NotificationActions        // 通知操作
└── NotificationSettings            // 通知设置
```

## 📊 性能要求

### API性能指标
- 私信发送: < 300ms
- 通知查询: < 200ms
- 管理员操作: < 500ms
- 会话加载: < 250ms

### 前端性能指标
- 管理员面板加载: < 1s
- 私信界面响应: < 200ms
- 通知更新延迟: < 500ms
- 实时消息延迟: < 1s

### 数据库性能优化
- 消息查询使用索引
- 通知查询分页优化
- 管理员日志归档
- 会话列表缓存

## 🔒 安全要求

### 权限安全
- 严格的角色权限验证
- API访问权限控制
- 敏感操作二次确认
- 操作日志完整记录

### 消息安全
- 私信内容加密存储
- 消息访问权限控制
- 防止消息泄露
- 消息删除安全处理

## 🧪 测试验收标准

### 功能测试
- [ ] 管理员权限控制有效
- [ ] 私信发送接收正常
- [ ] 通知推送及时准确
- [ ] 用户管理功能完整

### 安全测试
- [ ] 权限绕过攻击防护
- [ ] 私信隐私保护验证
- [ ] 管理员操作审计完整
- [ ] 敏感信息访问控制

### 性能测试
- [ ] 大量通知处理性能
- [ ] 私信并发发送测试
- [ ] 管理员面板查询性能
- [ ] 实时更新性能测试

---

**任务创建时间**: 2025-07-19  
**负责开发者**: Developer D  
**依赖关系**: 最小依赖，可独立开发  
**被依赖**: 为其他模块提供通知和管理功能
