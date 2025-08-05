---
type: "manual"
---

# Developer A - 技术实现要求

## 🏗️ 技术架构要求

### 数据库层 (Prisma + PostgreSQL)
```typescript
// 必须使用的Prisma配置
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
})

// 连接池配置要求
- 最大连接数: 20
- 连接超时: 30秒
- 查询超时: 15秒
- 自动重连: 启用
```

### API层要求
```typescript
// 统一响应格式 (必须遵循)
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: ErrorCode
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    pagination?: PaginationInfo
  }
}

// 错误代码标准
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### 数据验证要求
```typescript
// 使用Zod进行数据验证
import { z } from 'zod'

const postCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(10).optional(),
  isPrivate: z.boolean().default(false)
})

const postUpdateSchema = postCreateSchema.partial()
```

## 🔧 核心功能实现要求

### 1. 数据库连接优化
**文件**: `src/lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client'

// 单例模式实现
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 开发环境复用连接
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 连接健康检查
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true }
  } catch (error) {
    console.error('数据库连接检查失败:', error)
    return { healthy: false, error: error.message }
  }
}
```

### 2. 帖子CRUD API实现
**文件**: `src/app/api/posts/route.ts`

#### POST /api/posts (创建帖子)
```typescript
export async function POST(request: NextRequest) {
  // 必须实现的功能:
  // 1. 用户身份验证
  // 2. 数据验证 (使用postCreateSchema)
  // 3. 数据库事务处理
  // 4. 错误处理和日志记录
  // 5. 缓存失效处理
}
```

#### GET /api/posts (获取帖子列表)
```typescript
export async function GET(request: NextRequest) {
  // 必须支持的查询参数:
  // - page: 页码 (默认1)
  // - limit: 每页数量 (默认20, 最大100)
  // - userId: 用户ID过滤
  // - tag: 标签过滤
  // - search: 内容搜索
  // - sort: 排序方式 (latest, popular, trending)
}
```

#### GET /api/posts/[id] (获取单个帖子)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 必须包含的关联数据:
  // - 用户信息 (id, name, image, isVerified)
  // - 评论数量
  // - Star投票统计
  // - 标签信息
}
```

#### PUT /api/posts/[id] (更新帖子)
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 必须验证的权限:
  // - 用户是帖子作者
  // - 或用户是管理员
  // 必须更新版本号
}
```

#### DELETE /api/posts/[id] (删除帖子)
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 软删除实现:
  // - 设置status为'DELETED'
  // - 保留数据用于审计
  // - 清理相关缓存
}
```

### 3. 数据模型优化
**文件**: `prisma/schema.prisma` (仅修改Post相关部分)

```prisma
model Post {
  id          String   @id @default(cuid())
  title       String
  content     String
  tags        String[]
  isPrivate   Boolean  @default(false)
  status      PostStatus @default(PUBLISHED)
  version     Int      @default(1)
  viewCount   Int      @default(0)
  
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  comments    Comment[]
  starVotes   StarVote[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([tags])
  @@map("posts")
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  DELETED
}
```

### 4. 缓存策略实现
**文件**: `src/lib/cache.ts`
```typescript
// Redis缓存 (如果可用) 或内存缓存
class PostCache {
  private cache = new Map<string, any>()
  private ttl = 5 * 60 * 1000 // 5分钟

  async get(key: string) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  async set(key: string, data: any) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    })
  }

  async invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

export const postCache = new PostCache()
```

## 🧩 前端组件要求

### PostForm组件重构
**文件**: `src/components/PostForm.tsx`
```typescript
interface PostFormProps {
  initialData?: Partial<PostData>
  onSuccess?: (post: Post) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

// 必须实现的功能:
// 1. 表单验证 (实时验证)
// 2. 自动保存草稿
// 3. 图片上传支持
// 4. 标签自动完成
// 5. 预览功能
// 6. 错误处理和重试
```

### PostList组件优化
**文件**: `src/components/PostList.tsx`
```typescript
interface PostListProps {
  filters?: PostFilters
  pagination?: PaginationConfig
  onPostClick?: (post: Post) => void
  layout?: 'grid' | 'list'
}

// 必须实现的功能:
// 1. 虚拟滚动 (大量数据)
// 2. 无限滚动加载
// 3. 实时更新
// 4. 骨架屏加载
// 5. 错误边界处理
```

