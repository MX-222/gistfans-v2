---
type: "manual"
---

# Developer B - 评论系统API端点规格

## 📋 API端点清单

### 评论CRUD操作
```typescript
// 基础评论操作
POST   /api/comments                 // 创建评论
GET    /api/comments                 // 获取评论列表
GET    /api/comments/[id]            // 获取单个评论
PUT    /api/comments/[id]            // 更新评论
DELETE /api/comments/[id]            // 删除评论

// 回复功能
POST   /api/comments/[id]/reply      // 回复评论
GET    /api/comments/[id]/replies    // 获取评论回复

// 评论互动
POST   /api/comments/[id]/like       // 点赞评论
DELETE /api/comments/[id]/like       // 取消点赞
POST   /api/comments/[id]/report     // 举报评论

// 评论统计
GET    /api/comments/stats/post/[postId]  // 帖子评论统计
GET    /api/comments/stats/user/[userId]  // 用户评论统计
```

### 查询参数规范
```typescript
// GET /api/comments 支持的查询参数
interface CommentQueryParams {
  postId: string          // 必需 - 帖子ID
  page?: number          // 页码，默认1
  limit?: number         // 每页数量，默认20，最大100
  sort?: 'latest' | 'oldest' | 'popular'  // 排序方式
  parentId?: string      // 父评论ID，获取回复时使用
  userId?: string        // 用户ID过滤
  status?: CommentStatus // 评论状态过滤
}

// 示例请求
GET /api/comments?postId=clx123&page=1&limit=20&sort=latest
GET /api/comments?postId=clx123&parentId=comment456  // 获取回复
```

### API响应格式
```typescript
// 评论列表响应
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment123",
        "content": "这是一条评论",
        "postId": "post123",
        "userId": "user123",
        "parentId": null,
        "depth": 0,
        "status": "PUBLISHED",
        "likeCount": 5,
        "replyCount": 2,
        "user": {
          "id": "user123",
          "name": "用户名",
          "image": "头像URL",
          "isVerified": true
        },
        "replies": [
          {
            "id": "reply456",
            "content": "这是一条回复",
            "parentId": "comment123",
            "depth": 1,
            // ... 其他字段
          }
        ],
        "createdAt": "2025-07-19T10:00:00Z",
        "updatedAt": "2025-07-19T10:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    },
    "timestamp": "2025-07-19T10:00:00Z"
  }
}

// 评论创建响应
{
  "success": true,
  "data": {
    "comment": {
      "id": "new_comment_123",
      "content": "新创建的评论",
      // ... 完整评论数据
    }
  },
  "meta": {
    "timestamp": "2025-07-19T10:00:00Z"
  }
}
```

### 错误响应格式
```typescript
// 评论不存在
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "评论不存在",
    "details": {
      "commentId": "invalid_id"
    }
  }
}

// 权限不足
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "没有权限编辑此评论",
    "details": {
      "requiredPermission": "EDIT_COMMENT",
      "userRole": "USER"
    }
  }
}

// 内容验证失败
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "评论内容不能为空",
    "details": {
      "field": "content",
      "value": "",
      "constraint": "min_length_1"
    }
  }
}
```

## 🔧 API实现要求

### 评论创建API
```typescript
// POST /api/comments
export async function POST(request: NextRequest) {
  // 1. 身份验证
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return unauthorizedResponse()
  }

  // 2. 数据验证
  const body = await request.json()
  const validatedData = commentCreateSchema.parse(body)

  // 3. 帖子存在性验证 (依赖Developer A)
  const post = await prisma.post.findUnique({
    where: { id: validatedData.postId, status: 'PUBLISHED' }
  })
  if (!post) {
    return notFoundResponse('帖子不存在或已删除')
  }

  // 4. 父评论验证 (如果是回复)
  if (validatedData.parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: validatedData.parentId }
    })
    if (!parentComment || parentComment.postId !== validatedData.postId) {
      return badRequestResponse('父评论不存在或不属于此帖子')
    }
    
    // 检查回复深度限制
    if (parentComment.depth >= 2) {
      return badRequestResponse('回复层级不能超过3级')
    }
  }

  // 5. 数据库事务处理
  const comment = await prisma.$transaction(async (tx) => {
    // 创建评论
    const newComment = await tx.comment.create({
      data: {
        content: validatedData.content,
        postId: validatedData.postId,
        userId: session.user.id,
        parentId: validatedData.parentId,
        depth: validatedData.parentId ? parentComment.depth + 1 : 0,
        status: 'PUBLISHED'
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, isVerified: true }
        }
      }
    })

    // 更新父评论回复数量
    if (validatedData.parentId) {
      await tx.comment.update({
        where: { id: validatedData.parentId },
        data: { replyCount: { increment: 1 } }
      })
    }

    // 更新帖子评论数量
    await tx.post.update({
      where: { id: validatedData.postId },
      data: { commentCount: { increment: 1 } }
    })

    return newComment
  })

  // 6. 发送通知 (集成Developer D的通知系统)
  if (validatedData.parentId) {
    await sendCommentReplyNotification(parentComment.userId, comment)
  } else {
    await sendCommentNotification(post.userId, comment)
  }

  // 7. 缓存更新
  await invalidateCommentCache(validatedData.postId)

  return successResponse({ comment })
}
```

