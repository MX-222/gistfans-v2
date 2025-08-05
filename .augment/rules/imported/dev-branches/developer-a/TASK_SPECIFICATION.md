---
type: "manual"
---

# Developer A - 发帖系统修复任务规格

## 🎯 任务概览

**负责人**: Developer A  
**模块**: 发帖系统修复 (Post System Fix)  
**优先级**: 🔴 最高优先级 (其他模块依赖)  
**预估工期**: 3-4天  
**Git分支**: `feature/post-fix`  

## 📋 核心问题诊断

### 🔴 当前已知问题
1. **数据持久化失败**
   - 症状: 帖子发布后页面刷新时消失
   - 影响: 用户A发布的帖子，用户B无法看到
   - 疑似原因: 数据库连接问题或事务处理异常

2. **数据库连接不稳定**
   - 症状: 间歇性的数据库操作失败
   - 影响: 影响所有数据相关功能
   - 疑似原因: 连接池配置或Prisma配置问题

3. **模拟数据干扰**
   - 症状: 真实数据与模拟数据混合显示
   - 影响: 数据一致性问题
   - 疑似原因: Context数据与数据库数据冲突

## 🔧 技术修复目标

### 阶段一：问题诊断 (Day 1)
- [ ] **数据库连接诊断**
  - 检查Prisma客户端配置
  - 验证数据库连接池设置
  - 测试数据库连接稳定性
  - 分析连接超时和重试机制

- [ ] **数据持久化分析**
  - 追踪帖子创建API调用流程
  - 检查事务处理逻辑
  - 验证数据写入和读取一致性
  - 分析缓存机制影响

- [ ] **模拟数据清理**
  - 识别Context中的模拟数据
  - 分离真实数据和测试数据
  - 建立数据源优先级机制

### 阶段二：核心修复 (Day 2-3)
- [ ] **数据库层优化**
  - 优化Prisma连接配置
  - 实现连接池管理
  - 添加数据库健康检查
  - 实现自动重连机制

- [ ] **API层重构**
  - 重写帖子创建API
  - 实现事务处理优化
  - 添加数据验证层
  - 实现错误处理机制

- [ ] **数据一致性保证**
  - 实现数据同步机制
  - 添加数据完整性检查
  - 建立数据恢复策略
  - 实现缓存失效机制

### 阶段三：功能增强 (Day 4)
- [ ] **性能优化**
  - 实现查询优化
  - 添加数据库索引
  - 实现分页加载
  - 优化数据传输

- [ ] **监控和日志**
  - 添加详细日志记录
  - 实现性能监控
  - 建立错误追踪
  - 实现数据统计

## 🗄️ 数据库修复计划

### Prisma配置优化
```typescript
// prisma/schema.prisma 优化
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["jsonProtocol"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 连接池配置
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 数据模型优化
```sql
-- 添加必要的索引
CREATE INDEX idx_post_user_created ON Post(userId, createdAt DESC);
CREATE INDEX idx_post_status_created ON Post(status, createdAt DESC);
CREATE INDEX idx_post_tags ON Post USING GIN(tags);

-- 添加数据完整性约束
ALTER TABLE Post ADD CONSTRAINT check_content_length 
  CHECK (char_length(content) >= 1 AND char_length(content) <= 10000);

-- 添加状态字段
ALTER TABLE Post ADD COLUMN status PostStatus DEFAULT 'PUBLISHED';
ALTER TABLE Post ADD COLUMN version INTEGER DEFAULT 1;
```

## 🔌 API重构规格

### 帖子创建API重写
```typescript
// src/app/api/posts/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. 身份验证
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '用户未登录' }
      }, { status: 401 })
    }

    // 2. 数据验证
    const body = await request.json()
    const validatedData = postCreateSchema.parse(body)

    // 3. 数据库事务
    const post = await prisma.$transaction(async (tx) => {
      // 创建帖子
      const newPost = await tx.post.create({
        data: {
          ...validatedData,
          userId: session.user.id,
          status: 'PUBLISHED',
          version: 1
        },
        include: {
          user: {
            select: { id: true, name: true, image: true }
          },
          _count: {
            select: { comments: true, starVotes: true }
          }
        }
      })

      // 更新用户统计
      await tx.user.update({
        where: { id: session.user.id },
        data: { postCount: { increment: 1 } }
      })

      return newPost
    })

    // 4. 缓存更新
    await invalidatePostCache()

    // 5. 返回结果
    return NextResponse.json({
      success: true,
      data: { post },
      meta: { timestamp: new Date().toISOString() }
    })

  } catch (error) {
    console.error('帖子创建失败:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'INTERNAL_ERROR', 
        message: '帖子创建失败',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }, { status: 500 })
  }
}
```

### 帖子查询API优化
```typescript
// src/app/api/posts/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('userId')
    const tag = searchParams.get('tag')

    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      ...(userId && { userId }),
      ...(tag && { tags: { has: tag } })
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, image: true, isVerified: true }
          },
          _count: {
            select: { comments: true, starVotes: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.post.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: { posts },
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('帖子查询失败:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '帖子查询失败' }
    }, { status: 500 })
  }
}
```

## 🧩 前端组件重构

### PostForm组件优化
```typescript
// src/components/PostForm.tsx
export default function PostForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (data: PostFormData) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error?.message || '发布失败')
      }
      
      // 成功处理
      toast.success('帖子发布成功！')
      onSuccess?.()
      
    } catch (error) {
      setError(error.message)
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // ... 组件渲染逻辑
}
```

## 📊 测试验收标准

### 功能测试
- [ ] 帖子创建成功率 > 99%
- [ ] 帖子数据持久化验证
- [ ] 多用户并发发帖测试
- [ ] 帖子编辑和删除功能
- [ ] 帖子搜索和过滤功能

### 性能测试
- [ ] 帖子创建响应时间 < 500ms
- [ ] 帖子列表加载时间 < 1s
- [ ] 数据库查询优化验证
- [ ] 并发处理能力测试

### 数据一致性测试
- [ ] 数据库事务完整性
- [ ] 缓存与数据库同步
- [ ] 错误恢复机制验证
- [ ] 数据备份和恢复测试

---

**任务创建时间**: 2025-07-19  
**负责开发者**: Developer A  
**依赖关系**: 无 (基础模块)  
**被依赖**: Developer B, C, D的所有功能