### PostCard组件标准
**文件**: `src/components/PostCard.tsx`
```typescript
interface PostCardProps {
  post: Post
  variant?: 'compact' | 'detailed'
  showActions?: boolean
  onEdit?: (post: Post) => void
  onDelete?: (post: Post) => void
}

// 必须显示的信息:
// 1. 用户头像和名称
// 2. 发布时间 (相对时间)
// 3. 帖子标题和内容预览
// 4. 标签列表
// 5. 互动统计 (评论数、Star数)
// 6. 操作按钮 (编辑、删除、分享)
```

## 📊 性能要求

### 数据库查询优化
```sql
-- 必须添加的索引
CREATE INDEX CONCURRENTLY idx_posts_user_created 
  ON posts(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_posts_status_created 
  ON posts(status, created_at DESC) 
  WHERE status = 'PUBLISHED';

CREATE INDEX CONCURRENTLY idx_posts_tags 
  ON posts USING GIN(tags);

-- 查询性能要求
-- 帖子列表查询: < 100ms
-- 单个帖子查询: < 50ms
-- 帖子创建: < 200ms
-- 帖子更新: < 150ms
```

### API响应时间要求
- GET /api/posts: < 200ms
- POST /api/posts: < 500ms
- PUT /api/posts/[id]: < 300ms
- DELETE /api/posts/[id]: < 200ms

### 前端性能要求
- 组件首次渲染: < 100ms
- 列表滚动流畅度: 60fps
- 表单提交响应: < 1s
- 图片加载优化: 懒加载 + WebP

## 🔒 安全要求

### 输入验证
```typescript
// 所有用户输入必须验证
const sanitizeContent = (content: string) => {
  // 1. HTML标签过滤
  // 2. XSS防护
  // 3. SQL注入防护
  // 4. 长度限制
  return DOMPurify.sanitize(content)
}
```

### 权限控制
```typescript
// 帖子操作权限检查
const checkPostPermission = async (userId: string, postId: string, action: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true, status: true }
  })
  
  if (!post) throw new Error('帖子不存在')
  
  // 作者权限
  if (post.userId === userId) return true
  
  // 管理员权限
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  return user?.role === 'ADMIN' || user?.role === 'MODERATOR'
}
```

## 🧪 测试要求

### 单元测试 (Jest + Testing Library)
```typescript
// 必须测试的功能
describe('Post API', () => {
  test('创建帖子成功', async () => {})
  test('创建帖子数据验证', async () => {})
  test('获取帖子列表分页', async () => {})
  test('更新帖子权限检查', async () => {})
  test('删除帖子软删除', async () => {})
})

describe('PostForm组件', () => {
  test('表单验证正确', () => {})
  test('提交成功处理', () => {})
  test('错误状态显示', () => {})
})
```

### 集成测试
```typescript
// 端到端流程测试
describe('帖子完整流程', () => {
  test('用户发布帖子到显示', async () => {
    // 1. 登录用户
    // 2. 创建帖子
    // 3. 验证数据库存储
    // 4. 验证列表显示
    // 5. 验证其他用户可见
  })
})
```

## 📋 API端点清单

### 必须实现的API端点
```typescript
// 帖子CRUD操作
POST   /api/posts                    // 创建帖子
GET    /api/posts                    // 获取帖子列表
GET    /api/posts/[id]               // 获取单个帖子
PUT    /api/posts/[id]               // 更新帖子
DELETE /api/posts/[id]               // 删除帖子

// 帖子统计和搜索
GET    /api/posts/stats              // 帖子统计信息
GET    /api/posts/search             // 帖子搜索
GET    /api/posts/trending           // 热门帖子
GET    /api/posts/user/[userId]      // 用户帖子列表

// 数据库健康检查
GET    /api/health/database          // 数据库连接检查
```

