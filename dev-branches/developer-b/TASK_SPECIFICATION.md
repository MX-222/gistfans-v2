# Developer B - 评论系统完善任务规格

## 🎯 任务概览

**负责人**: Developer B  
**模块**: 评论系统完善 (Comment System Enhancement)  
**优先级**: 🟡 高优先级 (依赖发帖系统修复)  
**预估工期**: 4-5天  
**Git分支**: `feature/comment-system`  

## 📋 当前问题分析

### 🔴 已知问题
1. **评论发布失败**
   - 症状: 用户评论时出现"帖子不存在"错误
   - 影响: 评论功能完全无法使用
   - 根本原因: 帖子ID关联问题，依赖Developer A修复

2. **评论系统功能不完整**
   - 缺少多级回复功能
   - 缺少评论权限控制
   - 缺少评论通知机制
   - 缺少评论管理功能

3. **用户体验问题**
   - 评论加载性能差
   - 缺少实时评论更新
   - 缺少评论编辑功能
   - 缺少评论举报功能

## 🎯 功能目标

### 核心功能要求
- [ ] **多级评论系统** - 支持评论的回复，最多3级嵌套
- [ ] **实时评论更新** - 新评论自动显示，无需刷新页面
- [ ] **评论权限控制** - 基于用户角色的评论权限
- [ ] **评论通知机制** - 评论和回复的实时通知
- [ ] **评论管理功能** - 编辑、删除、举报评论

### 用户体验要求
- [ ] **流畅的交互体验** - 评论发布、回复、加载流畅
- [ ] **响应式设计** - 移动端和桌面端适配
- [ ] **无障碍访问** - 键盘导航、屏幕阅读器支持
- [ ] **性能优化** - 大量评论的虚拟滚动

## 🏗️ 技术架构设计

### 数据模型设计
```typescript
// 评论数据结构
interface Comment {
  id: string
  content: string
  postId: string
  userId: string
  parentId?: string  // 父评论ID，支持多级回复
  depth: number      // 嵌套深度，最大3级
  status: CommentStatus
  
  // 关联数据
  user: User
  post: Post
  parent?: Comment
  replies: Comment[]
  
  // 统计数据
  likeCount: number
  replyCount: number
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

enum CommentStatus {
  PUBLISHED = 'PUBLISHED',
  PENDING = 'PENDING',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED'
}
```

### API设计规范
```typescript
// 评论相关API端点
POST   /api/comments              // 创建评论
GET    /api/comments?postId=xxx   // 获取帖子评论
PUT    /api/comments/[id]         // 更新评论
DELETE /api/comments/[id]         // 删除评论
POST   /api/comments/[id]/like    // 点赞评论
POST   /api/comments/[id]/report  // 举报评论

// 回复相关API
POST   /api/comments/[id]/reply   // 回复评论
GET    /api/comments/[id]/replies // 获取评论回复
```

### 组件架构设计
```typescript
// 评论系统组件层级
CommentSection                    // 评论区容器
├── CommentForm                  // 评论发布表单
├── CommentList                  // 评论列表
│   ├── CommentItem             // 单个评论
│   │   ├── CommentContent      // 评论内容
│   │   ├── CommentActions      // 评论操作 (回复、点赞、举报)
│   │   ├── CommentReplyForm    // 回复表单
│   │   └── CommentReplies      // 回复列表
│   └── CommentPagination       // 评论分页
└── CommentNotification         // 评论通知
```

## 🔧 开发阶段规划

### 阶段一：基础架构 (Day 1)
**依赖**: 等待Developer A完成发帖系统修复

- [ ] **数据模型设计**
  - 设计Comment表结构
  - 添加多级回复支持
  - 设计评论状态管理
  - 添加必要的数据库索引

- [ ] **API架构设计**
  - 设计评论CRUD API
  - 设计回复功能API
  - 设计评论统计API
  - 制定错误处理规范

### 阶段二：核心功能开发 (Day 2-3)
- [ ] **评论发布功能**
  - 实现评论创建API
  - 开发评论表单组件
  - 添加内容验证和过滤
  - 实现评论权限检查

- [ ] **多级回复功能**
  - 实现回复创建API
  - 开发回复表单组件
  - 实现嵌套评论显示
  - 添加回复层级限制

- [ ] **评论显示功能**
  - 实现评论列表API
  - 开发评论列表组件
  - 实现评论分页加载
  - 添加评论排序功能

### 阶段三：高级功能 (Day 4)
- [ ] **实时更新功能**
  - 实现评论实时推送
  - 添加新评论提示
  - 实现评论数量实时更新
  - 优化性能和内存使用

- [ ] **评论管理功能**
  - 实现评论编辑功能
  - 实现评论删除功能
  - 添加评论举报功能
  - 实现评论审核机制

### 阶段四：优化和测试 (Day 5)
- [ ] **性能优化**
  - 实现评论虚拟滚动
  - 优化数据库查询
  - 添加评论缓存机制
  - 优化组件渲染性能

- [ ] **用户体验优化**
  - 添加加载状态指示
  - 实现乐观更新
  - 添加错误重试机制
  - 优化移动端体验

## 🗄️ 数据库设计