### 评论查询API
```typescript
// GET /api/comments
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postId = searchParams.get('postId')
  const parentId = searchParams.get('parentId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const sort = searchParams.get('sort') || 'latest'

  if (!postId) {
    return badRequestResponse('缺少必需参数: postId')
  }

  // 验证帖子存在
  const post = await prisma.post.findUnique({
    where: { id: postId, status: 'PUBLISHED' }
  })
  if (!post) {
    return notFoundResponse('帖子不存在')
  }

  // 构建查询条件
  const where: Prisma.CommentWhereInput = {
    postId,
    status: 'PUBLISHED',
    parentId: parentId || null
  }

  // 排序条件
  const orderBy = {
    latest: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    popular: { likeCount: 'desc' }
  }[sort] || { createdAt: 'desc' }

  // 查询评论
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, image: true, isVerified: true }
        },
        replies: {
          where: { status: 'PUBLISHED' },
          include: {
            user: {
              select: { id: true, name: true, image: true, isVerified: true }
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 3 // 只返回前3条回复，更多通过单独API获取
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.comment.count({ where })
  ])

  return successResponse({
    comments
  }, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}
```

## 🔒 权限和安全要求

### 权限检查
```typescript
// 评论权限检查函数
async function checkCommentPermission(
  userId: string, 
  commentId: string, 
  action: 'edit' | 'delete' | 'report'
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { user: true }
  })

  if (!comment) {
    throw new Error('评论不存在')
  }

  // 作者权限
  if (comment.userId === userId) {
    return true
  }

  // 管理员权限 (集成Developer D的权限系统)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })

  return user?.role === 'ADMIN' || user?.role === 'MODERATOR'
}
```

### 内容安全
```typescript
// 评论内容过滤
import DOMPurify from 'dompurify'

function sanitizeCommentContent(content: string): string {
  // 1. HTML标签过滤
  const cleaned = DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code'],
    ALLOWED_ATTR: []
  })

  // 2. 长度限制
  if (cleaned.length > 2000) {
    throw new Error('评论内容过长')
  }

  // 3. 敏感词过滤 (可选)
  return cleaned
}
```

## 📊 性能要求

### 查询优化
```sql
-- 必须添加的数据库索引
CREATE INDEX idx_comment_post_created ON Comment(postId, createdAt DESC);
CREATE INDEX idx_comment_parent_created ON Comment(parentId, createdAt ASC);
CREATE INDEX idx_comment_user_created ON Comment(userId, createdAt DESC);
CREATE INDEX idx_comment_status ON Comment(status);
```

### 缓存策略
```typescript
// 评论缓存管理
class CommentCache {
  // 缓存帖子评论列表
  async getPostComments(postId: string, page: number): Promise<Comment[] | null> {
    const key = `comments:post:${postId}:page:${page}`
    return await cache.get(key)
  }

  async setPostComments(postId: string, page: number, comments: Comment[]) {
    const key = `comments:post:${postId}:page:${page}`
    await cache.set(key, comments, 300) // 5分钟缓存
  }

  async invalidatePostComments(postId: string) {
    const pattern = `comments:post:${postId}:*`
    await cache.deletePattern(pattern)
  }
}
```

---

**API文档版本**: v1.0  
**创建时间**: 2025-07-19  
**适用开发者**: Developer B  
**依赖**: Developer A (帖子系统), Developer D (通知系统)