### API响应格式示例
```typescript
// 成功响应
{
  "success": true,
  "data": {
    "post": {
      "id": "clx123456",
      "title": "示例帖子",
      "content": "帖子内容...",
      "userId": "user123",
      "user": {
        "id": "user123",
        "name": "用户名",
        "image": "头像URL"
      },
      "tags": ["技术", "讨论"],
      "status": "PUBLISHED",
      "createdAt": "2025-07-19T10:00:00Z",
      "_count": {
        "comments": 5,
        "starVotes": 10
      }
    }
  },
  "meta": {
    "timestamp": "2025-07-19T10:00:00Z"
  }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "帖子标题不能为空",
    "details": {
      "field": "title",
      "value": ""
    }
  },
  "meta": {
    "timestamp": "2025-07-19T10:00:00Z"
  }
}
```

## 🧩 组件规格清单

### 必须实现的组件
```typescript
// PostForm.tsx - 帖子发布表单
interface PostFormProps {
  initialData?: Partial<PostData>
  onSuccess?: (post: Post) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

// PostList.tsx - 帖子列表
interface PostListProps {
  filters?: PostFilters
  pagination?: PaginationConfig
  onPostClick?: (post: Post) => void
  layout?: 'grid' | 'list'
}

// PostCard.tsx - 帖子卡片
interface PostCardProps {
  post: Post
  variant?: 'compact' | 'detailed'
  showActions?: boolean
  onEdit?: (post: Post) => void
  onDelete?: (post: Post) => void
}

// PostDetail.tsx - 帖子详情
interface PostDetailProps {
  postId: string
  showComments?: boolean
  showStarVoting?: boolean
}
```

## 🗄️ 数据库变更清单

### 必须执行的数据库变更
```sql
-- 1. 添加帖子状态字段
ALTER TABLE Post ADD COLUMN status PostStatus DEFAULT 'PUBLISHED';
ALTER TABLE Post ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE Post ADD COLUMN viewCount INTEGER DEFAULT 0;

-- 2. 添加性能索引
CREATE INDEX CONCURRENTLY idx_posts_user_created
  ON Post(userId, createdAt DESC);
CREATE INDEX CONCURRENTLY idx_posts_status_created
  ON Post(status, createdAt DESC)
  WHERE status = 'PUBLISHED';
CREATE INDEX CONCURRENTLY idx_posts_tags
  ON Post USING GIN(tags);

-- 3. 添加数据完整性约束
ALTER TABLE Post ADD CONSTRAINT check_content_length
  CHECK (char_length(content) >= 1 AND char_length(content) <= 10000);
ALTER TABLE Post ADD CONSTRAINT check_title_length
  CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

-- 4. 添加外键约束
ALTER TABLE Comment ADD CONSTRAINT fk_comment_post
  FOREIGN KEY (postId) REFERENCES Post(id) ON DELETE CASCADE;
```

## 🧪 测试清单

### 单元测试要求
```typescript
// src/app/api/posts/route.test.ts
describe('Posts API', () => {
  describe('POST /api/posts', () => {
    test('创建帖子成功', async () => {})
    test('创建帖子时标题为空应该失败', async () => {})
    test('创建帖子时内容过长应该失败', async () => {})
    test('未登录用户创建帖子应该失败', async () => {})
  })

  describe('GET /api/posts', () => {
    test('获取帖子列表成功', async () => {})
    test('分页参数正确处理', async () => {})
    test('标签过滤正确工作', async () => {})
    test('用户过滤正确工作', async () => {})
  })
})

// src/components/PostForm.test.tsx
describe('PostForm组件', () => {
  test('表单渲染正确', () => {})
  test('表单验证正确', () => {})
  test('提交成功处理', () => {})
  test('提交失败处理', () => {})
})
```

### 集成测试要求
```typescript
// tests/integration/posts.test.ts
describe('帖子完整流程', () => {
  test('用户发布帖子到显示完整流程', async () => {
    // 1. 用户登录
    // 2. 创建帖子
    // 3. 验证数据库存储
    // 4. 验证列表显示
    // 5. 验证其他用户可见
  })

  test('帖子编辑和删除流程', async () => {
    // 1. 创建帖子
    // 2. 编辑帖子
    // 3. 验证更新
    // 4. 删除帖子
    // 5. 验证软删除
  })
})
```

---

**技术要求版本**: v1.0
**创建时间**: 2025-07-19
**适用开发者**: Developer A
**代码审查**: 必须通过2名其他开发者审查