### Comment表结构
```sql
-- 评论表 (扩展现有表)
ALTER TABLE Comment ADD COLUMN parentId String?;
ALTER TABLE Comment ADD COLUMN depth Int DEFAULT 0;
ALTER TABLE Comment ADD COLUMN status CommentStatus DEFAULT 'PUBLISHED';
ALTER TABLE Comment ADD COLUMN likeCount Int DEFAULT 0;
ALTER TABLE Comment ADD COLUMN replyCount Int DEFAULT 0;
ALTER TABLE Comment ADD COLUMN deletedAt DateTime?;

-- 添加索引优化查询性能
CREATE INDEX idx_comment_post_created ON Comment(postId, createdAt DESC);
CREATE INDEX idx_comment_parent_created ON Comment(parentId, createdAt ASC);
CREATE INDEX idx_comment_user_created ON Comment(userId, createdAt DESC);
CREATE INDEX idx_comment_status ON Comment(status);

-- 添加外键约束
ALTER TABLE Comment ADD CONSTRAINT fk_comment_parent 
  FOREIGN KEY (parentId) REFERENCES Comment(id) ON DELETE CASCADE;
```

### CommentLike表 (新增)
```sql
-- 评论点赞表
CREATE TABLE CommentLike (
  id String @id @default(cuid())
  commentId String
  userId String
  createdAt DateTime @default(now())
  
  @@unique([commentId, userId])
  @@index([commentId])
  @@index([userId])
);
```

### CommentReport表 (新增)
```sql
-- 评论举报表
CREATE TABLE CommentReport (
  id String @id @default(cuid())
  commentId String
  reporterId String
  reason String
  description String?
  status ReportStatus DEFAULT 'PENDING'
  createdAt DateTime @default(now())
  
  @@index([commentId])
  @@index([reporterId])
  @@index([status])
);

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
  DISMISSED
}
```

## 🔌 API实现规格

### 评论创建API
```typescript
// POST /api/comments
export async function POST(request: NextRequest) {
  // 必须实现的功能:
  // 1. 用户身份验证
  // 2. 帖子存在性验证 (依赖Developer A)
  // 3. 评论内容验证和过滤
  // 4. 评论权限检查
  // 5. 数据库事务处理
  // 6. 评论通知发送
  // 7. 缓存更新
}
```

### 评论查询API
```typescript
// GET /api/comments?postId=xxx
export async function GET(request: NextRequest) {
  // 支持的查询参数:
  // - postId: 帖子ID (必需)
  // - page: 页码
  // - limit: 每页数量
  // - sort: 排序方式 (latest, oldest, popular)
  // - parentId: 父评论ID (获取回复)
  
  // 返回数据结构:
  // - 评论列表 (包含用户信息)
  // - 回复数量统计
  // - 分页信息
}
```

## 🧩 组件实现规格

### CommentSection组件
```typescript
interface CommentSectionProps {
  postId: string
  currentUser?: User
  allowComments?: boolean
  maxDepth?: number
  initialComments?: Comment[]
}

// 必须实现的功能:
// 1. 评论列表显示
// 2. 评论发布表单
// 3. 实时评论更新
// 4. 评论分页加载
// 5. 错误状态处理
```

### CommentItem组件
```typescript
interface CommentItemProps {
  comment: Comment
  currentUser?: User
  onReply?: (comment: Comment) => void
  onEdit?: (comment: Comment) => void
  onDelete?: (comment: Comment) => void
  onReport?: (comment: Comment) => void
  maxDepth?: number
}

// 必须显示的信息:
// 1. 用户头像和名称
// 2. 评论时间
// 3. 评论内容 (支持Markdown)
// 4. 回复按钮
// 5. 点赞数量和按钮
// 6. 操作菜单 (编辑、删除、举报)
```

## 📊 性能要求

### API性能指标
- 评论创建: < 300ms
- 评论查询: < 200ms
- 评论更新: < 250ms
- 评论删除: < 150ms

### 前端性能指标
- 评论列表渲染: < 100ms
- 评论发布响应: < 500ms
- 实时更新延迟: < 1s
- 大量评论滚动: 60fps

### 数据库性能优化
- 评论查询使用索引
- 回复查询批量加载
- 评论统计缓存
- 分页查询优化

## 🔒 安全要求

### 内容安全
- XSS防护 (内容过滤)
- 垃圾评论检测
- 敏感词过滤
- 评论频率限制

### 权限控制
- 评论发布权限
- 评论编辑权限 (仅作者)
- 评论删除权限 (作者+管理员)
- 评论举报权限

## 🧪 测试验收标准

### 功能测试
- [ ] 评论发布成功率 > 99%
- [ ] 多级回复功能正常
- [ ] 评论权限控制有效
- [ ] 实时更新功能正常
- [ ] 评论管理功能完整

### 性能测试
- [ ] 1000条评论加载性能
- [ ] 并发评论发布测试
- [ ] 实时更新性能测试
- [ ] 移动端性能测试

### 用户体验测试
- [ ] 评论发布流程顺畅
- [ ] 回复功能易用性
- [ ] 错误提示清晰
- [ ] 加载状态友好

---

**任务创建时间**: 2025-07-19  
**负责开发者**: Developer B  
**依赖关系**: Developer A (发帖系统修复)  
**被依赖**: Developer D (评论通知集成)
